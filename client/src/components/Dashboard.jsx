import React from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Format a raw number into a short currency string (e.g. $1.23B).
function formatCurrency(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'string') return value;
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

// Normalise sentiment label to 'bullish' | 'bearish' | 'neutral' for CSS classes.
function sentimentClass(label) {
  const l = String(label || '').toLowerCase();
  if (l.includes('bull')) return 'bullish';
  if (l.includes('bear')) return 'bearish';
  return 'neutral';
}

// ─── Empty state shown before the first search ─────────────────────────────────

function EmptyState() {
  return (
    <div className="empty-state">
      <p className="empty-state-title">No company loaded yet.</p>
      <p className="empty-state-sub">
        Enter a ticker symbol or company name above. The pipeline will fetch financial
        statements, scan recent news, and return a structured Invest or Pass verdict.
      </p>
    </div>
  );
}

// ─── Main Dashboard component ──────────────────────────────────────────────────

export function Dashboard({ result }) {
  if (!result) return <EmptyState />;

  const snap        = result.financialSnapshot || {};
  const news        = Array.isArray(result.news) ? result.news : [];
  const sentiment   = result.newsSentiment || {};
  const decision    = result.decision || {};
  const warnings    = result.warnings || [];

  const confidence  = Number(decision.confidence ?? 0);
  const isInvest    = String(decision.decision || '').toLowerCase() === 'invest';
  const verdictWord = isInvest ? 'invest' : 'pass';
  const keyFactors  = Array.isArray(decision.keyFactors) ? decision.keyFactors : [];
  const keyThemes   = Array.isArray(sentiment.keyThemes) ? sentiment.keyThemes : [];
  const articleSentiments = Array.isArray(sentiment.articleSentiments) ? sentiment.articleSentiments : [];

  // ─── Verdict banner ──────────────────────────────────────────────────────────
  return (
    <div>
      <div className={`verdict-banner ${verdictWord}`}>
        <div>
          <p className="verdict-company">
            {snap.company || snap.symbol || 'Company'} &nbsp;·&nbsp; {snap.symbol || '—'}
          </p>
          <p className="verdict-ticker">{snap.symbol || '—'}</p>
          <p className={`verdict-word ${verdictWord}`}>{verdictWord.toUpperCase()}</p>
          {decision.reasoning && (
            <p className="verdict-reasoning">{decision.reasoning}</p>
          )}
          {keyFactors.length > 0 && (
            <div className="factors-list">
              {keyFactors.slice(0, 6).map((f, i) => (
                <span key={i} className="factor-tag">{f}</span>
              ))}
            </div>
          )}
        </div>

        <div className="verdict-confidence-block">
          <span className="confidence-label">Confidence</span>
          <span className={`confidence-number ${verdictWord}`}>
            {confidence}<span className="confidence-pct">%</span>
          </span>
        </div>
      </div>

      {/* ─── 2-column grid below the banner ─────────────────────────────────── */}
      <div className="dashboard-grid">

        {/* ── Left: Financial snapshot ─────────────────────────────────────── */}
        <div>
          <div className="panel">
            <p className="panel-label">Financial snapshot · {snap.symbol || '—'}</p>
            <table className="fin-table">
              <tbody>
                <tr>
                  <td>Revenue</td>
                  <td>{formatCurrency(snap.latestRevenue)}</td>
                </tr>
                <tr>
                  <td>Market Cap</td>
                  <td>{snap.marketCap ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>P/E Ratio</td>
                  <td>{snap.peRatio ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>Revenue Growth YoY</td>
                  <td>{snap.revenueGrowthYoY ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>Profit Margin</td>
                  <td>{snap.profitMargin ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>Operating Margin</td>
                  <td>{snap.operatingMargin ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>Free Cash Flow</td>
                  <td>{snap.freeCashFlow ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>Debt / Equity</td>
                  <td>{snap.debtToEquity ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>EPS (latest reported)</td>
                  <td>{snap.latestReportedEPS ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>Beta</td>
                  <td>{snap.beta ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td>Source</td>
                  <td>{result.source || 'live'}</td>
                </tr>
              </tbody>
            </table>

            {warnings.length > 0 && (
              <div className="warning-stripe">{warnings[0]}</div>
            )}
          </div>
        </div>

        {/* ── Right: Sentiment + News feed ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Sentiment summary */}
          <div className="panel">
            <p className="panel-label">News sentiment</p>
            <div className="sentiment-score-row">
              <span className="sentiment-number">{sentiment.overallScore ?? '—'}</span>
              <span className={`sentiment-label ${sentimentClass(sentiment.overallLabel)}`}>
                {sentiment.overallLabel || 'Neutral'}
              </span>
            </div>
            {sentiment.summary && (
              <p className="sentiment-summary">{sentiment.summary}</p>
            )}
            {keyThemes.length > 0 && (
              <div className="themes-list">
                {keyThemes.slice(0, 5).map((t, i) => (
                  <span key={i} className="theme-tag">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* News feed */}
          <div className="panel">
            <p className="panel-label">Recent articles</p>
            {news.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                No recent articles were returned for this company.
              </p>
            ) : (
              <div className="news-list">
                {news.map((item, i) => {
                  const artSentiment = articleSentiments[i]?.label || sentiment.overallLabel || 'Neutral';
                  const sc = sentimentClass(artSentiment);
                  return (
                    <div key={i} className="news-item">
                      <div className="news-item-meta">
                        <span className="news-source">{item.source || 'Unknown'}</span>
                        <span className={`news-sentiment-dot ${sc}`}>{artSentiment}</span>
                      </div>
                      <p className="news-title">{item.title}</p>
                      {item.description && (
                        <p className="news-desc">{item.description}</p>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="news-link"
                        >
                          Read →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
