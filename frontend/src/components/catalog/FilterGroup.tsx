import React from 'react';

function FilterGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="filter-group">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

export default FilterGroup;
