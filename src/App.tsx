import { useState, useEffect, useCallback, lazy } from 'react';
import LoginModal from './components/LoginModal';
import type { ImpersonatedVendor } from './pages/vendor/VendorDashboard';
import type { ImpersonatedClientInfo } from './pages/client/ClientDashboard';
import type { AdminUser } from './pages/superadmin/views/SAAdmins';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLoadingScreen, AppAccessBlocked, AppDomainBlocked } from './app/AppStatusScreens';
import AppLandingPage from './app/AppLandingPage';
import AppShell from './app/AppShell';
import CompanySitePage from './pages/public/CompanySitePage';
import { getLandingTemplateKey } from './lib/companyHomePages';
import { getTemplateComponent } from './pages/superadmin/views/site-builder/templates/templateRegistry';
import { DemoSessionProvider } from './components/demo/DemoSessionContext';
import { useCustomDomain } from './app/useCustomDomain';

export interface ImpersonatedAdmin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  pin?: string;
  company_id?: string;
}

const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const VendorDashboard = lazy(() => import('./pages/vendor/VendorDashboard'));
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));

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

  async function resolveUserCompanyId(userEmail: string, appRole: string, metaCompanyId?: string): Promise<string | null> {
    if (metaCompanyId) return metaCompanyId;
    if (appRole === 'client') {
      const { data } = await supabase
        .from('registrations')
        .select('company_id')
        .eq('email', userEmail)
        .maybeSingle();
      return data?.company_id ?? null;
    }
    return null;
  }

  function applySession(session: { user: { id: string; email?: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> } }, domainCid: string | null) {
    const meta = session.user.app_metadata;
    const appRole = meta?.role as string | undefined;
    if (appRole === 'admin' && meta?.access_enabled === false) {
      setAccessBlocked(true);
      setRole(null);
      setDomainBlocked(false);
      return Promise.resolve();
    }
    setAccessBlocked(false);

    return (async () => {
      if (domainCid && appRole !== 'super_admin') {
        const userCompanyId = await resolveUserCompanyId(session.user.email ?? '', appRole ?? '', meta?.company_id as string | undefined);
        if (userCompanyId !== domainCid) {
          setDomainBlocked(true);
          setRole(null);
          return;
        }
      }
      setDomainBlocked(false);

      if (appRole === 'super_admin') {
        setRole('super_admin');
        setSaUserId(session.user.id);
        const um = session.user.user_metadata ?? {};
        const name = [um.first_name as string, um.last_name as string].filter(Boolean).join(' ');
        setSaDisplayName(name || 'Support Talvex');
      }
      else if (appRole === 'vendor') setRole('vendor');
      else if (appRole === 'client') setRole('client');
      else setRole('admin');
    })();
  }

  const detectRole = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setRole(null);
      setAccessBlocked(false);
      setDomainBlocked(false);
      setLoading(false);
      return;
    }
    await applySession(session, customDomainCompanyId);
    setLoading(false);
  }, [customDomainCompanyId]);

  useEffect(() => {
    detectRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRole(null);
        setAccessBlocked(false);
        setDomainBlocked(false);
      } else {
        applySession(session, customDomainCompanyId);
      }
    });
    return () => subscription.unsubscribe();
  }, [customDomainCompanyId]);

  useEffect(() => {
    getLandingTemplateKey()
      .then(key => { if (key) setLandingTemplateKey(key); })
      .catch(() => {})
      .finally(() => setLandingTemplateLoaded(true));
  }, []);

  const handleLogin = () => { detectRole(); setIsModalOpen(false); };
  const handleDomainLogin = useCallback(() => { detectRole(); }, [detectRole]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setImpersonatedVendor(null);
    setImpersonatedClient(null);
    setImpersonatedAdmin(null);
  };

  if (loading || (!role && !landingTemplateLoaded) || customDomainChecking) return <AppLoadingScreen />;
  if (domainBlocked) return <AppDomainBlocked onClear={() => setDomainBlocked(false)} />;
  if (accessBlocked) return <AppAccessBlocked onClear={() => setAccessBlocked(false)} />;

  // --- Public company site (/site/:slug) ---
  const siteSlugMatch = window.location.pathname.match(/^\/site\/([^/]+)/);
  if (siteSlugMatch) {
    return <CompanySitePage slug={siteSlugMatch[1]} />;
  }

  // --- Custom domain detection ---
  if (customDomainSlug && !role) {
    return <CompanySitePage slug={customDomainSlug} domainCompanyId={customDomainCompanyId} onLogin={handleDomainLogin} />;
  }
  if (customDomainNotFound && !role) {
    return <CompanySitePage slug="__domain_not_found__" />;
  }

  // --- Super Admin branches ---

  if (role === 'super_admin' && impersonatedAdmin && impersonatedVendor && impersonatedClient) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
          <ClientDashboard onLogout={handleLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} backLabel="Retour vendeur" isSAViewing />
        </AppShell>
      </DemoSessionProvider>
    );
  }

  if (role === 'super_admin' && impersonatedAdmin && impersonatedVendor) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="vendor" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
          <VendorDashboard onLogout={handleLogout} impersonatedVendor={impersonatedVendor} onBackToAdmin={() => setImpersonatedVendor(null)} onConnectAsClient={(client) => setImpersonatedClient(client)} isSAViewing />
        </AppShell>
      </DemoSessionProvider>
    );
  }

  if (role === 'super_admin' && impersonatedAdmin && impersonatedClient) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
          <ClientDashboard onLogout={handleLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} isSAViewing />
        </AppShell>
      </DemoSessionProvider>
    );
  }

  if (role === 'super_admin' && impersonatedAdmin) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="admin" useCompanyProvider companyId={impersonatedAdmin.company_id}>
          <AdminDashboard
            onLogout={handleLogout}
            onConnectAsVendor={(vendor) => setImpersonatedVendor({ id: vendor.id, first_name: vendor.first_name, last_name: vendor.last_name, auth_user_id: vendor.auth_user_id })}
            onConnectAsClient={(client) => setImpersonatedClient(client)}
            impersonatedAdmin={impersonatedAdmin}
            onBackToSuperAdmin={() => setImpersonatedAdmin(null)}
            isSAViewing
          />
        </AppShell>
      </DemoSessionProvider>
    );
  }

  if (role === 'super_admin') {
    return (
      <AppShell panelRole="super_admin">
        <SuperAdminDashboard
          onLogout={handleLogout}
          onConnectAsAdmin={(admin: AdminUser) => setImpersonatedAdmin({ id: admin.id, email: admin.email, first_name: admin.first_name, last_name: admin.last_name, pin: admin.pin, company_id: admin.company_id })}
        />
      </AppShell>
    );
  }

  // --- Client branch ---

  if (role === 'client') {
    return (
      <AppShell panelRole="client">
        <ClientDashboard onLogout={handleLogout} />
      </AppShell>
    );
  }

  // --- Vendor branches ---

  if (role === 'vendor' && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={handleLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} backLabel="Retour vendeur" />
      </AppShell>
    );
  }

  if (role === 'vendor') {
    return (
      <AppShell panelRole="vendor" useCompanyProvider>
        <VendorDashboard onLogout={handleLogout} onConnectAsClient={(client) => setImpersonatedClient(client)} />
      </AppShell>
    );
  }

  // --- Admin branches ---

  if (role === 'admin' && impersonatedVendor && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={handleLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} backLabel="Retour vendeur" />
      </AppShell>
    );
  }

  if (role === 'admin' && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={handleLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} />
      </AppShell>
    );
  }

  if (role === 'admin' && impersonatedVendor) {
    return (
      <AppShell panelRole="vendor" useCompanyProvider effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
        <VendorDashboard onLogout={handleLogout} impersonatedVendor={impersonatedVendor} onBackToAdmin={() => setImpersonatedVendor(null)} onConnectAsClient={(client) => setImpersonatedClient(client)} />
      </AppShell>
    );
  }

  if (role === 'admin') {
    return (
      <AppShell panelRole="admin" useCompanyProvider>
        <AdminDashboard
          onLogout={handleLogout}
          onConnectAsVendor={(vendor) => setImpersonatedVendor({ id: vendor.id, first_name: vendor.first_name, last_name: vendor.last_name, auth_user_id: vendor.auth_user_id })}
          onConnectAsClient={(client) => setImpersonatedClient(client)}
        />
      </AppShell>
    );
  }

  // --- Landing page (not logged in) ---

  const LandingTemplate = landingTemplateKey ? getTemplateComponent(landingTemplateKey) : null;

  if (LandingTemplate) {
    return (
      <ThemeProvider panelRole="admin">
        <div className="min-h-screen" style={{ background: '#020617' }}>
          <LandingTemplate />
        </div>
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
