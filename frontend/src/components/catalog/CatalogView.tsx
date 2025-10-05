import React from 'react';

function CatalogView({ children }: { children: React.ReactNode }) {
  return <div className="catalog-view">{children}</div>;
}

export default CatalogView;
