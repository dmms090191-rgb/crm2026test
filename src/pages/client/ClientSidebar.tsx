import { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  MessageCircle,
  CalendarDays,
  CalendarClock,
  Hexagon,
  GraduationCap,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { ClientActiveView } from './ClientDashboard';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import { usePanelHiddenTabs } from '../../hooks/usePanelHiddenTabs';

interface ClientSidebarProps {
  activeView: ClientActiveView;
  onNavigate: (view: ClientActiveView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
  onBackToRoisAdmin?: () => void;
  visuBadgeLabel?: string;
  backLabel?: string;
  canHideTabs?: boolean;
  hideTabsTargetName?: string;
  hideTabsTargetUserId?: string | null;
}

interface NavItem {
  id: ClientActiveView;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'G\u00e9n\u00e9ral',
    items: [
      { id: 'vue-ensemble', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Communication',
    items: [
      { id: 'messagerie', label: 'Support', icon: <MessageCircle className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Rendez-vous',
    items: [
      { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-4 h-4" /> },
      { id: 'propositions-rdv', label: 'Propositions RDV', icon: <CalendarClock className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { id: 'tuto', label: 'Tuto', icon: <GraduationCap className="w-4 h-4" /> },
    ],
  },
];

export default function ClientSidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, onBackToRoisAdmin, visuBadgeLabel, backLabel, canHideTabs, hideTabsTargetName, hideTabsTargetUserId }: ClientSidebarProps) {
  const tokens = useThemeTokens();
  const { hiddenTabs, loaded: hiddenTabsLoaded, toggle: toggleHiddenTab } = usePanelHiddenTabs('client', null, hideTabsTargetUserId);
  const [hideEditMode, setHideEditMode] = useState(false);

  const visibleSections = useMemo(() => {
    if (hideEditMode || hiddenTabs.size === 0) return sections;
    return sections.map(s => ({ ...s, items: s.items.filter(i => !hiddenTabs.has(i.id)) })).filter(s => s.items.length > 0);
  }, [hiddenTabs, hideEditMode]);

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{
        background: tokens.sidebar.bg,
        borderRight: `1px solid ${tokens.sidebar.border}`,
        backdropFilter: 'blur(16px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: `1px solid ${tokens.sidebar.border}` }}
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg"
            style={{ boxShadow: '0 0 20px rgba(34,211,238,0.4)' }}
          >
            <Hexagon className="w-4 h-4 text-white fill-white/20" strokeWidth={2} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold tracking-tight truncate" style={{ color: tokens.sidebar.logoText }}>DesignSpace3D</p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: tokens.sidebar.logoSub }}>Espace Client</p>
          </div>
        )}
      </div>

      {!hiddenTabsLoaded ? (
        <ClientSidebarSkeleton collapsed={collapsed} tokens={tokens} />
      ) : (
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {visibleSections.map((section, si) => (
          <div key={section.title}>
            {si > 0 && (
              <div className="mx-2 my-2" style={{ height: '1px', background: tokens.sidebar.divider }} />
            )}
            {!collapsed && (
              <p className="px-2 pb-1 pt-2 text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: tokens.sidebar.sectionTitle }}>
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = activeView === item.id;
              const isHidden = hiddenTabs.has(item.id);
              const dimmed = hideEditMode && isHidden;
              return (
                <ClientNavItem
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                  dimmed={dimmed}
                  hideEditMode={hideEditMode}
                  isHidden={isHidden}
                  tokens={tokens}
                  onNavigate={() => { if (!hideEditMode) onNavigate(item.id); }}
                  onToggleHide={() => toggleHiddenTab(item.id)}
                />
              );
            })}
          </div>
        ))}
      </nav>
      )}

      <SidebarFooterActions
        collapsed={collapsed}
        onLogout={onLogout}
        onCollapse={onCollapse}
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

function ClientSidebarSkeleton({ collapsed, tokens: t }: { collapsed: boolean; tokens: ReturnType<typeof useThemeTokens> }) {
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

function ClientNavItem({ item, isActive, collapsed, dimmed, hideEditMode, isHidden, tokens, onNavigate, onToggleHide }: {
  item: { id: string; label: string; icon: React.ReactNode };
  isActive: boolean; collapsed: boolean; dimmed: boolean;
  hideEditMode: boolean; isHidden: boolean;
  tokens: ReturnType<typeof useThemeTokens>;
  onNavigate: () => void; onToggleHide: () => void;
}) {
  const [eyeHovered, setEyeHovered] = useState(false);

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
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 min-w-0 flex-1 ${hideEditMode ? 'pointer-events-none' : ''}`}
        tabIndex={hideEditMode ? -1 : 0}
      >
        <span className="flex-shrink-0 transition-all duration-150" style={{ color: isActive && !dimmed ? tokens.sidebar.activeItemIcon : tokens.sidebar.itemIcon }}>
          {item.icon}
        </span>
        {!collapsed && (
          <span className="text-sm font-medium truncate transition-colors duration-150" style={{ color: dimmed ? tokens.sidebar.itemText : (isActive ? tokens.sidebar.activeItemText : tokens.sidebar.itemText) }}>
            {item.label}
          </span>
        )}
      </button>
      {!collapsed && isActive && !hideEditMode && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: tokens.sidebar.activeItemDot, boxShadow: `0 0 6px ${tokens.sidebar.activeItemDot}` }} />
      )}
      {hideEditMode && !collapsed && (
        <button
          onClick={e => { e.stopPropagation(); onToggleHide(); }}
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
