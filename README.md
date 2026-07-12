# AI Investment Research Agent

> **Live demo:** [https://investment-agent-flax.vercel.app/](https://investment-agent-flax.vercel.app/)

Enter a company name or stock ticker. The agent fetches financial data and recent news, then returns a clear **Invest** or **Pass** verdict with reasoning.

---

## How it works

1. You type a company name (e.g. "Apple") or ticker (e.g. "AAPL")
2. The server resolves it to a ticker symbol via Alpha Vantage
3. A 3-step AI pipeline runs:
   - **Fetch** — pulls financial statements + news articles
   - **Sentiment** — scores the news Bullish / Bearish / Neutral
   - **Decision** — synthesizes everything into an Invest or Pass verdict
4. Results appear in the dashboard

## Stack

- **Frontend** — React + Vite + Tailwind
- **Backend** — Node.js + Express
- **AI** — LangGraph pipeline · Groq (llama-3.3-70b)
- **Data** — Alpha Vantage (financials) · NewsAPI (news)

## Running locally

```bash
# Backend (port 3001)
cd server
cp .env.example .env   # fill in your API keys
npm run dev

# Frontend (port 5173)
cd client
npm run dev
```

## API Keys needed

| Key | Where to get |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `ALPHA_VANTAGE_API_KEY` | [alphavantage.co](https://www.alphavantage.co/support/#api-key) |
| `NEWS_API_KEY` | [newsapi.org](https://newsapi.org) |

## Known limitations

- **US stocks only** — Alpha Vantage fundamentals (OVERVIEW, income statement, etc.) only cover NYSE and NASDAQ. Non-US tickers (BSE, NSE, LSE, etc.) will return a clear error rather than a bad verdict.
- **25 requests/day** — Alpha Vantage free tier allows 25 API calls per day (~5 full research runs). The app will tell you when the limit is hit.