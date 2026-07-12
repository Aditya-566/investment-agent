import React, { useState } from 'react';

function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const q = value.trim();
    if (q) onSearch(q);
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <input
        id="company-search"
        className="search-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="AAPL · Apple · Nike · TSLA"
        disabled={loading}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        id="search-submit"
        className="search-btn"
        type="submit"
        disabled={loading || !value.trim()}
      >
        {loading ? 'Running...' : 'Analyze →'}
      </button>
    </form>
  );
}

export default SearchBar;
