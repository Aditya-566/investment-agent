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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_40%),linear-gradient(180deg,rgba(15,23,42,1),rgba(2,6,23,1))]" />
      <div className="pointer-events-none fixed inset-0 bg-grid-fade bg-[size:42px_42px] opacity-20" />

      <div className="relative">
        <Header />

        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur-xl sm:p-8">
            <div className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="mb-3 inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                  AI Investment Research Agent
                </p>
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Research a public company and get a clear Invest or Pass decision.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Pulls financial data, news, sentiment, and analyst context into a decision-first dashboard built for a solo project demo.
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Backend</span>
                  <span className="rounded-full bg-sky-400/10 px-2 py-1 text-sky-200">/api/research</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>LLM</span>
                  <span className="rounded-full bg-orange-400/10 px-2 py-1 text-orange-200">Groq · llama-3.3-70b</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data</span>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-200">Alpha Vantage + NewsAPI</span>
                </div>
              </div>
            </div>

            <SearchBar onSearch={runAnalysis} loading={loading} />

            {history.length > 0 && !loading && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className="mr-1 text-slate-400">Recent queries:</span>
                {history.map((item) => (
                  <button
                    key={item.ticker}
                    onClick={() => runAnalysis(item.ticker)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-400/10"
                  >
                    {item.ticker}
                  </button>
                ))}
                <button
                  onClick={clearHistory}
                  className="ml-2 text-slate-400 underline decoration-slate-600 underline-offset-4 transition hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                <div className="flex items-start justify-between gap-4">
                  <p>{error}</p>
                  <button onClick={clearError} className="text-rose-100/70 transition hover:text-rose-50">✕</button>
                </div>
              </div>
            )}

            <div className="mt-8">
              {loading ? <LoadingState status={status} /> : <Dashboard result={result} />}
            </div>

            {history.length > 0 && !loading && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={clearHistory}
                  className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200"
                >
                  Clear local history
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
