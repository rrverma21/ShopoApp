// EMERGENCY FIX: Service worker registration has been disabled to resolve routing issues.
// PWA caching will be reintroduced safely in a future update.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App.jsx';
import '@/index.css';

import {
  Chart,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  TimeScale,
  TimeSeriesScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register all required Chart.js components globally
Chart.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  TimeScale,
  TimeSeriesScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Unregister any existing service workers to clear old caches and fix routing
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister().then(success => {
        if (success) console.log('Successfully unregistered old service worker.');
      });
    }
  }).catch((error) => {
    console.error('ServiceWorker unregistration failed: ', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </>
);