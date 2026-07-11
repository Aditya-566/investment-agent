import React, { useState } from 'react';

export function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const examples = ['AAPL', 'MSFT', 'NVDA', 'JPM', 'Apple'];

  const submit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Enter a company name or ticker.');
      return;
    }
    setError('');
    onSearch(trimmed);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-lg shadow-slate-950/30">
      <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="relative">
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 pr-12 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-sky-400/40 focus:ring-4 focus:ring-sky-400/10"
            placeholder="Search company name or ticker"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (error) setError('');
            }}
            disabled={loading}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-sky-400 px-5 py-4 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Analyzing...' : 'Run Research'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <span>Try:</span>
        {examples.map((example) => (
          <button
            key={example}
            onClick={() => {
              setQuery(example);
              setError('');
              onSearch(example);
            }}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-400/10"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SearchBar;
