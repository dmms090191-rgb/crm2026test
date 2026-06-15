import { lazy, useCallback } from 'react';
import type { ImpersonatedVendor } from '../pages/vendor/VendorDashboard';
import type { ImpersonatedClientInfo } from '../pages/client/ClientDashboard';
import type { ImpersonatedAdmin, ImpersonatedCompanySuperAdmin } from '../App';
import type { AdminUser } from '../pages/superadmin/views/SAAdmins';
import type { CompanySuperAdmin } from '../pages/superadmin/views/super-admins/superAdminTypes';
import CompanySuperAdminDashboard from '../pages/company-super-admin/CompanySuperAdminDashboard';
import AppShell from './AppShell';
import { DemoSessionProvider } from '../components/demo/DemoSessionContext';
import { VisualizationProvider, useVisualization } from '../contexts/VisualizationContext';
import type { VisuRole } from '../contexts/VisualizationContext';

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

export default function AppDashboardRouter(props: Props) {
  return (
    <VisualizationProvider>
      <RouterInner {...props} />
    </VisualizationProvider>
  );
}

function RouterInner({
  role, onLogout, saUserId, saDisplayName,
  impersonatedAdmin, impersonatedVendor, impersonatedClient, impersonatedCompanySuperAdmin,
  directCSA,
  setImpersonatedAdmin, setImpersonatedVendor, setImpersonatedClient, setImpersonatedCompanySuperAdmin,
}: Props) {
  const visu = useVisualization();
  const push = visu.pushLevel;
  const pop = visu.popLevel;

  const ensureOrigin = useCallback(() => {
    if (!visu.isActive) push({ role: role as VisuRole, userId: saUserId ?? '', displayName: saDisplayName });
  }, [visu.isActive, push, role, saUserId, saDisplayName]);

  const connectAsAdmin = useCallback((admin: AdminUser) => {
    ensureOrigin();
    setImpersonatedAdmin({ id: admin.id, email: admin.email, first_name: admin.first_name, last_name: admin.last_name, pin: admin.pin, company_id: admin.company_id });
  }, [ensureOrigin, setImpersonatedAdmin]);

  const connectAsCSA = useCallback((csa: CompanySuperAdmin) => {
    ensureOrigin();
    setImpersonatedCompanySuperAdmin({ id: csa.id, email: csa.email, first_name: csa.first_name, last_name: csa.last_name, company: csa.company, company_id: csa.company_id });
  }, [ensureOrigin, setImpersonatedCompanySuperAdmin]);

  const connectAsVendor = useCallback((vendor: { id: string; first_name: string; last_name: string; auth_user_id?: string | null }) => {
    ensureOrigin();
    if (impersonatedAdmin) {
      push({ role: 'admin', userId: impersonatedAdmin.id, displayName: `${impersonatedAdmin.first_name} ${impersonatedAdmin.last_name}`.trim(), companyId: impersonatedAdmin.company_id });
    }
    setImpersonatedVendor({ id: vendor.id, first_name: vendor.first_name, last_name: vendor.last_name, auth_user_id: vendor.auth_user_id });
  }, [ensureOrigin, impersonatedAdmin, push, setImpersonatedVendor]);

  const connectAsClientFromVendor = useCallback((client: ImpersonatedClientInfo) => {
    if (impersonatedVendor) {
      push({ role: 'vendor', userId: impersonatedVendor.id, displayName: `${impersonatedVendor.first_name} ${impersonatedVendor.last_name}`.trim() });
    }
    setImpersonatedClient(client);
  }, [impersonatedVendor, push, setImpersonatedClient]);

  const connectAsClientFromAdmin = useCallback((client: ImpersonatedClientInfo) => {
    ensureOrigin();
    if (impersonatedAdmin) {
      push({ role: 'admin', userId: impersonatedAdmin.id, displayName: `${impersonatedAdmin.first_name} ${impersonatedAdmin.last_name}`.trim(), companyId: impersonatedAdmin.company_id });
    }
    setImpersonatedClient(client);
  }, [ensureOrigin, impersonatedAdmin, push, setImpersonatedClient]);

  const connectAsClientDirect = useCallback((client: ImpersonatedClientInfo) => {
    ensureOrigin();
    setImpersonatedClient(client);
  }, [ensureOrigin, setImpersonatedClient]);

  const backFromAdmin = useCallback(() => { pop(); setImpersonatedAdmin(null); }, [pop, setImpersonatedAdmin]);
  const backFromCSA = useCallback(() => { pop(); setImpersonatedCompanySuperAdmin(null); }, [pop, setImpersonatedCompanySuperAdmin]);
  const backFromVendor = useCallback(() => { pop(); setImpersonatedVendor(null); }, [pop, setImpersonatedVendor]);
  const backFromClient = useCallback(() => { pop(); setImpersonatedClient(null); }, [pop, setImpersonatedClient]);

  const badge = visu.originalBadgeLabel;
  const back = visu.previousLevelLabel;

  if (role === 'company_super_admin' && directCSA) {
    return <CompanySuperAdminDashboard impersonated={directCSA} onBack={onLogout} isImpersonation={false} />;
  }
  if (role === 'super_admin' && impersonatedCompanySuperAdmin) {
    return <CompanySuperAdminDashboard impersonated={impersonatedCompanySuperAdmin} onBack={backFromCSA} isImpersonation visuBadgeLabel={badge} backLabel={back} />;
  }
  if (role === 'super_admin' && impersonatedAdmin && impersonatedVendor && impersonatedClient) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
          <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={backFromClient} backLabel={back || 'Retour vendeur'} isSAViewing visuBadgeLabel={badge} />
        </AppShell>
      </DemoSessionProvider>
    );
  }
  if (role === 'super_admin' && impersonatedAdmin && impersonatedVendor) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="vendor" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
          <VendorDashboard onLogout={onLogout} impersonatedVendor={impersonatedVendor} onBackToAdmin={backFromVendor} onConnectAsClient={connectAsClientFromVendor} isSAViewing visuBadgeLabel={badge} backLabel={back} />
        </AppShell>
      </DemoSessionProvider>
    );
  }
  if (role === 'super_admin' && impersonatedAdmin && impersonatedClient) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
          <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={backFromClient} backLabel={back || 'Retour admin'} isSAViewing visuBadgeLabel={badge} />
        </AppShell>
      </DemoSessionProvider>
    );
  }
  if (role === 'super_admin' && impersonatedAdmin) {
    return (
      <DemoSessionProvider saUserId={saUserId ?? undefined} saDisplayName={saDisplayName}>
        <AppShell panelRole="admin" useCompanyProvider companyId={impersonatedAdmin.company_id}>
          <AdminDashboard onLogout={onLogout} onConnectAsVendor={connectAsVendor} onConnectAsClient={connectAsClientFromAdmin}
            impersonatedAdmin={impersonatedAdmin} onBackToSuperAdmin={backFromAdmin} isSAViewing visuBadgeLabel={badge} backLabel={back} />
        </AppShell>
      </DemoSessionProvider>
    );
  }
  if (role === 'super_admin') {
    return <AppShell panelRole="super_admin"><SuperAdminDashboard onLogout={onLogout} onConnectAsAdmin={connectAsAdmin} onConnectAsCompanySuperAdmin={connectAsCSA} /></AppShell>;
  }
  if (role === 'client') {
    return <AppShell panelRole="client"><ClientDashboard onLogout={onLogout} /></AppShell>;
  }
  if (role === 'vendor' && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={backFromClient} backLabel={back || 'Retour vendeur'} visuBadgeLabel={badge} />
      </AppShell>
    );
  }
  if (role === 'vendor') {
    return <AppShell panelRole="vendor" useCompanyProvider><VendorDashboard onLogout={onLogout} onConnectAsClient={connectAsClientDirect} /></AppShell>;
  }
  if (role === 'admin' && impersonatedVendor && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={backFromClient} backLabel={back || 'Retour vendeur'} visuBadgeLabel={badge} />
      </AppShell>
    );
  }
  if (role === 'admin' && impersonatedClient) {
    return (
      <AppShell panelRole="client" useCompanyProvider effectiveUserId={impersonatedClient.id}>
        <ClientDashboard onLogout={onLogout} impersonatedClient={impersonatedClient} onBackToAdmin={backFromClient} backLabel={back || 'Retour admin'} visuBadgeLabel={badge} />
      </AppShell>
    );
  }
  if (role === 'admin' && impersonatedVendor) {
    return (
      <AppShell panelRole="vendor" useCompanyProvider effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
        <VendorDashboard onLogout={onLogout} impersonatedVendor={impersonatedVendor} onBackToAdmin={backFromVendor} onConnectAsClient={connectAsClientFromVendor} visuBadgeLabel={badge} backLabel={back} />
      </AppShell>
    );
  }
  return (
    <AppShell panelRole="admin" useCompanyProvider>
      <AdminDashboard onLogout={onLogout} onConnectAsVendor={connectAsVendor} onConnectAsClient={connectAsClientDirect} />
    </AppShell>
  );
}
