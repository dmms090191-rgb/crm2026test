import { lazy } from 'react';
import type { SAView } from './SuperAdminSidebar';
import { SimulationProvider } from '../../contexts/SimulationContext';
import type { AdminUser } from './views/SAAdmins';
import type { CompanySuperAdmin } from './views/super-admins/superAdminTypes';

const SADashboard = lazy(() => import('./views/SADashboard'));
const SAAdmins = lazy(() => import('./views/SAAdmins'));
const SAMonCompte = lazy(() => import('./views/SAMonCompte'));
const DocumentationCrm = lazy(() => import('../admin/views/DocumentationCrm'));
const SystemPage = lazy(() => import('../admin/views/SystemPage'));
const SauvegardeRestauration = lazy(() => import('../admin/views/SauvegardeRestauration'));
const SATestsSysteme = lazy(() => import('./views/tests-systeme/SATestsSysteme'));
const SACrmSociete = lazy(() => import('./views/crm-societe/SACrmSociete'));
const SAStatuts = lazy(() => import('./views/SAStatuts'));
const SAApiIa = lazy(() => import('./views/SAApiIa'));
const SASites = lazy(() => import('./views/sites/SASites'));
const SAFonctionsTalvex = lazy(() => import('./views/fonctions-talvex/SAFonctionsTalvex'));
const SASiteTalvex = lazy(() => import('./views/site-builder/SASiteTalvex'));
const SACerveauIA = lazy(() => import('./views/cerveau-ia/SACerveauIA'));
const SALogoPage = lazy(() => import('./views/SALogoPage'));
const SAAmeliorations = lazy(() => import('./views/SAAmeliorations'));
const SAApplicationPage = lazy(() => import('./views/SAApplicationPage'));
const SAThemes = lazy(() => import('./views/themes/SAThemes'));
const EditeurIA = lazy(() => import('../admin/views/editeur-ia/EditeurIA'));
const SACalquerLogo = lazy(() => import('./views/SACalquerLogo'));
const SASuperAdmins = lazy(() => import('./views/super-admins/SASuperAdmins'));

interface Props {
  activeView: SAView;
  handleNavigate: (v: SAView) => void;
  handleConnectAsAdmin: (admin: AdminUser) => void;
  handleConnectAsCompanySuperAdmin: (sa: CompanySuperAdmin) => void;
  handleOpenChatAdmin: (admin: AdminUser) => void;
  cachedAdmins: AdminUser[];
  adminsRefreshing: boolean;
  adminsError: string;
  fetchAdminsCache: () => Promise<void>;
  docInitialTab: string | undefined;
  setDocInitialTab: (v: string | undefined) => void;
  docKey: number;
  setDocKey: React.Dispatch<React.SetStateAction<number>>;
  setActiveView: (v: SAView) => void;
  saFirstName: string;
  saLastName: string;
  setSaFirstName: (v: string) => void;
  setSaLastName: (v: string) => void;
  appIconSelectionMode: boolean;
  handleAppIconSelected: () => void;
  handleChangeAppIcon: () => void;
}

export default function SAViewRouter({
  activeView,
  handleNavigate,
  handleConnectAsAdmin,
  handleConnectAsCompanySuperAdmin,
  handleOpenChatAdmin,
  cachedAdmins,
  adminsRefreshing,
  adminsError,
  fetchAdminsCache,
  docInitialTab,
  setDocInitialTab,
  docKey,
  setDocKey,
  setActiveView,
  setSaFirstName,
  setSaLastName,
  appIconSelectionMode,
  handleAppIconSelected,
  handleChangeAppIcon,
}: Props) {
  switch (activeView) {
    case 'dashboard': return <SADashboard onNavigate={handleNavigate} onNavigateToAudit={() => { setDocInitialTab('audit-technique'); setDocKey(k => k + 1); setActiveView('documentation-crm'); }} adminCount={cachedAdmins.length} adminsLoading={adminsRefreshing && cachedAdmins.length === 0} />;
    case 'super-admins': return <SASuperAdmins onConnectAsCompanySuperAdmin={handleConnectAsCompanySuperAdmin} />;
    case 'admins': return <SAAdmins onConnectAsAdmin={handleConnectAsAdmin} onOpenChat={handleOpenChatAdmin} cachedAdmins={cachedAdmins} refreshing={adminsRefreshing} cachedError={adminsError} onRefresh={fetchAdminsCache} />;
    case 'chat-admin': return null;
    case 'documentation-crm': return <div className="p-3 sm:p-4 md:p-6 flex flex-col h-full min-h-0"><DocumentationCrm key={docKey} initialTab={docInitialTab} onInitialTabConsumed={() => setDocInitialTab(undefined)} /></div>;
    case 'system': return <SystemPage />;
    case 'sauvegarde': return <SimulationProvider><SauvegardeRestauration /></SimulationProvider>;
    case 'mon-compte': return <SAMonCompte onNameChange={(fn, ln) => { setSaFirstName(fn); setSaLastName(ln); }} />;
    case 'tests-systeme': return <SATestsSysteme />;
    case 'crm-societe': return <SACrmSociete />;
    case 'statuts': return <SAStatuts />;
    case 'api-ia': return <SAApiIa />;
    case 'sites': return <SASites />;
    case 'fonctions-talvex': return <SAFonctionsTalvex />;
    case 'site-talvex': return <SASiteTalvex />;
    case 'cerveau-ia': return <SACerveauIA />;
    case 'logo': return <SALogoPage appIconSelectionMode={appIconSelectionMode} onAppIconSelected={handleAppIconSelected} />;
    case 'ameliorations': return <SAAmeliorations />;
    case 'application': return <SAApplicationPage onChangeAppIcon={handleChangeAppIcon} />;
    case 'themes': return <SAThemes />;
    case 'editeur-ia': return <EditeurIA />;
    case 'calquer-logo': return <SACalquerLogo />;
    case 'tuto': return <div className="p-4 sm:p-6"><p className="text-sm" style={{ color: 'inherit' }}>Tuto - Contenu a venir</p></div>;
    default: return <SADashboard onNavigate={handleNavigate} adminCount={cachedAdmins.length} adminsLoading={adminsRefreshing && cachedAdmins.length === 0} />;
  }
}
