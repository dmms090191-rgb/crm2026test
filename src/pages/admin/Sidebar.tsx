import { useState, useEffect, useMemo } from 'react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { peutOuvrirCrmImmo, accesResolu, type EtatAcces } from '../../lib/crmImmoAccess';
import { sectionsAvecCrmImmo } from '../../lib/crmImmoSidebar';
import SidebarLayoutControls from '../../components/sidebar-v2/SidebarLayoutControls';
import { SidebarSkeleton, AdminItem } from './AdminSidebarItem';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import SidebarPanelTitle from '../../components/layout/SidebarPanelTitle';
import { useSidebarLayout } from '../../hooks/useSidebarLayout';
/* La definition de navigation vit hors de ce composant : le telephone la lit aussi. */
import { LAYOUT_SECTIONS, ICONS } from './navigationAdmin';
import { defaultEntries } from '../../lib/sidebarLayout';
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
  /*
   * Le droit d'ouvrir CRM Immo, calcule une seule fois dans AdminDashboard et
   * partage avec le renderer. C'est LUI qui decide si l'entree existe, et non
   * le drapeau `hidden` : voir le useMemo des sections.
   */
  crmImmoAcces?: EtatAcces;
  hideTabsTargetName?: string;
  hideTabsTargetUserId?: string | null;
}

export default function Sidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, editorZone1Bg, editorZone2Bg, logoZoneRef, sidebarBodyRef, onBackToRoisAdmin, backLabel, visuBadgeLabel, canHideTabs, crmImmoAcces = 'inconnu', hideTabsTargetUserId }: SidebarProps) {
  const t = useThemeTokens();
  const editorCtx = useEditorModeSafe();
  const { customThemeOverrides } = useTheme();
  const ctTextOverrides = customThemeOverrides?.text_overrides || {};
  const [userId, setUserId] = useState<string | null>(null);

  /* getSession et non getUser : on ne veut QUE l'identifiant, et il est deja dans le
     jeton en stockage. getUser interroge le serveur, et tous les appels auth de
     supabase-js passent par un verrou global que chaque requete REST doit prendre a son
     tour pour obtenir son jeton — un aller-retour ici retarde donc TOUTES les requetes
     du panel, pas seulement celle-ci. */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);


  /*
   * ---------- L'ONGLET CRM IMMO VIENT DU DROIT, JAMAIS DE `hidden` ----------
   *
   * Il serait tentant de le declarer { id: 'crm-immo', hidden: true } ci-dessus et
   * de laisser Talvex le demasquer. Ce serait un piege, mesure sur pieces :
   *
   *   - le bouton « Par defaut » de la reorganisation n'est garde par RIEN
   *     (SidebarLayoutControls : son voisin l'est, lui non) ;
   *   - resetToDefault remplace le brouillon par la DECLARATION, drapeaux `hidden`
   *     compris (useSidebarLayout) ;
   *   - confirmReorder enregistre le brouillon tel quel, « const next = draft »,
   *     sans aucune fusion.
   *
   * Deux clics d'une Societe — « Par defaut » puis « Valider » — lui retireraient
   * donc son propre module, en base, sans qu'elle comprenne pourquoi. Le droit ne
   * doit pas vivre dans un reglage d'organisation visuelle.
   *
   * L'entree n'est donc pas masquee : elle n'est pas EMISE. Et `hidden` continue de
   * servir a ce qu'il sert — ranger un onglet qu'on possede.
   *
   * Compartiment « Principal », a cote de Boutique et Cabinet : CRM Immo est un
   * module metier autonome. Le ranger sous « Gestion des leads » contredirait a
   * l'oeil la regle fondatrice du module — il ne se melange pas aux leads.
   *
   * La dependance est le seul BOOLEEN, pas l'etat a quatre valeurs : l'identite du
   * tableau doit rester stable entre deux rendus, sinon `defaults` change a chaque
   * fois et l'effet de chargement de useSidebarLayout se relance en boucle — une
   * panne invisible a l'ecran, visible seulement au reseau.
   */
  const crmImmoOuvert = peutOuvrirCrmImmo(crmImmoAcces);
  const crmImmoResolu = accesResolu(crmImmoAcces);
  const sections = useMemo(() => sectionsAvecCrmImmo(LAYOUT_SECTIONS, crmImmoOuvert), [crmImmoOuvert]);
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
        {/*
          On attend AUSSI que le droit soit resolu, et pas seulement le layout.
          Valider un ordre d'onglets pendant que `crm-immo` n'existe pas encore dans
          `sections` ecrirait un blob SANS lui ; reconcileLayout le re-ajouterait
          ensuite en FIN de liste, hors de son compartiment, et la Societe ne saurait
          pas pourquoi son onglet a demenage. La RPC part en parallele du chargement
          du layout, qui interroge deja la base : le cout est de l'ordre du bruit.
        */}
        {!layout.loaded || !crmImmoResolu ? (
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


