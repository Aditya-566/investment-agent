import React from 'react';

// Shows while the pipeline is running (~60-90 seconds).
// A blinking cursor line + the current status message — matches the terminal aesthetic.
function LoadingState({ status }) {
  return (
    <div className="loading-state">
      <p className="loading-cursor">Running pipeline</p>
      {status && <p className="loading-status">→ {status}</p>}
    </div>
  );
}

export default LoadingState;
