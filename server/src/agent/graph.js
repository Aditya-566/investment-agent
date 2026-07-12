/**
 * graph.js — The LangGraph pipeline.
 *
 * This file defines the three-step AI workflow that runs for every research request:
 *   1. fetchData    — Pulls financial statements from Alpha Vantage and news from NewsAPI.
 *                     Normalises everything into a clean `financialSnapshot` object.
 *   2. analyzeSentiment — Sends the news articles to Groq/Llama and gets back a
 *                     structured sentiment object (score, label, themes, per-article labels).
 *   3. makeDecision — Sends the financialSnapshot + sentiment to Groq and gets back
 *                     the final { decision, confidence, reasoning, keyFactors } JSON.
 *
 * LangGraph runs steps 2 and 3 sequentially (sentiment must finish before decision).
 * State flows through each node as a plain object — each node returns only the keys it sets.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import { buildSentimentPrompt, buildDecisionPrompt } from './prompts.js';
import { fetchResearchData } from './tools.js';

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-specdec';

// The shape of data that flows between nodes.
// Each field starts as undefined and gets filled in as the pipeline runs.
const StateAnnotation = Annotation.Root({
	ticker: Annotation(),
	companyName: Annotation(),
	source: Annotation(),
	financials: Annotation(),
	financialSnapshot: Annotation(),
	news: Annotation(),
	articleText: Annotation(),
	newsSentiment: Annotation(),
	decision: Annotation(),
	warnings: Annotation(),
	error: Annotation()
});

// Strip ```json ... ``` fences that LLMs sometimes wrap their output in.
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

// Single helper for all Groq calls — creates the client, invokes, returns content string.
async function callGroq({ systemPrompt, userPrompt, temperature = 0.2 }) {
	const apiKey = process.env.GROQ_API_KEY;
	if (!apiKey) {
		throw new Error('GROQ_API_KEY is not defined.');
	}

	const model = new ChatGroq({ apiKey, model: GROQ_MODEL, temperature });
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

// --- Node 1: Fetch raw financial data and news, normalise into state fields ---
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
		console.error(`[fetchData] Failed for ${ticker}:`, error.message);

		// Propagate definitive failures (unsupported ticker, rate limit) so the
		// route can return a clear error to the user instead of running the LLM
		// on an empty dataset and producing a meaningless Pass/0% verdict.
		if (error.message.includes('not available') || error.message.includes('request limit')) {
			return { ...state, error: error.message };
		}

		// Genuine transient network failure — fall through to mock so at least
		// news sentiment can still run and produce something useful.
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

// --- Node 2: Classify news sentiment (Bullish/Bearish/Neutral) via Groq ---
async function analyzeSentimentNode(state) {
	const systemPrompt = 'You analyze news sentiment for stocks. Stay grounded in the provided articles and output valid JSON only.';
	const userPrompt = buildSentimentPrompt({
		ticker: state.ticker,
		companyName: state.companyName,
		articles: state.articleText || 'No articles available.'
	});

	try {
		const raw = await callGroq({ systemPrompt, userPrompt, temperature: 0.1 });
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
		// Fallback: simple keyword scoring so the pipeline never crashes
		console.warn(`[analyzeSentiment] LLM call failed for ${state.ticker}, using keyword fallback: ${error.message}`);
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
				summary: 'Keyword-based sentiment fallback (LLM unavailable).',
				keyThemes: [],
				articleSentiments: (state.news || []).map((article) => ({ title: article.title, label }))
			}
		};
	}
}

// --- Node 3: Combine financials + sentiment and produce the final Invest/Pass verdict ---
async function makeDecisionNode(state) {
	const systemPrompt = 'You are a strict investment decision engine. Output valid JSON only and avoid unsupported claims.';
	const userPrompt = buildDecisionPrompt({
		ticker: state.ticker,
		companyName: state.companyName,
		financialSnapshot: JSON.stringify(state.financialSnapshot || {}, null, 2),
		sentimentAnalysis: JSON.stringify(state.newsSentiment || {}, null, 2),
		newsArticles: JSON.stringify((state.news || []).slice(0, 6), null, 2)
	});

	try {
		const raw = await callGroq({ systemPrompt, userPrompt, temperature: 0.05 });
		const parsed = safeJsonParse(raw, null);
		if (!parsed) {
			throw new Error('Unable to parse decision JSON.');
		}

		const decision = String(parsed.decision || 'Pass').toLowerCase() === 'invest' ? 'Invest' : 'Pass';
		const confidence = Number.isFinite(Number(parsed.confidence))
			? Math.max(0, Math.min(100, Number(parsed.confidence)))
			: 50;

		return {
			decision: {
				decision,
				confidence,
				reasoning: parsed.reasoning || 'No reasoning returned by the model.',
				keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : []
			}
		};
	} catch (error) {
		// Fallback: simple heuristic so the route always gets a usable decision object
		console.warn(`[makeDecision] LLM call failed for ${state.ticker}, using heuristic fallback: ${error.message}`);
		const sentimentScore = Number(state.newsSentiment?.overallScore ?? 50);
		const peRatio = Number(state.financialSnapshot?.peRatio);
		const revenueGrowth = Number(state.financialSnapshot?.revenueGrowthYoY);
		const pass =
			(Number.isFinite(peRatio) && peRatio > 45) ||
			sentimentScore < 45 ||
			(Number.isFinite(revenueGrowth) && revenueGrowth < 0);

		return {
			decision: {
				decision: pass ? 'Pass' : 'Invest',
				confidence: pass ? 61 : 66,
				reasoning: 'Heuristic fallback: LLM unavailable. Weights P/E, revenue trend, and news sentiment.',
				keyFactors: [
					`News sentiment score: ${sentimentScore}`,
					`P/E ratio: ${Number.isFinite(peRatio) ? peRatio.toFixed(2) : 'N/A'}`,
					`Revenue growth YoY: ${Number.isFinite(revenueGrowth) ? `${revenueGrowth}%` : 'N/A'}`
				]
			}
		};
	}
}

// Wire up the graph: fetch → sentiment → decision → done
const workflow = new StateGraph(StateAnnotation)
	.addNode('fetchData', fetchDataNode)
	.addNode('analyzeSentiment', analyzeSentimentNode)
	.addNode('makeDecision', makeDecisionNode)
	.addEdge('__start__', 'fetchData')
	.addEdge('fetchData', 'analyzeSentiment')
	.addEdge('analyzeSentiment', 'makeDecision')
	.addEdge('makeDecision', '__end__');

export default workflow.compile();