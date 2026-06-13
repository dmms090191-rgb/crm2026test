import { lazy } from 'react';
import {
  LayoutDashboard, Database, MessageCircle, MessageSquare,
  CalendarDays, CalendarCheck, Shield, UserCog,
  Building2, Bot, Brain, Settings,
} from 'lucide-react';

export type UserRole = 'super_admin' | 'admin' | 'vendor' | 'client';

export interface TabDef {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export function getTabsForRole(role: UserRole): TabDef[] {
  const s = 18;
  if (role === 'super_admin') return [
    { key: 'dashboard', label: 'Accueil', icon: <LayoutDashboard size={s} /> },
    { key: 'admins', label: 'Admins', icon: <UserCog size={s} /> },
    { key: 'chat-admin', label: 'Messages', icon: <MessageSquare size={s} /> },
    { key: 'crm-societe', label: 'Societes', icon: <Building2 size={s} /> },
    { key: 'more', label: 'Plus', icon: <Settings size={s} /> },
  ];
  if (role === 'admin') return [
    { key: 'vue-ensemble', label: 'Accueil', icon: <LayoutDashboard size={s} /> },
    { key: 'crm', label: 'CRM', icon: <Database size={s} /> },
    { key: 'chat-client', label: 'Clients', icon: <MessageCircle size={s} /> },
    { key: 'agenda', label: 'Agenda', icon: <CalendarDays size={s} /> },
    { key: 'more', label: 'Plus', icon: <Settings size={s} /> },
  ];
  if (role === 'vendor') return [
    { key: 'vue-ensemble', label: 'Accueil', icon: <LayoutDashboard size={s} /> },
    { key: 'leads', label: 'Leads', icon: <Database size={s} /> },
    { key: 'chat-admin', label: 'Messages', icon: <MessageSquare size={s} /> },
    { key: 'agenda', label: 'Agenda', icon: <CalendarDays size={s} /> },
    { key: 'propositions-rdv', label: 'RDV', icon: <CalendarCheck size={s} /> },
  ];
  return [
    { key: 'vue-ensemble', label: 'Accueil', icon: <LayoutDashboard size={s} /> },
    { key: 'messagerie', label: 'Support', icon: <MessageCircle size={s} /> },
    { key: 'agenda', label: 'Agenda', icon: <CalendarDays size={s} /> },
    { key: 'propositions-rdv', label: 'RDV', icon: <CalendarCheck size={s} /> },
  ];
}

export function getMoreTabs(role: UserRole): TabDef[] {
  const s = 18;
  if (role === 'super_admin') return [
    { key: 'api-ia', label: 'API IA', icon: <Bot size={s} /> },
    { key: 'cerveau-ia', label: 'Cerveau IA', icon: <Brain size={s} /> },
    { key: 'statuts', label: 'Statuts', icon: <Settings size={s} /> },
  ];
  if (role === 'admin') return [
    { key: 'chat-vendeur', label: 'Vendeurs', icon: <MessageSquare size={s} /> },
    { key: 'chat-super-admin', label: 'Support', icon: <Shield size={s} /> },
    { key: 'propositions-rdv', label: 'RDV', icon: <CalendarCheck size={s} /> },
    { key: 'statuts', label: 'Statuts', icon: <Settings size={s} /> },
  ];
  return [];
}

export const SADashboard = lazy(() => import('../pages/superadmin/views/SADashboard'));
export const SAAdmins = lazy(() => import('../pages/superadmin/views/SAAdmins'));
export const SAchatAdmin = lazy(() => import('../pages/superadmin/views/SAchatAdmin'));
export const SACrmSociete = lazy(() => import('../pages/superadmin/views/crm-societe/SACrmSociete'));
export const SAStatuts = lazy(() => import('../pages/superadmin/views/SAStatuts'));
export const SAApiIa = lazy(() => import('../pages/superadmin/views/SAApiIa'));
export const SACerveauIA = lazy(() => import('../pages/superadmin/views/cerveau-ia/SACerveauIA'));

export const AdminVueEnsemble = lazy(() => import('../pages/admin/views/VueEnsemble'));
export const AdminCrm = lazy(() => import('../pages/admin/views/Crm'));
export const AdminChatClient = lazy(() => import('../pages/admin/views/ChatClient'));
export const AdminChatVendeur = lazy(() => import('../pages/admin/views/ChatVendeur'));
export const AdminChatSuperAdmin = lazy(() => import('../pages/admin/views/ChatSuperAdmin'));
export const AdminAgenda = lazy(() => import('../pages/admin/views/Agenda'));
export const AdminPropositionsRdv = lazy(() => import('../pages/admin/views/PropositionsRdv'));
export const AdminStatuts = lazy(() => import('../pages/admin/views/Statuts'));

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
