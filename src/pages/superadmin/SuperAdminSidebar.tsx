import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Shield, UserCog, BookOpen, Monitor, HardDriveDownload, MessageSquare, CircleUser as UserCircle, FlaskConical, Building2, Settings, Bot, Globe, Blocks, LayoutTemplate, Brain, Image as ImageIcon, TrendingUp, GraduationCap, Smartphone, Palette, Sparkles, CopySlash } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSidebarOrder } from '../../hooks/useSidebarOrder';
import { useActiveLogo } from '../../hooks/useActiveLogo';
import SidebarReorderControls from '../../components/SidebarReorderControls';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import type { SidebarSection } from '../../lib/sidebarOrderTypes';
import { supabase } from '../../lib/supabase';
import { useEditorModeSafe, resolveTextColor, resolveTypography } from '../../contexts/EditorModeContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ensureGoogleFont } from '../../components/editor/EditorTypographyPanel';

export type SAView = 'dashboard' | 'super-admins' | 'admins' | 'chat-admin' | 'documentation-crm' | 'system' | 'sauvegarde' | 'mon-compte' | 'tests-systeme' | 'crm-societe' | 'statuts' | 'api-ia' | 'cerveau-ia' | 'sites' | 'fonctions-talvex' | 'site-talvex' | 'logo' | 'ameliorations' | 'tuto' | 'application' | 'themes' | 'editeur-ia' | 'calquer-logo';

interface SuperAdminSidebarProps {
  activeView: SAView;
  onNavigate: (view: SAView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
  editorZone1Bg?: string;
  editorZone2Bg?: string;
  logoZoneRef?: React.RefObject<HTMLDivElement | null>;
  sidebarBodyRef?: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_SECTIONS: SidebarSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard RA', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'logo', label: 'Logo RA', icon: <ImageIcon className="w-4 h-4" /> },
      { id: 'calquer-logo', label: 'Calquer logo RA', icon: <CopySlash className="w-4 h-4" /> },
      { id: 'site-talvex', label: 'Site RA', icon: <LayoutTemplate className="w-4 h-4" /> },
      { id: 'application', label: 'Application RA', icon: <Smartphone className="w-4 h-4" /> },
      { id: 'themes', label: 'Gestion themes RA', icon: <Palette className="w-4 h-4" /> },
      { id: 'tuto', label: 'Tuto RA', icon: <GraduationCap className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { id: 'super-admins', label: 'Liste Super Admins RA', icon: <Shield className="w-4 h-4" /> },
      { id: 'admins', label: 'Liste admins RA', icon: <UserCog className="w-4 h-4" /> },
      { id: 'mon-compte', label: 'Mon compte RA', icon: <UserCircle className="w-4 h-4" /> },
      { id: 'crm-societe', label: 'CRM Societe RA', icon: <Building2 className="w-4 h-4" /> },
      { id: 'sites', label: 'Sites & Domaines RA', icon: <Globe className="w-4 h-4" /> },
      { id: 'statuts', label: 'Statuts RA', icon: <Settings className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Contact',
    items: [
      { id: 'chat-admin', label: 'Chat Admin RA', icon: <MessageSquare className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Outils & Système',
    items: [
      { id: 'api-ia', label: 'API IA RA', icon: <Bot className="w-4 h-4" /> },
      { id: 'ameliorations', label: 'Ameliorations RA', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'fonctions-talvex', label: 'Fonctions Talvex RA', icon: <Blocks className="w-4 h-4" /> },
      { id: 'cerveau-ia', label: 'Cerveau IA SA RA', icon: <Brain className="w-4 h-4" /> },
      { id: 'editeur-ia', label: 'Editeur IA RA', icon: <Sparkles className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Maintenance',
    items: [
      { id: 'system', label: 'System RA', icon: <Monitor className="w-4 h-4" /> },
      { id: 'documentation-crm', label: 'Documentation CRM RA', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'tests-systeme', label: 'Tests Systeme RA', icon: <FlaskConical className="w-4 h-4" /> },
      { id: 'sauvegarde', label: 'Sauvegarde & restauration RA', icon: <HardDriveDownload className="w-4 h-4" /> },
    ],
  },
];

export default function SuperAdminSidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, editorZone1Bg, editorZone2Bg, logoZoneRef, sidebarBodyRef }: SuperAdminSidebarProps) {
  const t = useThemeTokens();
  const editorCtx = useEditorModeSafe();
  const { customThemeOverrides } = useTheme();
  const ctTextOverrides = customThemeOverrides?.text_overrides || {};
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const metaId = user.app_metadata?.company_id;
      if (metaId) setCompanyId(metaId);
    })();
  }, []);

  const { url: activeLogo, scale: logoScale } = useActiveLogo(companyId);

  const sections = useMemo(() => DEFAULT_SECTIONS, []);
  const order = useSidebarOrder({ role: 'super_admin', sections, userId });

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
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 0 20px rgba(245,158,11,0.4)' }}>
                <Shield className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
            </div>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-bold tracking-tight truncate" style={{ color: t.sidebar.logoText }}>ROIS ADMIN</p>
                <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: t.sidebar.logoSub }}>Plateforme SaaS</p>
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
        <SidebarReorderControls
          entries={order.entries} reordering={order.reordering} collapsed={collapsed}
          activeId={activeView} onNavigate={id => onNavigate(id as SAView)}
          startReorder={order.startReorder} cancelReorder={order.cancelReorder} confirmReorder={order.confirmReorder}
          move={order.move} handleDragStart={order.handleDragStart} handleDragOver={order.handleDragOver} handleDragEnd={order.handleDragEnd}
          draftLength={order.draftLength}
          renameEntry={order.renameEntry} addSection={order.addSection} addDivider={order.addDivider} removeEntry={order.removeEntry}
          resetToDefault={order.resetToDefault}
          dragSourceIdx={order.dragSourceIdx} dropTargetIdx={order.dropTargetIdx} dropEdge={order.dropEdge}
          sectionColorMap={sectionColorMap}
          sectionFontFamily={categoryFont}
          renderItem={(entry, isActive) => (
            <SAItem id={entry.id} label={entry.label} icon={entry.icon} isActive={isActive} collapsed={collapsed} onClick={() => onNavigate(entry.id as SAView)} tokens={t.sidebar} editorCtx={editorCtx} mergedTextOverrides={mergedTextOverrides} itemFontFamily={itemFont} />
          )}
        />

        <SidebarFooterActions
          collapsed={collapsed}
          onLogout={onLogout}
          onCollapse={onCollapse}
          onReorganize={order.startReorder}
          reordering={order.reordering}
          tokens={t}
          rdrFontFamily={rdrFont}
        />
      </div>
    </aside>
  );
}

function SAItem({ id, label, icon, isActive, collapsed, onClick, tokens, editorCtx, mergedTextOverrides, itemFontFamily }: {
  id: string; label: string; icon: React.ReactNode; isActive: boolean; collapsed: boolean; onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>['sidebar'];
  editorCtx: ReturnType<typeof useEditorModeSafe>;
  mergedTextOverrides: Record<string, string>;
  itemFontFamily?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const textColorOverride = resolveTextColor(`item:${id}`, mergedTextOverrides, editorCtx?.textPreview || {});
  const baseColor = isActive ? tokens.activeItemText : hovered ? tokens.itemTextHover : tokens.itemText;
  const finalColor = textColorOverride || baseColor;

  return (
    <button onClick={onClick} title={collapsed ? label : undefined} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      data-testid={id === 'admins' ? 'liste-admins-tab' : undefined}
      data-sidebar-item={id}
      className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 mb-0.5 ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-[7px]'}`}
      style={{ background: isActive ? tokens.activeItemBg : hovered ? 'rgba(255,255,255,0.04)' : 'transparent', color: finalColor, boxShadow: isActive ? tokens.activeItemShadow : 'none' }}>
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="text-[12.5px] font-medium truncate" style={{ fontFamily: itemFontFamily ? `"${itemFontFamily}", sans-serif` : undefined }}>{label}</span>}
    </button>
  );
}

