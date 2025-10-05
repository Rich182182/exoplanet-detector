import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import UploadPage from './UploadPage';
import AnalysisPage from './AnalysisPage';
import CatalogPage from './components/catalog/CatalogPage';

function App() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/model" element={<UploadPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Routes>
    </div>
  );
}

export default App;