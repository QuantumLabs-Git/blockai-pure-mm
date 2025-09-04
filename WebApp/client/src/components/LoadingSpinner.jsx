import React from 'react';

const LoadingSpinner = ({ fullScreen = false, message = 'Loading...' }) => {
  return (
    <div className={`loading-spinner ${!fullScreen ? 'inline' : ''}`}>
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;