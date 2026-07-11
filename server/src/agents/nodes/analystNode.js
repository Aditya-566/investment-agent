import { getEarnings, getOverview } from '../../services/alphaVantage.js';

function safeParseFloat(val) {
  if (!val || val === 'None') return null;
  const cleanVal = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanVal);
  return isNaN(parsed) ? null : parsed;
}

/**
 * analystNode fetches earnings surprises and analyst targets.
 * @param {Object} state - The current LangGraph state
 * @returns {Promise<Object>} - State updates
 */
export async function analystNode(state) {
  const { ticker } = state;
  console.log(`[AnalystNode] Fetching analyst estimates & earnings surprises for: ${ticker}`);

  try {
    const [earningsData, overview] = await Promise.all([
      getEarnings(ticker),
      getOverview(ticker).catch(err => {
        console.warn(`[AnalystNode] Failed to fetch overview for target price check: ${err.message}`);
        return null;
      })
    ]);

    const analystTargetPrice = overview ? safeParseFloat(overview.AnalystTargetPrice) : null;
    const currentPrice = overview ? safeParseFloat(overview.BookValue) : null; // As a fallback check or reference

    // Process quarterly earnings surprise history
    const quarterlySurprises = (earningsData?.quarterlyEarnings || [])
      .slice(0, 8) // Get the last 8 quarters (2 years)
      .map(q => ({
        fiscalDateEnding: q.fiscalDateEnding,
        reportedDate: q.reportedDate,
        reportedEPS: safeParseFloat(q.reportedEPS),
        estimatedEPS: safeParseFloat(q.estimatedEPS),
        surprise: safeParseFloat(q.surprise),
        surprisePercentage: safeParseFloat(q.surprisePercentage)
      }));

    // Process annual earnings history
    const annualEarnings = (earningsData?.annualEarnings || [])
      .slice(0, 4) // Get last 4 years
      .map(a => ({
        fiscalDateEnding: a.fiscalDateEnding,
        reportedEPS: safeParseFloat(a.reportedEPS)
      }));

    const analystData = {
      targetPrice: analystTargetPrice,
      quarterlySurprises,
      annualEarnings
    };

    console.log(`[AnalystNode] Analyst data loaded for: ${ticker}`);
    return {
      analystEstimates: analystData
    };
  } catch (error) {
    console.error(`[AnalystNode] Error fetching analyst data for ${ticker}:`, error);
    return {
      error: `AnalystNode failed: ${error.message}`
    };
  }
}

export default analystNode;
