import { lazy } from "react";

/*
 * LES VUES QUE LA COQUILLE TELEPHONE MONTE — et rien d autre.
 *
 * Ce fichier portait aussi deux listes d onglets ECRITES EN DUR (getTabsForRole,
 * getMoreTabs) et, un temps, les sources de navigation. Les listes sont supprimees, les
 * sources sont parties dans navigationMobileSources.ts : un .tsx qui exporte a la fois des
 * composants et des constantes casse le Fast Refresh, et le greffon le signalait.
 *
 * Il ne reste donc ici que des composants. L ensemble des ids reellement rendables, lui,
 * vit dans navigationMobile.ts, et un releve verifie que les deux concordent.
 */


export const SADashboard = lazy(() => import('../pages/superadmin/views/SADashboard'));
export const SAAdmins = lazy(() => import('../pages/superadmin/views/SAAdmins'));
export const SAchatAdmin = lazy(() => import('../pages/superadmin/views/SAchatAdmin'));
export const SACrmSociete = lazy(() => import('../pages/superadmin/views/crm-societe/SACrmSociete'));
export const SAStatuts = lazy(() => import('../pages/superadmin/views/SAStatuts'));
export const SAApiIa = lazy(() => import('../pages/superadmin/views/SAApiIa'));
export const SACerveauIA = lazy(() => import('../pages/superadmin/views/cerveau-ia/SACerveauIA'));
export const SASuperAdmins = lazy(() => import('../pages/superadmin/views/super-admins/SASuperAdmins'));
export const SAMonCompte = lazy(() => import('../pages/superadmin/views/SAMonCompte'));
export const SASystem = lazy(() => import('../pages/admin/views/SystemPage'));
export const SADocumentationCrm = lazy(() => import('../pages/admin/views/DocumentationCrm'));

export const AdminVueEnsemble = lazy(() => import('../pages/admin/views/VueEnsemble'));
export const AdminCrm = lazy(() => import('../pages/admin/views/Crm'));
export const AdminChatClient = lazy(() => import('../pages/admin/views/ChatClient'));
export const AdminChatVendeur = lazy(() => import('../pages/admin/views/ChatVendeur'));
export const AdminChatSuperAdmin = lazy(() => import('../pages/admin/views/ChatSuperAdmin'));
export const AdminAgenda = lazy(() => import('../pages/admin/views/Agenda'));
export const AdminPropositionsRdv = lazy(() => import('../pages/admin/views/PropositionsRdv'));
export const AdminStatuts = lazy(() => import('../pages/admin/views/Statuts'));

/*
 * Les quatre vues Societe ajoutees le 27/10/2026.
 *
 * Chacune a ete verifiee MONTABLE SEULE sous les seuls fournisseurs que la coquille pose —
 * ThemeProvider, TimezoneProvider, CompanyIdProvider, SimulationProvider — c'est-a-dire
 * sans AdminDashboard, et surtout verifiees sur ce qu'elles AFFICHENT — trois candidates
 * ont ete disqualifiees a ce titre, motifs mesures dans navigationMobile.ts. ListeVendeurs
 * avait deja son rendu telephone ecrit et jamais atteint (ListeVendeursMobileCard, md:hidden).
 */
export const AdminBoutiques = lazy(() => import('../pages/admin/views/Boutiques'));
export const AdminCabinets = lazy(() => import('../pages/admin/views/Cabinets'));
export const AdminListeVendeurs = lazy(() => import('../pages/admin/views/ListeVendeurs'));
export const AdminAgendaEquipe = lazy(() => import('../pages/admin/views/AgendaEquipe'));

export const VendorVueEnsemble = lazy(() => import('../pages/vendor/views/VendorVueEnsemble'));
export const VendorLeads = lazy(() => import('../pages/vendor/views/VendorLeads'));
export const VendorChatAdmin = lazy(() => import('../pages/vendor/views/VendorChatAdmin'));
export const VendorChatClient = lazy(() => import('../pages/vendor/views/VendorChatClient'));
export const VendorAgenda = lazy(() => import('../pages/vendor/views/VendorAgenda'));
export const VendorPropositionsRdv = lazy(() => import('../pages/vendor/views/VendorPropositionsRdv'));

export const ClientVueEnsemble = lazy(() => import('../pages/client/views/ClientVueEnsemble'));
export const ClientMessagerie = lazy(() => import('../pages/client/views/ClientMessagerie'));
export const ClientAgenda = lazy(() => import('../pages/client/views/ClientAgenda'));
export const ClientPropositionsRdv = lazy(() => import('../pages/client/views/ClientPropositionsRdv'));

export function PwaSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0ea5e9', borderTopColor: 'transparent' }} />
    </div>
  );
}
