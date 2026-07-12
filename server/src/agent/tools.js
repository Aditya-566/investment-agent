/**
 * tools.js — Data fetching and normalisation.
 *
 * Single exported function: fetchResearchData({ ticker, companyName })
 *
 * What it does:
 *   1. Fires Alpha Vantage API calls for overview, income statement, balance sheet,
 *      cash flow, and earnings — all in parallel (throttled internally by alphaVantage.js).
 *   2. Fetches news articles from NewsAPI in parallel with step 1.
 *   3. Normalises the raw API responses into a flat `financialSnapshot` object
 *      (the shape the decision prompt expects) and a plain `articleText` string
 *      (one article per numbered block, for the sentiment prompt).
 *   4. Falls back to mock data if Alpha Vantage returns nothing useful, so the
 *      pipeline always has something to reason over.
 *
 * Everything else in this file is a private helper.
 */

import { resolveTicker } from '../utils/tickerResolver.js';
import { getOverview, getIncomeStatement, getBalanceSheet, getCashFlow, getEarnings } from '../services/alphaVantage.js';
import { getCompanyNews } from '../services/newsApi.js';

// Convert Alpha Vantage's string values ("123456789" or "None") to a number or null.
function asNumber(value) {
  if (value === null || value === undefined || value === '' || value === 'None') return null;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

// Format a raw number into a human-readable currency string (e.g. $1.23B).
function formatCurrencyShort(value) {
  const numberValue = asNumber(value);
  if (numberValue === null) return 'N/A';
  const absValue = Math.abs(numberValue);
  if (absValue >= 1e12) return `$${(numberValue / 1e12).toFixed(2)}T`;
  if (absValue >= 1e9) return `$${(numberValue / 1e9).toFixed(2)}B`;
  if (absValue >= 1e6) return `$${(numberValue / 1e6).toFixed(2)}M`;
  return `$${numberValue.toLocaleString()}`;
}

// Return the first (most recent) report from an array, or null if empty.
function latestReport(reports = []) {
  return Array.isArray(reports) && reports.length > 0 ? reports[0] : null;
}

// Minimal mock payload used when live data is completely unavailable.
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
      ProfitMargin: 'N/A',
      OperatingMarginTTM: 'N/A',
      Beta: 'N/A',
      EPS: 'N/A',
      QuarterlyRevenueGrowthYOY: 'N/A'
    },
    incomeStatement: { annualReports: [] },
    balanceSheet: { annualReports: [] },
    cashFlow: { annualReports: [] },
    earnings: { annualEarnings: [], quarterlyEarnings: [] },
    news: [],
    warnings: ['Live market data was unavailable; mock fallback data was used.']
  };
}

// Fire all five Alpha Vantage endpoints at once (throttling is handled inside alphaVantage.js).
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

// Main export: fetch + normalise everything into the shape the graph nodes expect.
export async function fetchResearchData({ ticker, companyName }) {
  const [financialResult, newsResult] = await Promise.allSettled([
    fetchAlphaVantageBundle(ticker),
    getCompanyNews(companyName || ticker, 12)
  ]);

  const warnings = [];

  // AV_NO_DATA means the ticker isn't covered (e.g. BSE/NSE, delisted).
  // AV_RATE_LIMIT means the free 25-req/day cap was hit.
  // Neither of these should silently fall through to mock data — surface them.
  if (financialResult.status === 'rejected') {
    const err = financialResult.reason;
    if (err?.code === 'AV_NO_DATA') {
      throw new Error(
        `Financial data is not available for "${ticker}" on the Alpha Vantage free tier. ` +
        `This tool supports US-listed equities (NYSE/NASDAQ). ` +
        `Non-US exchanges (BSE, NSE, LSE, etc.) are not covered by the OVERVIEW/fundamentals endpoints.`
      );
    }
    if (err?.code === 'AV_RATE_LIMIT') {
      throw new Error(
        `Alpha Vantage daily request limit reached (25 requests/day on the free tier). ` +
        `Please wait until tomorrow or use a paid API key.`
      );
    }
    // Genuine network failure — fall through to mock so the LLM can at least run on news.
    warnings.push(`Financial data unavailable (network error): ${err?.message || 'request failed'}`);
  }

  let financials = financialResult.status === 'fulfilled'
    ? financialResult.value
    : buildMockResearchData(ticker, companyName);

  let news = newsResult.status === 'fulfilled' ? newsResult.value : [];
  if (newsResult.status === 'rejected') {
    warnings.push(`News data unavailable: ${newsResult.reason?.message || 'request failed'}`);
  }

  // Guard: if Alpha Vantage returned something but it has no Symbol, treat it as failed.
  if (!financials?.overview?.Symbol) {
    financials = buildMockResearchData(ticker, companyName);
    warnings.push('Ticker could not be validated from Alpha Vantage; mock financial data was used.');
  }

  const overview = financials.overview || {};
  const latestIncome = latestReport(financials.incomeStatement?.annualReports);
  const latestBalance = latestReport(financials.balanceSheet?.annualReports);
  const latestCashFlow = latestReport(financials.cashFlow?.annualReports);
  const latestEarnings = latestReport(financials.earnings?.quarterlyEarnings);

  const peRatio = asNumber(overview.PERatio);
  const debtToEquity = latestBalance?.totalShareholderEquity
    ? asNumber(latestBalance.totalLiabilities) / Math.max(asNumber(latestBalance.totalShareholderEquity) || 1, 1)
    : null;
  const revenueGrowth = asNumber(overview.QuarterlyRevenueGrowthYOY);
  const freeCashFlow = latestCashFlow
    ? (asNumber(latestCashFlow.operatingCashflow) || 0) - (asNumber(latestCashFlow.capitalExpenditures) || 0)
    : null;

  // Flat object of key metrics — this is what the decision prompt receives.
  const financialSnapshot = {
    company: overview.Name || companyName || ticker,
    symbol: overview.Symbol || ticker,
    marketCap: formatCurrencyShort(overview.MarketCapitalization),
    peRatio: peRatio ?? 'N/A',
    revenueGrowthYoY: revenueGrowth ?? 'N/A',
    debtToEquity: debtToEquity === null ? 'N/A' : Number(debtToEquity.toFixed(2)),
    freeCashFlow: freeCashFlow === null ? 'N/A' : formatCurrencyShort(freeCashFlow),
    profitMargin: overview.ProfitMargin ?? 'N/A',
    operatingMargin: overview.OperatingMarginTTM ?? 'N/A',
    beta: overview.Beta ?? 'N/A',
    latestRevenue: latestIncome ? asNumber(latestIncome.totalRevenue) : null,
    latestNetIncome: latestIncome ? asNumber(latestIncome.netIncome) : null,
    latestReportedEPS: latestEarnings ? asNumber(latestEarnings.reportedEPS) : null
  };

  // Plain text blob fed into the sentiment prompt — one numbered block per article.
  const articleText = news.map((article, index) =>
    `[#${index + 1}] ${article.title || 'Untitled'}\nSource: ${article.source || 'Unknown'}\nPublished: ${article.publishedAt || 'Unknown'}\nDescription: ${article.description || 'No description'}\nContent: ${article.content || 'No content'}`
  ).join('\n\n');

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

export { resolveTicker };