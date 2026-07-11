import { resolveTicker } from '../services/tickerLookup.js';
import { getOverview, getIncomeStatement, getBalanceSheet, getCashFlow, getEarnings } from '../services/alphaVantage.js';
import { getCompanyNews } from '../services/newsApi.js';

function asNumber(value) {
  if (value === null || value === undefined || value === '' || value === 'None') return null;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatCurrencyShort(value) {
  const numberValue = asNumber(value);
  if (numberValue === null) return 'N/A';
  const absValue = Math.abs(numberValue);
  if (absValue >= 1e12) return `$${(numberValue / 1e12).toFixed(2)}T`;
  if (absValue >= 1e9) return `$${(numberValue / 1e9).toFixed(2)}B`;
  if (absValue >= 1e6) return `$${(numberValue / 1e6).toFixed(2)}M`;
  return `$${numberValue.toLocaleString()}`;
}

function latestReport(reports = []) {
  return Array.isArray(reports) && reports.length > 0 ? reports[0] : null;
}

function buildMockResearchData(ticker, companyName = ticker) {
  return {
    source: 'mock',
    ticker,
    companyName,
    overview: {
      Symbol: ticker,
      Name: companyName,
      MarketCapitalization: 'N/A',
      PERatio: 'N/A',
      PEGRatio: 'N/A',
      PriceToBookRatio: 'N/A',
      PriceToSalesRatioTTM: 'N/A',
      ProfitMargin: 'N/A',
      OperatingMarginTTM: 'N/A',
      DividendYield: 'N/A',
      Beta: 'N/A',
      EPS: 'N/A',
      QuarterlyRevenueGrowthYOY: 'N/A',
      QuarterlyEarningsGrowthYOY: 'N/A'
    },
    incomeStatement: { annualReports: [] },
    balanceSheet: { annualReports: [] },
    cashFlow: { annualReports: [] },
    earnings: { annualEarnings: [], quarterlyEarnings: [] },
    news: [],
    warnings: ['Live market data was unavailable, so mock fallback data was used.']
  };
}

async function fetchAlphaVantageBundle(ticker) {
  const [overview, incomeStatement, balanceSheet, cashFlow, earnings] = await Promise.all([
    getOverview(ticker),
    getIncomeStatement(ticker),
    getBalanceSheet(ticker),
    getCashFlow(ticker),
    getEarnings(ticker)
  ]);

  return { overview, incomeStatement, balanceSheet, cashFlow, earnings };
}

export async function fetchResearchData({ ticker, companyName }) {
  const [financialResult, newsResult] = await Promise.allSettled([
    fetchAlphaVantageBundle(ticker),
    getCompanyNews(companyName || ticker, 12)
  ]);

  const warnings = [];

  let financials = financialResult.status === 'fulfilled'
    ? financialResult.value
    : buildMockResearchData(ticker, companyName);

  if (financialResult.status === 'rejected') {
    warnings.push(`Financial data fallback used: ${financialResult.reason?.message || 'request failed'}`);
  }

  let news = newsResult.status === 'fulfilled'
    ? newsResult.value
    : [];

  if (newsResult.status === 'rejected') {
    warnings.push(`News data fallback used: ${newsResult.reason?.message || 'request failed'}`);
  }

  if (!financials || !financials.overview || !financials.overview.Symbol) {
    financials = buildMockResearchData(ticker, companyName);
    warnings.push('Ticker could not be validated from Alpha Vantage, so mock financial data was used.');
  }

  const overview = financials.overview || {};
  const latestIncome = latestReport(financials.incomeStatement?.annualReports);
  const latestBalance = latestReport(financials.balanceSheet?.annualReports);
  const latestCashFlow = latestReport(financials.cashFlow?.annualReports);
  const latestEarnings = latestReport(financials.earnings?.quarterlyEarnings);

  const peRatio = asNumber(overview.PERatio);
  const debtToEquity = latestBalance && latestBalance.totalShareholderEquity
    ? asNumber(latestBalance.totalLiabilities) / Math.max(asNumber(latestBalance.totalShareholderEquity) || 1, 1)
    : null;
  const revenueGrowth = asNumber(overview.QuarterlyRevenueGrowthYOY);
  const freeCashFlow = latestCashFlow
    ? (asNumber(latestCashFlow.operatingCashflow) || 0) - (asNumber(latestCashFlow.capitalExpenditures) || 0)
    : null;

  const financialSnapshot = {
    company: overview.Name || companyName || ticker,
    symbol: overview.Symbol || ticker,
    marketCap: formatCurrencyShort(overview.MarketCapitalization),
    peRatio: peRatio ?? 'N/A',
    revenueGrowthYoY: revenueGrowth ?? 'N/A',
    debtToEquity: debtToEquity === null ? 'N/A' : Number(debtToEquity.toFixed(2)),
    freeCashFlow: freeCashFlow === null ? 'N/A' : formatCurrencyShort(freeCashFlow),
    profitMargin: overview.ProfitMargin ?? 'N/A',
    operatingMargin: overview.OperatingMarginTTM ?? overview.OperatingMarginPercentage ?? 'N/A',
    beta: overview.Beta ?? 'N/A',
    latestRevenue: latestIncome ? asNumber(latestIncome.totalRevenue) : null,
    latestNetIncome: latestIncome ? asNumber(latestIncome.netIncome) : null,
    latestReportedEPS: latestEarnings ? asNumber(latestEarnings.reportedEPS) : null
  };

  const articleText = news.map((article, index) => {
    return `[#${index + 1}] ${article.title || 'Untitled'}\nSource: ${article.source || 'Unknown'}\nPublished: ${article.publishedAt || 'Unknown'}\nDescription: ${article.description || 'No description'}\nContent: ${article.content || 'No content'}`;
  }).join('\n\n');

  return {
    ticker,
    companyName: overview.Name || companyName || ticker,
    source: financials.source || 'live',
    financials,
    financialSnapshot,
    news,
    articleText,
    warnings
  };
}

export {
  resolveTicker,
  getOverview,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getEarnings,
  getCompanyNews,
  buildMockResearchData,
  formatCurrencyShort,
  asNumber
};

export default {
  resolveTicker,
  getOverview,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getEarnings,
  getCompanyNews,
  fetchResearchData,
  buildMockResearchData
};