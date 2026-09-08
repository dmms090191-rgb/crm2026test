import { useState, useMemo } from 'react';
import { LayoutDashboard, Users, UserCog, Smartphone, Globe, MessageSquare, Crown, Eye, EyeOff, Tag } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import SidebarLayoutControls from '../../components/sidebar-v2/SidebarLayoutControls';
import { useSidebarLayout } from '../../hooks/useSidebarLayout';
import type { LayoutDefaultSection } from '../../lib/sidebarLayout';
import type { ImpersonatedCompanySuperAdmin } from '../../App';
import SidebarPanelTitle from '../../components/layout/SidebarPanelTitle';

export type CSAView = 'overview' | 'admins' | 'info' | 'chat-admin' | 'chat-rois-admin' | 'application' | 'site' | 'statuts';

/**
 * Structure par defaut du panel Groupe — moteur V2.
 * Les icones vivent hors de la structure : celle-ci doit rester serialisable.
 */
const LAYOUT_SECTIONS: LayoutDefaultSection[] = [
  { title: 'Principal', items: [
    { id: 'overview', label: 'Dashboard' },
    { id: 'info', label: 'Accès & sécurité' },
  ] },
  { title: 'Sociétés', items: [
    { id: 'statuts', label: 'Statuts' },
    { id: 'admins', label: 'Gestion des sociétés' },
  ] },
  { title: 'Contact', items: [
    { id: 'chat-rois-admin', label: 'Chat Talvex Administrateur' },
    { id: 'chat-admin', label: 'Chat Sociétés' },
  ] },
  { title: 'Configuration', items: [
    { id: 'application', label: 'Application' },
    { id: 'site', label: 'Site' },
  ] },
];

const ICONS: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard className="w-4 h-4" />,
  info: <UserCog className="w-4 h-4" />,
  statuts: <Tag className="w-4 h-4" />,
  admins: <Users className="w-4 h-4" />,
  'chat-rois-admin': <Crown className="w-4 h-4" />,
  'chat-admin': <MessageSquare className="w-4 h-4" />,
  application: <Smartphone className="w-4 h-4" />,
  site: <Globe className="w-4 h-4" />,
};

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
  /** Conserves pour compatibilite d'appel. En V2 le masquage vit dans Reorganiser. */
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
  impersonated, onBackToRoisAdmin, visuBadgeLabel, backLabel,
  logoZoneRef, sidebarBodyRef, zone1Bg, zone2Bg, badgeCounts, canHideTabs,
}: CSASidebarProps) {
  const t = useThemeTokens();
  const sections = useMemo(() => LAYOUT_SECTIONS, []);

  // Moteur V2, scope sur l'ENTITE : la ligne user_preferences du Groupe
  // visualise, cle sidebar_orders["v2:company_super_admin"].
  // En Visu, impersonated.id est bien le Groupe, jamais le compte Talvex.
  const layout = useSidebarLayout({
    panel: 'company_super_admin',
    entityUserId: impersonated.id,
    sections,
  });

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{ borderRight: `1px solid ${t.sidebar.border}`, backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)' }}
    >
      <div ref={logoZoneRef}>
        <SidebarPanelTitle label="Groupe" collapsed={collapsed} tokens={t} background={zone1Bg || undefined} />
      </div>

      <div ref={sidebarBodyRef} className="flex-1 flex flex-col min-h-0" style={{ background: zone2Bg || t.sidebar.bg }}>
        {!layout.loaded ? (
          <CSASidebarSkeleton collapsed={collapsed} tokens={t} />
        ) : (
        <SidebarLayoutControls
          entries={layout.reordering ? layout.draft : layout.visible}
          reordering={layout.reordering}
          collapsed={collapsed}
          activeId={activeView}
          defaultLabels={layout.defaultLabels}
          cancelReorder={layout.cancelReorder}
          confirmReorder={layout.confirmReorder}
          resetToDefault={layout.resetToDefault}
          move={layout.move}
          addSection={layout.addSection}
          addDivider={layout.addDivider}
          remove={layout.remove}
          rename={layout.rename}
          toggleHidden={layout.toggleHidden}
          // Masquer pilote la disponibilite des fonctionnalites : Talvex seul.
          canHide={canHideTabs === true}
          renderItem={(entry, isActive, label) => (
            <CSANavItem
              id={entry.id}
              label={label}
              icon={ICONS[entry.id]}
              isActive={isActive}
              collapsed={collapsed}
              onClick={() => onNavigate(entry.id as CSAView)}
              tokens={t.sidebar}
              badgeCount={badgeCounts?.[entry.id]}
            />
          )}
        />
        )}

        <SidebarFooterActions
          collapsed={collapsed}
          onLogout={onLogout}
          onCollapse={onCollapse}
          onReorganize={layout.startReorder}
          reordering={layout.reordering}
          tokens={t}
          onBackToRoisAdmin={onBackToRoisAdmin}
          visuBadgeLabel={visuBadgeLabel}
          backLabel={backLabel}
        />
      </div>
    </aside>
  );
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

function CSANavItem({ label, icon, isActive, collapsed, onClick, tokens, hideEditMode, isHidden, onToggleHide, badgeCount }: {
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
