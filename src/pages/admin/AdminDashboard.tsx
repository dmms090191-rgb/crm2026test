import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import InfoAdmin from './views/InfoAdmin';
import type { ImpersonatedClient, ChatLead } from './views/Crm';
import type { Vendor } from './views/ListeVendeurs';
import AgendaEquipe from './views/AgendaEquipe';
import { SimulationProvider } from '../../contexts/SimulationContext';
import { SimulationBanner } from './views/sauvegarde/SimulationBanner';
const VueEnsemble = lazy(() => import('./views/VueEnsemble'));
const Inscription = lazy(() => import('./views/Inscription'));
const AjouterLeads = lazy(() => import('./views/AjouterLeads'));
const AjouterVendeur = lazy(() => import('./views/AjouterVendeur'));
const ListeVendeurs = lazy(() => import('./views/ListeVendeurs'));
const ChatClient = lazy(() => import('./views/ChatClient'));
const ChatVendeur = lazy(() => import('./views/ChatVendeur'));
const ChatSuperAdmin = lazy(() => import('./views/ChatSuperAdmin'));
const Agenda = lazy(() => import('./views/Agenda'));
const PropositionsRdv = lazy(() => import('./views/PropositionsRdv'));
const Statuts = lazy(() => import('./views/Statuts'));
const Crm = lazy(() => import('./views/Crm'));
const ImportLeads = lazy(() => import('./views/ImportLeads'));
const importDocumentationCrm = () => import('./views/DocumentationCrm');
const DocumentationCrm = lazy(importDocumentationCrm);
const SauvegardeRestauration = lazy(() => import('./views/SauvegardeRestauration'));
const SystemPage = lazy(() => import('./views/SystemPage'));
import { supabase } from '../../lib/supabase';
import { saveConnectReturnContext, consumeConnectReturnContext, saveChatReturnContext } from '../../lib/connectReturnContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useUnreadClientMessages } from '../../hooks/useUnreadClientMessages';
import { useUnreadVendorMessages } from '../../hooks/useUnreadVendorMessages';
import { useUnreadFromSuperAdmin } from '../../hooks/useUnreadFromSuperAdmin';
import { useAgendaNotifications } from '../../hooks/useAgendaNotifications';
import { useAgendaEquipeNotifications } from '../../hooks/useAgendaEquipeNotifications';
import { BREADCRUMB_LABELS } from './adminDashboardConstants';
import { useAdminProposalNotifs } from './dashboard/useAdminProposalNotifs';
import { useAdminNavHandlers } from './dashboard/useAdminNavHandlers';

export interface ImpersonatedAdminInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  pin?: string;
  company_id?: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
  onConnectAsVendor?: (vendor: Vendor) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  impersonatedAdmin?: ImpersonatedAdminInfo | null;
  onBackToSuperAdmin?: () => void;
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
  | 'chat-super-admin'
  | 'chat-client'
  | 'chat-vendeur'
  | 'agenda'
  | 'agenda-equipe'
  | 'propositions-rdv'
  | 'statuts'
  | 'documentation-crm'
  | 'system'
  | 'sauvegarde';

export default function AdminDashboard({ onLogout, onConnectAsVendor, onConnectAsClient, impersonatedAdmin, onBackToSuperAdmin }: AdminDashboardProps) {
  const t = useThemeTokens();
  const { unreadCount: unreadClientCount, unreadEntries, markAsRead: markClientRead } = useUnreadClientMessages();
  const { unreadCount: unreadVendorCount, unreadEntries: unreadVendorEntries, markAsRead: markVendorRead } = useUnreadVendorMessages();
  const [adminAuthId, setAdminAuthId] = useState<string | null>(null);
  const effectiveAdminId = impersonatedAdmin?.id ?? adminAuthId;
  const { notifications: agendaNotifs, count: agendaPersoCount, markAsSeen: markAgendaSeen } = useAgendaNotifications('admin', adminAuthId);
  const { notifications: agendaEquipeNotifs, count: agendaEquipeCount, markAsSeen: markAgendaEquipeSeen } = useAgendaEquipeNotifications(adminAuthId);
  const { unreadCount: unreadSuperAdminCount, markAsRead: markSuperAdminRead } = useUnreadFromSuperAdmin(effectiveAdminId);
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
  const pendingScrollRef = useRef<{ leadId?: string; vendorId?: string; scrollY: number } | null>(null);

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

  useEffect(() => {
    const ctx = consumeConnectReturnContext('admin');
    if (ctx) {
      setActiveView(ctx.fromTab as ActiveView);
      pendingScrollRef.current = { leadId: ctx.leadId, vendorId: ctx.vendorId, scrollY: ctx.scrollY };
    }
  }, []);

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    const { leadId, vendorId, scrollY } = pendingScrollRef.current;
    pendingScrollRef.current = null;
    const targetId = leadId || vendorId;
    if (!targetId) { window.scrollTo({ top: scrollY, behavior: 'smooth' }); return; }
    let n = 0;
    const poll = () => {
      const el = document.querySelector(`[data-row-id="${targetId}"]`);
      if (!el) { if (++n < 30) setTimeout(poll, 150); return; }
      requestAnimationFrame(() => {
        const main = el.closest('main');
        if (main) { const r = el.getBoundingClientRect(), m = main.getBoundingClientRect(); main.scrollTo({ top: Math.max(0, r.top - m.top + main.scrollTop - main.clientHeight / 2 + r.height / 2), behavior: 'smooth' }); }
        else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('scroll-highlight'); setTimeout(() => el.classList.remove('scroll-highlight'), 2000);
      });
    };
    const tm = setTimeout(poll, 200);
    return () => clearTimeout(tm);
  }, [activeView]);

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
    const id = requestIdleCallback(() => { importDocumentationCrm(); });
    return () => cancelIdleCallback(id);
  }, []);

  const handleNameChange = useCallback((firstName: string, lastName: string) => {
    setAdminName([firstName, lastName].filter(Boolean).join(' ') || 'Administrateur');
  }, []);

  const lazyFallback = <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const renderView = () => {
    switch (activeView) {
      case 'vue-ensemble': return <Suspense fallback={lazyFallback}><VueEnsemble onNavigate={handleNavigate} unreadClientConversations={unreadEntries.length} unreadVendorConversations={unreadVendorEntries.length} /></Suspense>;
      case 'inscription': return <Suspense fallback={lazyFallback}><Inscription /></Suspense>;
      case 'import-leads': return <Suspense fallback={lazyFallback}><ImportLeads onNavigateToCrm={() => handleNavigate('crm')} /></Suspense>;
      case 'ajouter-leads': return <Suspense fallback={lazyFallback}><AjouterLeads /></Suspense>;
      case 'crm': return <Suspense fallback={lazyFallback}><Crm onConnectAsClient={(client) => { saveConnectReturnContext({ fromRole: 'admin', fromTab: 'crm', leadId: client.id, scrollY: window.scrollY }); onConnectAsClient?.(client); }} onOpenChat={(lead) => { saveChatReturnContext(lead.id, [lead.prenom, lead.nom].filter(Boolean).join(' ') || lead.email); setChatLead(lead); setChatClientMessageSent(false); setActiveView('chat-client'); }} onOpenRdv={(lead) => { setRdvLead(lead); setActiveView('propositions-rdv'); }} /></Suspense>;
      case 'ajouter-vendeur': return <Suspense fallback={lazyFallback}><AjouterVendeur /></Suspense>;
      case 'liste-vendeurs': return <Suspense fallback={lazyFallback}><ListeVendeurs onConnectAsVendor={(vendor) => { saveConnectReturnContext({ fromRole: 'admin', fromTab: 'liste-vendeurs', vendorId: vendor.id, scrollY: window.scrollY }); onConnectAsVendor?.(vendor); }} onOpenChat={(vendor) => { setChatVendor(vendor); setChatVendorMessageSent(false); setActiveView('chat-vendeur'); }} /></Suspense>;
      case 'chat-client': return null;
      case 'chat-vendeur': return null;
      case 'chat-super-admin': return null;
      case 'agenda': return <Suspense fallback={lazyFallback}><Agenda /></Suspense>;
      case 'agenda-equipe': return <AgendaEquipe />;
      case 'propositions-rdv': return <Suspense fallback={lazyFallback}><PropositionsRdv initialLead={rdvLead} onInitialLeadConsumed={() => setRdvLead(null)} onNavigateToCrm={(leadId?: string) => { if (leadId) pendingScrollRef.current = { leadId, scrollY: 0 }; handleNavigate('crm'); }} /></Suspense>;
      case 'statuts': return <Suspense fallback={lazyFallback}><Statuts /></Suspense>;
      case 'documentation-crm': return <Suspense fallback={lazyFallback}><DocumentationCrm initialTab={docInitialTab} onInitialTabConsumed={() => setDocInitialTab(undefined)} /></Suspense>;
      case 'system': return <Suspense fallback={lazyFallback}><SystemPage /></Suspense>;
      case 'sauvegarde': return <Suspense fallback={lazyFallback}><SauvegardeRestauration /></Suspense>;
      default: return <Suspense fallback={lazyFallback}><VueEnsemble unreadClientConversations={unreadEntries.length} unreadVendorConversations={unreadVendorEntries.length} /></Suspense>;
    }
  };
  const getBreadcrumb = () => BREADCRUMB_LABELS[activeView];

  return (
    <SimulationProvider>
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: t.main.bg }}>
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
        />
        <SimulationBanner />
        <main
          className={`flex-1 flex flex-col md:p-6 mobile-main-scroll ${(activeView === 'chat-client' || activeView === 'chat-vendeur' || activeView === 'chat-super-admin') ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}`}
          style={{
            minHeight: 0,
            overflow: (activeView === 'chat-client' || activeView === 'chat-vendeur' || activeView === 'chat-super-admin') ? 'hidden' : 'auto',
          }}
        >
          <div style={{ display: activeView === 'info-admin' ? 'block' : 'none' }}>
            <InfoAdmin onNameChange={handleNameChange} impersonatedAdmin={impersonatedAdmin} />
          </div>
          {activeView === 'chat-client' && (
            <Suspense fallback={lazyFallback}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <ChatClient initialLead={chatLead} onMessageSent={() => setChatClientMessageSent(true)} onClientViewed={markClientRead} onReturnToCrm={handleReturnToCrm} />
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
          {activeView === 'chat-super-admin' && (
            <Suspense fallback={lazyFallback}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <ChatSuperAdmin adminIdOverride={effectiveAdminId} onSuperAdminViewed={markSuperAdminRead} />
              </div>
            </Suspense>
          )}
          {activeView !== 'info-admin' && activeView !== 'chat-client' && activeView !== 'chat-vendeur' && activeView !== 'chat-super-admin' && renderView()}
        </main>
      </div>
    </div>
    </SimulationProvider>
  );
}
