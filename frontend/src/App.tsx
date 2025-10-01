import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import HomePage from './HomePage';
import EmptyPage from './EmptyPage';

function App() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={<EmptyPage />} />
        <Route path="/empty" element={<HomePage />} />
      </Routes>
    </div>
  );
}

export default App;