import React from 'react';
import SearchInput from './SearchInput';

interface ResultsPanelProps {
  children: React.ReactNode;
  totalCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const ResultsPanel = React.forwardRef<HTMLElement, ResultsPanelProps>(({ children, totalCount, searchValue, onSearchChange }, ref) => {
  return (
    <main className="results-panel" ref={ref}>
      <div className="results-header">
        <SearchInput value={searchValue} onChange={onSearchChange} />
        <span className="results-count">Found {totalCount} exoplanets</span>
      </div>
      {children}
    </main>
  );
});

export default ResultsPanel;
