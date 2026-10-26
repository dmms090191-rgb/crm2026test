import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import auditAutoRefreshPlugin from './scripts/auditPlugin';
import structureProjetPlugin from './scripts/structureProjetPlugin';

/*
 * LA VERSION, GRAVEE DANS LE PAQUET AU MOMENT DU BUILD.
 *
 * Une application INSTALLEE ne sait pas, autrement, quelle version elle est : contrairement
 * au site, elle ne se recharge pas depuis un serveur. Sans ce reperage, elle ne peut pas
 * comparer ce qu'elle est a ce qui est publie, et l'utilisateur n'apprend qu'une mise a jour
 * existe qu'en allant voir la page de telechargement — c'est-a-dire jamais.
 *
 * La source est la meme que partout ailleurs : src-tauri/tauri.conf.json. Android la lit
 * dans build.gradle, iOS par scripts/ios/synchroniserVersion.mjs, le paquet web ici.
 */
const versionProduit = (JSON.parse(
  readFileSync('src-tauri/tauri.conf.json', 'utf8'),
) as { version?: string }).version ?? '0.0.0';

export default defineConfig({
  define: {
    __VERSION_TALVEX__: JSON.stringify(versionProduit),
  },
  plugins: [react(), auditAutoRefreshPlugin(), structureProjetPlugin()],
  server: {
    host: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
