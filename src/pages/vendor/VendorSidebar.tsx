import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Database, MessageSquare, MessageCircle,
  Hexagon, CalendarDays, CalendarClock, GraduationCap,
  Eye, EyeOff,
} from 'lucide-react';
import type { VendorActiveView } from './VendorDashboard';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSidebarOrder } from '../../hooks/useSidebarOrder';
import SidebarReorderControls from '../../components/SidebarReorderControls';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import type { SidebarSection, SidebarEntry } from '../../lib/sidebarOrderTypes';
import { supabase } from '../../lib/supabase';
import { usePanelHiddenTabs } from '../../hooks/usePanelHiddenTabs';

interface VendorSidebarProps {
  activeView: VendorActiveView;
  onNavigate: (view: VendorActiveView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
  vendorAuthId?: string | null;
  companyId?: string | null;
  onBackToRoisAdmin?: () => void;
  visuBadgeLabel?: string;
  backLabel?: string;
  canHideTabs?: boolean;
  hideTabsTargetName?: string;
  hideTabsTargetUserId?: string | null;
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

export default function VendorSidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, vendorAuthId, companyId: propCompanyId, onBackToRoisAdmin, visuBadgeLabel, backLabel, canHideTabs, hideTabsTargetName, hideTabsTargetUserId }: VendorSidebarProps) {
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

  const { hiddenTabs, loaded: hiddenTabsLoaded, toggle: toggleHiddenTab } = usePanelHiddenTabs('vendor', companyId, hideTabsTargetUserId);
  const [hideEditMode, setHideEditMode] = useState(false);

  const sections = useMemo(() => DEFAULT_SECTIONS, []);
  const order = useSidebarOrder({ role: 'vendor', sections, userId: authUserId, companyId, hiddenTabs });

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

      {!hiddenTabsLoaded ? (
        <VendorSidebarSkeleton collapsed={collapsed} tokens={tokens} />
      ) : (
      <SidebarReorderControls
        entries={hideEditMode ? order.entries : filterHidden(order.entries, hiddenTabs)} reordering={order.reordering} collapsed={collapsed}
        activeId={activeView} onNavigate={id => onNavigate(id as VendorActiveView)}
        startReorder={order.startReorder} cancelReorder={order.cancelReorder} confirmReorder={order.confirmReorder}
        move={order.move} handleDragStart={order.handleDragStart} handleDragOver={order.handleDragOver} handleDragEnd={order.handleDragEnd}
        draftLength={order.draftLength}
        renameEntry={order.renameEntry} addSection={order.addSection} addDivider={order.addDivider} removeEntry={order.removeEntry}
        resetToDefault={order.resetToDefault}
        dragSourceIdx={order.dragSourceIdx} dropTargetIdx={order.dropTargetIdx} dropEdge={order.dropEdge}
        renderItem={(entry, isActive) => (
          <VendorItem
            entry={entry} isActive={isActive} collapsed={collapsed}
            onClick={() => { if (!hideEditMode) onNavigate(entry.id as VendorActiveView); }}
            tokens={tokens}
            hideEditMode={hideEditMode}
            isHidden={hiddenTabs.has(entry.id)}
            onToggleHide={() => toggleHiddenTab(entry.id)}
          />
        )}
      />
      )}

      <SidebarFooterActions
        collapsed={collapsed}
        onLogout={onLogout}
        onCollapse={onCollapse}
        onReorganize={order.startReorder}
        reordering={order.reordering}
        tokens={tokens}
        onBackToRoisAdmin={onBackToRoisAdmin}
        visuBadgeLabel={visuBadgeLabel}
        backLabel={backLabel}
        onHideTabs={canHideTabs ? () => setHideEditMode(prev => !prev) : undefined}
        hideEditMode={hideEditMode}
      />
    </aside>
  );
}

function filterHidden(entries: SidebarEntry[], hidden: Set<string>): SidebarEntry[] {
  if (hidden.size === 0) return entries;
  const filtered = entries.filter(e => e.kind !== 'item' || !hidden.has(e.id));
  const result: SidebarEntry[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const cur = filtered[i];
    if (cur.kind === 'section') { const next = filtered[i + 1]; if (!next || next.kind === 'section' || next.kind === 'divider') continue; }
    if (cur.kind === 'divider') { const next = filtered[i + 1]; if (!next || next.kind === 'divider') continue; }
    result.push(cur);
  }
  if (result.length > 0 && result[result.length - 1].kind === 'divider') result.pop();
  return result;
}

function VendorSidebarSkeleton({ collapsed, tokens: t }: { collapsed: boolean; tokens: ReturnType<typeof useThemeTokens> }) {
  const rows = collapsed ? [1,2,3,4] : [1,2,3,4,5,6];
  return (
    <div className="flex-1 overflow-hidden py-3 px-2 space-y-1.5">
      {rows.map(i => (
        <div key={i} className={`flex items-center rounded-lg ${collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'}`}>
          <div className="w-4 h-4 rounded flex-shrink-0" style={{ background: t.sidebar.divider, opacity: 0.4 }} />
          {!collapsed && <div className="h-3 rounded flex-1" style={{ background: t.sidebar.divider, opacity: 0.3, maxWidth: `${50 + (i % 3) * 20}%` }} />}
        </div>
      ))}
    </div>
  );
}

function VendorItem({ entry, isActive, collapsed, onClick, tokens, hideEditMode, isHidden, onToggleHide }: {
  entry: { id: string; label: string; icon: React.ReactNode }; isActive: boolean; collapsed: boolean; onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
  hideEditMode?: boolean;
  isHidden?: boolean;
  onToggleHide?: () => void;
}) {
  const [eyeHovered, setEyeHovered] = useState(false);
  const dimmed = hideEditMode && isHidden;

  return (
    <div
      className={`w-full flex items-center rounded-lg transition-all duration-150 group ${collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'}`}
      style={{
        ...(isActive && !hideEditMode ? { background: tokens.sidebar.activeItemBg, boxShadow: tokens.sidebar.activeItemShadow } : {}),
        opacity: dimmed ? 0.4 : 1,
        cursor: hideEditMode ? 'default' : 'pointer',
      }}
    >
      <button
        onClick={onClick}
        title={collapsed ? entry.label : undefined}
        className={`flex items-center gap-3 min-w-0 flex-1 ${hideEditMode ? 'pointer-events-none' : ''}`}
        tabIndex={hideEditMode ? -1 : 0}
      >
        <span className="flex-shrink-0 transition-all duration-150" style={{ color: isActive && !dimmed ? tokens.sidebar.activeItemIcon : tokens.sidebar.itemIcon }}>{entry.icon}</span>
        {!collapsed && <span className="text-sm font-medium truncate transition-colors duration-150" style={{ color: dimmed ? tokens.sidebar.itemText : (isActive ? tokens.sidebar.activeItemText : tokens.sidebar.itemText) }}>{entry.label}</span>}
      </button>
      {!collapsed && isActive && !hideEditMode && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: tokens.sidebar.activeItemDot, boxShadow: `0 0 6px ${tokens.sidebar.activeItemDot}` }} />}
      {hideEditMode && !collapsed && (
        <button
          onClick={e => { e.stopPropagation(); onToggleHide?.(); }}
          onMouseEnter={() => setEyeHovered(true)}
          onMouseLeave={() => setEyeHovered(false)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md ml-auto transition-all duration-150"
          style={{
            background: eyeHovered ? (isHidden ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.10)') : 'transparent',
            color: isHidden ? '#ef4444' : eyeHovered ? '#22c55e' : tokens.sidebar.itemText,
          }}
          title={isHidden ? 'Afficher' : 'Masquer'}
        >
          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

