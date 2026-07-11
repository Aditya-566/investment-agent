import React from 'react';

export function Header() {
  return (
    <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200 ring-1 ring-inset ring-sky-400/20">
              ▲
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">EquityPulse</p>
              <p className="text-xs text-slate-400">AI Investment Research Agent</p>
            </div>
          </div>
        </div>
        <div className="text-right text-xs uppercase tracking-[0.22em] text-slate-500">
          Finance-first research dashboard
        </div>
      </div>
    </header>
  );
}

export default Header;
