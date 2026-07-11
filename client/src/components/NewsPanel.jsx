import React from 'react';

/**
 * Panel rendering aggregate sentiment overview and a scrollable feed of recent news.
 */
export function NewsPanel({ news = [], sentimentData }) {
  const {
    overallSentiment = 'Neutral',
    sentimentScore = 0.0,
    keyThemes = [],
    summary = 'No summary analysis available.'
  } = sentimentData || {};

  // Class mapping for overall sentiment badge
  const getSentimentBadgeClass = (sentiment) => {
    const s = sentiment.toLowerCase();
    if (s.includes('bullish')) return 'badge-success';
    if (s.includes('bearish')) return 'badge-danger';
    return 'badge-neutral';
  };

  const getScoreColor = (score) => {
    if (score > 0.15) return 'var(--success-color)';
    if (score < -0.15) return 'var(--danger-color)';
    return 'var(--text-secondary)';
  };

  // Helper to format iso date to relative or readable format
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }}>
      <div className="card-title" style={{ borderBottom: 'none', marginBottom: '8px', paddingBottom: 0 }}>
        <span>News Sentiment & Analysis</span>
      </div>

      {/* Aggregate Sentiment Details */}
      <div 
        style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`badge ${getSentimentBadgeClass(overallSentiment)}`}>
              {overallSentiment}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sentiment Score:</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: getScoreColor(sentimentScore) }}>
              {sentimentScore > 0 ? `+${sentimentScore.toFixed(2)}` : sentimentScore.toFixed(2)}
            </span>
          </div>
        </div>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '12px' }}>
          {summary}
        </p>

        {keyThemes.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Key Themes:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {keyThemes.map((theme, i) => (
                <span 
                  key={i} 
                  className="badge" 
                  style={{ backgroundColor: 'var(--bg-primary)', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal' }}
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
        Recent Articles
      </div>

      {/* Scrollable Article list */}
      <div className="news-list">
        {news.length > 0 ? (
          news.map((item, idx) => (
            <a 
              key={idx} 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="news-card"
            >
              <div className="news-header">
                <span className="news-source">{item.source || 'General Finance'}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(item.publishedAt)}</span>
              </div>
              <h5 className="news-title">{item.title}</h5>
              {item.description && (
                <p className="news-summary">
                  {item.description.length > 140 ? `${item.description.slice(0, 140)}...` : item.description}
                </p>
              )}
            </a>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No recent news articles found.
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsPanel;
