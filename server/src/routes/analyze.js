import express from 'express';
import { resolveTicker } from '../utils/tickerResolver.js';
import { graph } from '../agents/workflow.js';

const router = express.Router();

/**
 * POST /api/analyze
 * Body: { query: string } (ticker or company name)
 */
router.post('/analyze', async (req, res, next) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter is required and must be a valid string.'
    });
  }

  const startTime = Date.now();
  const cleanQuery = query.trim();
  console.log(`[API /analyze] Request received for: "${cleanQuery}"`);

  try {
    // 1. Resolve ticker
    let ticker;
    try {
      ticker = await resolveTicker(cleanQuery);
    } catch (resolverError) {
      console.error(`[API /analyze] Ticker resolution failed: ${resolverError.message}`);
      return res.status(400).json({
        success: false,
        error: `Failed to resolve company name or ticker for "${cleanQuery}".`,
        details: resolverError.message
      });
    }

    console.log(`[API /analyze] Query resolved to ticker: "${ticker}". Launching LangGraph pipeline...`);

    // 2. Invoke LangGraph StateGraph workflow
    const initialState = {
      ticker: ticker,
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

    // 3. Check for pipeline error
    if (finalState.error) {
      console.error(`[API /analyze] Workflow completed with errors for ${ticker}: ${finalState.error}`);
      return res.status(500).json({
        success: false,
        error: 'The analysis pipeline failed to run to completion.',
        details: finalState.error,
        ticker
      });
    }

    // Ensure decision is present
    if (!finalState.decision) {
      console.error(`[API /analyze] Workflow finished but decision object is missing for ${ticker}`);
      return res.status(500).json({
        success: false,
        error: 'Analysis finished but failed to generate a final investment recommendation.',
        ticker
      });
    }

    console.log(`[API /analyze] Pipeline completed successfully for ${ticker} in ${duration}ms.`);

    // 4. Return results
    return res.status(200).json({
      success: true,
      ticker: finalState.ticker,
      companyName: finalState.companyName || cleanQuery,
      durationMs: duration,
      analysis: {
        financials: finalState.financials,
        newsSentiment: finalState.newsSentiment,
        analystEstimates: finalState.analystEstimates,
        decision: finalState.decision
      }
    });

  } catch (error) {
    console.error(`[API /analyze] Unhandled server error:`, error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected internal server error occurred.',
      details: error.message
    });
  }
});

export default router;
