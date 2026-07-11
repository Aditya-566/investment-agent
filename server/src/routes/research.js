import express from 'express';
import Cache from '../services/cache.js';
import { resolveTicker } from '../services/tickerLookup.js';
import graph from '../agent/graph.js';

const router = express.Router();
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

    const cacheKey = ticker.toUpperCase();
    if (shouldUseCache) {
      const cachedResearch = researchCache.get(cacheKey);
      if (cachedResearch) {
        console.log(`[API /research] Cache hit for ${cacheKey}`);
        return res.status(200).json({
          success: true,
          cached: true,
          ticker: cachedResearch.ticker,
          companyName: cachedResearch.companyName,
          durationMs: 0,
          analysis: cachedResearch.analysis
        });
      }
    }

    console.log(`[API /research] Query resolved to ticker: "${ticker}". Launching LangGraph pipeline...`);

    const initialState = {
      ticker,
      companyName: cleanQuery,
      financials: null,
      news: null,
      newsSentiment: null,
      analystEstimates: null,
      decision: null,
      error: null
    };

    const finalState = await graph.invoke(initialState);
    const duration = Date.now() - startTime;

    if (finalState.error) {
      console.error(`[API /research] Workflow completed with errors for ${ticker}: ${finalState.error}`);
      return res.status(500).json({
        success: false,
        error: 'The analysis pipeline failed to run to completion.',
        details: finalState.error,
        ticker
      });
    }

    if (!finalState.decision) {
      console.error(`[API /research] Workflow finished but decision object is missing for ${ticker}`);
      return res.status(500).json({
        success: false,
        error: 'Analysis finished but failed to generate a final investment recommendation.',
        ticker
      });
    }

    const analysis = {
      financials: finalState.financials,
      financialSnapshot: finalState.financialSnapshot,
      financialSummary: finalState.financialSummary,
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
      ...analysis,
      analysis
    });
  } catch (error) {
    console.error('[API /research] Unhandled server error:', error);

    const cacheKey = String(req.body?.query ?? req.body?.ticker ?? '').trim().toUpperCase();
    const cachedResearch = cacheKey ? researchCache.get(cacheKey) : null;
    if (cachedResearch) {
      return res.status(200).json({
        success: true,
        cached: true,
        warning: 'Live API requests failed, so the most recent cached result was returned.',
        ticker: cachedResearch.ticker,
        companyName: cachedResearch.companyName,
        durationMs: 0,
        analysis: cachedResearch.analysis
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
router.post('/analyze', handleResearchRequest);

export default router;