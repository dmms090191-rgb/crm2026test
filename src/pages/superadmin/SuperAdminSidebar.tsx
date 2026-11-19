import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Shield, UserCog, BookOpen, Monitor, HardDriveDownload, MessageSquare, CircleUser as UserCircle, FlaskConical, Building2, Settings, Bot, Globe, Blocks, LayoutTemplate, Brain, Image as ImageIcon, TrendingUp, GraduationCap, Smartphone, Palette, Sparkles, CopySlash, FolderOpen } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useActiveLogo } from '../../hooks/useActiveLogo';
import SidebarLayoutControls from '../../components/sidebar-v2/SidebarLayoutControls';
import { SASidebarSkeleton, SAItem } from './SuperAdminSidebarItem';
import SidebarFooterActions from '../../components/layout/SidebarFooterActions';
import { useSidebarLayout } from '../../hooks/useSidebarLayout';
import { defaultEntries } from '../../lib/sidebarLayout';
import type { LayoutDefaultSection } from '../../lib/sidebarLayout';
import { supabase } from '../../lib/supabase';
import { useEditorModeSafe, resolveTextColor, resolveTypography } from '../../contexts/EditorModeContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ensureGoogleFont } from '../../components/editor/EditorTypographyPanel';
import { isProtectedTab, PROTECTED_TAB_IDS } from './useSAHiddenTabs';
import { useTalixySidebar } from '../../talixy/useTalixySidebar';
import { useArcMetrics } from '../../talixy/useArcMetrics';
import TalixyArcLine from '../../talixy/TalixyArcLine';

export type SAView = 'dashboard' | 'super-admins' | 'admins' | 'chat-admin' | 'documentation-crm' | 'system' | 'sauvegarde' | 'mon-compte' | 'tests-systeme' | 'crm-societe' | 'statuts' | 'api-ia' | 'cerveau-ia' | 'sites' | 'fonctions-talvex' | 'site-talvex' | 'logo' | 'ameliorations' | 'tuto' | 'application' | 'themes' | 'editeur-ia' | 'calquer-logo' | 'mes-logos-ra';

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
  badgeCounts?: Record<string, number>;
  /** Identite deja connue d'App : valeurs INITIALES de userId et companyId (le getSession reste). */
  initialUserId?: string | null;
  initialCompanyId?: string | null;
}

/* Compartiments et onglets par defaut. EXPORTES : la navigation mobile part de la meme base. */
export const LAYOUT_SECTIONS: LayoutDefaultSection[] = [
  { title: 'Principal', items: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'mon-compte', label: 'Accès & sécurité' },
    { id: 'logo', label: 'Logo' },
    { id: 'calquer-logo', label: 'Calquer logo' },
    { id: 'mes-logos-ra', label: 'Mes logos' },
    { id: 'site-talvex', label: 'Site' },
    { id: 'application', label: 'Application' },
    { id: 'themes', label: 'Gestion des thèmes' },
    { id: 'tuto', label: 'Tuto' },
  ] },
  { title: 'Gestion', items: [
    { id: 'super-admins', label: 'Liste des groupes' },
    { id: 'statuts', label: 'Gestion des statuts' },
    { id: 'admins', label: 'Liste admins' },
    { id: 'crm-societe', label: 'CRM Sociétés' },
    { id: 'sites', label: 'Sites & Domaines' },
  ] },
  { title: 'Communication', items: [
    { id: 'chat-admin', label: 'Chat Groupes' },
  ] },
  { title: 'Maintenance', items: [
    { id: 'documentation-crm', label: 'Documentation CRM' },
    { id: 'system', label: 'Système' },
    { id: 'tests-systeme', label: 'Tests Système' },
    { id: 'sauvegarde', label: 'Sauvegarde & restauration' },
  ] },
  { title: 'Outils & Système', items: [
    { id: 'api-ia', label: 'API IA' },
    { id: 'ameliorations', label: 'Améliorations' },
    { id: 'fonctions-talvex', label: 'Fonctions Talvex' },
    { id: 'cerveau-ia', label: 'Cerveau IA Talvex' },
    { id: 'editeur-ia', label: 'Éditeur IA' },
  ] },
];

/*
 * Icones des onglets, par id. EXPORTEES : le mini arc mobile lit exactement la meme carte, pour
 * que le telephone montre les memes icones que le bureau — une seule source, jamais deux.
 */
export const ICONS: Record<string, React.ReactNode> = {
  'dashboard': <LayoutDashboard className="w-4 h-4" />,
  'mon-compte': <UserCircle className="w-4 h-4" />,
  'logo': <ImageIcon className="w-4 h-4" />,
  'calquer-logo': <CopySlash className="w-4 h-4" />,
  'mes-logos-ra': <FolderOpen className="w-4 h-4" />,
  'site-talvex': <LayoutTemplate className="w-4 h-4" />,
  'application': <Smartphone className="w-4 h-4" />,
  'themes': <Palette className="w-4 h-4" />,
  'tuto': <GraduationCap className="w-4 h-4" />,
  'super-admins': <Shield className="w-4 h-4" />,
  'statuts': <Settings className="w-4 h-4" />,
  'admins': <UserCog className="w-4 h-4" />,
  'crm-societe': <Building2 className="w-4 h-4" />,
  'sites': <Globe className="w-4 h-4" />,
  'chat-admin': <MessageSquare className="w-4 h-4" />,
  'documentation-crm': <BookOpen className="w-4 h-4" />,
  'system': <Monitor className="w-4 h-4" />,
  'tests-systeme': <FlaskConical className="w-4 h-4" />,
  'sauvegarde': <HardDriveDownload className="w-4 h-4" />,
  'api-ia': <Bot className="w-4 h-4" />,
  'ameliorations': <TrendingUp className="w-4 h-4" />,
  'fonctions-talvex': <Blocks className="w-4 h-4" />,
  'cerveau-ia': <Brain className="w-4 h-4" />,
  'editeur-ia': <Sparkles className="w-4 h-4" />,
};


export default function SuperAdminSidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout, editorZone1Bg, editorZone2Bg, logoZoneRef, sidebarBodyRef, badgeCounts, initialUserId = null, initialCompanyId = null }: SuperAdminSidebarProps) {
  const t = useThemeTokens();
  const editorCtx = useEditorModeSafe();
  const { customThemeOverrides } = useTheme();
  const ctTextOverrides = customThemeOverrides?.text_overrides || {};
  /*
   * GRAINES : l'identite qu'App connait deja. Sans elles, userId et companyId restaient nuls
   * tant que le getSession ci-dessous attendait le verrou d'auth-js, tenu au demarrage par le
   * refreshSession d'App (jusqu'a 46 s mesures le 19/11/2026) : le menu peignait alors les
   * onglets PAR DEFAUT (le cache sbl2:super_admin:<id> n'a pas de cle sans identifiant) et le
   * bouclier « ROIS ADMIN » faute de Societe pour le logo. Le getSession reste en place.
   */
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [companyId, setCompanyId] = useState<string | null>(initialCompanyId);

  /*
   * getSession et non getUser — meme raison que Sidebar.tsx:50, et meme mesure.
   *
   * On ne veut d'ici que l'identifiant du compte et son company_id : tous deux sont DEJA
   * dans le jeton en stockage, qu'il suffit donc de lire. getUser, lui, interroge le
   * serveur, et tous les appels auth de supabase-js passent par un verrou global que
   * chaque requete REST doit prendre a son tour pour obtenir son jeton.
   *
   * MESURE DU 13/11/2026, harnais montant ce menu derriere un client instrumente aux
   * latences relevees en production (auth 398 ms, REST 408 ms) :
   *   - avec getUser ... menu visible a 813 ms, les 33 onglets etant deja calcules a 4 ms ;
   *   - avec getSession  menu visible a 411 ms, pour le MEME hook et le meme cache vide.
   * Les 402 ms d'ecart sont l'aller-retour, et il est en SERIE devant la lecture des
   * preferences, qui ne peut pas partir avant d'avoir l'identifiant.
   *
   * Sur le panel monte deux fois (tiroir mobile + colonne bureau, SuperAdminDashboard),
   * les deux getUser se SERIALISENT sur ce verrou — 0->400 ms puis 0->799 ms au meme
   * relevé — et repoussent les quatre lectures REST a 1208 ms, toutes finissant au meme
   * instant. C'est la signature de paquet relevee dans les journaux de production.
   *
   * Aucune politique de session n'est touchee : getSession rend le jeton en stockage et
   * le rafraichit lui-meme s'il a expire (autoRefreshToken). Il ne rend jamais un jeton
   * perime ; il evite seulement l'aller-retour quand le jeton est encore valable.
   */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;
      setUserId(user.id);
      const metaId = user.app_metadata?.company_id;
      /* La session fait foi, y compris quand elle n'a plus de Societe : la graine ne survit pas a un
         jeton qui la contredit (avant les graines, companyId partait de null et y restait). */
      setCompanyId(metaId ?? null);
    });
  }, []);

  const { url: logoMemorise, scale: logoScale, lectures: lecturesLogo } = useActiveLogo(companyId, true);
  /* Le logo peint au premier rendu vient du dernier connu (localStorage). Si son fichier a ete
     supprime depuis, on retombe sur le bouclier au lieu d'une image cassee. Chaque lecture
     reussie en base efface la marque : une image qui avait echoue pendant le reveil de la
     plateforme est alors retentee, au lieu de laisser le bouclier jusqu'au rechargement. */
  const [logoCasse, setLogoCasse] = useState<string | null>(null);
  useEffect(() => { setLogoCasse(null); }, [lecturesLogo]);
  const activeLogo = logoMemorise && logoMemorise !== logoCasse ? logoMemorise : null;
  const sections = useMemo(() => LAYOUT_SECTIONS, []);
  // Configuration propre au compte Talvex connecte : cle v2:super_admin.
  const layout = useSidebarLayout({ panel: 'super_admin', entityUserId: userId, sections, protectedIds: PROTECTED_TAB_IDS });

  // Talixy (maquette gris bleute, desktop) : arc, decor et navigation sonore via le hook commun.
  const tx = useTalixySidebar<SAView>({ activeView, onNavigate, collapsed, reordering: layout.reordering });
  const arc = useArcMetrics();

  const mergedTextOverrides = useMemo(() => {
    const base = { ...ctTextOverrides };
    if (editorCtx) Object.assign(base, editorCtx.textOverrides);
    return base;
  }, [ctTextOverrides, editorCtx?.textOverrides]);

  // Couleurs d'editeur indexees par ID de compartiment : renommer un
  // compartiment ne casse plus la correspondance.
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
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : tx.arc ? 'w-full md:w-[var(--tx-aside)]' : 'w-full md:w-60'}`}
      data-tx-scene={tx.scene ? '' : undefined}
      style={{
        borderRight: tx.scene ? 'none' : `1px solid ${t.sidebar.border}`,
        backdropFilter: 'blur(16px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
        /*
         * Largeur de la colonne : la MEME courbe que l'arc, lue par le meme crochet. C'est ce qui
         * garantit que l'arc reste centre dans sa colonne a toutes les largeurs. Avant, la colonne
         * sautait de 312 a 376 puis a 420 px pendant que l'arc, lui, sautait a d'autres seuils.
         */
        ...(tx.arc ? ({ '--tx-aside': `${arc.asideW}px` } as React.CSSProperties) : {}),
      }}
    >
      {tx.scene && <TalixyArcLine />}
      <div
        ref={logoZoneRef}
        data-tx-logozone={tx.scene ? '' : undefined}
        className={`flex items-center h-16 flex-shrink-0 overflow-hidden ${activeLogo ? (collapsed ? 'justify-center px-2' : 'justify-center px-3') : 'gap-3 px-4'}`}
        style={{ background: editorZone1Bg || (tx.scene ? 'transparent' : t.sidebar.bg), borderBottom: tx.scene ? 'none' : `1px solid ${t.sidebar.border}` }}
      >
        {tx.scene ? (
          /* Maquette : le vrai logo Talvex pose dans l'espace, sans case (encre 770x200 dans 1024x1024 :
             affiche a 26 px de capitale comme la maquette => image de 160 px calee sur son encre). */
          /* Encre du fichier : x 128-897, y 413-612 sur 1024 ; affiche pour que « Talvex » commence a
             (98, 33) avec 26 px de capitale, comme la maquette. */
          <span className="tx-logo" style={{ alignSelf: 'flex-start', width: 132, height: 34, marginLeft: 86, marginRight: 'auto', marginTop: 30 }}>
            <img src="/talixy/logo-talvex.png" alt="Talvex" width={160} height={160} style={{ left: -20, top: -62 }} />
            <span className="tx-logo-tagline">Tout en un. Plus loin.</span>
          </span>
        ) : activeLogo ? (
          <img
            src={activeLogo}
            alt="Logo"
            onError={() => setLogoCasse(activeLogo)}
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
        style={{ background: editorZone2Bg || (tx.scene ? 'transparent' : t.sidebar.bg) }}
      >
        {!layout.loaded ? (
          <SASidebarSkeleton collapsed={collapsed} tokens={t} />
        ) : (
        <SidebarLayoutControls
          entries={layout.reordering ? layout.draft : layout.visible}
          reordering={layout.reordering}
          collapsed={collapsed}
          activeId={tx.activeId}
          wheel={tx.arc}
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
          // Panel de Talvex Administrateur : le niveau qui decide de la
          // disponibilite des fonctionnalites. Droit acquis.
          canHide
          isProtected={isProtectedTab}
          sectionColorById={sectionColorById}
          sectionFontFamily={categoryFont}
          renderItem={(entry, isActive, label) => (
            <SAItem
              id={entry.id} label={label} icon={ICONS[entry.id]} isActive={isActive} collapsed={collapsed}
              onClick={() => tx.navigate(entry.id as SAView)}
              tokens={t.sidebar} editorCtx={editorCtx} mergedTextOverrides={mergedTextOverrides} itemFontFamily={itemFont}
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
          rdrFontFamily={rdrFont}
        />
      </div>
    </aside>
  );
}

