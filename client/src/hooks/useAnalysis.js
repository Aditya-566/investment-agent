import { useState, useEffect } from 'react';
import { analyzeTicker } from '../utils/api.js';

/**
 * Custom hook to manage the investment analysis state, including loading progress,
 * error boundaries, and search history.
 */
export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('research_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load research history:', e);
      }
    }
  }, []);

  const runAnalysis = async (tickerQuery) => {
    if (!tickerQuery || !tickerQuery.trim()) {
      setError('Please enter a valid stock ticker or company name.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('Resolving ticker symbol...');
    
    // Timer array to clean up in case of rapid completion or failure
    const statusTimers = [];

    // Schedule status updates to inform user what the agent is doing
    const queueStatus = (text, delay) => {
      const timer = setTimeout(() => {
        setStatus(text);
      }, delay);
      statusTimers.push(timer);
    };

    queueStatus('Fetching financial statements and metrics from AlphaVantage...', 1200);
    queueStatus('Retrieving recent company news articles...', 3000);
    queueStatus('Analyzing news sentiment using Llama-3 model on Groq...', 4800);
    queueStatus('Fetching earnings history and consensus analyst targets...', 6500);
    queueStatus('Synthesizing research nodes & compiling final recommendation...', 8200);

    try {
      const data = await analyzeTicker(tickerQuery);
      const analysis = data.analysis || data;
      
      // Clear timers
      statusTimers.forEach(clearTimeout);
      
      // Verify structure
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(analysis);

      // Save to search history
      const finalTicker = (analysis.financials?.overview?.symbol || data.ticker || tickerQuery).toUpperCase();
      const companyName = analysis.financials?.overview?.name || data.companyName || 'Unknown Corp';

      setHistory(prevHistory => {
        const filtered = prevHistory.filter(h => h.ticker !== finalTicker);
        const updated = [
          { ticker: finalTicker, name: companyName, timestamp: Date.now() },
          ...filtered
        ].slice(0, 8); // Keep last 8 items
        
        localStorage.setItem('research_history', JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      statusTimers.forEach(clearTimeout);
      setError(err.message || 'An unexpected error occurred during research synthesis.');
      setResult(null);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('research_history');
  };

  const deleteHistoryItem = (tickerToDelete) => {
    setHistory(prevHistory => {
      const updated = prevHistory.filter(h => h.ticker !== tickerToDelete);
      localStorage.setItem('research_history', JSON.stringify(updated));
      return updated;
    });
  };

  return {
    loading,
    status,
    error,
    result,
    history,
    runAnalysis,
    clearError: () => setError(null),
    clearHistory,
    deleteHistoryItem
  };
}

export default useAnalysis;
