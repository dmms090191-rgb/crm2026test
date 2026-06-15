import { lazy } from 'react';
import type { ImpersonatedVendor } from '../pages/vendor/VendorDashboard';
import type { ImpersonatedClientInfo } from '../pages/client/ClientDashboard';
import type { ImpersonatedAdmin, ImpersonatedCompanySuperAdmin } from '../App';
import type { AdminUser } from '../pages/superadmin/views/SAAdmins';
import type { CompanySuperAdmin } from '../pages/superadmin/views/super-admins/superAdminTypes';
import CompanySuperAdminDashboard from '../pages/company-super-admin/CompanySuperAdminDashboard';
import AppShell from './AppShell';
import { DemoSessionProvider } from '../components/demo/DemoSessionContext';

const SuperAdminDashboard = lazy(() => import('../pages/superadmin/SuperAdminDashboard'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const VendorDashboard = lazy(() => import('../pages/vendor/VendorDashboard'));
const ClientDashboard = lazy(() => import('../pages/client/ClientDashboard'));

interface Props {
  role: 'super_admin' | 'company_super_admin' | 'admin' | 'vendor' | 'client';
  onLogout: () => void;
  saUserId: string | null;
  saDisplayName: string;
  impersonatedAdmin: ImpersonatedAdmin | null;
  impersonatedVendor: ImpersonatedVendor | null;
  impersonatedClient: ImpersonatedClientInfo | null;
  impersonatedCompanySuperAdmin: ImpersonatedCompanySuperAdmin | null;
  directCSA: ImpersonatedCompanySuperAdmin | null;
  setImpersonatedAdmin: (v: ImpersonatedAdmin | null) => void;
  setImpersonatedVendor: (v: ImpersonatedVendor | null) => void;
  setImpersonatedClient: (v: ImpersonatedClientInfo | null) => void;
  setImpersonatedCompanySuperAdmin: (v: ImpersonatedCompanySuperAdmin | null) => void;
}

export default function AppDashboardRouter({
  role, onLogout, saUserId, saDisplayName,
  impersonatedAdmin, impersonatedVendor, impersonatedClient, impersonatedCompanySuperAdmin,
  directCSA,
  setImpersonatedAdmin, setImpersonatedVendor, setImpersonatedClient, setImpersonatedCompanySuperAdmin,
}: Props) {
  const connectAsVendor = (vendor: { id: string; first_name: string; last_name: string; auth_user_id?: string | null }) =>
    setImpersonatedVendor({ id: vendor.id, first_name: vendor.first_name, last_name: vendor.last_name, auth_user_id: vendor.auth_user_id });
  const connectAsAdmin = (admin: AdminUser) =>
    setImpersonatedAdmin({ id: admin.id, email: admin.email, first_name: admin.first_name, last_name: admin.last_name, pin: admin.pin, company_id: admin.company_id });
  const connectAsCompanySuperAdmin = (csa: CompanySuperAdmin) =>
    setImpersonatedCompanySuperAdmin({ id: csa.id, email: csa.email, first_name: csa.first_name, last_name: csa.last_name, company: csa.company, company_id: csa.company_id });

  if (role === 'company_super_admin' && directCSA) {
    return (
      <CompanySuperAdminDashboard
        impersonated={directCSA}
        onBack={onLogout}
        isImpersonation={false}
      />
    );
  }
  if (role === 'super_admin' && impersonatedCompanySuperAdmin) {
    return (
      <CompanySuperAdminDashboard
        impersonated={impersonatedCompanySuperAdmin}
        onBack={() => setImpersonatedCompanySuperAdmin(null)}
        isImpersonation={true}
      />
    );
  }
  if (role === 'super_admin' && impersonatedAdmin && impersonatedVendor && impersonatedClient) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
          <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} backLabel="Retour vendeur" isSAViewing />
        </AppShell>
      </DemoSessionProvider>
    );
  }
  if (role === 'super_admin' && impersonatedAdmin && impersonatedVendor) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="vendor" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
          <VendorDashboard onLogout={onLogout} impersonatedVendor={impersonatedVendor} onBackToAdmin={() => setImpersonatedVendor(null)} onConnectAsClient={setImpersonatedClient} isSAViewing />
        </AppShell>
      </DemoSessionProvider>
    );
  }
  if (role === 'super_admin' && impersonatedAdmin && impersonatedClient) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
          <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} isSAViewing />
        </AppShell>
      </DemoSessionProvider>
    );
  }
  if (role === 'super_admin' && impersonatedAdmin) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="admin" useCompanyProvider companyId={impersonatedAdmin.company_id}>
          <AdminDashboard onLogout={onLogout} onConnectAsVendor={connectAsVendor} onConnectAsClient={setImpersonatedClient}
            impersonatedAdmin={impersonatedAdmin} onBackToSuperAdmin={() => setImpersonatedAdmin(null)} isSAViewing />
        </AppShell>
      </DemoSessionProvider>
    );
  }
  if (role === 'super_admin') {
    return (
      <AppShell panelRole="super_admin">
        <SuperAdminDashboard onLogout={onLogout} onConnectAsAdmin={connectAsAdmin} onConnectAsCompanySuperAdmin={connectAsCompanySuperAdmin} />
      </AppShell>
    );
  }
  if (role === 'client') {
    return (
      <AppShell panelRole="client">
        <ClientDashboard onLogout={onLogout} />
      </AppShell>
    );
  }
  if (role === 'vendor' && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} backLabel="Retour vendeur" />
      </AppShell>
    );
  }
  if (role === 'vendor') {
    return (
      <AppShell panelRole="vendor" useCompanyProvider>
        <VendorDashboard onLogout={onLogout} onConnectAsClient={setImpersonatedClient} />
      </AppShell>
    );
  }
  if (role === 'admin' && impersonatedVendor && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} backLabel="Retour vendeur" />
      </AppShell>
    );
  }
  if (role === 'admin' && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={() => setImpersonatedClient(null)} />
      </AppShell>
    );
  }
  if (role === 'admin' && impersonatedVendor) {
    return (
      <AppShell panelRole="vendor" useCompanyProvider effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
        <VendorDashboard onLogout={onLogout} impersonatedVendor={impersonatedVendor} onBackToAdmin={() => setImpersonatedVendor(null)} onConnectAsClient={setImpersonatedClient} />
      </AppShell>
    );
  }
  return (
    <AppShell panelRole="admin" useCompanyProvider>
      <AdminDashboard onLogout={onLogout} onConnectAsVendor={connectAsVendor} onConnectAsClient={setImpersonatedClient} />
    </AppShell>
  );
}
