import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Database, MessageSquare, MessageCircle,
  LogOut, ChevronLeft, Hexagon, CalendarDays, CalendarClock,
} from 'lucide-react';
import type { VendorActiveView } from './VendorDashboard';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSidebarOrder } from '../../hooks/useSidebarOrder';
import SidebarReorderControls from '../../components/SidebarReorderControls';
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
];

export default function VendorSidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, vendorAuthId, companyId: propCompanyId }: VendorSidebarProps) {
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
        renderItem={(entry, isActive) => (
          <VendorItem entry={entry} isActive={isActive} collapsed={collapsed} onClick={() => onNavigate(entry.id as VendorActiveView)} tokens={tokens} />
        )}
      />

      <div className="px-2 pb-2 pt-2 space-y-0.5" style={{ borderTop: `1px solid ${tokens.sidebar.divider}` }}>
        <VendorBottomBtn icon={<LogOut className="w-4 h-4 flex-shrink-0" />} label="Deconnexion" collapsed={collapsed} tokens={tokens} kind="logout" onClick={onLogout} />
        <VendorBottomBtn icon={<ChevronLeft className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`} />} label="Reduire" collapsed={collapsed} tokens={tokens} kind="collapse" onClick={onCollapse} />
      </div>
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

function VendorBottomBtn({ icon, label, collapsed, tokens, kind, onClick }: {
  icon: React.ReactNode; label: string; collapsed: boolean; tokens: ReturnType<typeof useThemeTokens>; kind: 'logout' | 'collapse'; onClick: () => void;
}) {
  const color = kind === 'logout' ? tokens.sidebar.logoutText : tokens.sidebar.collapseText;
  const hoverColor = kind === 'logout' ? tokens.sidebar.logoutHover : tokens.sidebar.itemTextHover;
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
