import { useState, useEffect, useCallback, Suspense } from 'react';
import { useTalixy } from '../talixy/useTalixy';
import { useTalixyMobileNav, useNavStep } from '../talixy/useTalixyMobileNav';
import TalixyMiniArc from '../talixy/TalixyMiniArc';
import { ICONS as SA_ICONS, LAYOUT_SECTIONS as SA_SECTIONS } from '../pages/superadmin/SuperAdminSidebar';
import { PROTECTED_TAB_IDS } from '../pages/superadmin/useSAHiddenTabs';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppIcon } from '../hooks/useAppIcon';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useCompanyId } from '../contexts/CompanyIdContext';
import {
  type UserRole, getTabsForRole, getMoreTabs, PwaSpinner,
  SADashboard, SAAdmins, SAchatAdmin, SACrmSociete, SAStatuts, SAApiIa, SACerveauIA,
  SASuperAdmins, SAMonCompte, SASystem, SADocumentationCrm,
  AdminVueEnsemble, AdminCrm, AdminChatClient, AdminChatVendeur, AdminChatSuperAdmin, AdminAgenda, AdminPropositionsRdv, AdminStatuts,
  VendorVueEnsemble, VendorLeads, VendorChatAdmin, VendorChatClient, VendorAgenda, VendorPropositionsRdv,
  ClientVueEnsemble, ClientMessagerie, ClientAgenda, ClientPropositionsRdv,
} from './pwaMobileShellConfig';

interface Props {
  role: UserRole;
  onLogout: () => void;
}

export default function PwaMobileShell({ role, onLogout }: Props) {
  const t = useThemeTokens();
  const { appIconUrl } = useAppIcon(null, role === 'super_admin' ? 'super_admin' : 'company');

  const tabs = getTabsForRole(role);
  const moreTabs = getMoreTabs(role);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? 'vue-ensemble');

  /*
   * TALIXY MOBILE — une seule source de verite pour la navigation.
   *
   * La barre du bas de cette coquille etait une liste ECRITE EN DUR (Accueil, Admins, Messages,
   * Societes, Plus) qui ignorait les masquages, les renommages et la reorganisation du bureau.
   * Sous Talixy et pour Talvex Administrateur uniquement, elle cede la place au mini double arc,
   * alimente par layout.visible — exactement la liste de la barre laterale du bureau.
   * Les autres roles et les autres themes gardent leur barre d'onglets, inchangee.
   */
  const talixy = useTalixy();
  const arcMobile = talixy.active && role === 'super_admin';
  const navTalixy = useTalixyMobileNav(SA_SECTIONS, PROTECTED_TAB_IDS, activeTab);
  const allerVers = useCallback((id: string) => { setActiveTab(id); setShowMore(false); }, []);
  const pasTalixy = useNavStep(navTalixy, allerVers);
  const [showMore, setShowMore] = useState(false);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [vendorDbId, setVendorDbId] = useState<string | null>(null);

  /*
   * LE NOM DE LA SOCIETE, QUE CETTE COQUILLE NE LISAIT PAS.
   *
   * MESURE DU 26/10/2026 SUR L'APK : la carte d'identite affichait « — » pour la
   * Societe, et « ? » pour l'avatar. Ce n'etait pas de la lenteur — AUCUNE requete ne
   * partait. Sur le bureau, cette lecture vit dans useAdminDashboardEffects, un fichier
   * que la coquille telephone ne monte jamais : elle importe la VUE toute seule et saute
   * toute la couche qui l'alimente.
   *
   * On ne monte pas AdminDashboard ici pour autant — ce serait monter un panel entier
   * pour trois chaines. On recopie la seule requete qui manque, a l'identique
   * (useAdminDashboardEffects.ts:90-94). Le companyId vient du fournisseur pose par
   * AppShell, qui est deja la.
   */
  const companyId = useCompanyId();
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

  const activeLabel = (() => {
    if (arcMobile) {
      const t = navTalixy.items.find(i => i.id === activeTab);
      if (t) return t.label;
    }
    const all = [...tabs, ...moreTabs];
    return all.find(tab => tab.key === activeTab)?.label ?? 'Accueil';
  })();

  const isChat = activeTab === 'chat-client' || activeTab === 'chat-vendeur'
    || activeTab === 'chat-admin' || activeTab === 'chat-super-admin'
    || activeTab === 'messagerie';

  const renderView = () => {
    if (role === 'super_admin') {
      switch (activeTab) {
        case 'dashboard': return <SADashboard />;
        case 'admins': return <SAAdmins />;
        case 'chat-admin': return <SAchatAdmin />;
        case 'crm-societe': return <SACrmSociete />;
        case 'statuts': return <SAStatuts />;
        case 'api-ia': return <SAApiIa />;
        case 'cerveau-ia': return <SACerveauIA />;
        case 'super-admins': return <SASuperAdmins />;
        case 'mon-compte': return <SAMonCompte />;
        case 'system': return <SASystem />;
        case 'documentation-crm': return <SADocumentationCrm />;
        default: return <SADashboard />;
      }
    }
    if (role === 'admin') {
      /*
       * LES TROIS PROPS D'IDENTITE, QUI MANQUAIENT ICI ET NULLE PART AILLEURS.
       *
       * Les roles vendeur et client passaient deja les leurs (vendorName, clientName) ;
       * seul l'admin montait sa vue nue. Or VueEnsemble declare des defauts VIDES
       * (VueEnsemble.tsx:43-45) et SocieteIdentityCard affiche `valeur || '—'` : une
       * chaine vide donne donc « — » de facon PERMANENTE, pas transitoire. C'est, champ
       * pour champ, la capture d'ecran du 26/10/2026.
       *
       * Le bureau les passe de la meme facon (AdminViewRenderer.tsx:144).
       */
      const identite = { fullName: userName, companyName, email: userEmail };
      switch (activeTab) {
        case 'vue-ensemble': return <AdminVueEnsemble {...identite} />;
        case 'crm': return <AdminCrm />;
        case 'chat-client': return <AdminChatClient />;
        case 'chat-vendeur': return <AdminChatVendeur />;
        case 'chat-super-admin': return <AdminChatSuperAdmin />;
        case 'agenda': return <AdminAgenda />;
        case 'propositions-rdv': return <AdminPropositionsRdv />;
        case 'statuts': return <AdminStatuts />;
        default: return <AdminVueEnsemble {...identite} />;
      }
    }
    if (role === 'vendor') {
      switch (activeTab) {
        case 'vue-ensemble': return <VendorVueEnsemble vendorId={vendorDbId} />;
        case 'leads': return <VendorLeads vendorId={vendorDbId} />;
        case 'chat-admin': return <VendorChatAdmin vendorName={userName || 'Vendeur'} vendorDbId={vendorDbId} />;
        case 'chat-client': return <VendorChatClient vendorName={userName || 'Vendeur'} vendorDbId={vendorDbId} />;
        case 'agenda': return <VendorAgenda vendorId={vendorDbId} />;
        case 'propositions-rdv': return <VendorPropositionsRdv vendorDbId={vendorDbId} />;
        default: return <VendorVueEnsemble vendorId={vendorDbId} />;
      }
    }
    switch (activeTab) {
      case 'vue-ensemble': return <ClientVueEnsemble clientName={userName || 'Client'} clientAuthId={userId} onNavigate={(v) => setActiveTab(v)} />;
      case 'messagerie': return <ClientMessagerie clientName={userName || 'Client'} clientAuthId={userId} />;
      case 'agenda': return <ClientAgenda clientEmail={userEmail} />;
      case 'propositions-rdv': return <ClientPropositionsRdv clientEmail={userEmail} />;
      default: return <ClientVueEnsemble clientName={userName || 'Client'} clientAuthId={userId} onNavigate={(v) => setActiveTab(v)} />;
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

        `p-3` : les neuf vues montees ici n'ont AUCUNE gouttiere a elles — c'est le
        conteneur qui la donne, comme sur le bureau. Sans elle, chaque carte, chaque titre
        et chaque bordure touche les deux bords de l'ecran. C'est le premier motif qui
        fait dire « l'interface n'est pas bonne » : rien ne respire.
      */}
      <main data-tx-mobile-body={arcMobile ? "" : undefined} className={`flex-1 min-h-0 flex flex-col ${isChat ? 'p-2 overflow-hidden' : 'p-3 overflow-y-auto'}`}>
        <Suspense fallback={<PwaSpinner />}>
          {renderView()}
        </Suspense>
      </main>

      {showMore && moreTabs.length > 0 && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 mx-4 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: t.modal.bg, border: `1px solid ${t.surface.border}`, marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-2 space-y-0.5">
              {moreTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setShowMore(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors active:scale-[0.98]"
                  style={{
                    background: activeTab === tab.key ? t.accent.bg : 'transparent',
                    color: activeTab === tab.key ? t.accent.text : t.text.secondary,
                  }}
                >
                  {tab.icon}
                  <span className="text-sm font-medium">{tab.label}</span>
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
        Sous Talixy et pour Talvex Administrateur, la barre codee en dur cede la place au mini
        double arc, alimente par la VRAIE navigation. Partout ailleurs, rien ne change.
      */}
      {arcMobile ? (
        <TalixyMiniArc
          items={navTalixy.items}
          activeIndex={navTalixy.activeIndex}
          compartiment={navTalixy.compartiment}
          icons={SA_ICONS}
          onSelect={allerVers}
          onStep={pasTalixy}
        />
      ) : (
      <nav
        className="flex-shrink-0 flex items-stretch safe-area-bottom"
        style={{ background: t.sidebar.bg, borderTop: `1px solid ${t.surface.border}` }}
      >
        {tabs.map(tab => {
          const isActive = tab.key === 'more' ? showMore : activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabPress(tab.key)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors active:scale-95"
              style={{ color: isActive ? t.accent.text : t.text.quaternary }}
            >
              <div className="relative">
                {tab.icon}
                {isActive && (
                  <div
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                    style={{ background: t.accent.solid }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      )}
    </div>
  );
}
