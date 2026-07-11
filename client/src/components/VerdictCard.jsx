import React from 'react';

/**
 * Renders the final recommendation card (Invest/Pass decision, confidence rating,
 * time horizon, and valuation summary).
 */
export function VerdictCard({ decisionData, companyInfo }) {
  if (!decisionData) return null;

  const {
    decision = 'pass',
    confidence = 0,
    summary = 'No summary provided.',
    valuationAssessment = 'N/A',
    timeHorizon = 'N/A'
  } = decisionData;

  const { symbol = '', name = '' } = companyInfo || {};

  const isInvest = decision.toLowerCase() === 'invest';

  return (
    <div className="card">
      <div className="verdict-header">
        <div className="verdict-decision">
          <label>Investment Verdict for {symbol}</label>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '4px 0 8px 0' }}>
            {name || symbol}
          </h2>
          <div className={`verdict-badge-large ${isInvest ? 'invest' : 'pass'}`}>
            {isInvest ? 'Invest' : 'Pass'}
          </div>
        </div>

        <div className="confidence-box">
          <label>Agent Confidence</label>
          <div className="confidence-value">{confidence}%</div>
          <div className="confidence-bar-bg">
            <div 
              className={`confidence-bar-fill ${isInvest ? 'invest' : 'pass'}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
        {summary}
      </p>

      <div className="verdict-details-grid">
        <div className="verdict-detail-item">
          <label>Valuation Assessment</label>
          <span className={valuationAssessment.toLowerCase().includes('undervalued') ? 'text-success font-semibold' : 'font-semibold'}>
            {valuationAssessment}
          </span>
        </div>
        <div className="verdict-detail-item">
          <label>Time Horizon</label>
          <span className="font-semibold">{timeHorizon}</span>
        </div>
      </div>
    </div>
  );
}

export default VerdictCard;
