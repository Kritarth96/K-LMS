import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // <--- 1. IMPORT THIS
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. WRAP APP IN BROWSERROUTER */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);