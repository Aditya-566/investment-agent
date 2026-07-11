import { ChatGroq } from '@langchain/groq';
import { DECISION_SYNTHESIS_PROMPT } from '../prompts.js';

function parseJson(text) {
  let cleaned = text.trim();
  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '');
    cleaned = cleaned.replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned.trim());
}

/**
 * decisionNode synthesizes all research and outputs the final recommendation.
 * @param {Object} state - The current LangGraph state
 * @returns {Promise<Object>} - State updates
 */
export async function decisionNode(state) {
  const { ticker, financials, newsSentiment, analystEstimates } = state;
  console.log(`[DecisionNode] Synthesizing final investment decision for: ${ticker}`);

  try {
    // Format inputs into strings
    const financialsStr = financials 
      ? JSON.stringify({ overview: financials.overview, metrics: financials.metrics, history: financials.history }, null, 2)
      : 'No financial data available.';

    const newsSentimentStr = newsSentiment
      ? JSON.stringify(newsSentiment, null, 2)
      : 'No news sentiment data available.';

    const analystEstimatesStr = analystEstimates
      ? JSON.stringify(analystEstimates, null, 2)
      : 'No analyst estimates data available.';

    // Populate prompt
    const prompt = DECISION_SYNTHESIS_PROMPT
      .replace('{ticker}', ticker)
      .replace('{financials}', financialsStr)
      .replace('{newsSentiment}', newsSentimentStr)
      .replace('{analystEstimates}', analystEstimatesStr);

    // Call LLM
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not defined.');
    }

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-specdec';
    const model = new ChatGroq({
      apiKey,
      model: modelName,
      temperature: 0.1 // Keep it low for consistent JSON adherence
    });

    console.log(`[DecisionNode] Invoking Groq (${modelName}) for recommendation...`);
    const response = await model.invoke(prompt);
    const content = response.content;

    let decisionResult;
    try {
      decisionResult = parseJson(content);
    } catch (parseError) {
      console.error(`[DecisionNode] JSON Parsing Error. Raw response content:\n`, content);
      throw new Error(`Synthesis output could not be parsed as JSON: ${parseError.message}`);
    }

    // Ensure array properties exist
    if (!Array.isArray(decisionResult.keyFactors)) {
      decisionResult.keyFactors = typeof decisionResult.keyFactors === 'string' 
        ? [decisionResult.keyFactors] 
        : [];
    }
    if (!Array.isArray(decisionResult.risks)) {
      decisionResult.risks = typeof decisionResult.risks === 'string' 
        ? [decisionResult.risks] 
        : [];
    }

    console.log(`[DecisionNode] Final Decision for ${ticker}: ${decisionResult.decision.toUpperCase()} with confidence ${decisionResult.confidence}%`);
    return {
      decision: decisionResult
    };
  } catch (error) {
    console.error(`[DecisionNode] Error during synthesis for ${ticker}:`, error);
    return {
      error: `DecisionNode failed: ${error.message}`
    };
  }
}

export default decisionNode;
