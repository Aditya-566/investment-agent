import React from 'react';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import Dashboard from './components/Dashboard.jsx';
import LoadingState from './components/LoadingState.jsx';
import { useAnalysis } from './hooks/useAnalysis.js';
import './index.css';

export function App() {
  const {
    loading,
    status,
    error,
    result,
    history,
    runAnalysis,
    clearError,
    deleteHistoryItem,
    clearHistory
  } = useAnalysis();

  return (
    <div className="page-shell">
      <Header />

      <main className="page-main">
        {/* Hero + Search */}
        <div className="hero">
          <p className="hero-eyebrow">AI Investment Research Terminal</p>
          <h1 className="hero-title">
            Research any public company.<br />Get a clear verdict.
          </h1>
          <p className="hero-sub">
            Pulls financial data, news sentiment, and analyst context — then returns a structured Invest or Pass decision.
          </p>

          <SearchBar onSearch={runAnalysis} loading={loading} />

          {history.length > 0 && !loading && (
            <div className="recents">
              <span className="recents-label">Recent</span>
              {history.map((item) => (
                <button
                  key={item.ticker}
                  className="recent-chip"
                  onClick={() => runAnalysis(item.ticker)}
                >
                  {item.ticker}
                </button>
              ))}
              <button className="recents-clear" onClick={clearHistory}>
                clear
              </button>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={clearError} aria-label="Dismiss error">✕</button>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <LoadingState status={status} />
        ) : (
          <Dashboard result={result} />
        )}
      </main>
    </div>
  );
}

export default App;
