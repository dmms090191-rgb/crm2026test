import { useState, useRef } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import type { ChatLead } from './views/Crm';
import type { Vendor } from './views/ListeVendeurs';
import { SimulationProvider } from '../../contexts/SimulationContext';
import { SimulationBanner } from './views/sauvegarde/SimulationBanner';
import type { AdminDashboardProps, ActiveView } from './adminDashboardTypes';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTheme } from '../../contexts/ThemeContext';
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
import { useAdminDashboardEffects } from './dashboard/useAdminDashboardEffects';
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

function AdminDashboardInner({ onLogout, onConnectAsVendor, onConnectAsClient, impersonatedAdmin, onBackToSuperAdmin, backLabel, isSAViewing }: AdminDashboardProps) {
  const t = useThemeTokens();
  const companyId = useCompanyId();
  const adminScopeKey = companyId ? `co_${companyId}` : 'co_none';
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

  const { handleNameChange } = useAdminDashboardEffects({
    companyId,
    setAdminAuthId,
    setAdminName,
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

      <AdminEditorPanels
        tabsVisible={tabsVisible} setTabsVisible={setTabsVisible}
        tabsCollapsed={tabsCollapsed} setTabsCollapsed={setTabsCollapsed}
        fondsVisible={fondsVisible} setFondsVisible={setFondsVisible}
        couleurVisible={couleurVisible} setCouleurVisible={setCouleurVisible}
        savedVisible={savedVisible} setSavedVisible={setSavedVisible}
        savedRefreshKey={savedRefreshKey} setSavedRefreshKey={setSavedRefreshKey}
        getPositionFor={getPositionFor} updatePositionFor={updatePositionFor}
        contenuPos={contenuPos}
        logoZoneRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef}
        topbarZoneRef={topbarZoneRef} contentZoneRef={contentZoneRef}
      />
      <EditorSaveThemeModal open={saveThemeOpen} onClose={() => setSaveThemeOpen(false)} ownerUserId={effectiveAdminId} ownerCompanyId={companyId} />
    </div>
    </SimulationProvider>
  );
}
