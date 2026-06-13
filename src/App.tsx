import { useState, useEffect, useCallback, useMemo } from 'react';
import PwaLoginPage from './components/PwaLoginPage';
import type { ImpersonatedVendor } from './pages/vendor/VendorDashboard';
import type { ImpersonatedClientInfo } from './pages/client/ClientDashboard';
import { supabase } from './lib/supabase';
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

const IS_PWA_STANDALONE = window.matchMedia('(display-mode: standalone)').matches
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
      try { if (cid) localStorage.setItem('crm_company_id', cid); } catch { /* ignore */ }
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
    try { await supabase.auth.signOut(); } catch { /* ignore signout errors */ }
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

  if (loading || customDomainChecking) return <AppLoadingScreen />;
  if (domainBlocked) return <AppDomainBlocked onClear={() => setDomainBlocked(false)} />;
  if (accessBlocked) return <AppAccessBlocked onClear={() => setAccessBlocked(false)} />;
  if (unauthorized) return <AppUnauthorizedPage onClear={() => setUnauthorized(false)} />;

  const siteSlugMatch = window.location.pathname.match(/^\/site\/([^/]+)/);
  if (siteSlugMatch) return <CompanySitePage slug={siteSlugMatch[1]} />;

  if ((customDomainSlug || customDomainPageId) && !role) return <CompanySitePage preloadedPage={customDomainPage} slug={customDomainSlug} pageId={customDomainPageId} domainCompanyId={customDomainCompanyId} onLogin={handleDomainLogin} />;
  if (customDomainNotFound && !role) return <CompanySitePage slug="__domain_not_found__" />;

  if (role === 'company_super_admin' && !directCSA) {
    return <CompanySuperAdminWaitingPage onLogout={handleLogout} />;
  }

  if (role) {
    if ((IS_PWA_STANDALONE || IS_VIRTUAL_PHONE) && !impersonatedAdmin && !impersonatedVendor && !impersonatedClient) {
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

  if (IS_PWA_STANDALONE) {
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
