import { useState, useEffect, useCallback, useMemo } from 'react';
import PwaLoginPage from './components/PwaLoginPage';
import type { ImpersonatedVendor } from './pages/vendor/VendorDashboard';
import type { ImpersonatedClientInfo } from './pages/client/ClientDashboard';
import { supabase } from './lib/supabase';
import { deconnecterSupabase } from './lib/deconnexion';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLoadingScreen, AppAccessBlocked, AppDomainBlocked } from './app/AppStatusScreens';
import AppUnauthorizedPage from './app/AppUnauthorizedPage';
import CompanySuperAdminWaitingPage from './pages/company-super-admin/CompanySuperAdminWaitingPage';
import CompanySitePage from './pages/public/CompanySitePage';
import { getLandingTemplateKey } from './lib/companyHomePages';
import { getTemplateComponent } from './pages/superadmin/views/site-builder/templates/templateRegistry';
import TalvexOfficialTemplate from './pages/superadmin/views/site-builder/templates/TalvexOfficialTemplate';
import { useCustomDomain } from './app/useCustomDomain';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import SessionExpiryWarning from './components/SessionExpiryWarning';
import { SessionTimeoutProvider } from './contexts/SessionTimeoutContext';
import AppDashboardRouter from './app/AppDashboardRouter';
import AppShell from './app/AppShell';
import PwaMobileShell from './app/PwaMobileShell';
import TalvexDesktopLauncher from './components/TalvexDesktopLauncher';
import { estDesktop, estMobile } from './lib/runtime';

/*
 * QUI RECOIT LA COQUILLE TELEPHONE : la PWA installee, ET l'application native mobile.
 *
 * CE DRAPEAU A PORTE `!estMobile()`, ET C'ETAIT UNE FAUTE. Elle vient du chantier Android :
 * une application Capacitor peut repondre vrai a display-mode: standalone, et il fallait
 * l'empecher d'etre traitee comme une PWA par main.tsx, qui PURGE les jetons de
 * sessionStorage a chaque lancement — ce qui forcerait une reconnexion a chaque ouverture.
 * Cette soustraction est juste LA-BAS, et elle y reste.
 *
 * Elle a ete recopiee ICI, ou le meme signal sert a tout autre chose : choisir le RENDU.
 * Consequence, mesuree le 25/10/2026 : en natif, estMobile() vaut vrai, donc ce drapeau
 * valait TOUJOURS faux, donc ni <PwaMobileShell> ni <PwaLoginPage> n'etaient jamais rendus.
 * Sur un telephone, l'utilisateur connecte recevait le tableau de bord concu pour un ecran
 * de PC, et l'utilisateur deconnecte la landing du site. C'etait deja le comportement de
 * l'APK Android livre.
 *
 * La lecon est la meme que pour le piege d'origine : un signal ne se corrige pas en soi, il
 * se corrige POUR UN USAGE. Les deux fichiers lisent les memes signaux et en veulent des
 * choses opposees.
 *
 * Le bureau, lui, est exclu a l'endroit ou il doit l'etre : par le !estDesktop() de la
 * branche de rendu, et par le launcher qui intercepte avant.
 */
const IS_COQUILLE_TELEPHONE = estMobile()
  || window.matchMedia('(display-mode: standalone)').matches
  || (navigator as unknown as Record<string, boolean>).standalone === true;

const IS_VIRTUAL_PHONE = new URLSearchParams(window.location.search).has('virtualPhone');

export interface ImpersonatedAdmin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  pin?: string;
  company_id?: string;
}

export interface ImpersonatedCompanySuperAdmin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  company_id: string;
}

type UserRole = 'super_admin' | 'company_super_admin' | 'admin' | 'vendor' | 'client' | null;

function App() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [impersonatedVendor, setImpersonatedVendor] = useState<ImpersonatedVendor | null>(null);
  const [impersonatedClient, setImpersonatedClient] = useState<ImpersonatedClientInfo | null>(null);
  const [impersonatedAdmin, setImpersonatedAdmin] = useState<ImpersonatedAdmin | null>(null);
  const [impersonatedCompanySuperAdmin, setImpersonatedCompanySuperAdmin] = useState<ImpersonatedCompanySuperAdmin | null>(null);
  const [directCSA, setDirectCSA] = useState<ImpersonatedCompanySuperAdmin | null>(null);
  const { customDomainPage, customDomainSlug, customDomainPageId, customDomainCompanyId, customDomainNotFound, checking: customDomainChecking } = useCustomDomain();
  const [domainBlocked, setDomainBlocked] = useState(false);
  const [saUserId, setSaUserId] = useState<string | null>(null);
  const [saDisplayName, setSaDisplayName] = useState('Support Talvex');
  const [landingTemplateKey, setLandingTemplateKey] = useState<string | null>(null);
  const [landingTemplateLoaded, setLandingTemplateLoaded] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  async function resolveUserCompanyId(userEmail: string, appRole: string, metaCompanyId?: string): Promise<string | null> {
    if (metaCompanyId) return metaCompanyId;
    if (appRole === 'client') {
      const { data } = await supabase.from('registrations').select('company_id').eq('email', userEmail).maybeSingle();
      return data?.company_id ?? null;
    }
    return null;
  }

  function applySession(session: { user: { id: string; email?: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> } }, domainCid: string | null) {
    const meta = session.user.app_metadata;
    const appRole = meta?.role as string | undefined;
    if (appRole === 'admin' && meta?.access_enabled === false) {
      setAccessBlocked(true); setRole(null); setDomainBlocked(false);
      return Promise.resolve();
    }
    setAccessBlocked(false);
    return (async () => {
      if (domainCid && appRole !== 'super_admin') {
        const uid = await resolveUserCompanyId(session.user.email ?? '', appRole ?? '', meta?.company_id as string | undefined);
        if (uid !== domainCid) { setDomainBlocked(true); setRole(null); return; }
      }
      setDomainBlocked(false);
      const cid = (meta?.company_id as string) ?? null;
      setUserCompanyId(cid);
      /* On EFFACE quand il n'y a pas de Societe, au lieu de laisser l'ancienne valeur.
         Sans ce `else`, un utilisateur sans Societe heriterait de celle du compte
         precedent — et src/lib/vueArriveeAdmin.ts, qui lit cette cle pour decider la vue
         d'arrivee avant le premier rendu, l'enverrait sur CRM Immo sans aucune raison.
         Cette cle n'a qu'un lecteur et qu'un ecrivain, donc l'effacer ne touche rien
         d'autre. */
      try {
        if (cid) localStorage.setItem('crm_company_id', cid);
        else localStorage.removeItem('crm_company_id');
      } catch { /* ignore */ }
      if (appRole === 'super_admin') {
        setRole('super_admin'); setSaUserId(session.user.id);
        const um = session.user.user_metadata ?? {};
        setSaDisplayName([um.first_name as string, um.last_name as string].filter(Boolean).join(' ') || 'Support Talvex');
      } else if (appRole === 'company_super_admin') {
        setRole('company_super_admin');
        if (cid) {
          const um = session.user.user_metadata ?? {};
          const { data: comp } = await supabase.from('companies').select('name').eq('id', cid).maybeSingle();
          setDirectCSA({
            id: session.user.id,
            email: session.user.email ?? '',
            first_name: (um.first_name as string) || '',
            last_name: (um.last_name as string) || '',
            company: comp?.name ?? '',
            company_id: cid,
          });
        }
      }
      else if (appRole === 'admin') setRole('admin');
      else if (appRole === 'vendor') setRole('vendor');
      else if (appRole === 'client') setRole('client');
      else { setUnauthorized(true); setRole(null); }
    })();
  }

  const detectRole = useCallback(async () => {
    try {
      const { data: refreshed } = await supabase.auth.refreshSession();
      const session = refreshed?.session ?? (await supabase.auth.getSession()).data.session;
      if (!session) { setRole(null); setAccessBlocked(false); setDomainBlocked(false); setUnauthorized(false); setLoading(false); return; }
      await applySession(session, customDomainCompanyId);
    } catch {
      setRole(null); setAccessBlocked(false); setDomainBlocked(false); setUnauthorized(false);
    }
    setLoading(false);
  }, [customDomainCompanyId]);

  useEffect(() => {
    detectRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setRole(null); setAccessBlocked(false); setDomainBlocked(false); setUnauthorized(false); }
      else { applySession(session, null); }
    });
    return () => subscription.unsubscribe();
  }, [customDomainCompanyId]);

  useEffect(() => {
    getLandingTemplateKey()
      .then(key => { if (key) setLandingTemplateKey(key); })
      .catch(() => {})
      .finally(() => setLandingTemplateLoaded(true));
  }, []);

  const handleLogin = () => { setSessionKey(k => k + 1); detectRole(); };
  const handleDomainLogin = useCallback(() => { setSessionKey(k => k + 1); detectRole(); }, [detectRole]);

  const handleLogout = async () => {
    if (IS_VIRTUAL_PHONE) {
      window.parent.postMessage({ type: 'talvex-phone-logout' }, '*');
      return;
    }
    // Portee selon le runtime : locale en desktop, pour ne pas fermer la session du
    // telephone. Le try/catch est conserve tel quel : seule la portee change.
    try { await deconnecterSupabase(); } catch { /* ignore signout errors */ }
    try {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch { /* ignore */ }
    setRole(null); setUserCompanyId(null); setLoading(false);
    setAccessBlocked(false); setDomainBlocked(false); setUnauthorized(false); setSaUserId(null);
    setImpersonatedVendor(null); setImpersonatedClient(null); setImpersonatedAdmin(null); setImpersonatedCompanySuperAdmin(null); setDirectCSA(null);
  };

  const sessionTimeout = useSessionTimeout(userCompanyId, !!role, handleLogout);
  const sessionCtxValue = useMemo(() => ({ onTimeoutChanged: sessionTimeout.updateTimeout }), [sessionTimeout.updateTimeout]);

  const expiryWarning = sessionTimeout.showWarning && role ? (
    <SessionExpiryWarning remainingSeconds={sessionTimeout.remainingSeconds} onStay={sessionTimeout.dismissWarning} onLogout={handleLogout} />
  ) : null;

  const siteSlugMatch = window.location.pathname.match(/^\/site\/([^/]+)/);
  if (siteSlugMatch) return <ThemeProvider panelRole="admin"><CompanySitePage slug={siteSlugMatch[1]} /></ThemeProvider>;

  if ((customDomainSlug || customDomainPageId) && !role) return <ThemeProvider panelRole="admin"><CompanySitePage preloadedPage={customDomainPage} slug={customDomainSlug} pageId={customDomainPageId} domainCompanyId={customDomainCompanyId} onLogin={handleDomainLogin} /></ThemeProvider>;
  if (customDomainNotFound && !role) return <ThemeProvider panelRole="admin"><CompanySitePage slug="__domain_not_found__" /></ThemeProvider>;

  if (loading || customDomainChecking) return <AppLoadingScreen />;
  if (domainBlocked) return <AppDomainBlocked onClear={() => setDomainBlocked(false)} />;
  if (accessBlocked) return <AppAccessBlocked onClear={() => setAccessBlocked(false)} />;
  if (unauthorized) return <AppUnauthorizedPage onClear={() => setUnauthorized(false)} />;

  if (role === 'company_super_admin' && !directCSA) {
    return <CompanySuperAdminWaitingPage onLogout={handleLogout} />;
  }

  if (role) {
    // REGLE PRODUIT : si le runtime est desktop, Talvex ne rend JAMAIS la coquille mobile,
    // meme si un parametre virtualPhone apparaissait dans l'URL de la fenetre. Un PC n'est
    // pas un telephone, et la mesure du 25/10/2026 montre que les deux termes ci-dessous
    // valent deja faux en Tauri : ce !estDesktop() ferme le seul chemin qui restait.
    if (!estDesktop() && (IS_COQUILLE_TELEPHONE || IS_VIRTUAL_PHONE) && !impersonatedAdmin && !impersonatedVendor && !impersonatedClient) {
      const panelRole = role === 'super_admin' ? 'super_admin' as const : role === 'company_super_admin' ? 'company_super_admin' as const : role === 'vendor' ? 'vendor' as const : role === 'client' ? 'client' as const : 'admin' as const;
      return (
        <SessionTimeoutProvider value={sessionCtxValue}>
          <AppShell panelRole={panelRole} useCompanyProvider={role !== 'super_admin'}>
            <PwaMobileShell key={sessionKey} role={role} onLogout={handleLogout} />
          </AppShell>
          {expiryWarning}
        </SessionTimeoutProvider>
      );
    }
    return (
      <SessionTimeoutProvider value={sessionCtxValue}>
        <AppDashboardRouter
          key={sessionKey}
          role={role} onLogout={handleLogout} saUserId={saUserId} saDisplayName={saDisplayName}
          impersonatedAdmin={impersonatedAdmin} impersonatedVendor={impersonatedVendor} impersonatedClient={impersonatedClient}
          impersonatedCompanySuperAdmin={impersonatedCompanySuperAdmin}
          directCSA={directCSA}
          setImpersonatedAdmin={setImpersonatedAdmin} setImpersonatedVendor={setImpersonatedVendor} setImpersonatedClient={setImpersonatedClient}
          setImpersonatedCompanySuperAdmin={setImpersonatedCompanySuperAdmin}
        />
        {expiryWarning}
      </SessionTimeoutProvider>
    );
  }

  /* Runtime desktop (Tauri) : portail dedie. Branche volontairement SEPAREE de celle de la
     PWA ci-dessous, bien que les deux rendent le meme composant aujourd'hui — c'est celle-ci
     qui recevra le launcher Talvex, et la PWA ne doit pas suivre. Ne jamais fusionner. */
  if (estDesktop()) {
    // Le launcher de bureau est un composant A PART, pas PwaLoginPage recolore : decision
    // de David du 25/10/2026, pour que la PWA mobile ne derive pas vers le logiciel de
    // bureau par petites touches. Il porte la palette Talixy en propre et n'appelle AUCUN
    // useTheme — c'est pourquoi il n'a pas besoin de ThemeProvider, contrairement a
    // PwaLoginPage qui, lui, LEVE sans fournisseur (via RegisterModal -> useThemeTokens).
    // Un releve interdit qu'un useTheme entre un jour dans sa chaine sans qu'on le voie.
    return <TalvexDesktopLauncher onLogin={handleLogin} />;
  }

  if (IS_COQUILLE_TELEPHONE) {
    return <PwaLoginPage onLogin={handleLogin} />;
  }

  if (!landingTemplateLoaded) return <AppLoadingScreen />;

  const LandingTemplate = landingTemplateKey ? getTemplateComponent(landingTemplateKey) : null;
  if (LandingTemplate) {
    return (
      <ThemeProvider panelRole="admin">
        <div className="min-h-screen" style={{ background: '#020617' }}><LandingTemplate /></div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider panelRole="admin">
      <div className="min-h-screen" style={{ background: '#030712' }}>
        <TalvexOfficialTemplate />
      </div>
    </ThemeProvider>
  );
}

export default App;
