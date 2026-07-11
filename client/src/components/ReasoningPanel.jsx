import React from 'react';

/**
 * Renders the detailed AI reasoning, highlighting key drivers (positive signals)
 * and risk factors.
 */
export function ReasoningPanel({ decisionData }) {
  if (!decisionData) return null;

  const {
    reasoning = 'No reasoning detailed.',
    keyFactors = [],
    risks = []
  } = decisionData;

  return (
    <div className="card">
      <div className="card-title">
        <span>Research Synthesis & Reasoning</span>
      </div>

      {/* Main Reasoning Paragraph */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Detailed Analysis Summary
        </h4>
        <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {reasoning}
        </p>
      </div>

      {/* Two Column Grid: Drivers vs Risks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Responsive layout for medium screen widths and up */}
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 768px) {
            .reasoning-split {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 24px !important;
            }
          }
        `}} />
        <div className="reasoning-split" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Key Drivers Column */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '18px', borderRadius: 'var(--radius-md)' }}>
            <h4 
              style={{ 
                fontSize: '0.825rem', 
                color: 'var(--success-color)', 
                marginBottom: '14px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Key Drivers & Catalysts
            </h4>
            <ul style={{ listStyle: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {keyFactors.length > 0 ? (
                keyFactors.map((factor, i) => (
                  <li 
                    key={i} 
                    style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-secondary)', 
                      lineHeight: 1.4,
                      position: 'relative',
                      paddingLeft: '14px'
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: 'var(--success-color)' }}>•</span>
                    {factor}
                  </li>
                ))
              ) : (
                <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No drivers identified.</li>
              )}
            </ul>
          </div>

          {/* Risks & Headwinds Column */}
          <div style={{ background: '#fffafb', border: '1px solid #fdebee', padding: '18px', borderRadius: 'var(--radius-md)' }}>
            <h4 
              style={{ 
                fontSize: '0.825rem', 
                color: 'var(--danger-color)', 
                marginBottom: '14px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Risks & Headwinds
            </h4>
            <ul style={{ listStyle: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {risks.length > 0 ? (
                risks.map((risk, i) => (
                  <li 
                    key={i} 
                    style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-secondary)', 
                      lineHeight: 1.4,
                      position: 'relative',
                      paddingLeft: '14px'
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: 'var(--danger-color)' }}>•</span>
                    {risk}
                  </li>
                ))
              ) : (
                <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No notable risks identified.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReasoningPanel;
