import React from 'react';

/**
 * Analyst targets and quarterly earnings surprise panel.
 */
export function AnalystPanel({ analystEstimates }) {
  if (!analystEstimates) return null;

  const { targetPrice = null, quarterlySurprises = [], annualEarnings = [] } = analystEstimates;

  const formatPrice = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `$${parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatEPS = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return val.toFixed(2);
  };

  const formatSurprisePercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Analyst Consensus & Earnings</span>
      </div>

      {/* Target Price Section */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Consensus Target Price
          </span>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px' }}>
            {targetPrice ? formatPrice(targetPrice) : 'N/A'}
          </h3>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '60%' }}>
          Average 12-month target price estimate compiled from major Wall Street research desks.
        </div>
      </div>

      {/* Earnings Surprise History */}
      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Quarterly Earnings History
      </h4>

      <div className="table-container">
        <table className="table-clean" style={{ fontSize: '0.825rem' }}>
          <thead>
            <tr>
              <th>Reported Date</th>
              <th className="text-right">Estimated EPS</th>
              <th className="text-right">Reported EPS</th>
              <th className="text-right">Surprise (%)</th>
            </tr>
          </thead>
          <tbody>
            {quarterlySurprises.length > 0 ? (
              quarterlySurprises.map((q, idx) => {
                const surpriseVal = q.surprisePercentage;
                const isPositive = surpriseVal >= 0;
                return (
                  <tr key={q.fiscalDateEnding || idx}>
                    <td className="font-semibold">{q.reportedDate || q.fiscalDateEnding}</td>
                    <td className="text-right">{formatEPS(q.estimatedEPS)}</td>
                    <td className="text-right font-medium">{formatEPS(q.reportedEPS)}</td>
                    <td 
                      className={`text-right font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}
                    >
                      {formatSurprisePercent(surpriseVal)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No recent earnings surprises found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnalystPanel;
