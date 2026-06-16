import { lazy, Suspense, startTransition, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ImpersonatedCompanySuperAdmin, ImpersonatedAdmin } from '../../App';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { TimezoneProvider } from '../../contexts/TimezoneContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';
import { EditorModeProvider, useEditorMode, resolveZoneEffective } from '../../contexts/EditorModeContext';
import EditorSaveThemeModal from '../../components/editor/EditorSaveThemeModal';
import { useEditorSessionPersistence } from '../superadmin/useEditorSessionPersistence';
import EditorChoiceButtons from '../superadmin/EditorChoiceButtons';
import EditorSubModeToolbar from '../superadmin/EditorSubModeToolbar';
import { VisualCustomizeProvider, useVisualCustomize } from '../../components/visualCustomize/VisualCustomizeContext';
import VisualCustomizeOverlay from '../../components/visualCustomize/VisualCustomizeOverlay';
import VisualCustomizeModal from '../../components/visualCustomize/VisualCustomizeModal';
import VCPreviewToolbar from '../../components/visualCustomize/VCPreviewToolbar';
import AppShell from '../../app/AppShell';
import { DemoSessionProvider } from '../../components/demo/DemoSessionContext';
import { saveConnectReturnContext, consumeConnectReturnContext } from '../../lib/connectReturnContext';
import CSAInfoPage from './CSAInfoPage';
import CSASidebar, { type CSAView } from './CSASidebar';
import CSATopBar from './CSATopBar';
import CSAOverview from './CSAOverview';
import CSAAdminsList from './CSAAdminsList';
import CSAEditorPanels from './CSAEditorPanels';
import CSAApplicationPage from './CSAApplicationPage';
import SiteManagerShell from '../superadmin/views/site-builder/SiteManagerShell';
import type { CSAAdminUser } from './CSAAdminsList';
import { useUnreadCSAAdminMessages } from '../../hooks/useUnreadCSAAdminMessages';
import type { ImpersonatedClientInfo } from '../client/ClientDashboard';
import type { ImpersonatedVendor } from '../vendor/VendorDashboard';

const AdminDashboard = lazy(() => import('../admin/AdminDashboard'));
const VendorDashboard = lazy(() => import('../vendor/VendorDashboard'));
const ClientDashboard = lazy(() => import('../client/ClientDashboard'));
const SAchatAdmin = lazy(() => import('../superadmin/views/SAchatAdmin'));
const CSAChatRoisAdmin = lazy(() => import('./CSAChatRoisAdmin'));

type EditorSubMode = null | 'onglet' | 'zone_droite';

interface Props {
  impersonated: ImpersonatedCompanySuperAdmin;
  onBack: () => void;
  isImpersonation?: boolean;
  visuBadgeLabel?: string;
  backLabel?: string;
  canHideTabs?: boolean;
}

export default function CompanySuperAdminDashboard({ impersonated, onBack, isImpersonation = true, visuBadgeLabel, backLabel, canHideTabs }: Props) {
  const [impersonatedAdmin, setImpersonatedAdmin] = useState<ImpersonatedAdmin | null>(null);
  const [impersonatedClient, setImpersonatedClient] = useState<ImpersonatedClientInfo | null>(null);
  const [impersonatedVendor, setImpersonatedVendor] = useState<ImpersonatedVendor | null>(null);

  const handleConnectAsAdmin = useCallback((admin: CSAAdminUser) => {
    saveConnectReturnContext({ fromRole: 'company_super_admin', fromTab: 'admins', adminId: admin.id, scrollY: window.scrollY });
    setImpersonatedAdmin({
      id: admin.id, email: admin.email,
      first_name: admin.first_name, last_name: admin.last_name,
      pin: admin.pin, company_id: admin.company_id,
    });
  }, []);

  const handleConnectAsClient = useCallback((client: ImpersonatedClientInfo) => {
    setImpersonatedClient(client);
  }, []);

  const handleConnectAsVendor = useCallback((vendor: { id: string; first_name: string; last_name: string; auth_user_id?: string | null }) => {
    setImpersonatedVendor({ id: vendor.id, first_name: vendor.first_name, last_name: vendor.last_name, auth_user_id: vendor.auth_user_id });
  }, []);

  const visuBadge = visuBadgeLabel || (isImpersonation ? undefined : 'Visu Super Admin');

  if (impersonatedAdmin && impersonatedVendor && impersonatedClient) {
    return (
      <DemoSessionProvider>
        <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <ClientDashboard
              onLogout={() => {}}
              impersonatedClient={impersonatedClient}
              onBackToAdmin={() => setImpersonatedClient(null)}
              backLabel="Retour vendeur"
              isSAViewing
              visuBadgeLabel={visuBadge}
              canHideTabs={canHideTabs}
              hideTabsTargetName={`${impersonatedClient.prenom} ${impersonatedClient.nom}`.trim() || impersonatedClient.email}
              hideTabsTargetUserId={impersonatedClient.id}
            />
          </Suspense>
        </AppShell>
      </DemoSessionProvider>
    );
  }

  if (impersonatedAdmin && impersonatedVendor) {
    return (
      <DemoSessionProvider>
        <AppShell panelRole="vendor" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <VendorDashboard
              onLogout={() => {}}
              impersonatedVendor={impersonatedVendor}
              onBackToAdmin={() => setImpersonatedVendor(null)}
              onConnectAsClient={(client) => setImpersonatedClient(client)}
              isSAViewing
              visuBadgeLabel={visuBadge}
              backLabel="Retour admin"
              canHideTabs={canHideTabs}
              hideTabsTargetName={`${impersonatedVendor.first_name} ${impersonatedVendor.last_name}`.trim()}
              hideTabsTargetUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}
            />
          </Suspense>
        </AppShell>
      </DemoSessionProvider>
    );
  }

  if (impersonatedAdmin && impersonatedClient) {
    return (
      <DemoSessionProvider>
        <AppShell panelRole="client" useCompanyProvider companyId={impersonatedAdmin.company_id} effectiveUserId={impersonatedClient.id}>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <ClientDashboard
              onLogout={() => {}}
              impersonatedClient={impersonatedClient}
              onBackToAdmin={() => setImpersonatedClient(null)}
              backLabel="Retour admin"
              isSAViewing
              visuBadgeLabel={visuBadge}
              canHideTabs={canHideTabs}
              hideTabsTargetName={`${impersonatedClient.prenom} ${impersonatedClient.nom}`.trim() || impersonatedClient.email}
              hideTabsTargetUserId={impersonatedClient.id}
            />
          </Suspense>
        </AppShell>
      </DemoSessionProvider>
    );
  }

  if (impersonatedAdmin) {
    return (
      <DemoSessionProvider>
        <AppShell panelRole="admin" useCompanyProvider companyId={impersonatedAdmin.company_id}>
          <AdminDashboard
            onLogout={() => {}}
            impersonatedAdmin={impersonatedAdmin}
            onBackToSuperAdmin={() => setImpersonatedAdmin(null)}
            onConnectAsClient={handleConnectAsClient}
            onConnectAsVendor={handleConnectAsVendor}
            backLabel="Retour Super Admin"
            isSAViewing
            visuBadgeLabel={visuBadge}
            canHideTabs={canHideTabs}
            hideTabsTargetName={`${impersonatedAdmin.first_name} ${impersonatedAdmin.last_name}`.trim() || impersonatedAdmin.email}
            hideTabsTargetUserId={impersonatedAdmin.id}
          />
        </AppShell>
      </DemoSessionProvider>
    );
  }

  const scopeKey = `csa_${impersonated.id}`;
  const vcScope = `csa_${impersonated.id}`;
  return (
    <ThemeProvider panelRole="company_super_admin" effectiveUserId={impersonated.id} companyId={impersonated.company_id}>
      <TimezoneProvider panelRole="super_admin">
        <EditorModeProvider scopeKey={scopeKey}>
          <VisualCustomizeProvider scope={vcScope}>
            <CSADashboardInner impersonated={impersonated} onBack={onBack} isImpersonation={isImpersonation} onConnectAsAdmin={handleConnectAsAdmin} visuBadgeLabel={visuBadgeLabel} backLabel={backLabel} canHideTabs={canHideTabs} />
            <VisualCustomizeOverlay />
            <VisualCustomizeModal />
            <VCPreviewToolbar />
          </VisualCustomizeProvider>
        </EditorModeProvider>
      </TimezoneProvider>
    </ThemeProvider>
  );
}

interface InnerProps extends Props {
  onConnectAsAdmin: (admin: CSAAdminUser) => void;
  visuBadgeLabel?: string;
  backLabel?: string;
}

function CSADashboardInner({ impersonated, onBack, isImpersonation = true, onConnectAsAdmin, visuBadgeLabel, backLabel, canHideTabs }: InnerProps) {
  const t = useThemeTokens();
  const [activeView, setActiveViewRaw] = useState<CSAView>('overview');
  const setActiveView = useCallback((v: CSAView) => {
    startTransition(() => setActiveViewRaw(v));
  }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [csaFirstName, setCsaFirstName] = useState(impersonated.first_name);
  const [csaLastName, setCsaLastName] = useState(impersonated.last_name);
  const [saveThemeOpen, setSaveThemeOpen] = useState(false);

  const editorCtx = useEditorMode();
  const vc = useVisualCustomize();
  const csaScopeKey = `csa_${impersonated.id}`;
  const [editorSubMode, setEditorSubMode] = useState<EditorSubMode>(null);

  const logoZoneRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const topbarZoneRef = useRef<HTMLElement>(null);
  const contentZoneRef = useRef<HTMLElement>(null);

  const {
    getPositionFor, savedRefreshKey, setSavedRefreshKey,
    tabsVisible, setTabsVisible, tabsCollapsed, setTabsCollapsed,
    fondsVisible, setFondsVisible, couleurVisible, setCouleurVisible,
    savedVisible, setSavedVisible, handleSaveSession, handleAlignPanels,
    updatePositionFor, contenuPos,
  } = useEditorSessionPersistence(csaScopeKey);

  const { customThemeOverrides } = useTheme();
  const ctZoneCss = customThemeOverrides?.zone_css;
  const zone1Bg = resolveZoneEffective('zone1', editorCtx.zoneOverrides, editorCtx.preview) || ctZoneCss?.zone1 || undefined;
  const zone2Bg = resolveZoneEffective('zone2', editorCtx.zoneOverrides, editorCtx.preview) || ctZoneCss?.zone2 || undefined;
  const zone3Bg = resolveZoneEffective('zone3', editorCtx.zoneOverrides, editorCtx.preview) || ctZoneCss?.zone3 || undefined;
  const zone4Bg = resolveZoneEffective('zone4', editorCtx.zoneOverrides, editorCtx.preview) || ctZoneCss?.zone4 || undefined;

  const bgImageUrl = editorCtx.backgroundImage || customThemeOverrides?.background_image || null;
  const bgZoom = editorCtx.backgroundImageZoom;
  const bgPosX = editorCtx.backgroundImagePositionX;
  const bgPosY = editorCtx.backgroundImagePositionY;
  const bgFit = editorCtx.backgroundImageFit;
  const getBgSize = (): string => {
    if (bgZoom !== 100) return `${bgZoom}%`;
    if (bgFit === 'contain') return 'contain';
    if (bgFit === 'fill') return '100% 100%';
    return 'cover';
  };

  useEffect(() => {
    const ctx = consumeConnectReturnContext('company_super_admin');
    if (ctx) setActiveView(ctx.fromTab as CSAView);
  }, []);

  const fullName = [csaFirstName, csaLastName].filter(Boolean).join(' ');
  const handleNameUpdated = (fn: string, ln: string) => { setCsaFirstName(fn); setCsaLastName(ln); };
  const currentImpersonated = { ...impersonated, first_name: csaFirstName, last_name: csaLastName };

  useEffect(() => {
    if (!editorCtx.editorOpen) {
      setEditorSubMode(null);
      if (vc.enabled) {
        vc.setActiveSelection(null);
        vc.setQuickApply({ active: false, presetConfig: null, presetModalKind: null, presetName: '' });
        vc.clearAllDrafts();
        vc.setEnabled(false);
      }
    }
  }, [editorCtx.editorOpen]);

  const handleSelectOnglet = useCallback(() => { setEditorSubMode('onglet'); }, []);
  const handleSelectZoneDroite = useCallback(() => {
    setEditorSubMode('zone_droite');
    vc.setEnabled(true);
  }, [vc]);
  const handleBackToChoice = useCallback(() => {
    if (vc.enabled) {
      vc.setActiveSelection(null);
      vc.setQuickApply({ active: false, presetConfig: null, presetModalKind: null, presetName: '' });
      vc.setMarkersHidden(false);
      vc.setPreviewBarVisible(false);
      vc.clearAllDrafts();
      vc.setEnabled(false);
    }
    setEditorSubMode(null);
  }, [vc]);

  const showChoice = editorCtx.editorOpen && editorSubMode === null;
  const showOngletPanels = editorCtx.editorOpen && editorSubMode === 'onglet';
  const showZoneDroite = editorCtx.editorOpen && editorSubMode === 'zone_droite';

  const ongletPanelsVisible = tabsVisible || fondsVisible || couleurVisible || savedVisible;
  const handleToggleOngletPanels = useCallback(() => {
    if (ongletPanelsVisible) {
      setTabsVisible(false); setFondsVisible(false); setCouleurVisible(false); setSavedVisible(false);
    } else {
      setTabsVisible(true); setTabsCollapsed(false); setFondsVisible(true); setCouleurVisible(true); setSavedVisible(true);
    }
  }, [ongletPanelsVisible, setTabsVisible, setTabsCollapsed, setFondsVisible, setCouleurVisible, setSavedVisible]);

  const { unreadCount: unreadAdminMsgCount, unreadEntries: unreadAdminMsgEntries, markAsRead: markAdminMsgRead } = useUnreadCSAAdminMessages(impersonated.id);
  const [chatInitialAdmin, setChatInitialAdmin] = useState<{ id: string; email: string; first_name: string; last_name: string } | null>(null);

  const sidebarBadgeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    if (unreadAdminMsgCount > 0) m['chat-admin'] = unreadAdminMsgCount;
    return m;
  }, [unreadAdminMsgCount]);

  const handleOpenChatAdmin = useCallback((adminId: string) => {
    const entry = unreadAdminMsgEntries.find(e => e.adminId === adminId);
    if (entry) {
      setChatInitialAdmin({ id: entry.adminId, email: entry.email, first_name: entry.firstName, last_name: entry.lastName });
    }
    setActiveView('chat-admin');
    markAdminMsgRead(adminId);
  }, [unreadAdminMsgEntries, markAdminMsgRead]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.reload();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: zone4Bg || t.main.bg }}>
      {bgImageUrl && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: getBgSize(),
            backgroundPosition: (bgPosX === 0 && bgPosY === 0) ? 'center' : `calc(50% + ${bgPosX}px) calc(50% + ${bgPosY}px)`,
            backgroundRepeat: 'no-repeat',
          }} />
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: t.modal.overlayBg }} onClick={() => setMobileOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <CSASidebar
          activeView={activeView}
          onNavigate={v => { setActiveView(v); setMobileOpen(false); }}
          collapsed={false}
          onCollapse={() => setMobileOpen(false)}
          onLogout={handleLogout}
          impersonated={currentImpersonated}
          isImpersonation={isImpersonation}
          onBackToRoisAdmin={isImpersonation ? onBack : undefined}
          visuBadgeLabel={visuBadgeLabel}
          backLabel={backLabel}
          canHideTabs={canHideTabs}
          hideTabsTargetName={`${impersonated.first_name} ${impersonated.last_name}`.trim() || impersonated.company}
          hideTabsTargetUserId={impersonated.id}
          logoZoneRef={logoZoneRef}
          sidebarBodyRef={sidebarBodyRef}
          zone1Bg={zone1Bg}
          zone2Bg={zone2Bg}
          badgeCounts={sidebarBadgeCounts}
        />
      </div>

      <div className="hidden md:block relative z-[1]">
        <CSASidebar
          activeView={activeView}
          onNavigate={setActiveView}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(prev => !prev)}
          onLogout={handleLogout}
          impersonated={currentImpersonated}
          isImpersonation={isImpersonation}
          onBackToRoisAdmin={isImpersonation ? onBack : undefined}
          visuBadgeLabel={visuBadgeLabel}
          backLabel={backLabel}
          canHideTabs={canHideTabs}
          hideTabsTargetName={`${impersonated.first_name} ${impersonated.last_name}`.trim() || impersonated.company}
          hideTabsTargetUserId={impersonated.id}
          logoZoneRef={logoZoneRef}
          sidebarBodyRef={sidebarBodyRef}
          zone1Bg={zone1Bg}
          zone2Bg={zone2Bg}
          badgeCounts={sidebarBadgeCounts}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-[1]">
        <CSATopBar
          activeView={activeView}
          csaUserId={impersonated.id}
          companyId={impersonated.company_id}
          companyName={impersonated.company}
          firstName={csaFirstName}
          lastName={csaLastName}
          onMobileMenu={() => setMobileOpen(true)}
          topbarRef={topbarZoneRef}
          editorZone3Bg={zone3Bg}
          unreadAdminMsgCount={unreadAdminMsgCount}
          unreadAdminMsgEntries={unreadAdminMsgEntries}
          onAdminMsgEntryClick={handleOpenChatAdmin}
        />
        {showChoice && (
          <EditorChoiceButtons onSelectOnglet={handleSelectOnglet} onSelectZoneDroite={handleSelectZoneDroite} onClose={editorCtx.closeEditor} />
        )}
        {showOngletPanels && (
          <EditorSubModeToolbar
            title="Personnaliser onglet"
            onBack={handleBackToChoice}
            onSaveSession={handleSaveSession}
            onSaveTheme={() => setSaveThemeOpen(true)}
            onAlignPanels={handleAlignPanels}
            panelsVisible={ongletPanelsVisible}
            onTogglePanels={handleToggleOngletPanels}
          />
        )}
        {showZoneDroite && (
          <EditorSubModeToolbar
            title="Personnaliser zone droite"
            onBack={handleBackToChoice}
            onSaveSession={handleSaveSession}
            onSaveTheme={() => setSaveThemeOpen(true)}
            brushesActive={!vc.markersHidden}
            onToggleBrushes={() => vc.setMarkersHidden(!vc.markersHidden)}
            previewBarActive={vc.previewBarVisible}
            onTogglePreviewBar={() => vc.setPreviewBarVisible(!vc.previewBarVisible)}
            vcHasPending={vc.hasPendingDrafts}
            onVcSaveAll={vc.commitAllDrafts}
          />
        )}
        <main
          ref={contentZoneRef}
          className="flex-1 overflow-y-auto"
          style={!bgImageUrl && zone4Bg ? { background: zone4Bg } : undefined}
        >
          {activeView === 'overview' && <CSAOverview impersonated={currentImpersonated} fullName={fullName} />}
          {activeView === 'admins' && <CSAAdminsList companyId={impersonated.company_id} onConnectAsAdmin={onConnectAsAdmin} />}
          {activeView === 'info' && <CSAInfoPage impersonated={currentImpersonated} onNameUpdated={handleNameUpdated} />}
          {activeView === 'chat-admin' && (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <div className="h-full flex flex-col">
                <SAchatAdmin
                  initialAdmin={chatInitialAdmin ? { id: chatInitialAdmin.id, email: chatInitialAdmin.email, first_name: chatInitialAdmin.first_name, last_name: chatInitialAdmin.last_name, phone: '', company: '', company_id: '', role: 'admin', pin: '', created_at: '', last_sign_in_at: null, access_enabled: true, ai_enabled: false } : null}
                  onAdminViewed={(adminId) => { markAdminMsgRead(adminId); setChatInitialAdmin(null); }}
                />
              </div>
            </Suspense>
          )}
          {activeView === 'chat-rois-admin' && (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <div className="h-full flex flex-col">
                <CSAChatRoisAdmin csaAuthId={impersonated.id} />
              </div>
            </Suspense>
          )}
          {activeView === 'application' && <CSAApplicationPage companyId={impersonated.company_id} />}
          {activeView === 'site' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0 flex flex-col">
                <SiteManagerShell
                  ownerType="admin_company"
                  title="Site"
                  subtitle="Gerez le site public de votre societe"
                  companyId={impersonated.company_id}
                  companyName={impersonated.company}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {showOngletPanels && <CSAEditorPanels
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
      />}
      <EditorSaveThemeModal open={saveThemeOpen} onClose={() => setSaveThemeOpen(false)} ownerUserId={impersonated.id} ownerCompanyId={impersonated.company_id} />
    </div>
  );
}
