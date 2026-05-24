import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Info, UserPlus, Upload, Users, Database, UserCheck, List,
  MessageCircle, MessageSquare, Shield, Calendar, CalendarRange, CalendarCheck,
  Settings, LogOut, ChevronLeft, Hexagon,
} from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSidebarOrder } from '../../hooks/useSidebarOrder';
import SidebarReorderControls from '../../components/SidebarReorderControls';
import type { SidebarSection } from '../../lib/sidebarOrderTypes';
import type { ActiveView } from './AdminDashboard';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
}

const DEFAULT_SECTIONS: SidebarSection[] = [
  { title: 'Principal', items: [
    { id: 'vue-ensemble', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'info-admin', label: 'Info admin', icon: <Info className="w-4 h-4" /> },
  ] },
  { title: 'Gestion des leads', items: [
    { id: 'inscription', label: 'Inscription', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'import-leads', label: 'Import de leads', icon: <Upload className="w-4 h-4" /> },
    { id: 'ajouter-leads', label: 'Ajouter leads', icon: <Users className="w-4 h-4" /> },
    { id: 'crm', label: 'CRM', icon: <Database className="w-4 h-4" /> },
  ] },
  { title: 'Equipe', items: [
    { id: 'ajouter-vendeur', label: 'Ajouter vendeur', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'liste-vendeurs', label: 'Liste vendeurs', icon: <List className="w-4 h-4" /> },
  ] },
  { title: 'Contact', items: [
    { id: 'chat-client', label: 'Chat Client', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'chat-vendeur', label: 'Chat Vendeur', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'chat-super-admin', label: 'Super Admin', icon: <Shield className="w-4 h-4" /> },
  ] },
  { title: 'Agenda', items: [
    { id: 'agenda', label: 'Agenda perso', icon: <Calendar className="w-4 h-4" /> },
    { id: 'agenda-equipe', label: 'Agenda équipe', icon: <CalendarRange className="w-4 h-4" /> },
    { id: 'propositions-rdv', label: 'Propositions RDV', icon: <CalendarCheck className="w-4 h-4" /> },
  ] },
  { title: 'Configuration', items: [
    { id: 'statuts', label: 'Statuts', icon: <Settings className="w-4 h-4" /> },
  ] },
];

export default function Sidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout }: SidebarProps) {
  const t = useThemeTokens();
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setCompanyId(user.app_metadata?.company_id ?? null);
    });
  }, []);

  const sections = useMemo(() => DEFAULT_SECTIONS, []);
  const order = useSidebarOrder({ role: 'admin', sections, userId, companyId });

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{ background: t.sidebar.bg, borderRight: `1px solid ${t.sidebar.border}`, backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)' }}
    >
      <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0" style={{ borderBottom: `1px solid ${t.sidebar.border}` }}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 20px rgba(34,211,238,0.4)' }}>
            <Hexagon className="w-4 h-4 text-white fill-white/20" strokeWidth={2} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold tracking-tight truncate" style={{ color: t.sidebar.logoText }}>DesignSpace3D</p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: t.sidebar.logoSub }}>Admin Panel</p>
          </div>
        )}
      </div>

      <SidebarReorderControls
        entries={order.entries} reordering={order.reordering} collapsed={collapsed}
        activeId={activeView} onNavigate={id => onNavigate(id as ActiveView)}
        startReorder={order.startReorder} cancelReorder={order.cancelReorder} confirmReorder={order.confirmReorder}
        move={order.move} handleDragStart={order.handleDragStart} handleDragOver={order.handleDragOver} handleDragEnd={order.handleDragEnd}
        draftLength={order.draftLength}
        renameEntry={order.renameEntry} addSection={order.addSection} addDivider={order.addDivider} removeEntry={order.removeEntry}
        renderItem={(entry, isActive) => (
          <AdminItem entry={entry} isActive={isActive} collapsed={collapsed} onClick={() => onNavigate(entry.id as ActiveView)} tokens={t.sidebar} />
        )}
      />

      <div className="px-2 pb-2 pt-2 space-y-0.5" style={{ borderTop: `1px solid ${t.sidebar.divider}` }}>
        <AdminBottomBtn icon={<LogOut className="w-4 h-4 flex-shrink-0" />} label="Deconnexion" collapsed={collapsed} color={t.sidebar.logoutText} hoverColor={t.sidebar.logoutHover} onClick={onLogout} />
        <AdminBottomBtn icon={<ChevronLeft className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`} />} label="Reduire" collapsed={collapsed} color={t.sidebar.collapseText} hoverColor={t.sidebar.collapseHover} onClick={onCollapse} />
      </div>
    </aside>
  );
}

function AdminItem({ entry, isActive, collapsed, onClick, tokens }: {
  entry: { id: string; label: string; icon: React.ReactNode }; isActive: boolean; collapsed: boolean; onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>['sidebar'];
}) {
  return (
    <button onClick={onClick} title={collapsed ? entry.label : undefined}
      className={`w-full flex items-center rounded-lg transition-all duration-150 group ${collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'}`}
      style={isActive ? { background: tokens.activeItemBg, boxShadow: tokens.activeItemShadow } : {}}>
      <span className="flex-shrink-0 transition-all duration-150" style={{ color: isActive ? tokens.activeItemIcon : tokens.itemIcon }}>{entry.icon}</span>
      {!collapsed && <span className="text-sm font-medium truncate transition-colors duration-150" style={{ color: isActive ? tokens.activeItemText : tokens.itemText }}>{entry.label}</span>}
      {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: tokens.activeItemDot, boxShadow: `0 0 6px ${tokens.activeItemDot}` }} />}
    </button>
  );
}

function AdminBottomBtn({ icon, label, collapsed, color, hoverColor, onClick }: { icon: React.ReactNode; label: string; collapsed: boolean; color: string; hoverColor: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 rounded-lg py-2 transition-all group ${collapsed ? 'px-1 justify-center' : 'px-3'}`}
      onMouseEnter={e => { e.currentTarget.querySelectorAll<HTMLElement>('[data-themed]').forEach(el => { el.style.color = hoverColor; }); }}
      onMouseLeave={e => { e.currentTarget.querySelectorAll<HTMLElement>('[data-themed]').forEach(el => { el.style.color = color; }); }}>
      <span data-themed style={{ color }}>{icon}</span>
      {!collapsed && <span data-themed className="text-sm font-medium transition-colors" style={{ color }}>{label}</span>}
    </button>
  );
}
