import React, { useState } from 'react';

/**
 * Component to present company financial data, ratios, and historical statement trends.
 */
export function FinancialsTable({ financialData }) {
  const [activeTab, setActiveTab] = useState('ratios');

  if (!financialData) return null;

  const { overview = {}, metrics = {}, history = {} } = financialData;

  // Format helpers
  const formatCurrency = (val) => {
    if (val === undefined || val === null) return 'N/A';
    if (Math.abs(val) >= 1.0e12) return `$${(val / 1.0e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1.0e9) return `$${(val / 1.0e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1.0e6) return `$${(val / 1.0e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const formatPercent = (val) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    // Check if value is already a percentage (like 0.15 representing 15%)
    // AlphaVantage QuarterlyRevenueGrowthYOY is usually like "0.20" -> 20.0%
    return `${(val * 100).toFixed(1)}%`;
  };

  const formatRawPercent = (val) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    return `${val.toFixed(1)}%`;
  };

  const formatRatio = (val) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    return val.toFixed(2);
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Financial Analysis & Ratios</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${activeTab === 'ratios' ? 'btn-primary' : 'badge-neutral'}`}
            style={{ padding: '4px 12px', fontSize: '0.75rem' }}
            onClick={() => setActiveTab('ratios')}
          >
            Key Metrics
          </button>
          <button 
            className={`btn ${activeTab === 'trends' ? 'btn-primary' : 'badge-neutral'}`}
            style={{ padding: '4px 12px', fontSize: '0.75rem' }}
            onClick={() => setActiveTab('trends')}
          >
            Annual Trends
          </button>
        </div>
      </div>

      {activeTab === 'ratios' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Column 1: Valuation */}
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Valuation & Yield
            </h4>
            <table className="table-clean" style={{ fontSize: '0.825rem' }}>
              <tbody>
                <tr>
                  <td>Market Capitalization</td>
                  <td className="text-right font-medium">{formatCurrency(overview.marketCap)}</td>
                </tr>
                <tr>
                  <td>P/E Ratio</td>
                  <td className="text-right font-medium">{formatRatio(overview.peRatio)}</td>
                </tr>
                <tr>
                  <td>PEG Ratio</td>
                  <td className="text-right font-medium">{formatRatio(overview.pegRatio)}</td>
                </tr>
                <tr>
                  <td>Price to Sales (TTM)</td>
                  <td className="text-right font-medium">{formatRatio(overview.psRatio)}</td>
                </tr>
                <tr>
                  <td>Price to Book</td>
                  <td className="text-right font-medium">{formatRatio(overview.pbRatio)}</td>
                </tr>
                <tr>
                  <td>Dividend Yield</td>
                  <td className="text-right font-medium">{formatRawPercent(overview.dividendYield * 100)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Column 2: Health & Growth */}
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Financial Health & Growth
            </h4>
            <table className="table-clean" style={{ fontSize: '0.825rem' }}>
              <tbody>
                <tr>
                  <td>Debt to Equity</td>
                  <td className="text-right font-medium">{formatRatio(metrics.debtToEquity)}</td>
                </tr>
                <tr>
                  <td>Current Ratio</td>
                  <td className="text-right font-medium">{formatRatio(metrics.currentRatio)}</td>
                </tr>
                <tr>
                  <td>Free Cash Flow</td>
                  <td className="text-right font-medium">{formatCurrency(metrics.freeCashFlow)}</td>
                </tr>
                <tr>
                  <td>Revenue Growth (YoY)</td>
                  <td className={`text-right font-medium ${metrics.revenueGrowthYoY >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatPercent(metrics.revenueGrowthYoY)}
                  </td>
                </tr>
                <tr>
                  <td>Earnings Growth (YoY)</td>
                  <td className={`text-right font-medium ${metrics.earningsGrowthYoY >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatPercent(metrics.earningsGrowthYoY)}
                  </td>
                </tr>
                <tr>
                  <td>Profit Margin (Net)</td>
                  <td className="text-right font-medium">{formatRawPercent(overview.profitMargin * 100)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Fiscal Year Ending</th>
                <th className="text-right">Total Revenue</th>
                <th className="text-right">Operating Income</th>
                <th className="text-right">Net Income</th>
                <th className="text-right">Free Cash Flow</th>
              </tr>
            </thead>
            <tbody>
              {/* Combine incomeStatement and cashFlow histories based on index */}
              {history.incomeStatement && history.incomeStatement.map((isReport, idx) => {
                const cfReport = history.cashFlow ? history.cashFlow[idx] : null;
                return (
                  <tr key={isReport.fiscalDateEnding || idx}>
                    <td className="font-semibold">{isReport.fiscalDateEnding}</td>
                    <td className="text-right font-medium">{formatCurrency(isReport.totalRevenue)}</td>
                    <td className="text-right font-medium">{formatCurrency(isReport.operatingIncome)}</td>
                    <td className="text-right font-medium">{formatCurrency(isReport.netIncome)}</td>
                    <td className="text-right font-medium">
                      {cfReport ? formatCurrency(cfReport.freeCashFlow) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
              {(!history.incomeStatement || history.incomeStatement.length === 0) && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No annual history reports available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FinancialsTable;
