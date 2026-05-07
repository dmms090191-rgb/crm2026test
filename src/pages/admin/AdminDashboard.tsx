import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import InfoAdmin from './views/InfoAdmin';
import type { ImpersonatedClient, ChatLead } from './views/Crm';
import type { Vendor } from './views/ListeVendeurs';
import AgendaEquipe from './views/AgendaEquipe';

const VueEnsemble = lazy(() => import('./views/VueEnsemble'));
const Inscription = lazy(() => import('./views/Inscription'));
const AjouterLeads = lazy(() => import('./views/AjouterLeads'));
const AjouterVendeur = lazy(() => import('./views/AjouterVendeur'));
const ListeVendeurs = lazy(() => import('./views/ListeVendeurs'));
const ChatClient = lazy(() => import('./views/ChatClient'));
const ChatVendeur = lazy(() => import('./views/ChatVendeur'));
const Agenda = lazy(() => import('./views/Agenda'));
const PropositionsRdv = lazy(() => import('./views/PropositionsRdv'));
const Statuts = lazy(() => import('./views/Statuts'));
const Crm = lazy(() => import('./views/Crm'));
const ImportLeads = lazy(() => import('./views/ImportLeads'));
const importDocumentationCrm = () => import('./views/DocumentationCrm');
const DocumentationCrm = lazy(importDocumentationCrm);
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useUnreadClientMessages } from '../../hooks/useUnreadClientMessages';
import { useUnreadVendorMessages } from '../../hooks/useUnreadVendorMessages';
import { useAgendaNotifications } from '../../hooks/useAgendaNotifications';
import { useAgendaEquipeNotifications } from '../../hooks/useAgendaEquipeNotifications';
import type { VendorNotifEntry } from './TopBar';

interface AdminDashboardProps {
  onLogout: () => void;
  onConnectAsVendor?: (vendor: Vendor) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
}

export type ActiveView =
  | 'vue-ensemble'
  | 'info-admin'
  | 'inscription'
  | 'import-leads'
  | 'ajouter-leads'
  | 'crm'
  | 'ajouter-vendeur'
  | 'liste-vendeurs'
  | 'chat-client'
  | 'chat-vendeur'
  | 'agenda'
  | 'agenda-equipe'
  | 'propositions-rdv'
  | 'statuts'
  | 'documentation-crm';

export default function AdminDashboard({ onLogout, onConnectAsVendor, onConnectAsClient }: AdminDashboardProps) {
  const t = useThemeTokens();
  const { unreadCount: unreadClientCount, unreadEntries, markAsRead: markClientRead } = useUnreadClientMessages();
  const { unreadCount: unreadVendorCount, unreadEntries: unreadVendorEntries, markAsRead: markVendorRead } = useUnreadVendorMessages();
  const [adminAuthId, setAdminAuthId] = useState<string | null>(null);
  const { notifications: agendaNotifs, count: agendaPersoCount, markAsSeen: markAgendaSeen } = useAgendaNotifications('admin', adminAuthId);
  const { notifications: agendaEquipeNotifs, count: agendaEquipeCount, markAsSeen: markAgendaEquipeSeen } = useAgendaEquipeNotifications(adminAuthId);
  const [confirmedUnseen, setConfirmedUnseen] = useState<{ id: string; lead_name: string; created_at: string }[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('vue-ensemble');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminName, setAdminName] = useState('Administrateur');
  const [chatLead, setChatLead] = useState<ChatLead | null>(null);
  const [rdvLead, setRdvLead] = useState<ChatLead | null>(null);
  const [chatVendor, setChatVendor] = useState<Vendor | null>(null);
  const [chatClientMessageSent, setChatClientMessageSent] = useState(false);
  const [chatVendorMessageSent, setChatVendorMessageSent] = useState(false);
  const [docInitialTab, setDocInitialTab] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setAdminAuthId(user.id);
      if (user.user_metadata) {
        const { first_name, last_name } = user.user_metadata;
        if (first_name || last_name) {
          setAdminName([first_name, last_name].filter(Boolean).join(' '));
        }
      }
    });
  }, []);

  useEffect(() => {
    const fetchUnseen = async () => {
      const { data } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at')
        .eq('status', 'confirmed')
        .eq('seen_by_admin', false)
        .is('vendor_id', null)
        .order('created_at', { ascending: false });
      setConfirmedUnseen(data ?? []);
    };
    fetchUnseen();
    const ch = supabase
      .channel('admin-confirmed-unseen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, fetchUnseen)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const id = requestIdleCallback(() => { importDocumentationCrm(); });
    return () => cancelIdleCallback(id);
  }, []);

  const handleNameChange = useCallback((firstName: string, lastName: string) => {
    setAdminName([firstName, lastName].filter(Boolean).join(' ') || 'Administrateur');
  }, []);

  const handleClientEntryClick = useCallback((entry: { leadId: string; nom: string; prenom: string; email: string; clientAuthId: string }) => {
    setChatLead({ id: entry.leadId, nom: entry.nom, prenom: entry.prenom, email: entry.email });
    setChatClientMessageSent(false);
    setActiveView('chat-client');
    markClientRead(entry.clientAuthId);
  }, [markClientRead]);

  const handleVendorEntryClick = useCallback((entry: VendorNotifEntry) => {
    const v: Vendor = { id: entry.vendorId, first_name: entry.firstName, last_name: entry.lastName, email: entry.email, auth_user_id: null, password: '', phone: '', created_at: '' };
    setChatVendor(v);
    setChatVendorMessageSent(false);
    setActiveView('chat-vendeur');
    markVendorRead(entry.vendorId);
  }, [markVendorRead]);

  const handleVendorViewed = useCallback((vendorId: string) => {
    markVendorRead(vendorId);
  }, [markVendorRead]);

  const handleAgendaPersoClick = useCallback((rdvId: string) => {
    markAgendaSeen(rdvId);
    setActiveView('agenda');
  }, [markAgendaSeen]);

  const handleAgendaEquipeClick = useCallback((rdvId: string) => {
    markAgendaEquipeSeen(rdvId);
    setActiveView('agenda-equipe');
  }, [markAgendaEquipeSeen]);

  const handleProposalEntryClick = useCallback((proposalId: string) => {
    supabase
      .from('rdv_proposals')
      .update({ seen_by_admin: true })
      .eq('id', proposalId)
      .then(() => {
        setConfirmedUnseen(prev => prev.filter(p => p.id !== proposalId));
      });
    setActiveView('propositions-rdv');
  }, []);

  const handleNavigate = useCallback((view: ActiveView, options?: { docTab?: string }) => {
    if (activeView === 'chat-client' && !chatClientMessageSent) {
      setChatLead(null);
    }
    if (activeView === 'chat-vendeur' && !chatVendorMessageSent) {
      setChatVendor(null);
    }
    if (view === 'documentation-crm' && options?.docTab) {
      setDocInitialTab(options.docTab);
    } else {
      setDocInitialTab(undefined);
    }
    setActiveView(view);
  }, [activeView, chatClientMessageSent, chatVendorMessageSent]);

  const lazyFallback = <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const renderView = () => {
    switch (activeView) {
      case 'vue-ensemble': return <Suspense fallback={lazyFallback}><VueEnsemble onNavigate={handleNavigate} /></Suspense>;
      case 'inscription': return <Suspense fallback={lazyFallback}><Inscription /></Suspense>;
      case 'import-leads': return <Suspense fallback={lazyFallback}><ImportLeads onNavigateToCrm={() => handleNavigate('crm')} /></Suspense>;
      case 'ajouter-leads': return <Suspense fallback={lazyFallback}><AjouterLeads /></Suspense>;
      case 'crm': return <Suspense fallback={lazyFallback}><Crm onConnectAsClient={onConnectAsClient} onOpenChat={(lead) => { setChatLead(lead); setChatClientMessageSent(false); setActiveView('chat-client'); }} onOpenRdv={(lead) => { setRdvLead(lead); setActiveView('propositions-rdv'); }} /></Suspense>;
      case 'ajouter-vendeur': return <Suspense fallback={lazyFallback}><AjouterVendeur /></Suspense>;
      case 'liste-vendeurs': return <Suspense fallback={lazyFallback}><ListeVendeurs onConnectAsVendor={onConnectAsVendor} onOpenChat={(vendor) => { setChatVendor(vendor); setChatVendorMessageSent(false); setActiveView('chat-vendeur'); }} /></Suspense>;
      case 'chat-client': return null;
      case 'chat-vendeur': return null;
      case 'agenda': return <Suspense fallback={lazyFallback}><Agenda /></Suspense>;
      case 'agenda-equipe': return <AgendaEquipe />;
      case 'propositions-rdv': return <Suspense fallback={lazyFallback}><PropositionsRdv initialLead={rdvLead} onInitialLeadConsumed={() => setRdvLead(null)} onNavigateToCrm={() => handleNavigate('crm')} /></Suspense>;
      case 'statuts': return <Suspense fallback={lazyFallback}><Statuts /></Suspense>;
      case 'documentation-crm': return <Suspense fallback={lazyFallback}><DocumentationCrm initialTab={docInitialTab} onInitialTabConsumed={() => setDocInitialTab(undefined)} /></Suspense>;
      default: return <Suspense fallback={lazyFallback}><VueEnsemble /></Suspense>;
    }
  };

  const getBreadcrumb = () => {
    const labels: Record<ActiveView, string> = {
      'vue-ensemble': "Vue d'ensemble",
      'info-admin': 'Info admin',
      'inscription': 'Inscription',
      'import-leads': 'Import de leads',
      'ajouter-leads': 'Ajouter leads',
      'crm': 'Crm',
      'ajouter-vendeur': 'Ajouter vendeur',
      'liste-vendeurs': 'Liste vendeurs',
      'chat-client': 'Chat Client',
      'chat-vendeur': 'Chat Vendeur',
      'agenda': 'Agenda perso',
      'agenda-equipe': 'Agenda équipe',
      'propositions-rdv': 'Propositions RDV',
      'statuts': 'Statuts',
      'documentation-crm': 'Documentation CRM',
    };
    return labels[activeView];
  };

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300" style={{ background: t.main.bg }}>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
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
        />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
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
          agendaPersoCount={agendaPersoCount}
          agendaPersoEntries={agendaNotifs}
          onAgendaPersoEntryClick={handleAgendaPersoClick}
          agendaEquipeCount={agendaEquipeCount}
          agendaEquipeEntries={agendaEquipeNotifs}
          onAgendaEquipeEntryClick={handleAgendaEquipeClick}
          propositionsCount={confirmedUnseen.length}
          propositionsEntries={confirmedUnseen}
          onPropositionEntryClick={handleProposalEntryClick}
        />
        <main
          className="flex-1 flex flex-col p-3 sm:p-4 md:p-6"
          style={{
            minHeight: 0,
            overflow: (activeView === 'chat-client' || activeView === 'chat-vendeur') ? 'hidden' : 'auto',
          }}
        >
          <div style={{ display: activeView === 'info-admin' ? 'block' : 'none' }}>
            <InfoAdmin onNameChange={handleNameChange} />
          </div>
          {activeView === 'chat-client' && (
            <Suspense fallback={lazyFallback}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <ChatClient initialLead={chatLead} onMessageSent={() => setChatClientMessageSent(true)} onClientViewed={markClientRead} />
              </div>
            </Suspense>
          )}
          {activeView === 'chat-vendeur' && (
            <Suspense fallback={lazyFallback}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <ChatVendeur key={chatVendor?.id ?? 'no-vendor'} initialVendor={chatVendor} onMessageSent={() => setChatVendorMessageSent(true)} onVendorViewed={handleVendorViewed} />
              </div>
            </Suspense>
          )}
          {activeView !== 'info-admin' && activeView !== 'chat-client' && activeView !== 'chat-vendeur' && renderView()}
        </main>
      </div>
    </div>
  );
}
