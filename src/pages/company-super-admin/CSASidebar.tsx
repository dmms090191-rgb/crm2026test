import { useState, useMemo } from 'react';
import { LayoutDashboard, Users, UserCog, Shield, Smartphone } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSidebarOrder } from '../../hooks/useSidebarOrder';
import SidebarReorderControls from '../../components/SidebarReorderControls';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import type { SidebarSection } from '../../lib/sidebarOrderTypes';
import type { ImpersonatedCompanySuperAdmin } from '../../App';

export type CSAView = 'overview' | 'admins' | 'info' | 'application';

const DEFAULT_SECTIONS: SidebarSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'info', label: 'Info Super Admin', icon: <UserCog className="w-4 h-4" /> },
      { id: 'admins', label: 'Liste des admins', icon: <Users className="w-4 h-4" /> },
      { id: 'application', label: 'Application', icon: <Smartphone className="w-4 h-4" /> },
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
  logoZoneRef?: React.RefObject<HTMLDivElement | null>;
  sidebarBodyRef?: React.RefObject<HTMLDivElement | null>;
  zone1Bg?: string;
  zone2Bg?: string;
}

export default function CSASidebar({
  activeView, onNavigate, collapsed, onCollapse, onLogout,
  impersonated, isImpersonation, onBackToRoisAdmin, logoZoneRef, sidebarBodyRef, zone1Bg, zone2Bg,
}: CSASidebarProps) {
  const t = useThemeTokens();
  const sections = useMemo(() => DEFAULT_SECTIONS, []);
  const order = useSidebarOrder({
    role: 'company_super_admin',
    sections,
    userId: impersonated.id,
    companyId: impersonated.company_id,
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
        <SidebarReorderControls
          entries={order.entries}
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
              onClick={() => onNavigate(entry.id as CSAView)}
              tokens={t.sidebar}
            />
          )}
        />

        <SidebarFooterActions
          collapsed={collapsed}
          onLogout={onLogout}
          onCollapse={onCollapse}
          onReorganize={order.startReorder}
          reordering={order.reordering}
          tokens={t}
          onBackToRoisAdmin={onBackToRoisAdmin}
        />
      </div>
    </aside>
  );
}

function CSANavItem({ id, label, icon, isActive, collapsed, onClick, tokens }: {
  id: string; label: string; icon: React.ReactNode; isActive: boolean; collapsed: boolean;
  onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>['sidebar'];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 mb-0.5 ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-[7px]'}`}
      style={{
        background: isActive ? tokens.activeItemBg : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: isActive ? tokens.activeItemText : hovered ? tokens.itemTextHover : tokens.itemText,
        boxShadow: isActive ? tokens.activeItemShadow : 'none',
      }}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="text-[12.5px] font-medium truncate">{label}</span>}
    </button>
  );
}
