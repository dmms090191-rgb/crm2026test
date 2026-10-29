import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import type { ChatLead } from './views/Crm';
import type { Vendor } from './views/ListeVendeurs';
import { SimulationProvider } from '../../contexts/SimulationContext';
import { SimulationBanner } from './views/sauvegarde/SimulationBanner';
import type { AdminDashboardProps, ActiveView } from './adminDashboardTypes';
import { vueArriveeAdmin, societeMemorisee, VUE_ARRIVEE_CRM_IMMO_COMPANY_ID } from '../../lib/vueArriveeAdmin';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useCompanyId } from '../../hooks/useCompanyId';
import { useCrmImmoAccess } from '../../hooks/useCrmImmoAccess';
import { useCrmImmoAlertes } from './views/crm-immo/useCrmImmoAlertes';
import { useCrmImmoTableauDeBord } from './views/crm-immo/useCrmImmoTableauDeBord';
import type { CategorieImmo } from '../../lib/crmImmoEcheancier';
import { CrmImmoAlertesProvider } from '../../contexts/CrmImmoAlertesContext';
import { peutOuvrirCrmImmo } from '../../lib/crmImmoAccess';
import { importCrmImmo } from './dashboard/adminLazyViews';
import { planifierAuRepos } from '../../lib/auRepos';
import { useActiveLogo } from '../../hooks/useActiveLogo';
import { useAppIcon } from '../../hooks/useAppIcon';
import { useUnreadClientMessages } from '../../hooks/useUnreadClientMessages';
import { useUnreadVendorMessages } from '../../hooks/useUnreadVendorMessages';
import { useUnreadFromSuperAdmin } from '../../hooks/useUnreadFromSuperAdmin';
import { useAgendaNotifications } from '../../hooks/useAgendaNotifications';
import { useAgendaEquipeNotifications } from '../../hooks/useAgendaEquipeNotifications';
import { BREADCRUMB_LABELS } from './adminDashboardConstants';
import { useAdminProposalNotifs } from './dashboard/useAdminProposalNotifs';
import { useHistoriqueNotifications } from './dashboard/useHistoriqueNotifications';
import { useAdminNavHandlers } from './dashboard/useAdminNavHandlers';
import { useAdminDashboardEffects } from './dashboard/useAdminDashboardEffects';
import { useAdminIdentity } from './dashboard/useAdminIdentity';
import DemoEmitterLayer from '../../components/demo/DemoEmitterLayer';
import DemoReceiverLayer from '../../components/demo/DemoReceiverLayer';
import { useDemoSessionSafe } from '../../components/demo/DemoSessionContext';
import GlassBackgroundLayer from '../../components/theme/GlassBackgroundLayer';
import AdminViewRenderer from './dashboard/AdminViewRenderer';
import AdminEditorPanels from './dashboard/AdminEditorPanels';
import { EditorModeProvider, useEditorMode, resolveZoneEffective } from '../../contexts/EditorModeContext';
import EditorSaveThemeModal from '../../components/editor/EditorSaveThemeModal';
import EditorToolbar from '../../components/editor/EditorToolbar';
import { useEditorSessionPersistence } from '../superadmin/useEditorSessionPersistence';
import { useHiddenNotifCards } from '../../hooks/useHiddenNotifCards';
import { useNotifCardOrder } from '../../hooks/useNotifCardOrder';

export type { ImpersonatedAdminInfo, ActiveView } from './adminDashboardTypes';

export default function AdminDashboard(props: AdminDashboardProps) {
  const companyId = useCompanyId();
  const scopeKey = companyId ? `co_${companyId}` : 'co_none';
  return (
    <EditorModeProvider scopeKey={scopeKey}>
      <AdminDashboardInner {...props} />
    </EditorModeProvider>
  );
}

function AdminDashboardInner({ onLogout, onConnectAsVendor, onConnectAsClient, impersonatedAdmin, onBackToSuperAdmin, backLabel, isSAViewing, visuBadgeLabel, canHideTabs, hideTabsTargetName, hideTabsTargetUserId }: AdminDashboardProps) {
  const t = useThemeTokens();
  const companyId = useCompanyId();
  const adminScopeKey = companyId ? `co_${companyId}` : 'co_none';
  /*
   * Le droit d'ouvrir CRM Immo, demande UNE SEULE FOIS ici, puis descendu a la
   * barre laterale ET au renderer. Deux appels donneraient deux verites : selon
   * lequel repond le premier, l'onglet existerait sans que la vue s'ouvre, ou
   * l'inverse — une panne intermittente, donc indiagnosticable.
   *
   * companyId est celui de la Societe VISITEE (CompanyIdContext rend
   * overrideCompanyId ?? authCompanyId), donc la Visu suit le droit de la Societe
   * chez qui Talvex ou un Groupe entre, sans une ligne de code en plus.
   */
  const {
    etat: crmImmoAcces,
    /* Le code et le message reels de l'echec : ils ne servent qu'a la Porte, qui les affiche.
       La barre laterale n'en a pas besoin — elle ne sait que ouvrir ou cacher l'onglet. */
    detail: crmImmoDetailErreur,
    recharger: rechargerCrmImmoAcces,
  } = useCrmImmoAccess(companyId);
  /*
   * ---------- LA SOURCE UNIQUE DES ALERTES CRM IMMO ----------
   *
   * Un seul chargement, ici, qui sert DEUX surfaces : la carte CRM Immo du hub
   * Notifications general (via TopBar) et la cloche de la page du module (via le
   * contexte). Deux appels donneraient deux compteurs qui divergeraient des qu une
   * alerte serait traitee d un cote.
   *
   * Le drapeau est le DROIT, pas un reglage : sans lui, chaque Societe de Talvex —
   * et la plupart n ont pas le module — paierait deux requetes inutiles a chaque
   * ouverture de panel.
   */
  const crmImmoOuvert = peutOuvrirCrmImmo(crmImmoAcces);

  /*
   * ---------- LE PAQUET DE CRM IMMO EST PRELEVE DES QUE LE DROIT EST CONNU ----------
   *
   * Sans cela, le telechargement commence au CLIC, apres la reponse de la RPC, et
   * l'utilisateur attend 31 fichiers devant un spinner. La RPC, elle, a repondu au
   * montage du panel : le creneau au repos qui suit est gratuit, et le paquet y tient.
   *
   * Le declencheur est le DROIT et non le montage : une Societe sans le module ne
   * telecharge rien. Et le creneau au repos cede le pas a tout ce qui presse — le
   * prelevement ne peut donc pas retarder l'affichage qu'il sert.
   *
   * ON PASSE PAR planifierAuRepos, ET PAS PAR requestIdleCallback. L'appel nu levait une
   * ReferenceError sur Safari iOS, ou cette fonction n'existe pas, et l'ErrorBoundary
   * remplacait alors le panel par un ecran d'erreur. Voir src/lib/auRepos.ts : le repli
   * garde l'intention — laisser passer ce qui presse — sans pretendre mesurer le repos.
   */
  useEffect(() => {
    if (!crmImmoOuvert) return;
    return planifierAuRepos(() => { void importCrmImmo(); });
  }, [crmImmoOuvert]);
  /*
   * ---------- L ORDRE DES DEUX HOOKS A ETE INVERSE LE 22 OCTOBRE 2026 ----------
   *
   * Le hook du TABLEAU DE BORD charge maintenant les PERIODES et les ENCAISSEMENTS,
   * et porte l horloge. Celui des ALERTES les recoit.
   *
   * C est la regle des impayes anciens qui l impose : une dette d un contrat
   * renouvele doit rester dans la cloche, or les trois colonnes du dossier ne
   * refletent que la periode en cours. La cloche a donc besoin des periodes — et les
   * relire de son cote donnerait deux jeux de lignes rafraichis a des instants
   * differents, donc une cloche et des cartes qui se contredisent.
   */
  const tableauImmo = useCrmImmoTableauDeBord(crmImmoOuvert);
  const alertesImmo = useCrmImmoAlertes(
    crmImmoOuvert,
    tableauImmo.moment,
    tableauImmo.periodes,
    tableauImmo.encaissements,
    tableauImmo.recharger,
  );
  /* Le filtre qu une carte du dashboard demande d appliquer en arrivant sur la page. */
  const [filtreImmoADemander, setFiltreImmoADemander] = useState<CategorieImmo | null>(null);
  /* Le dossier que le hub demande d ouvrir. Le hub est dans la barre du haut, la page
     dans la zone principale : ils ne se connaissent pas, le contexte les relie. */
  const [dossierImmoAOuvrir, setDossierImmoAOuvrir] = useState<string | null>(null);
  const alertesImmoPartagees = useMemo(() => ({
    etat: crmImmoOuvert ? alertesImmo : null,
    dossierAOuvrir: dossierImmoAOuvrir,
    demanderOuverture: (id: string) => setDossierImmoAOuvrir(id),
    ouvertureConsommee: () => setDossierImmoAOuvrir(null),
    filtreADemander: filtreImmoADemander,
    demanderFiltre: (f: CategorieImmo) => setFiltreImmoADemander(f),
    filtreConsomme: () => setFiltreImmoADemander(null),
    tableauDeBord: crmImmoOuvert
      ? {
          compteurs: tableauImmo.compteurs,
          dossiersParCategorie: tableauImmo.dossiersParCategorie,
          chargement: tableauImmo.chargement,
          /* L'horloge VIVANTE du module, partagee avec l'echeancier : une seule, pour que
             les cartes et la modale ne puissent pas franchir minuit a deux instants. */
          aujourdhui: tableauImmo.aujourdhui,
          recharger: tableauImmo.recharger,
        }
      : null,
  }), [crmImmoOuvert, alertesImmo, dossierImmoAOuvrir, filtreImmoADemander, tableauImmo]);
  const { url: activeLogoUrl } = useActiveLogo(companyId);
  const { appIconUrl: configIconUrl, appName: configAppName } = useAppIcon(companyId, 'company');
  const [companyName, setCompanyName] = useState('');
  const demoCtx = useDemoSessionSafe();
  const demoStatus: 'idle' | 'pending' | 'active' = demoCtx?.session?.status === 'active' ? 'active' : demoCtx?.session?.status === 'pending' ? 'pending' : 'idle';
  const { unreadCount: unreadClientCount, unreadEntries, markAsRead: markClientRead } = useUnreadClientMessages();
  const { unreadCount: unreadVendorCount, unreadEntries: unreadVendorEntries, markAsRead: markVendorRead } = useUnreadVendorMessages();
  const [adminAuthId, setAdminAuthId] = useState<string | null>(null);
  const effectiveAdminId = impersonatedAdmin?.id ?? adminAuthId;
  const notifTargetUserId = hideTabsTargetUserId ?? effectiveAdminId ?? null;
  const { hiddenTabs: hiddenNotifCards, loaded: hiddenNotifCardsLoaded, toggle: toggleNotifCard } = useHiddenNotifCards(companyId, notifTargetUserId);
  /*
   * MASQUER une carte decide de ce qui EXISTE, et pilotera les forfaits : la RLS de
   * panel_hidden_tabs reserve INSERT / UPDATE / DELETE au seul super_admin. Mesure faite
   * role par role : Talvex ACCEPTE, un Groupe en Visu prend 42501, une Societe aussi.
   *
   * `isSAViewing` etait trop large : il vaut pour N IMPORTE QUELLE Visu, Groupe compris.
   * Le bouton apparaissait donc a qui la base allait refuser — et comme l ecriture
   * echouait en SILENCE, les cartes revenaient au rechargement sans que personne sache
   * pourquoi.
   *
   * `canHideTabs` est la regle deja employee par la barre laterale (Sidebar) et par le
   * panel Commercial (useVendorNotifPrefs : « Talvex seul »).
   */
  const peutMasquerLesCartes = canHideTabs === true;
  const notifCardOrderHook = useNotifCardOrder(notifTargetUserId, companyId);
  /*
   * ---------- LE « DEJA VU » DES DEUX AGENDA ----------
   *
   * Le panel Societe est le SEUL ecran a demander la persistance en base, et seulement
   * hors Visu. Partout ailleurs — Vendeur, Client, et ici pendant une Visu — le
   * localStorage reste en place, inchange.
   *
   * Pourquoi la Visu est exclue : ces deux hooks recoivent `adminAuthId`, l identifiant
   * du compte CONNECTE, et non `effectiveAdminId`, celui de l administrateur regarde.
   * Persister reviendrait a ecrire, dans la Societe visitee, des notifications dont
   * Talvex — ou le Groupe — serait declare destinataire. La RLS ne l arreterait pas :
   * le role super_admin a FOR ALL sur la table.
   *
   * La decision elle-meme est dans `deciderPersistance`, en un seul endroit, prouvee
   * sans navigateur pour les trois panels.
   */
  const persistanceAgenda = useMemo(
    () => ({ persistanceEnBase: true, enVisu: Boolean(impersonatedAdmin) }),
    [impersonatedAdmin],
  );
  const { notifications: agendaNotifs, count: agendaPersoCount, markAsSeen: markAgendaSeen } = useAgendaNotifications('admin', adminAuthId, persistanceAgenda);
  const { notifications: agendaEquipeNotifs, count: agendaEquipeCount, markAsSeen: markAgendaEquipeSeen } = useAgendaEquipeNotifications(adminAuthId, persistanceAgenda);
  const { unreadCount: unreadSuperAdminCount, entries: superAdminEntries, markAsRead: markSuperAdminRead } = useUnreadFromSuperAdmin(effectiveAdminId);
  /*
   * La vue de depart est DECIDEE, pas corrigee. Une premiere version basculait dans
   * l'effet ci-dessous : elle marchait, mais David voyait le Dashboard apparaitre une
   * fraction de seconde avant la bascule. On tranche donc des le premier rendu, a partir
   * de la Societe que App.tsx a deja ecrite dans le stockage (voir src/lib/vueArriveeAdmin.ts).
   *
   * Partir sur 'crm-immo' n'OUVRE PAS le module pour autant : CrmImmoGate n'evalue son
   * lazy() que sur un droit 'accorde', affiche un spinner tant qu'il vaut 'inconnu', et
   * explique sur 'refuse'. Le droit reste donc seul maitre de l'ouverture.
   */
  const [activeView, setActiveView] = useState<ActiveView>(() =>
    vueArriveeAdmin(societeMemorisee(), isSAViewing === true),
  );
  /*
   * ---------- LA VUE D'ARRIVEE DE BELLISIMMO ----------
   *
   * Demande de David du 25/10/2026 : les utilisateurs de cette Societe arrivent sur
   * CRM Immo, pas sur la vue d'ensemble. Toutes les autres Societes sont inchangees.
   *
   * POURQUOI PAS DANS LE useState CI-DESSUS, qui serait pourtant plus court. Au montage,
   * le droit d'ouvrir CRM Immo vaut 'inconnu' : il n'est NI accorde NI refuse, l'appel est
   * encore en vol (voir src/lib/crmImmoAccess.ts). Partir sur 'crm-immo' des le premier
   * rendu monterait donc le module AVANT de savoir s'il est autorise. On attend que
   * l'etat soit resolu, et seul 'accorde' ouvre.
   *
   * POURQUOI isSAViewing PLUTOT QUE LE ROLE D'ORIGINE. Le commentaire de la ligne 160
   * reproche a ce signal d'etre trop large : il vaut pour N'IMPORTE QUELLE Visu, Groupe
   * compris. C'est un defaut la-bas, c'est exactement ce qu'il faut ici — David a demande
   * que ni le Super Admin ni le Groupe ne soient deplaces. Tester le seul super_admin
   * aurait laisse passer la Visu d'un Groupe.
   *
   * POURQUOI UN DRAPEAU. Sans lui, l'effet se rejouerait a chaque changement de ses
   * dependances et ramenerait l'utilisateur sur CRM Immo pendant qu'il navigue ailleurs.
   * C'est la difference entre une vue d'ARRIVEE et une redirection permanente, que David
   * a explicitement exclue. Le garde sur activeView dit la meme chose autrement : si la
   * vue n'est plus celle du depart, c'est que l'utilisateur a deja choisi, on le laisse.
   *
   * CET EFFET EST UN RATTRAPAGE, plus le mecanisme principal. La vue de depart est
   * desormais decidee au premier rendu ci-dessus. Il ne sert que si le stockage n'a rien
   * rendu — navigation privee, quota, magasin verrouille — auquel cas companyId finit par
   * arriver par le contexte et la bascule se fait, avec le clignotement mais sans rien
   * casser. Le retirer rendrait ces cas silencieusement inoperants.
   *
   * POUR GENERALISER UN JOUR : remplacer la constante de src/lib/vueArriveeAdmin.ts par une
   * colonne de vue initiale sur companies. L'identifiant est en dur parce qu'une seule
   * Societe est concernee et que David a demande de ne pas toucher a la base.
   */
  const [arriveeInitialeAppliquee, setArriveeInitialeAppliquee] = useState(false);
  useEffect(() => {
    if (arriveeInitialeAppliquee) return;
    if (isSAViewing) return;
    if (companyId !== VUE_ARRIVEE_CRM_IMMO_COMPANY_ID) return;
    if (!crmImmoOuvert) return;
    if (activeView !== 'vue-ensemble') return;
    setActiveView('crm-immo');
    setArriveeInitialeAppliquee(true);
  }, [arriveeInitialeAppliquee, isSAViewing, companyId, crmImmoOuvert, activeView]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatLead, setChatLead] = useState<ChatLead | null>(null);
  const [rdvLead, setRdvLead] = useState<ChatLead | null>(null);
  const [chatVendor, setChatVendor] = useState<Vendor | null>(null);
  const [chatClientMessageSent, setChatClientMessageSent] = useState(false);
  const [chatVendorMessageSent, setChatVendorMessageSent] = useState(false);
  const [docInitialTab, setDocInitialTab] = useState<string | undefined>(undefined);
  const pendingScrollRef = useRef<{ leadId?: string; vendorId?: string; scrollY: number } | null>(null);
  const editorCtx = useEditorMode();
  const [saveThemeOpen, setSaveThemeOpen] = useState(false);
  const logoZoneRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const topbarZoneRef = useRef<HTMLElement>(null);
  const contentZoneRef = useRef<HTMLElement>(null);

  const {
    getPositionFor, savedRefreshKey, setSavedRefreshKey,
    tabsVisible, setTabsVisible, tabsCollapsed, setTabsCollapsed,
    fondsVisible, setFondsVisible, couleurVisible, setCouleurVisible,
    savedVisible, setSavedVisible, handleSaveSession, handleAlignPanels, handleResetPanelPositions,
    updatePositionFor, contenuPos,
  } = useEditorSessionPersistence(adminScopeKey);

  const { proposalUnseen, confirmedUnseen, rescheduleUnseen, rescheduleRequestUnseen, handleProposalEntryClick, handleConfirmedEntryClick, handleRescheduleEntryClick, handleRescheduleRequestEntryClick } =
    useAdminProposalNotifs(setActiveView);

  const {
    handleClientEntryClick, handleVendorEntryClick, handleVendorViewed,
    handleAgendaPersoClick, handleAgendaEquipeClick, handleNavigate, handleReturnToCrm,
  } = useAdminNavHandlers({
    activeView, chatClientMessageSent, chatVendorMessageSent,
    setChatLead, setChatVendor, setChatClientMessageSent, setChatVendorMessageSent,
    setActiveView, setDocInitialTab,
    markClientRead, markVendorRead, markAgendaSeen, markAgendaEquipeSeen,
    pendingScrollRef,
  });

  /*
   * Le clic sur une carte CRM Immo du dashboard.
   *
   * CHAQUE carte ouvre la page du module sur SA categorie — c'est la demande de
   * David : << Je ne veux pas qu'une carte ouvre simplement Tous si un filtre precis
   * peut etre applique. >>
   *
   * On DEPOSE la demande avant de naviguer : la page du module n'est pas encore
   * montee, et le contexte vit au-dessus du renderer, donc la demande survit au
   * changement de vue.
   *
   * La page lira le classement dans le meme contexte, donc la liste qu'elle affichera
   * est exactement celle que la carte a comptee — meme parcours, meme horloge.
   */
  const ouvrirCrmImmoDepuisDashboard = useCallback((categorie: CategorieImmo) => {
    setFiltreImmoADemander(categorie);
    handleNavigate('crm-immo');
  }, [handleNavigate]);

  /*
   * ---------- L ALIMENTATION DE L HISTORIQUE ----------
   *
   * Les dix categories de la cloche, rassemblees pour etre inscrites dans
   * notification_history. Mises en forme ici parce que c est ici, et nulle part
   * ailleurs, que les dix sources coexistent.
   *
   * Les trois chats passent leur plus ancien message non lu (oldestAt) : c est l ancre
   * de l EPISODE. Tant qu une conversation reste non lue, cette ancre ne bouge pas, donc
   * trois messages de Jean produisent UNE entree et non trois.
   */
  const sourcesHistorique = useMemo(() => ({
    client: unreadEntries.map(e => ({
      interlocuteurId: e.clientAuthId,
      nom: [e.prenom, e.nom].filter(Boolean).join(' ') || e.email,
      count: e.count, oldestAt: e.oldestAt, preview: e.preview,
    })),
    vendeur: unreadVendorEntries.map(e => ({
      interlocuteurId: e.vendorId,
      nom: [e.firstName, e.lastName].filter(Boolean).join(' ') || e.email,
      count: e.count, oldestAt: e.oldestAt, preview: e.preview,
    })),
    'super-admin': (superAdminEntries ?? []).map(e => ({
      interlocuteurId: e.superAdminId,
      nom: e.name, sousTitre: e.subtitle,
      count: e.count, oldestAt: e.oldestAt, preview: e.preview,
    })),
    agenda: agendaNotifs,
    equipe: agendaEquipeNotifs,
    propositions: proposalUnseen,
    rdv: confirmedUnseen,
    decalages: rescheduleUnseen,
    'demandes-decalage': rescheduleRequestUnseen,
    /*
     * TOUTES les alertes derivees, et non les seules actives.
     *
     * ---------- POURQUOI CE CHANGEMENT, LE 23 OCTOBRE 2026 ----------
     *
     * Ce champ valait `alertesImmo.actives`, c'est-a-dire les non traitees. Une alerte
     * traitee ne pouvait donc PLUS JAMAIS entrer dans l'historique : traiter une alerte
     * avant qu'un Admin n'ouvre son panel la faisait disparaitre pour toujours. C'est
     * ainsi que la table est restee a zero ligne — releve en base le 23 octobre 2026 —
     * alors que deux alertes avaient bel et bien existe.
     *
     * L'historique est un JOURNAL : une alerte traitee reste un evenement qui a eu lieu.
     * Son etat n'est pas perdu pour autant, il voyage avec elle : ligneImmo pose
     * `read_at` et `treated_at` depuis crm_immo_etats.
     *
     * LA CLOCHE N'EST PAS TOUCHEE. Elle lit `actives` et `compteBadge` comme avant ;
     * c'est seulement ce que l'historique RECOIT qui s'elargit.
     */
    'crm-immo': crmImmoOuvert ? alertesImmo.toutes : [],
  }), [
    unreadEntries, unreadVendorEntries, superAdminEntries,
    agendaNotifs, agendaEquipeNotifs,
    proposalUnseen, confirmedUnseen, rescheduleUnseen, rescheduleRequestUnseen,
    crmImmoOuvert, alertesImmo.toutes,
  ]);

  /*
   * lectureSeule en Visu, et c est le SEUL garde de ce chantier qui ne soit pas tenu par
   * la base : Talvex porte le role super_admin, dont la politique est FOR ALL sur toute
   * la table. La RLS laisserait donc Talvex marquer lu, archiver ou supprimer les
   * notifications de l admin qu il regarde, et faire baisser son compteur.
   *
   * C est la regle tranchee pour le Groupe, appliquee a Visu : consulter ne doit jamais
   * ecrire a la place de quelqu un.
   */
  const historique = useHistoriqueNotifications({
    companyId, userId: effectiveAdminId,
    lectureSeule: Boolean(impersonatedAdmin),
    sources: sourcesHistorique,
    setActiveView, setChatLead, setChatVendor,
    setChatClientMessageSent, setChatVendorMessageSent,
    setDossierImmoAOuvrir,
  });

  // Identite affichee : edition de la session > Societe visualisee > compte connecte.
  const { adminName, setAdminName, setAdminEmail, applyNameEdit, identityName, identityEmail } = useAdminIdentity(impersonatedAdmin);

  useAdminDashboardEffects({
    companyId,
    setAdminAuthId,
    setAdminName,
    setAdminEmail,
    // Une Societe visualisee ne doit jamais etre ecrasee par le compte JWT.
    isImpersonating: Boolean(impersonatedAdmin),
    setCompanyName,
    setActiveView,
    activeView,
    pendingScrollRef,
  });

  const getBreadcrumb = () => BREADCRUMB_LABELS[activeView];

  const { customThemeOverrides } = useTheme();
  const ctZoneCss = customThemeOverrides?.zone_css;
  const zone1Bg = resolveZoneEffective('zone1', editorCtx.zoneOverrides, editorCtx.preview) || ctZoneCss?.zone1 || undefined;
  const zone2Bg = resolveZoneEffective('zone2', editorCtx.zoneOverrides, editorCtx.preview) || ctZoneCss?.zone2 || undefined;
  const zone3Bg = resolveZoneEffective('zone3', editorCtx.zoneOverrides, editorCtx.preview) || ctZoneCss?.zone3 || undefined;
  const zone4Bg = resolveZoneEffective('zone4', editorCtx.zoneOverrides, editorCtx.preview) || ctZoneCss?.zone4 || undefined;

  const bgImageUrl = editorCtx.backgroundImage || customThemeOverrides?.background_image || null;
  const outerStyle: React.CSSProperties = bgImageUrl
    ? {
        backgroundColor: t.main.bg,
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : { background: zone4Bg || t.main.bg };

  return (
    <SimulationProvider>
    <div className="flex h-[100dvh] overflow-hidden relative" style={outerStyle}>
      <GlassBackgroundLayer />
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: t.modal.overlayBg }} onClick={() => setMobileOpen(false)} />
      )}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-[min(300px,calc(100vw-24px))]
          md:relative md:z-auto md:w-auto
          transition-transform duration-300 md:transition-none md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          activeView={activeView}
          onNavigate={(view) => { handleNavigate(view); setMobileOpen(false); }}
          collapsed={mobileOpen ? false : sidebarCollapsed}
          onCollapse={() => { if (mobileOpen) setMobileOpen(false); else setSidebarCollapsed(!sidebarCollapsed); }}
          onLogout={onLogout}
          editorZone1Bg={zone1Bg}
          editorZone2Bg={zone2Bg}
          logoZoneRef={logoZoneRef}
          sidebarBodyRef={sidebarBodyRef}
          onBackToRoisAdmin={onBackToSuperAdmin}
          backLabel={backLabel}
          visuBadgeLabel={visuBadgeLabel}
          canHideTabs={canHideTabs}
          crmImmoAcces={crmImmoAcces}
          hideTabsTargetName={hideTabsTargetName}
          hideTabsTargetUserId={hideTabsTargetUserId}
        />
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        <TopBar
          breadcrumb={getBreadcrumb()}
          onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
          adminName={adminName}
          unreadClientCount={unreadClientCount}
          unreadClientEntries={unreadEntries}
          onClientEntryClick={handleClientEntryClick}
          unreadVendorCount={unreadVendorCount}
          unreadVendorEntries={unreadVendorEntries}
          onVendorEntryClick={handleVendorEntryClick}
          unreadSuperAdminCount={unreadSuperAdminCount}
          onSuperAdminClick={() => { markSuperAdminRead(); setActiveView('chat-super-admin'); }}
          agendaPersoCount={agendaPersoCount}
          agendaPersoEntries={agendaNotifs}
          onAgendaPersoEntryClick={handleAgendaPersoClick}
          agendaEquipeCount={agendaEquipeCount}
          agendaEquipeEntries={agendaEquipeNotifs}
          onAgendaEquipeEntryClick={handleAgendaEquipeClick}
          proposalsCount={proposalUnseen.length}
          proposalsEntries={proposalUnseen}
          onProposalEntryClick={handleProposalEntryClick}
          confirmedCount={confirmedUnseen.length}
          confirmedEntries={confirmedUnseen}
          onConfirmedEntryClick={handleConfirmedEntryClick}
          rescheduleCount={rescheduleUnseen.length}
          rescheduleEntries={rescheduleUnseen}
          onRescheduleEntryClick={handleRescheduleEntryClick}
          rescheduleRequestCount={rescheduleRequestUnseen.length}
          rescheduleRequestEntries={rescheduleRequestUnseen}
          onRescheduleRequestEntryClick={handleRescheduleRequestEntryClick}
          impersonatedAdmin={impersonatedAdmin}
          onBackToSuperAdmin={onBackToSuperAdmin}
          appIconUrl={configIconUrl ?? activeLogoUrl}
          appName={configAppName || companyName || undefined}
          topbarRef={topbarZoneRef}
          editorZone3Bg={zone3Bg}
          canHideNotifCards={peutMasquerLesCartes}
          crmImmoActif={crmImmoOuvert}
          crmImmoCount={alertesImmo.badge}
          crmImmoEntries={alertesImmo.actives}
          /*
           * CRM Immo marque lu AU CLIC, comme les neuf autres categories.
           *
           * Elle etait la seule a ne pas le faire : la notification restait neuve apres
           * avoir ete ouverte, et le compteur ne baissait pas. Les neuf autres appellent
           * toutes leur propre marquage ici meme (markClientRead, markVendorRead,
           * markSuperAdminRead, markAgendaSeen, marquerVue).
           *
           * marquerLue verifie son ecriture — .select() puis comptage des lignes — et
           * rend une erreur plutot qu un succes muet, parce qu un UPDATE refuse par la
           * RLS rend { error: null } et zero ligne.
           *
           * Marquer lu ne TRAITE pas : seul le module le fait, et seul un geste explicite.
           */
          onCrmImmoEntryClick={(alerte) => {
            void alertesImmo.marquerLue(alerte);
            setDossierImmoAOuvrir(alerte.dossier_id);
            setActiveView('crm-immo');
          }}
          hiddenNotifCards={hiddenNotifCards}
          hiddenNotifCardsLoaded={hiddenNotifCardsLoaded}
          onToggleNotifCard={toggleNotifCard}
          canReorderNotifCards={true}
          notifCardOrder={notifCardOrderHook.order}
          notifCardLabels={notifCardOrderHook.labels}
          notifReordering={notifCardOrderHook.reordering}
          onStartNotifReorder={notifCardOrderHook.startReorder}
          onCancelNotifReorder={notifCardOrderHook.cancelReorder}
          onConfirmNotifReorder={notifCardOrderHook.confirmReorder}
          onMoveNotifDraft={notifCardOrderHook.moveDraft}
          onRenameNotifDraft={notifCardOrderHook.renameDraft}
          onResetNotifDefault={notifCardOrderHook.resetToDefault}
        />
        <EditorToolbar onSaveTheme={() => setSaveThemeOpen(true)} onResetPositions={handleResetPanelPositions} onAlignPanels={handleAlignPanels} onSaveSession={handleSaveSession} />
        {isSAViewing && impersonatedAdmin && (
          <DemoEmitterLayer
            activeView={activeView}
            viewLabel={getBreadcrumb()}
            targetUserId={impersonatedAdmin.id}
            targetRole="admin"
            targetName={[impersonatedAdmin.first_name, impersonatedAdmin.last_name].filter(Boolean).join(' ') || impersonatedAdmin.email}
            companyId={impersonatedAdmin.company_id ?? null}
            tokens={t}
          />
        )}
        <SimulationBanner />
        {!isSAViewing && <DemoReceiverLayer userId={adminAuthId} onViewChange={(v) => setActiveView(v as ActiveView)} />}
        <main
          ref={contentZoneRef}
          className={`flex-1 flex flex-col md:p-6 mobile-main-scroll ${(activeView === 'chat-client' || activeView === 'chat-vendeur' || activeView === 'chat-super-admin') ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}`}
          style={{
            minHeight: 0,
            overflow: (activeView === 'chat-client' || activeView === 'chat-vendeur' || activeView === 'chat-super-admin') ? 'hidden' : 'auto',
            ...(!bgImageUrl && zone4Bg ? { background: zone4Bg } : {}),
          }}
        >
          <CrmImmoAlertesProvider valeur={alertesImmoPartagees}>
          <AdminViewRenderer
            activeView={activeView}
            chatLead={chatLead}
            chatVendor={chatVendor}
            rdvLead={rdvLead}
            effectiveAdminId={effectiveAdminId}
            impersonatedAdmin={impersonatedAdmin}
            isSAViewing={isSAViewing}
            crmImmoAcces={crmImmoAcces}
            crmImmoDetailErreur={crmImmoDetailErreur}
            onReessayerCrmImmo={rechargerCrmImmoAcces}
            docInitialTab={docInitialTab}
            unreadClientConversations={unreadEntries.length}
            unreadVendorConversations={unreadVendorEntries.length}
            pendingScrollRef={pendingScrollRef}
            setChatLead={setChatLead}
            setChatVendor={setChatVendor}
            setRdvLead={setRdvLead}
            setChatClientMessageSent={setChatClientMessageSent}
            setChatVendorMessageSent={setChatVendorMessageSent}
            setDocInitialTab={setDocInitialTab}
            identityName={identityName} identityEmail={identityEmail} companyName={companyName}
            onNameChange={applyNameEdit}
            onConnectAsVendor={onConnectAsVendor}
            onConnectAsClient={onConnectAsClient}
            handleNavigate={handleNavigate}
            immoDashboard={crmImmoOuvert ? { compteurs: tableauImmo.compteurs, chargement: tableauImmo.chargement } : null}
            onOuvrirCrmImmo={ouvrirCrmImmoDepuisDashboard}
            handleReturnToCrm={handleReturnToCrm}
            setActiveView={setActiveView}
            markClientRead={markClientRead}
            onVendorViewed={handleVendorViewed}
            markSuperAdminRead={markSuperAdminRead}
            historique={historique}
          />
          </CrmImmoAlertesProvider>
        </main>
      </div>

      <AdminEditorPanels
        tabsVisible={tabsVisible} setTabsVisible={setTabsVisible}
        tabsCollapsed={tabsCollapsed} setTabsCollapsed={setTabsCollapsed}
        fondsVisible={fondsVisible} setFondsVisible={setFondsVisible}
        couleurVisible={couleurVisible} setCouleurVisible={setCouleurVisible}
        savedVisible={savedVisible} setSavedVisible={setSavedVisible}
        savedRefreshKey={savedRefreshKey} setSavedRefreshKey={setSavedRefreshKey}
        getPositionFor={(panel: string) => getPositionFor(panel) ?? null} updatePositionFor={updatePositionFor}
        contenuPos={contenuPos}
        logoZoneRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef}
        topbarZoneRef={topbarZoneRef} contentZoneRef={contentZoneRef}
      />
      <EditorSaveThemeModal open={saveThemeOpen} onClose={() => setSaveThemeOpen(false)} ownerUserId={effectiveAdminId} ownerCompanyId={companyId} />
    </div>
    </SimulationProvider>
  );
}
