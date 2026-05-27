import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import auditAutoRefreshPlugin from './scripts/auditPlugin';

export default defineConfig({
  plugins: [react(), auditAutoRefreshPlugin()],
  server: {
    host: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
