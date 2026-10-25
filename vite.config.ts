import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import auditAutoRefreshPlugin from './scripts/auditPlugin';
import structureProjetPlugin from './scripts/structureProjetPlugin';

export default defineConfig({
  plugins: [react(), auditAutoRefreshPlugin(), structureProjetPlugin()],
  server: {
    host: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
