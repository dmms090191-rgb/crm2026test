import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './lib/pwaPromptCapture';
import './index.css';

// --- Session security: non-persistent sessions ---
// Supabase auth now uses sessionStorage (configured in lib/supabase.ts).
// Clean up any old auth tokens that were stored in localStorage from
// before this change, so they can never cause an auto-login.
try {
  const lsKeys = Object.keys(localStorage);
  for (const key of lsKeys) {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      localStorage.removeItem(key);
    }
  }
} catch { /* storage unavailable */ }

// PWA fresh-launch guard: when a PWA is opened (or reopened after being
// closed), this entry point re-executes. Clear any Supabase session from
// sessionStorage so the user must log in again. During normal SPA usage
// (sidebar nav, tab switches inside the app), this file does NOT re-run,
// so the active session is preserved.
const IS_PWA = window.matchMedia('(display-mode: standalone)').matches
  || (navigator as unknown as Record<string, boolean>).standalone === true;

if (IS_PWA) {
  try {
    const ssKeys = Object.keys(sessionStorage);
    for (const key of ssKeys) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch { /* storage unavailable */ }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
