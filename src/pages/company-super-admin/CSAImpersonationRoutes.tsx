import { lazy, Suspense } from 'react';
import AppShell from '../../app/AppShell';
import { DemoSessionProvider } from '../../components/demo/DemoSessionContext';
import type { ImpersonatedAdmin } from '../../App';
import type { ImpersonatedClientInfo } from '../client/ClientDashboard';
import type { ImpersonatedVendor } from '../vendor/VendorDashboard';

const AdminDashboard = lazy(() => import('../admin/AdminDashboard'));
const VendorDashboard = lazy(() => import('../vendor/VendorDashboard'));
const ClientDashboard = lazy(() => import('../client/ClientDashboard'));

interface Props {
  impersonatedAdmin: ImpersonatedAdmin;
  impersonatedClient: ImpersonatedClientInfo | null;
  impersonatedVendor: ImpersonatedVendor | null;
  setImpersonatedAdmin: (v: ImpersonatedAdmin | null) => void;
  setImpersonatedClient: (v: ImpersonatedClientInfo | null) => void;
  setImpersonatedVendor: (v: ImpersonatedVendor | null) => void;
  handleConnectAsClient: (client: ImpersonatedClientInfo) => void;
  handleConnectAsVendor: (vendor: { id: string; first_name: string; last_name: string; auth_user_id?: string | null }) => void;
  visuBadge?: string;
  canHideTabs?: boolean;
}

/**
 * Chaine de Visu depuis le panel Groupe : Societe, puis Vendeur, puis Client.
 * Extrait tel quel du dashboard, aucun changement de comportement.
 */
export default function CSAImpersonationRoutes({
  impersonatedAdmin, impersonatedClient, impersonatedVendor,
  setImpersonatedAdmin, setImpersonatedClient, setImpersonatedVendor,
  handleConnectAsClient, handleConnectAsVendor, visuBadge, canHideTabs,
}: Props) {
if (impersonatedAdmin && impersonatedVendor && impersonatedClient) {
  return (
    <DemoSessionProvider>
      <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <ClientDashboard
            onLogout={() => {}}
            impersonatedClient={impersonatedClient}
            onBackToAdmin={() => setImpersonatedClient(null)}
            backLabel="Retour Vendeur"
            isSAViewing
            visuBadgeLabel={visuBadge}
            canHideTabs={canHideTabs}
            hideTabsTargetName={`${impersonatedClient.prenom} ${impersonatedClient.nom}`.trim() || impersonatedClient.email}
            hideTabsTargetUserId={impersonatedClient.id}
          />
        </Suspense>
      </AppShell>
    </DemoSessionProvider>
  );
}

if (impersonatedAdmin && impersonatedVendor) {
  return (
    <DemoSessionProvider>
      <AppShell panelRole="vendor" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <VendorDashboard
            onLogout={() => {}}
            impersonatedVendor={impersonatedVendor}
            onBackToAdmin={() => setImpersonatedVendor(null)}
            onConnectAsClient={(client) => setImpersonatedClient(client)}
            isSAViewing
            visuBadgeLabel={visuBadge}
            backLabel="Retour Société"
            canHideTabs={canHideTabs}
            hideTabsTargetName={`${impersonatedVendor.first_name} ${impersonatedVendor.last_name}`.trim()}
            hideTabsTargetUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}
          />
        </Suspense>
      </AppShell>
    </DemoSessionProvider>
  );
}

if (impersonatedAdmin && impersonatedClient) {
  return (
    <DemoSessionProvider>
      <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <ClientDashboard
            onLogout={() => {}}
            impersonatedClient={impersonatedClient}
            onBackToAdmin={() => setImpersonatedClient(null)}
            backLabel="Retour Société"
            isSAViewing
            visuBadgeLabel={visuBadge}
            canHideTabs={canHideTabs}
            hideTabsTargetName={`${impersonatedClient.prenom} ${impersonatedClient.nom}`.trim() || impersonatedClient.email}
            hideTabsTargetUserId={impersonatedClient.id}
          />
        </Suspense>
      </AppShell>
    </DemoSessionProvider>
  );
}

if (impersonatedAdmin) {
  return (
    <DemoSessionProvider>
      <AppShell panelRole="admin" useCompanyProvider companyId={impersonatedAdmin.company_id}>
        <AdminDashboard
          onLogout={() => {}}
          impersonatedAdmin={impersonatedAdmin}
          onBackToSuperAdmin={() => setImpersonatedAdmin(null)}
          onConnectAsClient={handleConnectAsClient}
          onConnectAsVendor={handleConnectAsVendor}
          backLabel="Retour Groupe"
          isSAViewing
          visuBadgeLabel={visuBadge}
          canHideTabs={canHideTabs}
          hideTabsTargetName={`${impersonatedAdmin.first_name} ${impersonatedAdmin.last_name}`.trim() || impersonatedAdmin.email}
          hideTabsTargetUserId={impersonatedAdmin.id}
        />
      </AppShell>
    </DemoSessionProvider>
  );
}

  return null;
}
