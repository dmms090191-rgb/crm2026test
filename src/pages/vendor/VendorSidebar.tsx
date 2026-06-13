import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Database, MessageSquare, MessageCircle,
  Hexagon, CalendarDays, CalendarClock, GraduationCap,
} from 'lucide-react';
import type { VendorActiveView } from './VendorDashboard';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSidebarOrder } from '../../hooks/useSidebarOrder';
import SidebarReorderControls from '../../components/SidebarReorderControls';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import type { SidebarSection } from '../../lib/sidebarOrderTypes';
import { supabase } from '../../lib/supabase';

interface VendorSidebarProps {
  activeView: VendorActiveView;
  onNavigate: (view: VendorActiveView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
  vendorAuthId?: string | null;
  companyId?: string | null;
  onBackToRoisAdmin?: () => void;
}

const DEFAULT_SECTIONS: SidebarSection[] = [
  { title: 'Principal', items: [
    { id: 'vue-ensemble', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'leads', label: 'Leads', icon: <Database className="w-4 h-4" /> },
  ] },
  { title: 'Rendez-vous', items: [
    { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'propositions-rdv', label: 'Propositions RDV', icon: <CalendarClock className="w-4 h-4" /> },
  ] },
  { title: 'Contact', items: [
    { id: 'chat-admin', label: 'Chat Admin', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'chat-client', label: 'Chat Client', icon: <MessageCircle className="w-4 h-4" /> },
  ] },
  { title: 'Ressources', items: [
    { id: 'tuto', label: 'Tuto', icon: <GraduationCap className="w-4 h-4" /> },
  ] },
];

export default function VendorSidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, vendorAuthId, companyId: propCompanyId, onBackToRoisAdmin }: VendorSidebarProps) {
  const tokens = useThemeTokens();
  const [authUserId, setAuthUserId] = useState<string | null>(vendorAuthId ?? null);
  const [companyId, setCompanyId] = useState<string | null>(propCompanyId ?? null);

  useEffect(() => {
    if (vendorAuthId) { setAuthUserId(vendorAuthId); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setAuthUserId(user.id);
      setCompanyId(user.app_metadata?.company_id ?? null);
    });
  }, [vendorAuthId]);

  useEffect(() => {
    if (propCompanyId) setCompanyId(propCompanyId);
  }, [propCompanyId]);

  const sections = useMemo(() => DEFAULT_SECTIONS, []);
  const order = useSidebarOrder({ role: 'vendor', sections, userId: authUserId, companyId });

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{ background: tokens.sidebar.bg, borderRight: `1px solid ${tokens.sidebar.border}`, backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)' }}
    >
      <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0" style={{ borderBottom: `1px solid ${tokens.sidebar.border}` }}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg" style={{ boxShadow: `0 0 20px ${tokens.accent.text}66` }}>
            <Hexagon className="w-4 h-4 fill-white/20" style={{ color: tokens.text.primary }} strokeWidth={2} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold tracking-tight truncate" style={{ color: tokens.sidebar.logoText }}>DesignSpace3D</p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: tokens.sidebar.logoSub }}>Espace Vendeur</p>
          </div>
        )}
      </div>

      <SidebarReorderControls
        entries={order.entries} reordering={order.reordering} collapsed={collapsed}
        activeId={activeView} onNavigate={id => onNavigate(id as VendorActiveView)}
        startReorder={order.startReorder} cancelReorder={order.cancelReorder} confirmReorder={order.confirmReorder}
        move={order.move} handleDragStart={order.handleDragStart} handleDragOver={order.handleDragOver} handleDragEnd={order.handleDragEnd}
        draftLength={order.draftLength}
        renameEntry={order.renameEntry} addSection={order.addSection} addDivider={order.addDivider} removeEntry={order.removeEntry}
        resetToDefault={order.resetToDefault}
        dragSourceIdx={order.dragSourceIdx} dropTargetIdx={order.dropTargetIdx} dropEdge={order.dropEdge}
        renderItem={(entry, isActive) => (
          <VendorItem entry={entry} isActive={isActive} collapsed={collapsed} onClick={() => onNavigate(entry.id as VendorActiveView)} tokens={tokens} />
        )}
      />

      <SidebarFooterActions
        collapsed={collapsed}
        onLogout={onLogout}
        onCollapse={onCollapse}
        onReorganize={order.startReorder}
        reordering={order.reordering}
        tokens={tokens}
        onBackToRoisAdmin={onBackToRoisAdmin}
      />
    </aside>
  );
}

function VendorItem({ entry, isActive, collapsed, onClick, tokens }: {
  entry: { id: string; label: string; icon: React.ReactNode }; isActive: boolean; collapsed: boolean; onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <button onClick={onClick} title={collapsed ? entry.label : undefined}
      className={`w-full flex items-center rounded-lg transition-all duration-150 group ${collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'}`}
      style={isActive ? { background: tokens.sidebar.activeItemBg, boxShadow: tokens.sidebar.activeItemShadow } : {}}>
      <span className="flex-shrink-0 transition-all duration-150" style={{ color: isActive ? tokens.sidebar.activeItemIcon : tokens.sidebar.itemIcon }}>{entry.icon}</span>
      {!collapsed && <span className="text-sm font-medium truncate transition-colors duration-150" style={{ color: isActive ? tokens.sidebar.activeItemText : tokens.sidebar.itemText }}>{entry.label}</span>}
      {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: tokens.sidebar.activeItemDot, boxShadow: `0 0 6px ${tokens.sidebar.activeItemDot}` }} />}
    </button>
  );
}

