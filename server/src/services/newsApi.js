import axios from 'axios';
import Cache from './cache.js';

const cache = new Cache(30 * 60 * 1000);

export async function getCompanyNews(query, pageSize = 15) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn('[NewsAPI] Warning: NEWS_API_KEY is not defined in the environment.');
  }

  const cacheKey = `news:${query}:${pageSize}`;
  const cachedVal = cache.get(cacheKey);
  if (cachedVal) {
    console.log(`[NewsAPI] Cache hit for query: ${query}`);
    return cachedVal;
  }

  console.log(`[NewsAPI] Fetching news from API for query: "${query}"...`);
  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        language: 'en',
        sortBy: 'relevance',
        pageSize,
        apiKey
      },
      headers: {
        'User-Agent': 'InvestmentResearchAgent/1.0'
      }
    });

    if (response.data && response.data.articles) {
      const articles = response.data.articles.map((article) => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source ? article.source.name : 'Unknown'
      }));

      cache.set(cacheKey, articles);
      return articles;
    }

    return [];
  } catch (error) {
    console.error(`[NewsAPI] Error fetching news for query "${query}": ${error.message}`);
    if (error.response && error.response.data) {
      console.error('[NewsAPI] API Response Details:', error.response.data);
    }
    throw error;
  }
}

export default {
  getCompanyNews
};