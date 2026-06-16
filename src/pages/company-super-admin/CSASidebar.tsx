import { useState, useMemo } from 'react';
import { LayoutDashboard, Users, UserCog, Shield, Smartphone, Globe, MessageSquare, Crown, Eye, EyeOff } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSidebarOrder } from '../../hooks/useSidebarOrder';
import SidebarReorderControls from '../../components/SidebarReorderControls';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import type { SidebarSection, SidebarEntry } from '../../lib/sidebarOrderTypes';
import type { ImpersonatedCompanySuperAdmin } from '../../App';
import { usePanelHiddenTabs } from '../../hooks/usePanelHiddenTabs';

export type CSAView = 'overview' | 'admins' | 'info' | 'chat-admin' | 'chat-rois-admin' | 'application' | 'site';

const DEFAULT_SECTIONS: SidebarSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'info', label: 'Info Super Admin', icon: <UserCog className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Distributeur',
    items: [
      { id: 'admins', label: 'Liste des distributeurs', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Contact',
    items: [
      { id: 'chat-admin', label: 'Chat Admin', icon: <MessageSquare className="w-4 h-4" /> },
      { id: 'chat-rois-admin', label: 'Chat Rois Admin', icon: <Crown className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'application', label: 'Application', icon: <Smartphone className="w-4 h-4" /> },
      { id: 'site', label: 'Site', icon: <Globe className="w-4 h-4" /> },
    ],
  },
];

interface CSASidebarProps {
  activeView: CSAView;
  onNavigate: (view: CSAView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
  impersonated: ImpersonatedCompanySuperAdmin;
  isImpersonation: boolean;
  onBackToRoisAdmin?: () => void;
  visuBadgeLabel?: string;
  backLabel?: string;
  canHideTabs?: boolean;
  hideTabsTargetName?: string;
  hideTabsTargetUserId?: string | null;
  logoZoneRef?: React.RefObject<HTMLDivElement | null>;
  sidebarBodyRef?: React.RefObject<HTMLDivElement | null>;
  zone1Bg?: string;
  zone2Bg?: string;
  badgeCounts?: Record<string, number>;
}

export default function CSASidebar({
  activeView, onNavigate, collapsed, onCollapse, onLogout,
  impersonated, isImpersonation, onBackToRoisAdmin, visuBadgeLabel, backLabel, canHideTabs, hideTabsTargetName, hideTabsTargetUserId, logoZoneRef, sidebarBodyRef, zone1Bg, zone2Bg, badgeCounts,
}: CSASidebarProps) {
  const t = useThemeTokens();
  const { hiddenTabs, loaded: hiddenTabsLoaded, toggle: toggleHiddenTab } = usePanelHiddenTabs('company_super_admin', impersonated.company_id, hideTabsTargetUserId);
  const [hideEditMode, setHideEditMode] = useState(false);
  const sections = useMemo(() => DEFAULT_SECTIONS, []);
  const order = useSidebarOrder({
    role: 'company_super_admin',
    sections,
    userId: impersonated.id,
    companyId: impersonated.company_id,
    hiddenTabs,
  });

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{ borderRight: `1px solid ${t.sidebar.border}`, backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)' }}
    >
      <div
        ref={logoZoneRef}
        className={`flex items-center h-16 flex-shrink-0 overflow-hidden gap-3 px-4`}
        style={{ background: zone1Bg || t.sidebar.bg, borderBottom: `1px solid ${t.sidebar.border}` }}
      >
        {collapsed ? (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg mx-auto" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.4)' }}>
            <Shield className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
        ) : (
          <>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.4)' }}>
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-bold tracking-tight truncate" style={{ color: t.sidebar.logoText }}>SUPER ADMIN</p>
              <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: t.sidebar.logoSub }}>{impersonated.company}</p>
            </div>
          </>
        )}
      </div>

      <div ref={sidebarBodyRef} className="flex-1 flex flex-col min-h-0" style={{ background: zone2Bg || t.sidebar.bg }}>
        {!hiddenTabsLoaded ? (
          <CSASidebarSkeleton collapsed={collapsed} tokens={t} />
        ) : (
        <SidebarReorderControls
          entries={hideEditMode ? order.entries : filterHidden(order.entries, hiddenTabs)}
          reordering={order.reordering}
          collapsed={collapsed}
          activeId={activeView}
          onNavigate={id => onNavigate(id as CSAView)}
          startReorder={order.startReorder}
          cancelReorder={order.cancelReorder}
          confirmReorder={order.confirmReorder}
          move={order.move}
          handleDragStart={order.handleDragStart}
          handleDragOver={order.handleDragOver}
          handleDragEnd={order.handleDragEnd}
          draftLength={order.draftLength}
          renameEntry={order.renameEntry}
          addSection={order.addSection}
          addDivider={order.addDivider}
          removeEntry={order.removeEntry}
          resetToDefault={order.resetToDefault}
          dragSourceIdx={order.dragSourceIdx}
          dropTargetIdx={order.dropTargetIdx}
          dropEdge={order.dropEdge}
          renderItem={(entry, isActive) => (
            <CSANavItem
              id={entry.id}
              label={entry.label}
              icon={entry.icon}
              isActive={isActive}
              collapsed={collapsed}
              onClick={() => { if (!hideEditMode) onNavigate(entry.id as CSAView); }}
              tokens={t.sidebar}
              hideEditMode={hideEditMode}
              isHidden={hiddenTabs.has(entry.id)}
              onToggleHide={() => toggleHiddenTab(entry.id)}
              badgeCount={badgeCounts?.[entry.id]}
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
          tokens={t}
          onBackToRoisAdmin={onBackToRoisAdmin}
          visuBadgeLabel={visuBadgeLabel}
          backLabel={backLabel}
          onHideTabs={canHideTabs ? () => setHideEditMode(prev => !prev) : undefined}
          hideEditMode={hideEditMode}
        />
      </div>
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

function CSASidebarSkeleton({ collapsed, tokens: t }: { collapsed: boolean; tokens: ReturnType<typeof useThemeTokens> }) {
  const rows = collapsed ? [1,2,3,4] : [1,2,3,4,5];
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

function CSANavItem({ id, label, icon, isActive, collapsed, onClick, tokens, hideEditMode, isHidden, onToggleHide, badgeCount }: {
  id: string; label: string; icon: React.ReactNode; isActive: boolean; collapsed: boolean;
  onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>['sidebar'];
  hideEditMode?: boolean;
  isHidden?: boolean;
  onToggleHide?: () => void;
  badgeCount?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [eyeHovered, setEyeHovered] = useState(false);
  const dimmed = hideEditMode && isHidden;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 mb-0.5 ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-[7px]'}`}
      style={{
        background: isActive && !hideEditMode ? tokens.activeItemBg : hovered && !hideEditMode ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: dimmed ? tokens.itemText : (isActive ? tokens.activeItemText : hovered ? tokens.itemTextHover : tokens.itemText),
        boxShadow: isActive && !hideEditMode ? tokens.activeItemShadow : 'none',
        opacity: dimmed ? 0.4 : 1,
        cursor: hideEditMode ? 'default' : 'pointer',
      }}
    >
      <button
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-2.5 min-w-0 flex-1 ${hideEditMode ? 'pointer-events-none' : ''}`}
        tabIndex={hideEditMode ? -1 : 0}
      >
        <span className="flex-shrink-0 relative">
          {icon}
          {collapsed && !!badgeCount && badgeCount > 0 && !hideEditMode && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500 shadow-sm">{badgeCount > 99 ? '99+' : badgeCount}</span>
          )}
        </span>
        {!collapsed && <span className="text-[12.5px] font-medium truncate">{label}</span>}
        {!collapsed && !!badgeCount && badgeCount > 0 && !hideEditMode && (
          <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500 shadow-sm">{badgeCount > 99 ? '99+' : badgeCount}</span>
        )}
      </button>
      {hideEditMode && !collapsed && (
        <button
          onClick={e => { e.stopPropagation(); onToggleHide?.(); }}
          onMouseEnter={() => setEyeHovered(true)}
          onMouseLeave={() => setEyeHovered(false)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md ml-auto transition-all duration-150"
          style={{
            background: eyeHovered ? (isHidden ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.10)') : 'transparent',
            color: isHidden ? '#ef4444' : eyeHovered ? '#22c55e' : tokens.itemText,
          }}
          title={isHidden ? 'Afficher' : 'Masquer'}
        >
          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}
