import React from 'react';

function formatCurrency(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'string') return value;
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function confidenceColor(confidence) {
  if (confidence >= 70) return 'text-emerald-300';
  if (confidence >= 50) return 'text-amber-300';
  return 'text-rose-300';
}

function confidenceStroke(confidence) {
  return 283 - (283 * confidence) / 100;
}

function SentimentBadge({ label }) {
  const normalized = String(label || 'Neutral').toLowerCase();
  const classes = normalized.includes('bull')
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
    : normalized.includes('bear')
      ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
      : 'border-slate-400/20 bg-slate-400/10 text-slate-200';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>{label || 'Neutral'}</span>;
}

export function Dashboard({ result }) {
  if (!result) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-8">
          <h2 className="text-xl font-semibold text-white">No research loaded yet</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Search for a public company to generate a structured investment thesis with financials, sentiment, and a final Invest or Pass decision.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-8 text-sm text-slate-300">
          The dashboard will populate with cards, tables, and a confidence meter after the first query.
        </div>
      </div>
    );
  }

  const financials = result.financials || {};
  const financialSnapshot = result.financialSnapshot || {};
  const news = Array.isArray(result.news) ? result.news : [];
  const newsSentiment = result.newsSentiment || {};
  const decision = result.decision || {};
  const confidence = Number(decision.confidence || 0);
  const isInvest = String(decision.decision || '').toLowerCase() === 'invest';

  const labels = decision.keyFactors || [];
  const warnings = result.warnings || [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Decision</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{isInvest ? 'Invest' : 'Pass'}</h2>
                <p className="mt-2 text-sm text-slate-300">{decision.reasoning || 'No reasoning available.'}</p>
              </div>
              <div className="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                  <circle cx="50" cy="50" r="45" className="fill-none stroke-slate-800" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className={`fill-none ${confidenceColor(confidence)}`}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset={confidenceStroke(confidence)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-semibold ${confidenceColor(confidence)}`}>{confidence}%</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Confidence</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {labels.slice(0, 4).map((item, index) => (
                <span key={index} className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Financial summary</p>
            <div className="mt-4 grid gap-3">
              <Metric label="Revenue" value={formatCurrency(financialSnapshot.latestRevenue)} />
              <Metric label="P/E" value={financialSnapshot.peRatio ?? 'N/A'} />
              <Metric label="Market Cap" value={financialSnapshot.marketCap ?? 'N/A'} />
              <Metric label="Debt / Equity" value={financialSnapshot.debtToEquity ?? 'N/A'} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Financial analysis</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Key metrics and trend snapshot</h3>
            </div>
            <div className="text-right text-sm text-slate-300">
              <div>{financialSnapshot.symbol || financials?.overview?.symbol || 'N/A'}</div>
              <div className="text-slate-500">{financialSnapshot.company || financials?.overview?.name || ''}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue Growth YoY" value={financialSnapshot.revenueGrowthYoY ?? 'N/A'} tone="text-sky-200" />
            <StatCard label="Profit Margin" value={financialSnapshot.profitMargin ?? 'N/A'} tone="text-emerald-200" />
            <StatCard label="Operating Margin" value={financialSnapshot.operatingMargin ?? 'N/A'} tone="text-sky-200" />
            <StatCard label="Free Cash Flow" value={financialSnapshot.freeCashFlow ?? 'N/A'} tone="text-amber-200" />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <tbody className="divide-y divide-white/10 text-slate-200">
                <Row label="Latest EPS" value={financialSnapshot.latestReportedEPS ?? 'N/A'} />
                <Row label="Beta" value={financialSnapshot.beta ?? 'N/A'} />
                <Row label="Source" value={result.source || 'live'} />
              </tbody>
            </table>
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              {warnings[0]}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Decision factors</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(decision.keyFactors || []).slice(0, 8).map((factor, index) => (
              <span key={index} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
                {factor}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">News sentiment</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{newsSentiment.overallLabel || 'Neutral'}</h3>
            </div>
            <SentimentBadge label={newsSentiment.overallLabel || 'Neutral'} />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            {newsSentiment.summary || 'No sentiment summary available.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(newsSentiment.keyThemes || []).slice(0, 5).map((theme, index) => (
              <span key={index} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {theme}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">News feed</p>
          <div className="mt-4 space-y-3">
            {news.length > 0 ? news.map((item, index) => {
              const sentiment = newsSentiment.articleSentiments?.[index]?.label || newsSentiment.overallLabel || 'Neutral';
              return (
                <article key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-white">{item.title}</h4>
                      <p className="mt-1 text-xs text-slate-400">{item.source || 'Unknown source'}</p>
                    </div>
                    <SentimentBadge label={sentiment} />
                  </div>
                  {item.description && <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>}
                  <a href={item.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-sky-300 transition hover:text-sky-200">
                    Read article
                  </a>
                </article>
              );
            }) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                No recent news articles were returned.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td className="px-4 py-3 text-slate-400">{label}</td>
      <td className="px-4 py-3 text-right font-medium text-white">{value}</td>
    </tr>
  );
}

export default Dashboard;
