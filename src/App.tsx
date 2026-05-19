import { useState, useEffect, lazy } from 'react';
import LoginModal from './components/LoginModal';
import type { ImpersonatedVendor } from './pages/vendor/VendorDashboard';
import type { ImpersonatedClientInfo } from './pages/client/ClientDashboard';
import type { AdminUser } from './pages/superadmin/views/SAAdmins';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLoadingScreen, AppAccessBlocked } from './app/AppStatusScreens';
import AppLandingPage from './app/AppLandingPage';
import AppShell from './app/AppShell';
import CompanySitePage from './pages/public/CompanySitePage';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [impersonatedVendor, setImpersonatedVendor] = useState<ImpersonatedVendor | null>(null);
  const [impersonatedClient, setImpersonatedClient] = useState<ImpersonatedClientInfo | null>(null);
  const [impersonatedAdmin, setImpersonatedAdmin] = useState<ImpersonatedAdmin | null>(null);

  async function detectRole() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setRole(null);
      setAccessBlocked(false);
      setLoading(false);
      return;
    }
    const meta = session.user.app_metadata;
    const appRole = meta?.role;
    if (appRole === 'admin' && meta?.access_enabled === false) {
      setAccessBlocked(true);
      setRole(null);
      setLoading(false);
      return;
    }
    setAccessBlocked(false);
    if (appRole === 'super_admin') setRole('super_admin');
    else if (appRole === 'vendor') setRole('vendor');
    else if (appRole === 'client') setRole('client');
    else setRole('admin');
    setLoading(false);
  }

  useEffect(() => {
    detectRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRole(null);
        setAccessBlocked(false);
      } else {
        const meta = session.user.app_metadata;
        const appRole = meta?.role;
        if (appRole === 'admin' && meta?.access_enabled === false) {
          setAccessBlocked(true);
          setRole(null);
          return;
        }
        setAccessBlocked(false);
        if (appRole === 'super_admin') setRole('super_admin');
        else if (appRole === 'vendor') setRole('vendor');
        else if (appRole === 'client') setRole('client');
        else setRole('admin');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => { detectRole(); setIsModalOpen(false); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setImpersonatedVendor(null);
    setImpersonatedClient(null);
    setImpersonatedAdmin(null);
  };

  if (loading) return <AppLoadingScreen />;
  if (accessBlocked) return <AppAccessBlocked onClear={() => setAccessBlocked(false)} />;

  // --- Public company site (/site/:slug) ---
  const siteSlugMatch = window.location.pathname.match(/^\/site\/([^/]+)/);
  if (siteSlugMatch) {
    return <CompanySitePage slug={siteSlugMatch[1]} />;
  }

  // --- Super Admin branches ---

  if (role === 'super_admin' && impersonatedAdmin && impersonatedVendor && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={handleLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} backLabel="Retour vendeur" />
      </AppShell>
    );
  }

  if (role === 'super_admin' && impersonatedAdmin && impersonatedVendor) {
    return (
      <AppShell panelRole="vendor" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
        <VendorDashboard onLogout={handleLogout} impersonatedVendor={impersonatedVendor} onBackToAdmin={() => setImpersonatedVendor(null)} onConnectAsClient={(client) => setImpersonatedClient(client)} />
      </AppShell>
    );
  }

  if (role === 'super_admin' && impersonatedAdmin && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={handleLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} />
      </AppShell>
    );
  }

  if (role === 'super_admin' && impersonatedAdmin) {
    return (
      <AppShell panelRole="admin" useCompanyProvider companyId={impersonatedAdmin.company_id}>
        <AdminDashboard
          onLogout={handleLogout}
          onConnectAsVendor={(vendor) => setImpersonatedVendor({ id: vendor.id, first_name: vendor.first_name, last_name: vendor.last_name, auth_user_id: vendor.auth_user_id })}
          onConnectAsClient={(client) => setImpersonatedClient(client)}
          impersonatedAdmin={impersonatedAdmin}
          onBackToSuperAdmin={() => setImpersonatedAdmin(null)}
        />
      </AppShell>
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

  return (
    <ThemeProvider panelRole="admin">
      <AppLandingPage onOpenLogin={() => setIsModalOpen(true)} />
      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLogin={handleLogin} />
    </ThemeProvider>
  );
}

export default App;
