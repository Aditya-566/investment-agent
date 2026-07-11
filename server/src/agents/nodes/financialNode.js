import { getOverview, getIncomeStatement, getBalanceSheet, getCashFlow } from '../../services/alphaVantage.js';

function safeParseFloat(val) {
  if (!val || val === 'None') return 0;
  const cleanVal = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanVal);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * financialNode fetches financial statements and extracts key indicators.
 * @param {Object} state - The current LangGraph state
 * @returns {Promise<Object>} - State updates
 */
export async function financialNode(state) {
  const { ticker } = state;
  console.log(`[FinancialNode] Fetching financials for: ${ticker}`);

  try {
    // Concurrent fetch to speed up execution (throttling is handled internally by alphaVantage.js)
    const [overview, incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      getOverview(ticker),
      getIncomeStatement(ticker),
      getBalanceSheet(ticker),
      getCashFlow(ticker)
    ]);

    if (!overview || !overview.Symbol) {
      throw new Error(`Overview data not returned for symbol ${ticker}. It may be invalid or delisted.`);
    }

    const peRatio = safeParseFloat(overview.PERatio);
    const pegRatio = safeParseFloat(overview.PEGRatio);
    const pbRatio = safeParseFloat(overview.PriceToBookRatio);
    const psRatio = safeParseFloat(overview.PriceToSalesRatioTTM);
    const profitMargin = safeParseFloat(overview.ProfitMargin);
    const operatingMargin = safeParseFloat(overview.OperatingMarginPercentage);
    const dividendYield = safeParseFloat(overview.DividendYield);
    const beta = safeParseFloat(overview.Beta);
    const marketCap = safeParseFloat(overview.MarketCapitalization);
    const eps = safeParseFloat(overview.EPS);

    // Calculate Debt to Equity ratio from latest balance sheet
    let debtToEquity = 0;
    let currentRatio = 0;
    if (balanceSheet && balanceSheet.annualReports && balanceSheet.annualReports.length > 0) {
      const latestBS = balanceSheet.annualReports[0];
      const totalLiabilities = safeParseFloat(latestBS.totalLiabilities);
      const totalShareholderEquity = safeParseFloat(latestBS.totalShareholderEquity);
      const totalCurrentAssets = safeParseFloat(latestBS.totalCurrentAssets);
      const totalCurrentLiabilities = safeParseFloat(latestBS.totalCurrentLiabilities);

      if (totalShareholderEquity !== 0) {
        debtToEquity = totalLiabilities / totalShareholderEquity;
      }
      if (totalCurrentLiabilities !== 0) {
        currentRatio = totalCurrentAssets / totalCurrentLiabilities;
      }
    }

    // Calculate Free Cash Flow from latest cash flow report (Operating Cash Flow - Capital Expenditures)
    let freeCashFlow = 0;
    if (cashFlow && cashFlow.annualReports && cashFlow.annualReports.length > 0) {
      const latestCF = cashFlow.annualReports[0];
      const operatingCF = safeParseFloat(latestCF.operatingCashflow);
      const capEx = safeParseFloat(latestCF.capitalExpenditures);
      freeCashFlow = operatingCF - capEx;
    }

    // Capture recent financial trend summaries
    const recentIncomeStatementSummary = (incomeStatement?.annualReports || []).slice(0, 3).map(rep => ({
      fiscalDateEnding: rep.fiscalDateEnding,
      totalRevenue: safeParseFloat(rep.totalRevenue),
      operatingIncome: safeParseFloat(rep.operatingIncome),
      netIncome: safeParseFloat(rep.netIncome)
    }));

    const recentBalanceSheetSummary = (balanceSheet?.annualReports || []).slice(0, 3).map(rep => ({
      fiscalDateEnding: rep.fiscalDateEnding,
      totalAssets: safeParseFloat(rep.totalAssets),
      totalLiabilities: safeParseFloat(rep.totalLiabilities),
      totalShareholderEquity: safeParseFloat(rep.totalShareholderEquity)
    }));

    const recentCashFlowSummary = (cashFlow?.annualReports || []).slice(0, 3).map(rep => ({
      fiscalDateEnding: rep.fiscalDateEnding,
      operatingCashflow: safeParseFloat(rep.operatingCashflow),
      capitalExpenditures: safeParseFloat(rep.capitalExpenditures),
      freeCashFlow: safeParseFloat(rep.operatingCashflow) - safeParseFloat(rep.capitalExpenditures)
    }));

    const financialsData = {
      overview: {
        symbol: overview.Symbol,
        name: overview.Name,
        description: overview.Description,
        sector: overview.Sector,
        industry: overview.Industry,
        marketCap,
        peRatio,
        pegRatio,
        pbRatio,
        psRatio,
        profitMargin,
        operatingMargin,
        dividendYield,
        beta,
        eps
      },
      metrics: {
        debtToEquity,
        currentRatio,
        freeCashFlow,
        revenueGrowthYoY: safeParseFloat(overview.QuarterlyRevenueGrowthYOY),
        earningsGrowthYoY: safeParseFloat(overview.QuarterlyEarningsGrowthYOY)
      },
      history: {
        incomeStatement: recentIncomeStatementSummary,
        balanceSheet: recentBalanceSheetSummary,
        cashFlow: recentCashFlowSummary
      }
    };

    console.log(`[FinancialNode] Financials loaded successfully for: ${ticker}`);
    return {
      financials: financialsData
    };
  } catch (error) {
    console.error(`[FinancialNode] Error loading financials for: ${ticker}`, error);
    return {
      error: `FinancialNode failed: ${error.message}`
    };
  }
}

export default financialNode;
