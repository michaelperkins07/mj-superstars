import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Initialize error tracking BEFORE rendering to catch early errors
import errorTracking from './services/errorTracking';
errorTracking.init();

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
