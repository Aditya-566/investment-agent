import React from 'react';

// Minimal top strip: shows the tool name and stack info in monospace.
// Not a full nav — this app has one page.
function Header() {
  return (
    <header className="ticker-tape">
      <span className="ticker-tape-label">
        Investment Research Terminal
      </span>
      <span className="ticker-tape-label">
        LLM: <span>Groq · llama-3.3-70b</span>
        &nbsp;·&nbsp;
        Data: <span>Alpha Vantage + NewsAPI</span>
      </span>
    </header>
  );
}

export default Header;
