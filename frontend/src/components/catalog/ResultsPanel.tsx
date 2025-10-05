import React from 'react';
import SearchInput from './SearchInput';
import ReactPaginate from 'react-paginate';

interface ResultsPanelProps {
  children: React.ReactNode;
  totalCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  pageCount: number;
  onPageChange: (selectedItem: { selected: number }) => void;
  currentPage: number;
}

const ResultsPanel = React.forwardRef<HTMLElement, ResultsPanelProps>(({ children, totalCount, searchValue, onSearchChange, pageCount, onPageChange, currentPage }, ref) => {
  return (
    <main className="results-panel" ref={ref}>
      <div className="results-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <SearchInput value={searchValue} onChange={onSearchChange} />
          {pageCount > 1 && (
            <ReactPaginate
              breakLabel="..."
              nextLabel=">"
              onPageChange={onPageChange}
              pageRangeDisplayed={1}
              marginPagesDisplayed={1}
              pageCount={pageCount}
              previousLabel="<"
              renderOnZeroPageCount={null}
              containerClassName={'mini-pagination'}
              pageClassName={'page-item'}
              pageLinkClassName={'page-link'}
              previousClassName={'page-item'}
              previousLinkClassName={'page-link'}
              nextClassName={'page-item'}
              nextLinkClassName={'page-link'}
              breakClassName={'page-item'}
              breakLinkClassName={'page-link'}
              activeClassName={'active'}
              forcePage={currentPage}
            />
          )}
        </div>
        <span className="results-count">Found {totalCount} exoplanets</span>
      </div>
      {children}
    </main>
  );
});

export default ResultsPanel;
