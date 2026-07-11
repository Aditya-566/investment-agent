import { ChatGroq } from '@langchain/groq';
import { getCompanyNews } from '../../services/newsApi.js';
import { NEWS_SENTIMENT_PROMPT } from '../prompts.js';

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
 * newsNode fetches articles and performs sentiment analysis using Groq.
 * @param {Object} state - The current LangGraph state
 * @returns {Promise<Object>} - State updates
 */
export async function newsNode(state) {
  const { ticker } = state;
  console.log(`[NewsNode] Analyzing news sentiment for: ${ticker}`);

  try {
    // 1. Fetch news articles
    // Fetch a maximum of 15 articles to avoid payload issues
    const articles = await getCompanyNews(ticker, 15);

    if (!articles || articles.length === 0) {
      console.log(`[NewsNode] No articles found for: ${ticker}`);
      return {
        news: [],
        newsSentiment: {
          overallSentiment: 'Neutral',
          sentimentScore: 0.0,
          keyThemes: ['No news found'],
          summary: `No recent news articles were found for ${ticker}.`
        }
      };
    }

    // 2. Format articles for the LLM prompt
    const formattedArticles = articles
      .map((art, index) => {
        return `[Article #${index + 1}]
Source: ${art.source}
Published At: ${art.publishedAt}
Title: ${art.title}
Description: ${art.description || 'No description'}
Content Snippet: ${art.content ? art.content.slice(0, 300) : 'No content preview'}`;
      })
      .join('\n\n');

    // 3. Build the prompt
    const prompt = NEWS_SENTIMENT_PROMPT
      .replace('{ticker}', ticker)
      .replace('{articles}', formattedArticles);

    // 4. Initialize Groq model
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not defined.');
    }

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-specdec';
    const model = new ChatGroq({
      apiKey,
      model: modelName, // passing modelName as model
      temperature: 0.1
    });

    console.log(`[NewsNode] Invoking Groq (${modelName}) for sentiment analysis on ${ticker}`);
    const response = await model.invoke(prompt);
    const content = response.content;

    // 5. Parse output
    let sentimentResult;
    try {
      sentimentResult = parseJson(content);
    } catch (parseError) {
      console.error(`[NewsNode] JSON Parsing Error. Raw response content:`, content);
      throw new Error(`LLM output could not be parsed as JSON: ${parseError.message}`);
    }

    console.log(`[NewsNode] News sentiment analysis complete for: ${ticker}. Sentiment: ${sentimentResult.overallSentiment} (${sentimentResult.sentimentScore})`);
    return {
      news: articles,
      newsSentiment: sentimentResult
    };
  } catch (error) {
    console.error(`[NewsNode] Error during news analysis for ${ticker}:`, error);
    return {
      error: `NewsNode failed: ${error.message}`
    };
  }
}

export default newsNode;
