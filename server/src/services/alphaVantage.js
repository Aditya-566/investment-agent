import axios from 'axios';
import Cache from './cache.js';

// Cache for 24 hours for financial data since it doesn't change frequently.
const cache = new Cache(24 * 60 * 60 * 1000); 

const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

// Throttling setup: max 5 requests per minute -> min 12s between calls.
let queue = Promise.resolve();
let lastCallTime = 0;
const THROTTLE_DELAY = 12000; 

async function waitForThrottling() {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < THROTTLE_DELAY) {
    const delay = THROTTLE_DELAY - timeSinceLastCall;
    console.log(`[Alpha Vantage] Throttling: waiting ${delay}ms before next API request...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastCallTime = Date.now();
}

async function enqueueCall(fn) {
  const currentQueue = queue;
  let resolveNext;
  queue = new Promise(resolve => {
    resolveNext = resolve;
  });

  try {
    await currentQueue;
    await waitForThrottling();
    return await fn();
  } finally {
    resolveNext();
  }
}

async function fetchWithRetry(url, params, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[Alpha Vantage] Calling API: function=${params.function} (Attempt ${attempt}/${retries})...`);
    try {
      const response = await axios.get(url, { params });
      const data = response.data;

      if (!data) {
        throw new Error('Empty response received from Alpha Vantage API');
      }

      // Check for Note (rate limit warning on standard key) or Information
      if (data.Note || data.Information) {
        const message = data.Note || data.Information;
        console.warn(`[Alpha Vantage] Rate limit warning on attempt ${attempt}: ${message}`);
        
        if (attempt < retries) {
          // Wait 30 seconds before retrying when rate limited
          console.log(`[Alpha Vantage] Waiting 30 seconds before retrying...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
          continue;
        } else {
          throw new Error(`Alpha Vantage API rate limit hit: ${message}`);
        }
      }

      // Check for API error message
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
      }

      return data;
    } catch (error) {
      console.error(`[Alpha Vantage] Error during API call on attempt ${attempt}: ${error.message}`);
      if (attempt === retries) {
        throw error;
      }
      // Wait 5 seconds before retrying general network errors
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function getAlphaVantageData(fnName, params, ttl = 24 * 60 * 60 * 1000) {
  const cacheKey = `alphavantage:${fnName}:${JSON.stringify(params)}`;
  const cachedVal = cache.get(cacheKey);
  if (cachedVal) {
    console.log(`[Alpha Vantage] Cache hit for key: ${cacheKey}`);
    return cachedVal;
  }

  // Cache miss, run through throttle queue
  const data = await enqueueCall(() => fetchWithRetry('https://www.alphavantage.co/query', {
    ...params,
    apikey: apiKey
  }));

  // Store in cache if we got valid data
  cache.set(cacheKey, data, ttl);
  return data;
}

export async function getOverview(symbol) {
  return getAlphaVantageData('OVERVIEW', { function: 'OVERVIEW', symbol });
}

export async function getIncomeStatement(symbol) {
  return getAlphaVantageData('INCOME_STATEMENT', { function: 'INCOME_STATEMENT', symbol });
}

export async function getBalanceSheet(symbol) {
  return getAlphaVantageData('BALANCE_SHEET', { function: 'BALANCE_SHEET', symbol });
}

export async function getCashFlow(symbol) {
  return getAlphaVantageData('CASH_FLOW', { function: 'CASH_FLOW', symbol });
}

export async function getEarnings(symbol) {
  return getAlphaVantageData('EARNINGS', { function: 'EARNINGS', symbol });
}

export async function searchSymbol(keywords) {
  return getAlphaVantageData('SYMBOL_SEARCH', { function: 'SYMBOL_SEARCH', keywords }, 2 * 60 * 60 * 1000); // 2 hours for symbol search
}

export default {
  getOverview,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getEarnings,
  searchSymbol
};
