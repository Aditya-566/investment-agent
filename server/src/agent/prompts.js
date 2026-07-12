/**
 * prompts.js — LLM prompt templates.
 *
 * Two prompts:
 *   buildSentimentPrompt  — asks the LLM to score a batch of news articles as
 *                           Bullish/Bearish/Neutral and return structured JSON.
 *   buildDecisionPrompt   — asks the LLM to make a final Invest/Pass verdict
 *                           given financial metrics and the sentiment analysis.
 *
 * Each function takes an object of named inputs and returns a string ready to
 * pass as the `userPrompt` in callGroq(). The schema comments show exactly what
 * JSON structure the LLM is expected to return.
 */

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

export function buildDecisionPrompt({ ticker, companyName, financialSnapshot, sentimentAnalysis, newsArticles }) {
	return `You are a disciplined portfolio manager.
Decide whether to Invest or Pass on ${companyName || ticker} (${ticker}).

Rules:
- Use only the provided research.
- Avoid hallucinations and do not mention data you cannot see.
- If evidence is mixed or incomplete, choose Pass.
- Output valid JSON only.

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