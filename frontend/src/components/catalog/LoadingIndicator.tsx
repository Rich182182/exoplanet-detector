import React from 'react';
import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  text?: string;
  show: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ text = 'Scanning the cosmos...', show }) => {
  return (
    <div className={`loading-overlay ${!show ? 'hidden' : ''}`}>
      <div className="orbital-spinner">
        <div className="star"></div>
        <div className="orbit orbit-1">
          <div className="planet planet-1"></div>
        </div>
        <div className="orbit orbit-2">
          <div className="planet planet-2"></div>
        </div>
      </div>
      <div className="loading-text">{text}</div>
    </div>
  );
};

export default LoadingIndicator;
