import { useState, useEffect, useCallback, useRef } from 'react';
import VendorSidebar from './VendorSidebar';
import VendorTopBar from './VendorTopBar';
import VendorViewRenderer, { vendorBreadcrumb } from './VendorViewRenderer';
import { supabase } from '../../lib/supabase';
import { consumeConnectReturnContext, consumeChatReturnContext } from '../../lib/connectReturnContext';
import type { ImpersonatedClientInfo } from '../client/ClientDashboard';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import GlassBackgroundLayer from '../../components/theme/GlassBackgroundLayer';
import { useUnreadVendorAdminMessages } from '../../hooks/useUnreadVendorAdminMessages';
import { useUnreadVendorClientMessages } from '../../hooks/useUnreadVendorClientMessages';
import { useAgendaNotifications } from '../../hooks/useAgendaNotifications';
import { useVendorNotifPrefs } from './dashboard/useVendorNotifPrefs';
import { useVendorProposalNotifs } from './dashboard/useVendorProposalNotifs';
import type { VendorClientNotifEntry } from './VendorTopBar';
import DemoEmitterLayer from '../../components/demo/DemoEmitterLayer';
import DemoReceiverLayer from '../../components/demo/DemoReceiverLayer';
import { useDemoSessionSafe } from '../../components/demo/DemoSessionContext';

export interface ImpersonatedVendor {
  id: string;
  first_name: string;
  last_name: string;
  auth_user_id?: string | null;
}

interface VendorDashboardProps {
  onLogout: () => void;
  impersonatedVendor?: ImpersonatedVendor;
  onBackToAdmin?: () => void;
  onConnectAsClient?: (client: ImpersonatedClientInfo) => void;
  isSAViewing?: boolean;
  visuBadgeLabel?: string;
  backLabel?: string;
  canHideTabs?: boolean;
  hideTabsTargetName?: string;
  hideTabsTargetUserId?: string | null;
}

export type VendorActiveView = 'vue-ensemble' | 'leads' | 'chat-admin' | 'chat-client' | 'agenda' | 'propositions-rdv' | 'tuto';

export interface VendorChatLead {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  tel?: string;
}

export default function VendorDashboard({ onLogout, impersonatedVendor, onBackToAdmin, onConnectAsClient, isSAViewing, visuBadgeLabel, backLabel, canHideTabs, hideTabsTargetName, hideTabsTargetUserId }: VendorDashboardProps) {
  const tokens = useThemeTokens();
  const demoCtx = useDemoSessionSafe();
  const demoStatus: 'idle' | 'pending' | 'active' = demoCtx?.session?.status === 'active' ? 'active' : demoCtx?.session?.status === 'pending' ? 'pending' : 'idle';
  const [activeView, setActiveView] = useState<VendorActiveView>('vue-ensemble');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [vendorName, setVendorName] = useState('Vendeur');
  const [vendorDbId, setVendorDbId] = useState<string | null>(null);
  const [connectedAuthId, setConnectedAuthId] = useState<string | null>(null);
  const [chatLead, setChatLead] = useState<VendorChatLead | null>(null);
  const [rdvLead, setRdvLead] = useState<VendorChatLead | null>(null);
  const { unreadCount: unreadAdminCount, latestAt: unreadAdminLatestAt, preview: unreadAdminPreview, markAsRead: markAdminRead } = useUnreadVendorAdminMessages(vendorDbId);
  const { unreadCount: unreadClientCount, unreadEntries: unreadClientEntries, markAsRead: markClientRead } = useUnreadVendorClientMessages(vendorDbId);
  const { notifications: agendaNotifs, count: agendaCount, markAsSeen: markAgendaSeen } = useAgendaNotifications('vendor', vendorDbId);
  const { proposalUnseen, confirmedUnseen, markProposalSeen, markConfirmedSeen } = useVendorProposalNotifs(vendorDbId);
  const pendingScrollRef = useRef<{ leadId?: string; scrollY: number } | null>(null);
  // --- Hub Notifications ---------------------------------------------------
  const notifPrefs = useVendorNotifPrefs(vendorDbId, connectedAuthId, impersonatedVendor, canHideTabs);

  useEffect(() => {
    const ctx = consumeConnectReturnContext('vendor');
    if (ctx) {
      setActiveView(ctx.fromTab as VendorActiveView);
      pendingScrollRef.current = { leadId: ctx.leadId, scrollY: ctx.scrollY };
    }
  }, []);

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    const { leadId, scrollY } = pendingScrollRef.current;
    pendingScrollRef.current = null;
    if (!leadId) { window.scrollTo({ top: scrollY, behavior: 'smooth' }); return; }
    let n = 0;
    const poll = () => {
      const el = document.querySelector(`[data-row-id="${leadId}"]`);
      if (!el) { if (++n < 30) setTimeout(poll, 150); return; }
      requestAnimationFrame(() => {
        const main = el.closest('main');
        if (main) { const r = el.getBoundingClientRect(), m = main.getBoundingClientRect(); main.scrollTo({ top: Math.max(0, r.top - m.top + main.scrollTop - main.clientHeight / 2 + r.height / 2), behavior: 'smooth' }); }
        else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('scroll-highlight'); setTimeout(() => el.classList.remove('scroll-highlight'), 2000);
      });
    };
    const t = setTimeout(poll, 200);
    return () => clearTimeout(t);
  }, [activeView]);

  useEffect(() => {
    if (impersonatedVendor) {
      setVendorName([impersonatedVendor.first_name, impersonatedVendor.last_name].filter(Boolean).join(' ') || 'Vendeur');
      setVendorDbId(impersonatedVendor.id);
      return;
    }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      if (user?.user_metadata) {
        const { first_name, last_name } = user.user_metadata;
        if (first_name || last_name) {
          setVendorName([first_name, last_name].filter(Boolean).join(' '));
        }
      }
      setConnectedAuthId(user.id);
      const { data: vendorRow } = await supabase
        .from('vendors')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (vendorRow) setVendorDbId(vendorRow.id);
    });
  }, [impersonatedVendor]);

  useEffect(() => {
    if (activeView === 'chat-admin') {
      markAdminRead();
    }
  }, [activeView, markAdminRead]);

  const handleAdminNotifClick = useCallback(() => {
    setActiveView('chat-admin');
  }, []);

  const handleAgendaNotifClick = useCallback((rdvId: string, type?: 'starting' | 'untreated') => {
    markAgendaSeen(rdvId, type);
    setActiveView('agenda');
  }, [markAgendaSeen]);

  const handleProposalEntryClick = useCallback((proposalId: string) => {
    markProposalSeen(proposalId);
    setActiveView('propositions-rdv');
  }, [markProposalSeen]);

  const handleConfirmedEntryClick = useCallback((proposalId: string) => {
    markConfirmedSeen(proposalId);
    setActiveView('propositions-rdv');
  }, [markConfirmedSeen]);

  const handleClientEntryClick = useCallback((entry: VendorClientNotifEntry) => {
    setChatLead({ id: entry.leadId, nom: entry.nom, prenom: entry.prenom, email: entry.email });
    setActiveView('chat-client');
    markClientRead(entry.clientAuthId);
  }, [markClientRead]);

  const handleClientViewed = useCallback((clientAuthId: string) => {
    markClientRead(clientAuthId);
  }, [markClientRead]);

  const handleReturnToLeads = useCallback(() => {
    const ctx = consumeChatReturnContext();
    setChatLead(null); setActiveView('leads');
    if (ctx) pendingScrollRef.current = { leadId: ctx.leadId, scrollY: 0 };
  }, []);

  const getBreadcrumb = useCallback(() => vendorBreadcrumb(activeView), [activeView]);

  return (
    <div className="flex h-[100dvh] overflow-hidden relative" style={{ background: tokens.main.bg }}>
      <GlassBackgroundLayer />
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: tokens.modal.overlayBg }} onClick={() => setMobileOpen(false)} />
      )}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-[min(280px,calc(100vw-64px))]
          md:relative md:z-auto md:w-auto
          transition-transform duration-300 md:transition-none md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <VendorSidebar
          activeView={activeView}
          onNavigate={(view) => { if (view === 'chat-client') sessionStorage.removeItem('crm_chat_return_context'); setActiveView(view); setMobileOpen(false); }}
          collapsed={mobileOpen ? false : sidebarCollapsed}
          onCollapse={() => { if (mobileOpen) setMobileOpen(false); else setSidebarCollapsed(!sidebarCollapsed); }}
          onLogout={onLogout}
          vendorAuthId={impersonatedVendor?.auth_user_id ?? null}
          onBackToRoisAdmin={onBackToAdmin}
          visuBadgeLabel={visuBadgeLabel}
          backLabel={backLabel}
          canHideTabs={canHideTabs}
          hideTabsTargetName={hideTabsTargetName}
          hideTabsTargetUserId={hideTabsTargetUserId}
        />
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        <VendorTopBar
          breadcrumb={getBreadcrumb()}
          onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
          vendorName={vendorName}
          isImpersonating={!!impersonatedVendor}
          onBackToAdmin={onBackToAdmin}
          unreadAdminCount={unreadAdminCount}
          unreadAdminLatestAt={unreadAdminLatestAt}
          unreadAdminPreview={unreadAdminPreview}
          adminName={notifPrefs.adminIdentity.name}
          adminSubtitle={notifPrefs.adminIdentity.subtitle}
          onAdminNotifClick={handleAdminNotifClick}
          unreadClientCount={unreadClientCount}
          unreadClientEntries={unreadClientEntries}
          onClientEntryClick={handleClientEntryClick}
          agendaCount={agendaCount}
          agendaEntries={agendaNotifs}
          onAgendaEntryClick={handleAgendaNotifClick}
          proposalsCount={proposalUnseen.length}
          proposalsEntries={proposalUnseen}
          onProposalEntryClick={handleProposalEntryClick}
          confirmedCount={confirmedUnseen.length}
          confirmedEntries={confirmedUnseen}
          onConfirmedEntryClick={handleConfirmedEntryClick}
          canReorderNotifCards={notifPrefs.canReorderNotifCards}
          canHideNotifCards={notifPrefs.canHideNotifCards}
          hiddenNotifCards={notifPrefs.hiddenNotifCards}
          onToggleNotifCard={notifPrefs.toggleNotifCard}
          notifCardOrder={notifPrefs.order.order}
          notifCardLabels={notifPrefs.order.labels}
          notifReordering={notifPrefs.order.reordering}
          onStartNotifReorder={notifPrefs.order.startReorder}
          onCancelNotifReorder={notifPrefs.order.cancelReorder}
          onConfirmNotifReorder={notifPrefs.order.confirmReorder}
          onMoveNotifDraft={notifPrefs.order.moveDraft}
          onRenameNotifDraft={notifPrefs.order.renameDraft}
          onResetNotifDefault={notifPrefs.order.resetToDefault}
        />
        {isSAViewing && impersonatedVendor && (
          <DemoEmitterLayer
            activeView={activeView}
            viewLabel={getBreadcrumb()}
            targetUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}
            targetRole="vendor"
            targetName={[impersonatedVendor.first_name, impersonatedVendor.last_name].filter(Boolean).join(' ')}
            companyId={null}
            tokens={tokens}
          />
        )}
        {!isSAViewing && !impersonatedVendor && <DemoReceiverLayer userId={vendorDbId} onViewChange={(v) => setActiveView(v as VendorActiveView)} />}
        <main
          className={`flex-1 flex flex-col md:p-6 mobile-main-scroll ${(activeView === 'chat-admin' || activeView === 'chat-client') ? 'p-2 sm:p-3 overflow-hidden' : 'p-3 sm:p-4 overflow-auto'}`}
          style={{ minHeight: 0 }}
        >
          <VendorViewRenderer
            activeView={activeView} vendorDbId={vendorDbId} vendorName={vendorName}
            unreadClientEntries={unreadClientEntries} chatLead={chatLead} rdvLead={rdvLead}
            impersonatedVendor={impersonatedVendor} pendingScrollRef={pendingScrollRef}
            setActiveView={setActiveView} setChatLead={setChatLead} setRdvLead={setRdvLead}
            onConnectAsClient={onConnectAsClient} markAdminRead={markAdminRead}
            handleClientViewed={handleClientViewed} handleReturnToLeads={handleReturnToLeads}
          />
        </main>
      </div>
    </div>
  );
}
