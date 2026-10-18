import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { isNativeAndroid } from './utils/apiConfig.js';

if (isNativeAndroid() && typeof document !== 'undefined') {
  document.documentElement.classList.add('u2u-native');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register privacy-first service worker for PWA support in production
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Graceful fallback if SW registration is restricted
    });
  });
}
