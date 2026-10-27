import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useTalixy } from '../talixy/useTalixy';
import {
  useTalixyMobileNav, useNavStep, repartirOnglets, corrigerOngletActif,
} from '../talixy/useTalixyMobileNav';
import TalixyMiniArc from '../talixy/TalixyMiniArc';
import { LogOut, MoreHorizontal, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppIcon } from '../hooks/useAppIcon';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useCompanyId } from '../contexts/CompanyIdContext';
import { usePanelHiddenTabs } from '../hooks/usePanelHiddenTabs';
import { useCrmImmoAccess } from '../hooks/useCrmImmoAccess';
import { peutOuvrirCrmImmo } from '../lib/crmImmoAccess';
import { sectionsAvecCrmImmo } from '../lib/crmImmoSidebar';
import { VUES_TELEPHONE } from './navigationMobile';
import { type UserRole, SOURCES_NAV } from './navigationMobileSources';
import type { Vendor } from '../pages/admin/views/ListeVendeurs';
import {
  PwaSpinner,
  SADashboard, SAAdmins, SAchatAdmin, SACrmSociete, SAStatuts, SAApiIa, SACerveauIA,
  SASuperAdmins, SAMonCompte, SASystem, SADocumentationCrm,
  AdminVueEnsemble, AdminCrm, AdminChatClient, AdminChatVendeur, AdminChatSuperAdmin, AdminAgenda, AdminPropositionsRdv, AdminStatuts,
  AdminBoutiques, AdminCabinets, AdminListeVendeurs, AdminAgendaEquipe,
  VendorVueEnsemble, VendorLeads, VendorChatAdmin, VendorChatClient, VendorAgenda, VendorPropositionsRdv,
  ClientVueEnsemble, ClientMessagerie, ClientAgenda, ClientPropositionsRdv,
} from './pwaMobileShellConfig';

interface Props {
  role: UserRole;
  onLogout: () => void;
}

/**
 * CE QUI S'AFFICHE QUAND UN ID N'A PAS DE VUE — ET SURTOUT, CE QUI NE S'AFFICHE PLUS.
 *
 * Chaque `switch` de cette coquille finissait par un `default` qui rendait le tableau de
 * bord du role. Ce repli etait un mensonge : l'en-tete affichait le libelle du vrai onglet,
 * tire de layout.visible, pendant que le corps montrait le Dashboard. Treize onglets de
 * Talvex Administrateur se comportaient ainsi, dormants sous un theme que personne n'a
 * active.
 *
 * Avec le filtre par VUES_TELEPHONE, ce cas ne doit plus JAMAIS arriver. Cet ecran est donc
 * un detecteur, pas une fonctionnalite : s'il se montre, c'est que l'ensemble declare et le
 * switch ont divergé, et il faut le voir au lieu de le cacher derriere une page plausible.
 */
function EcranSansVue({ id, couleur }: { id: string; couleur: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <HelpCircle className="w-8 h-8" style={{ color: couleur }} />
      <p className="text-sm font-medium" style={{ color: couleur }}>
        Cet onglet n'a pas encore d'écran sur téléphone.
      </p>
      <p className="text-xs opacity-70" style={{ color: couleur }}>
        Ouvrez-le depuis l'ordinateur. ({id})
      </p>
    </div>
  );
}

export default function PwaMobileShell({ role, onLogout }: Props) {
  const t = useThemeTokens();
  const { appIconUrl } = useAppIcon(null, role === 'super_admin' ? 'super_admin' : 'company');
  const companyId = useCompanyId();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [vendorDbId, setVendorDbId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  /* Le commercial dont on vient d'ouvrir la conversation depuis la liste. Meme role que
     `chatVendor` dans AdminDashboard : porter la cible d'un onglet a l'autre. */
  const [chatVendor, setChatVendor] = useState<Vendor | null>(null);

  /*
   * ============ LA NAVIGATION VIENT DE layout.visible, PLUS D'UNE LISTE EN DUR ============
   *
   * Masquer un onglet sur le bureau le retire du telephone. Le renommer le renomme. Le
   * deplacer le deplace. L'ordre de la barre du bas EST l'ordre de la barre laterale : il
   * n'y a aucune notion de priorite ici, parce qu'inventer un classement reintroduirait une
   * deuxieme verite a cote de celle que David configure.
   */
  const source = SOURCES_NAV[role];

  /*
   * CRM IMMO : L'INJECTION CONDITIONNELLE, CONSERVEE A L'IDENTIQUE.
   *
   * L'entree n'est pas declaree dans LAYOUT_SECTIONS, elle est EMISE selon le droit reel.
   * La raison est ecrite dans crmImmoSidebar.ts : un droit ne doit pas vivre dans un reglage
   * d'organisation visuelle, sinon deux clics — « Par defaut » puis « Valider » — retireraient
   * a une Societe son propre module, en base.
   *
   * La dependance du useMemo est le seul BOOLEEN, jamais l'etat a quatre valeurs : l'identite
   * du tableau doit rester stable entre deux rendus, sinon `defaults` change a chaque fois et
   * l'effet de chargement de useSidebarLayout se relance en boucle — une panne invisible a
   * l'ecran, visible seulement au reseau.
   *
   * Un seul appel, et c'est important : le commentaire de useCrmImmoAccess avertit que deux
   * appels donneraient deux verites. Sur telephone, AdminDashboard n'est pas monte — celui-ci
   * est donc le seul. Et il ne bloque rien : l'etat part a 'inconnu', la barre se peint sans
   * CRM Immo, puis la reponse arrive.
   */
  const { etat: crmImmoAcces } = useCrmImmoAccess(role === 'admin' ? companyId : null);
  const crmImmoOuvert = peutOuvrirCrmImmo(crmImmoAcces);
  const sections = useMemo(
    () => (role === 'admin' ? sectionsAvecCrmImmo(source.sections, crmImmoOuvert) : source.sections),
    [role, source.sections, crmImmoOuvert],
  );

  /*
   * Le client n'a pas de `layout.visible` : `LayoutPanel` ne contient pas 'client', sa barre
   * tourne encore sur l'ancien moteur de masquage. `actif: false` rend donc tout le crochet
   * inerte pour lui — aucune lecture de session, aucune lecture en base — et ses onglets
   * restent ceux de ses sections, dans l'ordre. Son masquage est applique juste apres, par
   * son moteur a lui : on lit la MEME cle que ClientSidebar (panel 'client', companyId null).
   */
  const [activeTab, setActiveTab] = useState('');
  const nav = useTalixyMobileNav(
    source.panel, sections, source.protectedIds, activeTab,
    role !== 'client', VUES_TELEPHONE[role],
  );
  const { hiddenTabs: masquesClient } = usePanelHiddenTabs(role === 'client' ? 'client' : '', null, null);

  const onglets = useMemo(
    () => (role === 'client' ? nav.items.filter(i => !masquesClient.has(i.id)) : nav.items),
    [role, nav.items, masquesClient],
  );

  /*
   * L'onglet actif, corrige quand il n'est plus atteignable.
   *
   * Ce n'est pas le repli silencieux qu'on vient de supprimer : ici l'onglet a disparu parce
   * que l'utilisateur l'a masque depuis son bureau, ou parce que son droit a change. Rester
   * sur un onglet que sa configuration ne contient plus n'aurait aucun sens. L'etat part
   * vide, et ce meme effet pose le premier onglet au montage.
   */
  useEffect(() => {
    const corrige = corrigerOngletActif(activeTab, onglets);
    if (corrige !== null && corrige !== activeTab) setActiveTab(corrige);
  }, [activeTab, onglets]);

  const { barre, plus } = useMemo(() => repartirOnglets(onglets), [onglets]);

  const talixy = useTalixy();
  const arcMobile = talixy.active && role === 'super_admin';
  const allerVers = useCallback((id: string) => { setActiveTab(id); setShowMore(false); }, []);
  const pasTalixy = useNavStep(nav, allerVers);

  /*
   * LE NOM DE LA SOCIETE, QUE CETTE COQUILLE NE LISAIT PAS.
   *
   * MESURE DU 26/10/2026 SUR L'APK : la carte d'identite affichait « — » pour la Societe.
   * Ce n'etait pas de la lenteur — AUCUNE requete ne partait. Sur le bureau, cette lecture
   * vit dans useAdminDashboardEffects, un fichier que la coquille ne monte jamais : elle
   * importe la VUE toute seule et saute toute la couche qui l'alimente.
   *
   * On ne monte pas AdminDashboard pour autant — ce serait monter un panel entier pour trois
   * chaines. On recopie la seule requete qui manque, a l'identique
   * (useAdminDashboardEffects.ts:90-94).
   */
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (!companyId) return;
    supabase.from('companies').select('name').eq('id', companyId).maybeSingle()
      .then(({ data }) => { if (data?.name) setCompanyName(data.name); });
  }, [companyId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email ?? '');
      const m = user.user_metadata ?? {};
      setUserName([m.first_name as string, m.last_name as string].filter(Boolean).join(' ') || '');
    });
  }, []);

  useEffect(() => {
    if (role !== 'vendor') return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('vendors').select('id').eq('auth_user_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) setVendorDbId(data.id); });
    });
  }, [role]);

  const handleTabPress = useCallback((key: string) => {
    if (key === 'more') { setShowMore(v => !v); }
    else { setActiveTab(key); setShowMore(false); }
  }, []);

  /* Le libelle de l'en-tete vient de la MEME liste que la barre : un renommage le suit. */
  const activeLabel = onglets.find(o => o.id === activeTab)?.label ?? '';

  const isChat = activeTab === 'chat-client' || activeTab === 'chat-vendeur'
    || activeTab === 'chat-admin' || activeTab === 'chat-super-admin'
    || activeTab === 'messagerie';

  const renderView = () => {
    if (role === 'super_admin') {
      switch (activeTab) {
        case 'dashboard': return <SADashboard />;
        case 'mon-compte': return <SAMonCompte />;
        case 'super-admins': return <SASuperAdmins />;
        case 'statuts': return <SAStatuts />;
        case 'admins': return <SAAdmins />;
        case 'crm-societe': return <SACrmSociete />;
        case 'chat-admin': return <SAchatAdmin />;
        case 'documentation-crm': return <SADocumentationCrm />;
        case 'system': return <SASystem />;
        case 'api-ia': return <SAApiIa />;
        case 'cerveau-ia': return <SACerveauIA />;
        default: return <EcranSansVue id={activeTab} couleur={t.text.secondary} />;
      }
    }
    if (role === 'admin') {
      /*
       * LES TROIS PROPS D'IDENTITE, QUI MANQUAIENT ICI ET NULLE PART AILLEURS.
       *
       * Les roles vendeur et client passaient deja les leurs ; seul l'admin montait sa vue
       * nue. Or VueEnsemble declare des defauts VIDES et SocieteIdentityCard affiche
       * `valeur || '—'` : une chaine vide donne donc « — » de facon PERMANENTE, pas
       * transitoire. C'est, champ pour champ, la capture d'ecran du 26/10/2026.
       */
      const identite = { fullName: userName, companyName, email: userEmail };
      switch (activeTab) {
        case 'vue-ensemble': return <AdminVueEnsemble {...identite} />;
        case 'crm': return <AdminCrm />;
        case 'statuts': return <AdminStatuts />;
        case 'chat-client': return <AdminChatClient />;
        case 'chat-super-admin': return <AdminChatSuperAdmin />;
        /* `key` sur l'id : changer de commercial doit REMONTER la conversation, pas la
           reutiliser. C'est ce que fait le bureau (AdminViewRenderer.tsx:131). */
        case 'chat-vendeur': return <AdminChatVendeur key={chatVendor?.id ?? 'sans-vendeur'} initialVendor={chatVendor} />;
        case 'agenda': return <AdminAgenda />;
        case 'propositions-rdv': return <AdminPropositionsRdv />;
        case 'boutique': return <AdminBoutiques />;
        case 'cabinet': return <AdminCabinets />;
        /*
         * `ownerUserId` n'est pas decoratif : il alimente useActionOrder et
         * useActionVisibility (VendorActionModal), donc l'ordre et la visibilite du menu
         * d'actions que la Societe a elle-meme configures. Le laisser a null afficherait
         * silencieusement le menu par defaut. Le bureau passe effectiveAdminId ; la coquille
         * exclut la Visu (garde d'App.tsx), donc c'est l'auth id du compte connecte.
         *
         * `onOpenChat` est cable comme sur le bureau : on retient le commercial et on ouvre
         * l'onglet de conversation. Sans ce cablage, le bouton « Message » du menu d'actions
         * se contentait de fermer le menu — un faux bouton. La prise de controle, elle,
         * n'est PAS cablable ici (App.tsx:248 retire la coquille des qu'une impersonation
         * est posee), donc sa carte ne s'affiche pas : VendorActionModal la conditionne
         * desormais a la presence du cablage.
         */
        case 'liste-vendeurs': return (
          <AdminListeVendeurs
            ownerUserId={userId || null}
            onOpenChat={(v) => { setChatVendor(v); setActiveTab('chat-vendeur'); }}
          />
        );
        case 'agenda-equipe': return <AdminAgendaEquipe />;
        default: return <EcranSansVue id={activeTab} couleur={t.text.secondary} />;
      }
    }
    if (role === 'vendor') {
      switch (activeTab) {
        case 'vue-ensemble': return <VendorVueEnsemble vendorId={vendorDbId} />;
        case 'leads': return <VendorLeads vendorId={vendorDbId} />;
        case 'agenda': return <VendorAgenda vendorId={vendorDbId} />;
        case 'propositions-rdv': return <VendorPropositionsRdv vendorDbId={vendorDbId} />;
        case 'chat-admin': return <VendorChatAdmin vendorName={userName || 'Vendeur'} vendorDbId={vendorDbId} />;
        case 'chat-client': return <VendorChatClient vendorName={userName || 'Vendeur'} vendorDbId={vendorDbId} />;
        default: return <EcranSansVue id={activeTab} couleur={t.text.secondary} />;
      }
    }
    switch (activeTab) {
      case 'vue-ensemble': return <ClientVueEnsemble clientName={userName || 'Client'} clientAuthId={userId} onNavigate={(v) => setActiveTab(v)} />;
      case 'messagerie': return <ClientMessagerie clientName={userName || 'Client'} clientAuthId={userId} />;
      case 'agenda': return <ClientAgenda clientEmail={userEmail} />;
      case 'propositions-rdv': return <ClientPropositionsRdv clientEmail={userEmail} />;
      default: return <EcranSansVue id={activeTab} couleur={t.text.secondary} />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: t.main.bg }}>
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 safe-area-top"
        style={{ background: t.sidebar.bg, borderBottom: `1px solid ${t.surface.border}` }}
      >
        {appIconUrl ? (
          <img src={appIconUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0ea5e9, #10b981)' }}>
            <span className="text-white text-sm font-bold">T</span>
          </div>
        )}
        <span className="flex-1 text-sm font-semibold truncate" style={{ color: t.text.primary }}>
          {activeLabel}
        </span>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors active:scale-95"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <LogOut size={14} />
          Quitter
        </button>
      </header>

      {/*
        DEUX MANQUES, MESURES LE 26/10/2026 SUR L'APK, ET LA MEME LIGNE LES CORRIGE.

        `flex flex-col` : les vues de messagerie se dimensionnent par rapport a un parent
        en colonne. Sans lui, leur liste de conversations n'a pas de hauteur et la zone de
        saisie sort de l'ecran. Le conteneur du bureau, lui, l'a toujours eu.

        `p-3` : les vues montees ici n'ont AUCUNE gouttiere a elles — c'est le conteneur
        qui la donne, comme sur le bureau. Sans elle, chaque carte, chaque titre et chaque
        bordure touche les deux bords de l'ecran. C'est le premier motif qui fait dire
        « l'interface n'est pas bonne » : rien ne respire.
      */}
      <main data-tx-mobile-body={arcMobile ? "" : undefined} className={`flex-1 min-h-0 flex flex-col ${isChat ? 'p-2 overflow-hidden' : 'p-3 overflow-y-auto'}`}>
        <Suspense fallback={<PwaSpinner />}>
          {renderView()}
        </Suspense>
      </main>

      {showMore && plus.length > 0 && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 mx-4 rounded-xl overflow-hidden shadow-2xl max-h-[70vh] overflow-y-auto"
            style={{ background: t.modal.bg, border: `1px solid ${t.surface.border}`, marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-2 space-y-0.5">
              {plus.map(onglet => (
                <button
                  key={onglet.id}
                  onClick={() => { setActiveTab(onglet.id); setShowMore(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors active:scale-[0.98]"
                  style={{
                    background: activeTab === onglet.id ? t.accent.bg : 'transparent',
                    color: activeTab === onglet.id ? t.accent.text : t.text.secondary,
                  }}
                >
                  {source.icons[onglet.id]}
                  <span className="text-sm font-medium">{onglet.label}</span>
                </button>
              ))}
              <div className="my-1 mx-4 h-px" style={{ background: t.surface.border }} />
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-400 transition-colors active:scale-[0.98]"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Deconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/*
        Sous Talixy et pour Talvex Administrateur, la barre cede la place au mini double arc.
        Il recoit desormais la liste FILTREE : c'est lui qui proposait 24 onglets dont 13
        retombaient en silence sur le Dashboard.
      */}
      {arcMobile ? (
        <TalixyMiniArc
          items={nav.items}
          activeIndex={nav.activeIndex}
          compartiment={nav.compartiment}
          icons={source.icons}
          onSelect={allerVers}
          onStep={pasTalixy}
        />
      ) : (
      <nav
        className="flex-shrink-0 flex items-stretch safe-area-bottom"
        style={{ background: t.sidebar.bg, borderTop: `1px solid ${t.surface.border}` }}
      >
        {barre.map(onglet => {
          const isActive = activeTab === onglet.id;
          return (
            <button
              key={onglet.id}
              onClick={() => handleTabPress(onglet.id)}
              className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors active:scale-95"
              style={{ color: isActive ? t.accent.text : t.text.quaternary }}
            >
              <div className="relative">
                {source.icons[onglet.id]}
                {isActive && (
                  <div
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                    style={{ background: t.accent.solid }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight truncate max-w-full px-0.5">{onglet.label}</span>
            </button>
          );
        })}
        {plus.length > 0 && (
          <button
            onClick={() => handleTabPress('more')}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors active:scale-95"
            style={{ color: showMore ? t.accent.text : t.text.quaternary }}
          >
            <div className="relative">
              <MoreHorizontal size={18} />
              {showMore && (
                <div
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                  style={{ background: t.accent.solid }}
                />
              )}
            </div>
            <span className="text-[10px] font-medium leading-tight">Plus</span>
          </button>
        )}
      </nav>
      )}
    </div>
  );
}
