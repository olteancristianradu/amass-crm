import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './styles/globals.css';

// Initialize Sentry error tracking
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
  });
}

// Apply saved theme before render
const savedTheme = localStorage.getItem('amass-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const savedAccent = localStorage.getItem('amass-accent');
const savedAccentDk = localStorage.getItem('amass-accent-dk');
if (savedAccent) {
  document.documentElement.style.setProperty('--accent', savedAccent);
  document.documentElement.style.setProperty('--accent-lt', savedAccent + '26');
  document.documentElement.style.setProperty('--accent-glow', savedAccent + '66');
}
if (savedAccentDk) {
  document.documentElement.style.setProperty('--accent-dk', savedAccentDk);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register service worker for PWA / offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('SW registered:', registration.scope);
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('SW updated — new content available.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  });
}
