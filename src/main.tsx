import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import SitePreviewEntry, { prepareSitePreviewRealm } from './pages/public/SitePreviewEntry';
import TelechargerPage from './pages/public/TelechargerPage';
import './lib/pwaPromptCapture';
import { estMobile, estApplicationInstallee } from './lib/runtime';
import './index.css';
import './talixy/talixy.css';
import './talixy/talixyUI.css';

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
/*
 * « AFFICHAGE AUTONOME », PAS « PWA ». Le runtime mobile en est soustrait : sans cela, la
 * purge des jetons ci-dessous s'executerait a CHAQUE lancement de l'application Android,
 * et l'utilisateur devrait se reconnecter a chaque fois. C'est le defaut le plus grave
 * que l'audit du 25/10/2026 ait trouve, et il ne se voit pas a la relecture.
 */
const IS_PWA = !estMobile()
  && (window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as Record<string, boolean>).standalone === true);

// Apercu interne du module Site (iframe). Monte a la place de App : aucune detection de role ;
// connexion, inscription et ecritures neutralisees dans l'iframe (sitePreviewGuard.ts).
const IS_SITE_PREVIEW = window.location.pathname === '/site-apercu';
/*
 * LE CENTRE DE TELECHARGEMENT PUBLIC. Monte A LA PLACE de App, comme l'apercu de site
 * juste au-dessus : aucune detection de role, aucune resolution de domaine, aucune fenetre
 * de connexion. La page est donc accessible sans compte, et la connexion y est
 * physiquement inatteignable — la landing n'est ni modifiee ni contournee, on ne passe
 * simplement pas par elle.
 *
 * Les deux ecritures sont acceptees parce que l'adresse circulera par ecrit et par
 * oral : le francais pour les utilisateurs, l'anglais parce que c'est le reflexe.
 */
const IS_TELECHARGER = /^\/(telecharger|download)\/?$/.test(window.location.pathname);
// Une page affichee dans un cadre (iframe) partage la session de l'onglet : elle ne doit jamais l'effacer.
const IS_EMBEDDED = window.self !== window.top;

if (IS_SITE_PREVIEW) prepareSitePreviewRealm();

if (IS_PWA && !IS_SITE_PREVIEW && !IS_EMBEDDED) {
  try {
    const ssKeys = Object.keys(sessionStorage);
    for (const key of ssKeys) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch { /* storage unavailable */ }
}

/*
 * LE SERVICE WORKER EST POUR LE WEB ET LA PWA, PAS POUR LES APPLICATIONS INSTALLEES.
 *
 * Bureau ET mobile en sont ecartes, pour la meme raison de fond : les assets sont
 * embarques dans l'application (talvex.exe, ou l'APK), donc le cache n'apporte rien — et
 * c'est lui qui casse les mises a jour. Precision mesuree pour le mobile : une WebView
 * Capacitor sert bien les requetes de service worker (Capacitor cable un
 * ServiceWorkerClient), si bien que le worker FONCTIONNERAIT et pourrait reproduire la
 * fenetre blanche connue. On ne compte donc pas sur son echec : on ne l'enregistre pas.
 *
 * Mesure du 25/10/2026 : en Tauri, la fenetre s'ouvrait BLANCHE apres chaque nouvelle
 * version. La cause n'est pas le service worker en lui-meme, c'est ce qu'il garde en
 * cache. Il sert un index.html d'une version precedente, lequel cite un chunk de script
 * dont le nom a change au build suivant ; le navigateur demande un fichier qui n'existe
 * plus, aucun module ne s'execute, et #root reste vide. Rien ne le signale : ni erreur
 * visible, ni releve rouge. Le contournement etait de desinscrire le worker a la main
 * avant chaque lancement.
 *
 * Sur le web ce cache a un sens : il fait tenir l'application hors connexion et evite de
 * retelecharger les memes fichiers. Dans l'application installee il n'en a AUCUN — les
 * assets sont embarques dans talvex.exe et servis depuis le binaire. Le cache n'y apporte
 * donc rien, et c'est lui qui casse les mises a jour.
 *
 * CE QUE CETTE GARDE NE FAIT PAS. Un profil DEJA pollue ne peut pas se reparer tout seul :
 * quand le worker a servi un index.html perime, aucun script de l'application ne s'execute,
 * donc la desinscription ci-dessous n'est pas atteinte. Elle protege les lancements a venir
 * et nettoie les profils ou la page charge encore ; une installation deja cassee demande un
 * nettoyage du profil WebView2, une fois.
 */
if (estApplicationInstallee()) {
  // Defensif : un worker installe par une version anterieure doit partir, sinon il
  // reprendrait la main au prochain demarrage. Pas de rechargement ici — si ce code
  // s'execute, la page est deja saine, et un reload automatique risquerait de boucler.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .catch(() => { /* rien a desinscrire */ });
  }
  if ('caches' in window) {
    caches.keys()
      .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
      .catch(() => { /* pas de cache accessible */ });
  }
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {IS_TELECHARGER ? <TelechargerPage /> : IS_SITE_PREVIEW ? <SitePreviewEntry /> : <App />}
    </ErrorBoundary>
  </StrictMode>
);
