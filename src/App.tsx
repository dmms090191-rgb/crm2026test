import { useState, useEffect, useCallback, useMemo } from 'react';
import LoginModal from './components/LoginModal';
import type { ImpersonatedVendor } from './pages/vendor/VendorDashboard';
import type { ImpersonatedClientInfo } from './pages/client/ClientDashboard';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLoadingScreen, AppAccessBlocked, AppDomainBlocked } from './app/AppStatusScreens';
import AppLandingPage from './app/AppLandingPage';
import CompanySitePage from './pages/public/CompanySitePage';
import { getLandingTemplateKey } from './lib/companyHomePages';
import { getTemplateComponent } from './pages/superadmin/views/site-builder/templates/templateRegistry';
import { useCustomDomain } from './app/useCustomDomain';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import SessionExpiryWarning from './components/SessionExpiryWarning';
import { SessionTimeoutProvider } from './contexts/SessionTimeoutContext';
import AppDashboardRouter from './app/AppDashboardRouter';

export interface ImpersonatedAdmin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  pin?: string;
  company_id?: string;
}

type UserRole = 'super_admin' | 'admin' | 'vendor' | 'client' | null;

function App() {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [impersonatedVendor, setImpersonatedVendor] = useState<ImpersonatedVendor | null>(null);
  const [impersonatedClient, setImpersonatedClient] = useState<ImpersonatedClientInfo | null>(null);
  const [impersonatedAdmin, setImpersonatedAdmin] = useState<ImpersonatedAdmin | null>(null);
  const { customDomainSlug, customDomainCompanyId, customDomainNotFound, checking: customDomainChecking } = useCustomDomain();
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
      setUserCompanyId((meta?.company_id as string) ?? null);
      if (appRole === 'super_admin') {
        setRole('super_admin'); setSaUserId(session.user.id);
        const um = session.user.user_metadata ?? {};
        setSaDisplayName([um.first_name as string, um.last_name as string].filter(Boolean).join(' ') || 'Support Talvex');
      } else if (appRole === 'vendor') setRole('vendor');
      else if (appRole === 'client') setRole('client');
      else setRole('admin');
    })();
  }

  const detectRole = useCallback(async () => {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const session = refreshed?.session ?? (await supabase.auth.getSession()).data.session;
    if (!session) { setRole(null); setAccessBlocked(false); setDomainBlocked(false); setLoading(false); return; }
    await applySession(session, customDomainCompanyId);
    setLoading(false);
  }, [customDomainCompanyId]);

  useEffect(() => {
    detectRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setRole(null); setAccessBlocked(false); setDomainBlocked(false); }
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

  const handleLogin = () => { setSessionKey(k => k + 1); detectRole(); setIsModalOpen(false); };
  const handleDomainLogin = useCallback(() => { setSessionKey(k => k + 1); detectRole(); }, [detectRole]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null); setUserCompanyId(null);
    setImpersonatedVendor(null); setImpersonatedClient(null); setImpersonatedAdmin(null);
  };

  const sessionTimeout = useSessionTimeout(userCompanyId, !!role, handleLogout);
  const sessionCtxValue = useMemo(() => ({ onTimeoutChanged: sessionTimeout.updateTimeout }), [sessionTimeout.updateTimeout]);

  const expiryWarning = sessionTimeout.showWarning && role ? (
    <SessionExpiryWarning remainingSeconds={sessionTimeout.remainingSeconds} onStay={sessionTimeout.dismissWarning} onLogout={handleLogout} />
  ) : null;

  if (loading || (!role && !landingTemplateLoaded) || customDomainChecking) return <AppLoadingScreen />;
  if (domainBlocked) return <AppDomainBlocked onClear={() => setDomainBlocked(false)} />;
  if (accessBlocked) return <AppAccessBlocked onClear={() => setAccessBlocked(false)} />;

  const siteSlugMatch = window.location.pathname.match(/^\/site\/([^/]+)/);
  if (siteSlugMatch) return <CompanySitePage slug={siteSlugMatch[1]} />;

  if (customDomainSlug && !role) return <CompanySitePage slug={customDomainSlug} domainCompanyId={customDomainCompanyId} onLogin={handleDomainLogin} />;
  if (customDomainNotFound && !role) return <CompanySitePage slug="__domain_not_found__" />;

  if (role) {
    return (
      <SessionTimeoutProvider value={sessionCtxValue}>
        <AppDashboardRouter
          key={sessionKey}
          role={role} onLogout={handleLogout} saUserId={saUserId} saDisplayName={saDisplayName}
          impersonatedAdmin={impersonatedAdmin} impersonatedVendor={impersonatedVendor} impersonatedClient={impersonatedClient}
          setImpersonatedAdmin={setImpersonatedAdmin} setImpersonatedVendor={setImpersonatedVendor} setImpersonatedClient={setImpersonatedClient}
        />
        {expiryWarning}
      </SessionTimeoutProvider>
    );
  }

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
      <AppLandingPage onOpenLogin={() => setIsModalOpen(true)} />
      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLogin={handleLogin} />
    </ThemeProvider>
  );
}

export default App;
