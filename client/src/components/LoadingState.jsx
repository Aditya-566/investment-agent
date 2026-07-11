import React from 'react';

const STEPS = ['Fetching data', 'Analyzing financials', 'Analyzing sentiment', 'Making decision'];

export function LoadingState({ status }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-400/20 border-t-sky-300" />
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Working</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{status || 'Running research workflow...'}</h3>
          </div>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-3/4 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" />
        </div>

        <div className="mt-6 space-y-3">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-400/10 text-xs font-semibold text-sky-200">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <PlaceholderCard height="h-28" />
        <PlaceholderCard height="h-40" />
        <PlaceholderCard height="h-56" />
      </div>
    </div>
  );
}

function PlaceholderCard({ height }) {
  return <div className={`rounded-3xl border border-white/10 bg-slate-950/50 ${height} animate-pulse`} />;
}

export default LoadingState;
