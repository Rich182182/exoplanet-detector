import React from 'react';

function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="page-container">{children}</div>;
}

export default PageContainer;
