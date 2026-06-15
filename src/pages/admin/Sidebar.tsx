import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Info, UserPlus, Upload, Users, Database, UserCheck, List,
  MessageCircle, MessageSquare, Shield, Calendar, CalendarRange, CalendarCheck,
  Settings, Hexagon, Globe, Brain, Image as ImageIcon, GraduationCap, Smartphone, Sparkles, CopySlash,
  Eye, EyeOff,
} from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSidebarOrder } from '../../hooks/useSidebarOrder';
import { useActiveLogo } from '../../hooks/useActiveLogo';
import { useCompanyId } from '../../hooks/useCompanyId';
import SidebarReorderControls from '../../components/SidebarReorderControls';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import type { SidebarSection, SidebarEntry } from '../../lib/sidebarOrderTypes';
import type { ActiveView } from './AdminDashboard';
import { supabase } from '../../lib/supabase';
import { usePanelHiddenTabs } from '../../hooks/usePanelHiddenTabs';
import { useEditorModeSafe, resolveTextColor, resolveTypography } from '../../contexts/EditorModeContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ensureGoogleFont } from '../../components/editor/EditorTypographyPanel';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
  editorZone1Bg?: string;
  editorZone2Bg?: string;
  logoZoneRef?: React.RefObject<HTMLDivElement | null>;
  sidebarBodyRef?: React.RefObject<HTMLDivElement | null>;
  onBackToRoisAdmin?: () => void;
  backLabel?: string;
  visuBadgeLabel?: string;
  canHideTabs?: boolean;
  hideTabsTargetName?: string;
  hideTabsTargetUserId?: string | null;
}

const DEFAULT_SECTIONS: SidebarSection[] = [
  { title: 'Principal', items: [
    { id: 'vue-ensemble', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'site', label: 'Site', icon: <Globe className="w-4 h-4" /> },
    { id: 'logo', label: 'Logo', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'calquer-logo', label: 'Calquer logo', icon: <CopySlash className="w-4 h-4" /> },
    { id: 'application', label: 'Application', icon: <Smartphone className="w-4 h-4" /> },
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
    { id: 'cerveau-ia', label: 'Cerveau IA AD', icon: <Brain className="w-4 h-4" /> },
    { id: 'editeur-ia', label: 'Editeur IA', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'tuto', label: 'Tuto', icon: <GraduationCap className="w-4 h-4" /> },
  ] },
];

export default function Sidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, editorZone1Bg, editorZone2Bg, logoZoneRef, sidebarBodyRef, onBackToRoisAdmin, backLabel, visuBadgeLabel, canHideTabs, hideTabsTargetName, hideTabsTargetUserId }: SidebarProps) {
  const t = useThemeTokens();
  const editorCtx = useEditorModeSafe();
  const { customThemeOverrides } = useTheme();
  const ctTextOverrides = customThemeOverrides?.text_overrides || {};
  const companyId = useCompanyId();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { url: activeLogo, scale: logoScale } = useActiveLogo(companyId);

  const { hiddenTabs, loaded: hiddenTabsLoaded, toggle: toggleHiddenTab } = usePanelHiddenTabs('admin', companyId, hideTabsTargetUserId);
  const [hideEditMode, setHideEditMode] = useState(false);

  const sections = useMemo(() => DEFAULT_SECTIONS, []);
  const order = useSidebarOrder({ role: 'admin', sections, userId, companyId });

  const mergedTextOverrides = useMemo(() => {
    const base = { ...ctTextOverrides };
    if (editorCtx) Object.assign(base, editorCtx.textOverrides);
    return base;
  }, [ctTextOverrides, editorCtx?.textOverrides]);

  const sectionColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const section of DEFAULT_SECTIONS) {
      const color = resolveTextColor(`cat:${section.title}`, mergedTextOverrides, editorCtx?.textPreview || {});
      if (color) map[section.title] = color;
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [mergedTextOverrides, editorCtx?.textPreview]);

  const categoryFont = resolveTypography('category', editorCtx?.typographyOverrides ?? {}, editorCtx?.typographyPreview ?? {});
  const itemFont = resolveTypography('item', editorCtx?.typographyOverrides ?? {}, editorCtx?.typographyPreview ?? {});
  const rdrFont = resolveTypography('rdr', editorCtx?.typographyOverrides ?? {}, editorCtx?.typographyPreview ?? {});

  useEffect(() => {
    [categoryFont, itemFont, rdrFont].forEach(f => { if (f) ensureGoogleFont(f); });
  }, [categoryFont, itemFont, rdrFont]);

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{ borderRight: `1px solid ${t.sidebar.border}`, backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)' }}
    >
      <div
        ref={logoZoneRef}
        className={`flex items-center h-16 flex-shrink-0 overflow-hidden ${activeLogo ? (collapsed ? 'justify-center px-2' : 'justify-center px-3') : 'gap-3 px-4'}`}
        style={{ background: editorZone1Bg || t.sidebar.bg, borderBottom: `1px solid ${t.sidebar.border}` }}
      >
        {activeLogo ? (
          <img
            src={activeLogo}
            alt="Logo"
            className={`object-contain transition-transform duration-200 ${collapsed ? 'h-9 max-w-[40px]' : 'max-h-[44px] max-w-[180px]'}`}
            style={{ transform: `scale(${logoScale})` }}
          />
        ) : (
          <>
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
          </>
        )}
      </div>

      <div
        ref={sidebarBodyRef}
        className="flex-1 flex flex-col min-h-0"
        style={{ background: editorZone2Bg || t.sidebar.bg }}
      >
        {!hiddenTabsLoaded ? (
          <SidebarSkeleton collapsed={collapsed} tokens={t} />
        ) : (
        <SidebarReorderControls
          entries={hideEditMode ? order.entries : filterHidden(order.entries, hiddenTabs)} reordering={order.reordering} collapsed={collapsed}
          activeId={activeView} onNavigate={id => onNavigate(id as ActiveView)}
          startReorder={order.startReorder} cancelReorder={order.cancelReorder} confirmReorder={order.confirmReorder}
          move={order.move} handleDragStart={order.handleDragStart} handleDragOver={order.handleDragOver} handleDragEnd={order.handleDragEnd}
          draftLength={order.draftLength}
          renameEntry={order.renameEntry} addSection={order.addSection} addDivider={order.addDivider} removeEntry={order.removeEntry}
          resetToDefault={order.resetToDefault}
          dragSourceIdx={order.dragSourceIdx} dropTargetIdx={order.dropTargetIdx} dropEdge={order.dropEdge}
          sectionColorMap={sectionColorMap}
          sectionFontFamily={categoryFont}
          renderItem={(entry, isActive) => (
            <AdminItem
              entry={entry} isActive={isActive} collapsed={collapsed}
              onClick={() => { if (!hideEditMode) onNavigate(entry.id as ActiveView); }}
              tokens={t.sidebar} editorCtx={editorCtx} mergedTextOverrides={mergedTextOverrides} itemFontFamily={itemFont}
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
          tokens={t}
          rdrFontFamily={rdrFont}
          onBackToRoisAdmin={onBackToRoisAdmin}
          backLabel={backLabel}
          visuBadgeLabel={visuBadgeLabel}
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

function SidebarSkeleton({ collapsed, tokens: t }: { collapsed: boolean; tokens: ReturnType<typeof useThemeTokens> }) {
  const rows = collapsed ? [1,2,3,4,5,6] : [1,2,3,4,5,6,7,8];
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

function AdminItem({ entry, isActive, collapsed, onClick, tokens, editorCtx, mergedTextOverrides, itemFontFamily, hideEditMode, isHidden, onToggleHide }: {
  entry: { id: string; label: string; icon: React.ReactNode }; isActive: boolean; collapsed: boolean; onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>['sidebar'];
  editorCtx: ReturnType<typeof useEditorModeSafe>;
  mergedTextOverrides: Record<string, string>;
  itemFontFamily?: string;
  hideEditMode?: boolean;
  isHidden?: boolean;
  onToggleHide?: () => void;
}) {
  const [eyeHovered, setEyeHovered] = useState(false);
  const textColorOverride = resolveTextColor(`item:${entry.id}`, mergedTextOverrides, editorCtx?.textPreview || {});
  const baseTextColor = isActive ? tokens.activeItemText : tokens.itemText;
  const finalColor = textColorOverride || baseTextColor;
  const dimmed = hideEditMode && isHidden;

  return (
    <div
      data-sidebar-item={entry.id}
      className={`w-full flex items-center rounded-lg transition-all duration-150 group ${collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'}`}
      style={{
        ...(isActive && !hideEditMode ? { background: tokens.activeItemBg, boxShadow: tokens.activeItemShadow } : {}),
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
        <span className="flex-shrink-0 transition-all duration-150" style={{ color: dimmed ? tokens.itemIcon : (textColorOverride || (isActive ? tokens.activeItemIcon : tokens.itemIcon)) }}>{entry.icon}</span>
        {!collapsed && <span className="text-sm font-medium truncate transition-colors duration-150" style={{ color: dimmed ? tokens.itemText : finalColor, fontFamily: itemFontFamily ? `"${itemFontFamily}", sans-serif` : undefined }}>{entry.label}</span>}
      </button>
      {!collapsed && isActive && !hideEditMode && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: tokens.activeItemDot, boxShadow: `0 0 6px ${tokens.activeItemDot}` }} />}
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

