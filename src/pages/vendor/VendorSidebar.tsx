import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Database, MessageSquare, MessageCircle,
  CalendarDays, CalendarClock, GraduationCap,
} from 'lucide-react';
import type { VendorActiveView } from './VendorDashboard';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import SidebarLayoutControls from '../../components/sidebar-v2/SidebarLayoutControls';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import SidebarPanelTitle from '../../components/layout/SidebarPanelTitle';
import { useSidebarLayout } from '../../hooks/useSidebarLayout';
import type { LayoutDefaultSection } from '../../lib/sidebarLayout';
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
  visuBadgeLabel?: string;
  backLabel?: string;
  canHideTabs?: boolean;
  hideTabsTargetName?: string;
  hideTabsTargetUserId?: string | null;
}

/**
 * Layout PAR DEFAUT du panel Commercial.
 *
 * Les `id` sont les identifiants techniques de navigation (VendorActiveView) :
 * ils ne changent jamais. Seuls le libelle affiche, l'ordre et le compartiment
 * sont definis ici. Les icones sont resolues au rendu, par id.
 */
const LAYOUT_SECTIONS: LayoutDefaultSection[] = [
  { title: 'Principal', items: [
    { id: 'vue-ensemble', label: "Vue d'ensemble" },
    { id: 'leads', label: 'Leads' },
  ] },
  { title: 'Rendez-vous', items: [
    { id: 'agenda', label: 'Agenda' },
    { id: 'propositions-rdv', label: 'Propositions RDV' },
  ] },
  { title: 'Contact', items: [
    { id: 'chat-admin', label: 'Chat Administration' },
    { id: 'chat-client', label: 'Chat Client' },
  ] },
  { title: 'Ressources', items: [
    { id: 'tuto', label: 'Tuto' },
  ] },
];

const ICONS: Record<string, React.ReactNode> = {
  'vue-ensemble': <LayoutDashboard className="w-4 h-4" />,
  'leads': <Database className="w-4 h-4" />,
  'agenda': <CalendarDays className="w-4 h-4" />,
  'propositions-rdv': <CalendarClock className="w-4 h-4" />,
  'chat-admin': <MessageSquare className="w-4 h-4" />,
  'chat-client': <MessageCircle className="w-4 h-4" />,
  'tuto': <GraduationCap className="w-4 h-4" />,
};

export default function VendorSidebar({
  activeView, onNavigate, collapsed, onCollapse, onLogout, vendorAuthId,
  onBackToRoisAdmin, visuBadgeLabel, backLabel, canHideTabs, hideTabsTargetUserId,
}: VendorSidebarProps) {
  const tokens = useThemeTokens();
  const [authUserId, setAuthUserId] = useState<string | null>(vendorAuthId ?? null);

  useEffect(() => {
    if (vendorAuthId) { setAuthUserId(vendorAuthId); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAuthUserId(user.id);
    });
  }, [vendorAuthId]);

  const sections = useMemo(() => LAYOUT_SECTIONS, []);
  // Entite REELLE : le Commercial visualise en Visu, sinon celui qui est connecte.
  const effectiveUserId = hideTabsTargetUserId ?? authUserId;
  const layout = useSidebarLayout({ panel: 'vendor', entityUserId: effectiveUserId, sections });

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{ background: tokens.sidebar.bg, borderRight: `1px solid ${tokens.sidebar.border}`, backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)' }}
    >
      <SidebarPanelTitle label="Vendeur" collapsed={collapsed} tokens={tokens} />

      {!layout.loaded ? (
        <VendorSidebarSkeleton collapsed={collapsed} tokens={tokens} />
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
          // Le Commercial connecte normalement reorganise, mais ne masque pas :
          // seul un niveau superieur autorise decide des onglets qui existent.
          canHide={canHideTabs === true}
          renderItem={(entry, isActive, label) => (
            <VendorItem
              entry={{ id: entry.id, label, icon: ICONS[entry.id] }}
              isActive={isActive}
              collapsed={collapsed}
              onClick={() => onNavigate(entry.id as VendorActiveView)}
              tokens={tokens}
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
        tokens={tokens}
        onBackToRoisAdmin={onBackToRoisAdmin}
        visuBadgeLabel={visuBadgeLabel}
        backLabel={backLabel}
      />
    </aside>
  );
}

function VendorSidebarSkeleton({ collapsed, tokens: t }: { collapsed: boolean; tokens: ReturnType<typeof useThemeTokens> }) {
  const rows = collapsed ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6];
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

function VendorItem({ entry, isActive, collapsed, onClick, tokens }: {
  entry: { id: string; label: string; icon: React.ReactNode };
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div
      className={`w-full flex items-center rounded-lg transition-all duration-150 group cursor-pointer ${collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'}`}
      style={isActive ? { background: tokens.sidebar.activeItemBg, boxShadow: tokens.sidebar.activeItemShadow } : undefined}
    >
      <button
        onClick={onClick}
        title={collapsed ? entry.label : undefined}
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <span className="flex-shrink-0 transition-all duration-150" style={{ color: isActive ? tokens.sidebar.activeItemIcon : tokens.sidebar.itemIcon }}>{entry.icon}</span>
        {!collapsed && <span className="text-sm font-medium truncate transition-colors duration-150" style={{ color: isActive ? tokens.sidebar.activeItemText : tokens.sidebar.itemText }}>{entry.label}</span>}
      </button>
      {!collapsed && isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: tokens.sidebar.activeItemDot, boxShadow: `0 0 6px ${tokens.sidebar.activeItemDot}` }} />
      )}
    </div>
  );
}
