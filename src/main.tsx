import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './lib/pwaPromptCapture';
import './index.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

// Dynamic manifest: if we know the company_id, point the manifest to the
// edge function so the PWA icon matches the one chosen in Application tab.
(function updateManifest() {
  try {
    const companyId = localStorage.getItem('crm_company_id');
    if (companyId) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const link = document.querySelector('link[rel="manifest"]');
      if (link) {
        (link as HTMLLinkElement).href = `${supabaseUrl}/functions/v1/pwa-manifest?company_id=${companyId}`;
      }
    }
  } catch { /* ignore */ }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
