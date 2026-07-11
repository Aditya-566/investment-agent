import { searchSymbol } from '../services/alphaVantage.js';

/**
 * Resolves a company name or ticker query to a clean stock ticker symbol.
 * If query already looks like a ticker, verifies it.
 * @param {string} query - Company name (e.g. "Apple") or ticker (e.g. "AAPL")
 * @returns {Promise<string>} - Resolved ticker symbol (e.g. "AAPL")
 */
export async function resolveTicker(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid query: ticker or company name must be a string');
  }

  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    throw new Error('Query cannot be empty');
  }

  console.log(`[TickerResolver] Resolving: "${cleanedQuery}"`);

  let searchResults;
  try {
    searchResults = await searchSymbol(cleanedQuery);
  } catch (error) {
    console.error(`[TickerResolver] Error searching symbol: ${error.message}`);
    // If API search fails but the query looks like a ticker, fallback to it
    if (/^[A-Za-z]{1,5}$/.test(cleanedQuery)) {
      console.log(`[TickerResolver] API failed, but "${cleanedQuery}" is ticker-like. Using as fallback.`);
      return cleanedQuery.toUpperCase();
    }
    throw error;
  }

  const matches = searchResults.bestMatches || [];

  if (matches.length === 0) {
    // If query is ticker-like (1-5 letters), assume it's a ticker and proceed with warning
    if (/^[A-Za-z]{1,5}$/.test(cleanedQuery)) {
      console.warn(`[TickerResolver] No search matches for "${cleanedQuery}". Falling back to uppercase input.`);
      return cleanedQuery.toUpperCase();
    }
    throw new Error(`Could not resolve ticker or company name for "${cleanedQuery}"`);
  }

  // 1. Check for exact symbol match (case-insensitive)
  const exactMatch = matches.find(
    m => m['1. symbol'].toUpperCase() === cleanedQuery.toUpperCase()
  );
  if (exactMatch) {
    const symbol = exactMatch['1. symbol'].toUpperCase();
    console.log(`[TickerResolver] Exact match found: ${symbol} (${exactMatch['2. name']})`);
    return symbol;
  }

  // 2. Prefer US/USD matches, ranked by name similarity to the query.
  //    Score: 3 = name equals query, 2 = name starts with query, 1 = name contains query, 0 = no relation.
  //    This prevents "Apple" from mapping to APLE (Apple Hospitality REIT) instead of AAPL (Apple Inc).
  function nameScore(m) {
    const name = (m['2. name'] || '').toLowerCase();
    const q = cleanedQuery.toLowerCase();
    if (name === q) return 4;
    // "Apple Inc" matches "apple" followed immediately by a space or end of string
    const wordBoundaryRegex = new RegExp(`^${q}(\\s|$)`, 'i');
    if (wordBoundaryRegex.test(name)) return 3;
    if (name.startsWith(q)) return 2;
    if (name.includes(q)) return 1;
    return 0;
  }

  function isUS(m) {
    const region = (m['4. region'] || '').toLowerCase();
    const currency = (m['8. currency'] || '').toUpperCase();
    return region.includes('united states') || currency === 'USD';
  }

  const usMatches = matches.filter(isUS);

  if (usMatches.length > 0) {
    // Sort: highest name score first; ties broken by shorter company name (more precise match)
    usMatches.sort((a, b) => {
      const scoreDiff = nameScore(b) - nameScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (a['2. name'] || '').length - (b['2. name'] || '').length;
    });
    const best = usMatches[0];
    const symbol = best['1. symbol'].toUpperCase();
    console.log(`[TickerResolver] Best US match found: ${symbol} (${best['2. name']})`);
    return symbol;
  }

  // 3. Fallback to the first match in the list
  const bestMatch = matches[0];
  const symbol = bestMatch['1. symbol'].toUpperCase();
  console.log(`[TickerResolver] Best match found: ${symbol} (${bestMatch['2. name']})`);
  return symbol;
}

export default {
  resolveTicker
};
