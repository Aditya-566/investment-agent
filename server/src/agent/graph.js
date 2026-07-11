import { StateGraph, Annotation } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import { buildFinancialSummaryPrompt, buildSentimentPrompt, buildDecisionPrompt } from './prompts.js';
import { fetchResearchData } from './tools.js';

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-specdec';

const StateAnnotation = Annotation.Root({
	ticker: Annotation(),
	companyName: Annotation(),
	source: Annotation(),
	financials: Annotation(),
	financialSnapshot: Annotation(),
	financialSummary: Annotation(),
	news: Annotation(),
	articleText: Annotation(),
	newsSentiment: Annotation(),
	decision: Annotation(),
	warnings: Annotation(),
	error: Annotation()
});

function stripCodeFences(value) {
	if (typeof value !== 'string') return value;
	let cleaned = value.trim();
	if (cleaned.startsWith('```')) {
		cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
	}
	return cleaned.trim();
}

function safeJsonParse(value, fallback = null) {
	try {
		return JSON.parse(stripCodeFences(value));
	} catch {
		return fallback;
	}
}

function buildFinancialText(snapshot = {}) {
	return JSON.stringify(snapshot, null, 2);
}

async function callGroq({ systemPrompt, userPrompt, temperature = 0.2 }) {
	const apiKey = process.env.GROQ_API_KEY;
	if (!apiKey) {
		throw new Error('GROQ_API_KEY is not defined.');
	}

	const model = new ChatGroq({
		apiKey,
		model: GROQ_MODEL,
		temperature
	});

	const response = await model.invoke([
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: userPrompt }
	]);

	const content = response?.content;
	if (!content) {
		throw new Error('Groq response did not include message content.');
	}

	return content;
}

async function fetchDataNode(state) {
	const { ticker, companyName } = state;
	try {
		console.log(`[fetchData] Loading research data for ${ticker}`);
		const payload = await fetchResearchData({ ticker, companyName });
		return {
			...payload,
			warnings: payload.warnings || []
		};
	} catch (error) {
		console.error(`[fetchData] Failed for ${ticker}:`, error);
		return {
			...state,
			source: 'mock',
			financials: null,
			financialSnapshot: {},
			news: [],
			articleText: '',
			warnings: [`Research data fetch failed: ${error.message}`],
			error: null
		};
	}
}

async function analyzeFinancialsNode(state) {
	const financialText = buildFinancialText(state.financialSnapshot || {});
	const systemPrompt = 'You summarize financial data for investment research. Be factual, concise, and do not invent missing data.';
	const userPrompt = buildFinancialSummaryPrompt({
		ticker: state.ticker,
		companyName: state.companyName,
		financialSnapshot: financialText
	});

	try {
		const summary = await callGroq({
			systemPrompt,
			userPrompt,
			temperature: 0.1
		});

		return {
			financialSummary: summary.trim()
		};
	} catch (error) {
		console.warn(`[analyzeFinancials] OpenAI summary failed for ${state.ticker}, using fallback text: ${error.message}`);
		const fallback = `Financial data for ${state.companyName || state.ticker} is ${state.financialSnapshot?.peRatio ? `trading at a P/E of ${state.financialSnapshot.peRatio}` : 'incompletely available'}. Revenue growth, leverage, and free cash flow should be reviewed alongside the latest filings.`;
		return { financialSummary: fallback };
	}
}

async function analyzeSentimentNode(state) {
	const systemPrompt = 'You analyze news sentiment for stocks. Stay grounded in the provided articles and output valid JSON only.';
	const userPrompt = buildSentimentPrompt({
		ticker: state.ticker,
		companyName: state.companyName,
		articles: state.articleText || 'No articles available.'
	});

	try {
		const raw = await callGroq({
			systemPrompt,
			userPrompt,
			temperature: 0.1
		});

		const parsed = safeJsonParse(raw, null);
		if (!parsed) {
			throw new Error('Unable to parse sentiment JSON.');
		}

		return {
			newsSentiment: {
				overallScore: Number(parsed.overallScore ?? 50),
				overallLabel: parsed.overallLabel || 'Neutral',
				summary: parsed.summary || 'No summary provided.',
				keyThemes: Array.isArray(parsed.keyThemes) ? parsed.keyThemes : [],
				articleSentiments: Array.isArray(parsed.articleSentiments) ? parsed.articleSentiments : []
			}
		};
	} catch (error) {
		console.warn(`[analyzeSentiment] OpenAI sentiment failed for ${state.ticker}, using fallback text: ${error.message}`);
		const lowerCased = (state.articleText || '').toLowerCase();
		const negativeHits = ['lawsuit', 'downgrade', 'miss', 'decline', 'weak', 'debt', 'cuts'];
		const positiveHits = ['beat', 'upgrade', 'growth', 'record', 'profit', 'buyback', 'raised'];
		const negativeCount = negativeHits.filter((term) => lowerCased.includes(term)).length;
		const positiveCount = positiveHits.filter((term) => lowerCased.includes(term)).length;
		const score = Math.max(0, Math.min(100, 50 + (positiveCount - negativeCount) * 12));
		const label = score >= 60 ? 'Bullish' : score <= 40 ? 'Bearish' : 'Neutral';

		return {
			newsSentiment: {
				overallScore: score,
				overallLabel: label,
				summary: 'Sentiment fallback was used because the LLM call failed.',
				keyThemes: [],
				articleSentiments: (state.news || []).map((article) => ({
					title: article.title,
					label
				}))
			}
		};
	}
}

async function makeDecisionNode(state) {
	const systemPrompt = 'You are a strict investment decision engine. Output valid JSON only and avoid unsupported claims.';
	const userPrompt = buildDecisionPrompt({
		ticker: state.ticker,
		companyName: state.companyName,
		financialSummary: state.financialSummary || 'No financial summary available.',
		financialSnapshot: buildFinancialText(state.financialSnapshot || {}),
		sentimentAnalysis: JSON.stringify(state.newsSentiment || {}, null, 2),
		newsArticles: JSON.stringify((state.news || []).slice(0, 6), null, 2)
	});

	try {
		const raw = await callGroq({
			systemPrompt,
			userPrompt,
			temperature: 0.05
		});

		const parsed = safeJsonParse(raw, null);
		if (!parsed) {
			throw new Error('Unable to parse decision JSON.');
		}

		const decision = String(parsed.decision || 'Pass').toLowerCase() === 'invest' ? 'Invest' : 'Pass';
		const confidence = Number.isFinite(Number(parsed.confidence)) ? Math.max(0, Math.min(100, Number(parsed.confidence))) : 50;

		return {
			decision: {
				decision,
				confidence,
				reasoning: parsed.reasoning || 'No reasoning returned by the model.',
				keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : []
			}
		};
	} catch (error) {
		console.warn(`[makeDecision] OpenAI decision failed for ${state.ticker}, using heuristic fallback: ${error.message}`);
		const sentimentScore = Number(state.newsSentiment?.overallScore ?? 50);
		const peRatio = Number(state.financialSnapshot?.peRatio);
		const revenueGrowth = Number(state.financialSnapshot?.revenueGrowthYoY);
		const pass = (Number.isFinite(peRatio) && peRatio > 45) || sentimentScore < 45 || (Number.isFinite(revenueGrowth) && revenueGrowth < 0);

		return {
			decision: {
				decision: pass ? 'Pass' : 'Invest',
				confidence: pass ? 61 : 66,
				reasoning: 'Fallback decision used because the model was unavailable. The heuristic weighs valuation, revenue trend, and news sentiment.',
				keyFactors: [
					`News sentiment score: ${sentimentScore}`,
					`P/E ratio: ${Number.isFinite(peRatio) ? peRatio.toFixed(2) : 'N/A'}`,
					`Revenue growth YoY: ${Number.isFinite(revenueGrowth) ? `${revenueGrowth}%` : 'N/A'}`
				]
			}
		};
	}
}

const workflow = new StateGraph(StateAnnotation)
	.addNode('fetchData', fetchDataNode)
	.addNode('analyzeFinancials', analyzeFinancialsNode)
	.addNode('analyzeSentiment', analyzeSentimentNode)
	.addNode('makeDecision', makeDecisionNode)
	.addEdge('__start__', 'fetchData')
	.addEdge('fetchData', 'analyzeFinancials')
	.addEdge('fetchData', 'analyzeSentiment')
	.addEdge('analyzeFinancials', 'makeDecision')
	.addEdge('analyzeSentiment', 'makeDecision')
	.addEdge('makeDecision', '__end__');

const graph = workflow.compile();

export {
	graph,
	StateAnnotation,
	fetchDataNode as fetchData,
	analyzeFinancialsNode as analyzeFinancials,
	analyzeSentimentNode as analyzeSentiment,
	makeDecisionNode as makeDecision
};

export default graph;