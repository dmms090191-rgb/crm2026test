import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import type { ImpersonatedClient, ChatLead } from './views/Crm';
import type { Vendor } from './views/ListeVendeurs';
import { SimulationProvider } from '../../contexts/SimulationContext';
import { SimulationBanner } from './views/sauvegarde/SimulationBanner';
import { importDocumentationCrm } from './dashboard/adminLazyViews';
import { supabase } from '../../lib/supabase';
import { consumeConnectReturnContext } from '../../lib/connectReturnContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useCompanyId } from '../../hooks/useCompanyId';
import { useActiveLogo } from '../../hooks/useActiveLogo';
import { useAppIcon } from '../../hooks/useAppIcon';
import { useUnreadClientMessages } from '../../hooks/useUnreadClientMessages';
import { useUnreadVendorMessages } from '../../hooks/useUnreadVendorMessages';
import { useUnreadFromSuperAdmin } from '../../hooks/useUnreadFromSuperAdmin';
import { useAgendaNotifications } from '../../hooks/useAgendaNotifications';
import { useAgendaEquipeNotifications } from '../../hooks/useAgendaEquipeNotifications';
import { BREADCRUMB_LABELS } from './adminDashboardConstants';
import { useAdminProposalNotifs } from './dashboard/useAdminProposalNotifs';
import { useAdminNavHandlers } from './dashboard/useAdminNavHandlers';
import DemoEmitterLayer from '../../components/demo/DemoEmitterLayer';
import DemoReceiverLayer from '../../components/demo/DemoReceiverLayer';
import { useDemoSessionSafe } from '../../components/demo/DemoSessionContext';
import GlassBackgroundLayer from '../../components/theme/GlassBackgroundLayer';
import AdminViewRenderer from './dashboard/AdminViewRenderer';

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
  isSAViewing?: boolean;
}

export type ActiveView =
  | 'vue-ensemble'
  | 'site'
  | 'logo'
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
  | 'sauvegarde'
  | 'cerveau-ia'
  | 'application'
  | 'tuto';

export default function AdminDashboard({ onLogout, onConnectAsVendor, onConnectAsClient, impersonatedAdmin, onBackToSuperAdmin, isSAViewing }: AdminDashboardProps) {
  const t = useThemeTokens();
  const companyId = useCompanyId();
  const { url: activeLogoUrl } = useActiveLogo(companyId);
  const { appIconUrl: configIconUrl, appName: configAppName } = useAppIcon(companyId, 'company');
  const [companyName, setCompanyName] = useState('');
  const demoCtx = useDemoSessionSafe();
  const demoStatus: 'idle' | 'pending' | 'active' = demoCtx?.session?.status === 'active' ? 'active' : demoCtx?.session?.status === 'pending' ? 'pending' : 'idle';
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
    if (!companyId) return;
    supabase.from('companies').select('name').eq('id', companyId).maybeSingle()
      .then(({ data }) => { if (data?.name) setCompanyName(data.name); });
  }, [companyId]);

  useEffect(() => {
    const id = requestIdleCallback(() => { importDocumentationCrm(); });
    return () => cancelIdleCallback(id);
  }, []);

  const handleNameChange = useCallback((firstName: string, lastName: string) => {
    setAdminName([firstName, lastName].filter(Boolean).join(' ') || 'Administrateur');
  }, []);

  const getBreadcrumb = () => BREADCRUMB_LABELS[activeView];

  return (
    <SimulationProvider>
    <div className="flex h-[100dvh] overflow-hidden relative" style={{ background: t.main.bg }}>
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
          demoStatus={isSAViewing ? demoStatus : 'idle'}
          demoSlot={isSAViewing && impersonatedAdmin ? (
            <DemoEmitterLayer
              activeView={activeView}
              viewLabel={getBreadcrumb()}
              targetUserId={impersonatedAdmin.id}
              targetRole="admin"
              targetName={[impersonatedAdmin.first_name, impersonatedAdmin.last_name].filter(Boolean).join(' ') || impersonatedAdmin.email}
              companyId={impersonatedAdmin.company_id ?? null}
              tokens={t}
            />
          ) : undefined}
          appIconUrl={configIconUrl ?? activeLogoUrl}
          appName={configAppName || companyName || undefined}
        />
        <SimulationBanner />
        {!isSAViewing && <DemoReceiverLayer userId={adminAuthId} onViewChange={(v) => setActiveView(v as ActiveView)} />}
        <main
          className={`flex-1 flex flex-col md:p-6 mobile-main-scroll ${(activeView === 'chat-client' || activeView === 'chat-vendeur' || activeView === 'chat-super-admin') ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}`}
          style={{
            minHeight: 0,
            overflow: (activeView === 'chat-client' || activeView === 'chat-vendeur' || activeView === 'chat-super-admin') ? 'hidden' : 'auto',
          }}
        >
          <AdminViewRenderer
            activeView={activeView}
            chatLead={chatLead}
            chatVendor={chatVendor}
            rdvLead={rdvLead}
            effectiveAdminId={effectiveAdminId}
            impersonatedAdmin={impersonatedAdmin}
            isSAViewing={isSAViewing}
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
            onNameChange={handleNameChange}
            onConnectAsVendor={onConnectAsVendor}
            onConnectAsClient={onConnectAsClient}
            handleNavigate={handleNavigate}
            handleReturnToCrm={handleReturnToCrm}
            setActiveView={setActiveView}
            markClientRead={markClientRead}
            onVendorViewed={handleVendorViewed}
            markSuperAdminRead={markSuperAdminRead}
          />
        </main>
      </div>
    </div>
    </SimulationProvider>
  );
}
