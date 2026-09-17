import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Info, UserPlus, Upload, Users, Database, UserCheck, List,
  MessageCircle, MessageSquare, Shield, Calendar, CalendarRange, CalendarCheck,
  Settings, Globe, Brain, Image as ImageIcon, GraduationCap, Smartphone, Sparkles, CopySlash, Store,
} from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import SidebarLayoutControls from '../../components/sidebar-v2/SidebarLayoutControls';
import { SidebarSkeleton, AdminItem } from './AdminSidebarItem';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import SidebarPanelTitle from '../../components/layout/SidebarPanelTitle';
import { useSidebarLayout } from '../../hooks/useSidebarLayout';
import { defaultEntries } from '../../lib/sidebarLayout';
import type { LayoutDefaultSection } from '../../lib/sidebarLayout';
import type { ActiveView } from './AdminDashboard';
import { supabase } from '../../lib/supabase';
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

/**
 * Layout PAR DEFAUT du panel Societe.
 *
 * Les `id` sont les identifiants techniques de navigation (ActiveView) : ils ne
 * changent jamais. Seuls le libelle affiche, l'ordre et le compartiment sont
 * definis ici.
 *
 * `hidden: true` = onglet present dans le layout par defaut mais masque au
 * demarrage. Il reste connu du moteur — donc jamais retire d'une configuration
 * deja enregistree — et se demasque depuis « Reorganiser ».
 */
const LAYOUT_SECTIONS: LayoutDefaultSection[] = [
  { title: 'Principal', items: [
    { id: 'vue-ensemble', label: 'Dashboard' },
    { id: 'info-admin', label: 'Accès & sécurité' },
    { id: 'boutique', label: 'Boutique' },
    // Site : module normal, visible par defaut. Talvex Administrateur peut toujours le masquer ;
    // une configuration deja enregistree garde son propre etat (reconcileLayout).
    { id: 'site', label: 'Site' },
    { id: 'logo', label: 'Logo', hidden: true },
    { id: 'calquer-logo', label: 'Calquer logo', hidden: true },
    { id: 'application', label: 'Application', hidden: true },
  ] },
  { title: 'Gestion des leads', items: [
    { id: 'inscription', label: 'Inscriptions leads' },
    { id: 'import-leads', label: 'Import CSV de leads' },
    { id: 'ajouter-leads', label: 'Nouveau lead' },
    { id: 'crm', label: 'CRM Leads' },
    { id: 'statuts', label: 'Statuts' },
  ] },
  { title: 'Équipe commerciale', items: [
    { id: 'ajouter-vendeur', label: 'Ajouter un commercial' },
    { id: 'liste-vendeurs', label: 'Liste des commerciaux' },
  ] },
  { title: 'Communication', items: [
    { id: 'chat-client', label: 'Chat Client' },
    { id: 'chat-vendeur', label: 'Chat Commercial' },
    { id: 'chat-super-admin', label: 'Chat Direction' },
  ] },
  { title: 'Agenda', items: [
    { id: 'agenda', label: 'Mon agenda' },
    { id: 'agenda-equipe', label: 'Agenda de l’équipe' },
    { id: 'propositions-rdv', label: 'Propositions de RDV' },
    { id: 'cerveau-ia', label: 'Cerveau IA AD', hidden: true },
    { id: 'editeur-ia', label: 'Editeur IA', hidden: true },
    { id: 'tuto', label: 'Tuto', hidden: true },
  ] },
];

const ICONS: Record<string, React.ReactNode> = {
  'vue-ensemble': <LayoutDashboard className="w-4 h-4" />,
  'boutique': <Store className="w-4 h-4" />,
  'site': <Globe className="w-4 h-4" />,
  'logo': <ImageIcon className="w-4 h-4" />,
  'calquer-logo': <CopySlash className="w-4 h-4" />,
  'application': <Smartphone className="w-4 h-4" />,
  'info-admin': <Info className="w-4 h-4" />,
  'inscription': <UserPlus className="w-4 h-4" />,
  'import-leads': <Upload className="w-4 h-4" />,
  'ajouter-leads': <Users className="w-4 h-4" />,
  'crm': <Database className="w-4 h-4" />,
  'ajouter-vendeur': <UserCheck className="w-4 h-4" />,
  'liste-vendeurs': <List className="w-4 h-4" />,
  'chat-client': <MessageCircle className="w-4 h-4" />,
  'chat-vendeur': <MessageSquare className="w-4 h-4" />,
  'chat-super-admin': <Shield className="w-4 h-4" />,
  'agenda': <Calendar className="w-4 h-4" />,
  'agenda-equipe': <CalendarRange className="w-4 h-4" />,
  'propositions-rdv': <CalendarCheck className="w-4 h-4" />,
  'statuts': <Settings className="w-4 h-4" />,
  'cerveau-ia': <Brain className="w-4 h-4" />,
  'editeur-ia': <Sparkles className="w-4 h-4" />,
  'tuto': <GraduationCap className="w-4 h-4" />,
};

export default function Sidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, editorZone1Bg, editorZone2Bg, logoZoneRef, sidebarBodyRef, onBackToRoisAdmin, backLabel, visuBadgeLabel, canHideTabs, hideTabsTargetUserId }: SidebarProps) {
  const t = useThemeTokens();
  const editorCtx = useEditorModeSafe();
  const { customThemeOverrides } = useTheme();
  const ctTextOverrides = customThemeOverrides?.text_overrides || {};
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);


  const sections = useMemo(() => LAYOUT_SECTIONS, []);
  // Entite REELLE : la Societe visualisee en Visu, sinon la Societe connectee.
  const effectiveUserId = hideTabsTargetUserId ?? userId;
  const layout = useSidebarLayout({ panel: 'admin', entityUserId: effectiveUserId, sections });

  const mergedTextOverrides = useMemo(() => {
    const base = { ...ctTextOverrides };
    if (editorCtx) Object.assign(base, editorCtx.textOverrides);
    return base;
  }, [ctTextOverrides, editorCtx?.textOverrides]);

  // Couleurs d'editeur indexees par ID de compartiment : renommer un
  // compartiment ne casse donc plus la correspondance.
  const sectionColorById = useMemo(() => {
    const defs = defaultEntries(LAYOUT_SECTIONS);
    const map: Record<string, string> = {};
    let i = 0;
    for (const e of defs) {
      if (e.kind !== 'section') continue;
      const title = LAYOUT_SECTIONS[i++].title;
      const color = resolveTextColor(`cat:${title}`, mergedTextOverrides, editorCtx?.textPreview || {});
      if (color) map[e.id] = color;
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
      <div ref={logoZoneRef}>
        <SidebarPanelTitle label="Société" collapsed={collapsed} tokens={t} background={editorZone1Bg || undefined} />
      </div>

      <div
        ref={sidebarBodyRef}
        className="flex-1 flex flex-col min-h-0"
        style={{ background: editorZone2Bg || t.sidebar.bg }}
      >
        {!layout.loaded ? (
          <SidebarSkeleton collapsed={collapsed} tokens={t} />
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
          sectionColorById={sectionColorById}
          sectionFontFamily={categoryFont}
          renderItem={(entry, isActive, label) => (
            <AdminItem
              entry={{ id: entry.id, label, icon: ICONS[entry.id] }}
              isActive={isActive} collapsed={collapsed}
              onClick={() => onNavigate(entry.id as ActiveView)}
              tokens={t.sidebar} editorCtx={editorCtx} mergedTextOverrides={mergedTextOverrides} itemFontFamily={itemFont}
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
          rdrFontFamily={rdrFont}
          onBackToRoisAdmin={onBackToRoisAdmin}
          backLabel={backLabel}
          visuBadgeLabel={visuBadgeLabel}
        />
      </div>
    </aside>
  );
}


