/**
 * Helper for fetching data from the backend API.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Sends a ticker query to the backend to run the AI research agent workflow.
 * @param {string} ticker - The stock ticker or company name.
 * @returns {Promise<Object>} The full research state result.
 */
export async function analyzeTicker(ticker) {
  if (!ticker || typeof ticker !== 'string' || !ticker.trim()) {
    throw new Error('Please enter a valid stock ticker or company name.');
  }

  const response = await fetch(`${BASE_URL}/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: ticker.trim() })
  });

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMessage = errData.error;
      }
    } catch (e) {
      // JSON parsing failed, fallback to status code error
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  // Validate that we received something from the graph
  if (!data) {
    throw new Error('Empty response received from the investment research agent.');
  }
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export default {
  analyzeTicker
};
