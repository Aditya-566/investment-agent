export function buildFinancialSummaryPrompt({ ticker, companyName, financialSnapshot }) {
	return `You are a senior equity research analyst.
Write one concise paragraph summarizing the financial picture for ${companyName || ticker} (${ticker}).

Rules:
- Use only the numbers and facts in the provided data.
- Do not invent missing metrics.
- Focus on revenue growth, margins, valuation, leverage, and cash generation.
- Mention if data is incomplete.

Data:
${financialSnapshot}

Return plain text only. No bullets, no markdown, no JSON.`;
}

export function buildSentimentPrompt({ ticker, companyName, articles }) {
	return `You are a market news analyst.
Analyze the articles about ${companyName || ticker} (${ticker}) and return valid JSON only.

Rules:
- Base the score only on the provided articles.
- Score must be an integer from 0 to 100 where 0 is extremely negative and 100 is extremely positive.
- If articles are mixed, lean neutral instead of guessing.
- Produce per-article labels that are one of: Bullish, Bearish, Neutral.
- Do not add commentary outside JSON.

Articles:
${articles}

Schema:
{
	"overallScore": 0,
	"overallLabel": "Neutral",
	"summary": "One short paragraph.",
	"keyThemes": ["theme 1", "theme 2"],
	"articleSentiments": [
		{ "title": "Article title", "label": "Bullish" }
	]
}`;
}

export function buildDecisionPrompt({ ticker, companyName, financialSummary, financialSnapshot, sentimentAnalysis, newsArticles }) {
	return `You are a disciplined portfolio manager.
Decide whether to Invest or Pass on ${companyName || ticker} (${ticker}).

Rules:
- Use only the provided research.
- Avoid hallucinations and do not mention data you cannot see.
- If evidence is mixed or incomplete, choose Pass.
- Output valid JSON only.

Financial summary:
${financialSummary}

Financial snapshot:
${financialSnapshot}

News sentiment:
${sentimentAnalysis}

Recent articles:
${newsArticles}

Schema:
{
	"decision": "Invest",
	"confidence": 0,
	"reasoning": "Short but specific explanation using the data above.",
	"keyFactors": ["factor 1", "factor 2", "factor 3"]
}`;
}

export default {
	buildFinancialSummaryPrompt,
	buildSentimentPrompt,
	buildDecisionPrompt
};