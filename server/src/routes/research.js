import express from 'express';
import Cache from '../services/cache.js';
import { resolveTicker } from '../utils/tickerResolver.js';
import graph from '../agent/graph.js';

const router = express.Router();
// Cache results for 1 hour — Alpha Vantage data doesn't change minute to minute.
const researchCache = new Cache(60 * 60 * 1000);

async function handleResearchRequest(req, res) {
  const input = req.body?.query ?? req.body?.ticker;
  const shouldUseCache = req.body?.refresh !== true;

  if (!input || typeof input !== 'string' || !input.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Query or ticker is required and must be a valid string.'
    });
  }

  const startTime = Date.now();
  const cleanQuery = input.trim();
  console.log(`[API /research] Request received for: "${cleanQuery}"`);

  try {
    // Step 1: Convert company name / ticker string → canonical uppercase ticker symbol.
    let ticker;
    try {
      ticker = await resolveTicker(cleanQuery);
    } catch (resolverError) {
      console.error(`[API /research] Ticker resolution failed: ${resolverError.message}`);
      return res.status(400).json({
        success: false,
        error: `We could not find a listed company for "${cleanQuery}". Try a ticker like AAPL or a well-known public company name.`,
        details: resolverError.message
      });
    }

    // Step 2: Return cached result if available and refresh not requested.
    const cacheKey = ticker.toUpperCase();
    if (shouldUseCache) {
      const cached = researchCache.get(cacheKey);
      if (cached) {
        console.log(`[API /research] Cache hit for ${cacheKey}`);
        return res.status(200).json({
          success: true,
          cached: true,
          ticker: cached.ticker,
          companyName: cached.companyName,
          durationMs: 0,
          ...cached.analysis
        });
      }
    }

    // Step 3: Run the LangGraph pipeline (fetchData → analyzeSentiment → makeDecision).
    console.log(`[API /research] Query resolved to ticker: "${ticker}". Launching LangGraph pipeline...`);
    const finalState = await graph.invoke({
      ticker,
      companyName: cleanQuery,
      financials: null,
      news: null,
      newsSentiment: null,
      decision: null,
      error: null
    });
    const duration = Date.now() - startTime;

    if (finalState.error) {
      console.error(`[API /research] Workflow error for ${ticker}: ${finalState.error}`);
      // Coverage / rate-limit errors are the caller's problem, not a server fault.
      const isCoverageError =
        finalState.error.includes('not available') ||
        finalState.error.includes('request limit');
      return res.status(isCoverageError ? 400 : 500).json({
        success: false,
        error: finalState.error,
        ticker
      });
    }

    if (!finalState.decision) {
      console.error(`[API /research] Missing decision object for ${ticker}`);
      return res.status(500).json({
        success: false,
        error: 'Analysis finished but failed to generate a final investment recommendation.',
        ticker
      });
    }

    // Step 4: Package the fields the frontend needs.
    const analysis = {
      financials: finalState.financials,
      financialSnapshot: finalState.financialSnapshot,
      news: finalState.news || [],
      newsSentiment: finalState.newsSentiment,
      decision: finalState.decision,
      source: finalState.source || 'live',
      warnings: Array.isArray(finalState.warnings) ? finalState.warnings : []
    };

    researchCache.set(cacheKey, {
      ticker: finalState.ticker,
      companyName: finalState.companyName || cleanQuery,
      analysis
    });

    console.log(`[API /research] Pipeline completed successfully for ${ticker} in ${duration}ms.`);

    return res.status(200).json({
      success: true,
      ticker: finalState.ticker,
      companyName: finalState.companyName || cleanQuery,
      durationMs: duration,
      ...analysis
    });

  } catch (error) {
    console.error('[API /research] Unhandled server error:', error);

    // Last resort: return stale cache rather than a bare 500.
    const cacheKey = String(req.body?.query ?? req.body?.ticker ?? '').trim().toUpperCase();
    const cached = cacheKey ? researchCache.get(cacheKey) : null;
    if (cached) {
      return res.status(200).json({
        success: true,
        cached: true,
        warning: 'Live API requests failed; returning the most recent cached result.',
        ticker: cached.ticker,
        companyName: cached.companyName,
        durationMs: 0,
        ...cached.analysis
      });
    }

    return res.status(500).json({
      success: false,
      error: 'We could not complete the research request right now. Please try again in a few minutes.',
      details: error.message
    });
  }
}

router.post('/research', handleResearchRequest);

export default router;