import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import HomePage from './HomePage';
import EmptyPage from './EmptyPage';
import UploadPage  from './UploadPage';
import AnalysisPage from './AnalysisPage';

function App() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={<EmptyPage />} />
        <Route path="/empty" element={<HomePage />} />
        <Route path="/model" element={<UploadPage></UploadPage>} />
        <Route path="/analysis" element={<AnalysisPage></AnalysisPage>} />
      </Routes>
    </div>
  );
}

export default App;