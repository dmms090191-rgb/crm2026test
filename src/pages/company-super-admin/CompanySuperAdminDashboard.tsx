import { startTransition, useState, useCallback, useRef, useEffect } from 'react';
import type { ImpersonatedCompanySuperAdmin, ImpersonatedAdmin } from '../../App';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { TimezoneProvider } from '../../contexts/TimezoneContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';
import { EditorModeProvider, useEditorMode, resolveZoneEffective } from '../../contexts/EditorModeContext';
import EditorSaveThemeModal from '../../components/editor/EditorSaveThemeModal';
import { useEditorSessionPersistence } from '../superadmin/useEditorSessionPersistence';
import CSAEditorToolbars from './CSAEditorToolbars';
import { VisualCustomizeProvider, useVisualCustomize } from '../../components/visualCustomize/VisualCustomizeContext';
import VisualCustomizeOverlay from '../../components/visualCustomize/VisualCustomizeOverlay';
import VisualCustomizeModal from '../../components/visualCustomize/VisualCustomizeModal';
import VCPreviewToolbar from '../../components/visualCustomize/VCPreviewToolbar';
import { saveConnectReturnContext, consumeConnectReturnContext } from '../../lib/connectReturnContext';
import type { CSAView } from './CSASidebar';
import CSASidebarSlots from './CSASidebarSlots';
import CSATopBar from './CSATopBar';
import CSAViewRenderer from './CSAViewRenderer';
import CSAImpersonationRoutes from './CSAImpersonationRoutes';
import CSAEditorPanels from './CSAEditorPanels';
import type { CSAAdminUser } from './CSAAdminsList';
import { useCsaNotifications } from './useCsaNotifications';
import type { ImpersonatedClientInfo } from '../client/ClientDashboard';
import type { ImpersonatedVendor } from '../vendor/VendorDashboard';

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

  if (impersonatedAdmin) {
    return (
      <CSAImpersonationRoutes
        impersonatedAdmin={impersonatedAdmin}
        impersonatedClient={impersonatedClient}
        impersonatedVendor={impersonatedVendor}
        setImpersonatedAdmin={setImpersonatedAdmin}
        setImpersonatedClient={setImpersonatedClient}
        setImpersonatedVendor={setImpersonatedVendor}
        handleConnectAsClient={handleConnectAsClient}
        handleConnectAsVendor={handleConnectAsVendor}
        visuBadge={visuBadge}
        canHideTabs={canHideTabs}
      />
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

  const {
    markAdminMsgRead, chatInitialAdmin, setChatInitialAdmin,
    chatCachedAdmins, notifCount, notifEntries, sidebarBadgeCounts,
    handleMessageSociete, handleNotifClick, talvexAutoOpen, setTalvexAutoOpen,
  } = useCsaNotifications(impersonated.id, impersonated.company_id, setActiveView);

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
      <CSASidebarSlots
        activeView={activeView}
        setActiveView={(v) => { setTalvexAutoOpen(false); setActiveView(v); }}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
        sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
        handleLogout={handleLogout}
        currentImpersonated={currentImpersonated} impersonated={impersonated}
        isImpersonation={isImpersonation} onBack={onBack}
        visuBadgeLabel={visuBadgeLabel} backLabel={backLabel} canHideTabs={canHideTabs}
        logoZoneRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef}
        zone1Bg={zone1Bg} zone2Bg={zone2Bg}
        sidebarBadgeCounts={sidebarBadgeCounts} t={t}
      />

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
          unreadAdminMsgCount={notifCount}
          unreadAdminMsgEntries={notifEntries}
          onAdminMsgEntryClick={handleNotifClick}
        />
        <CSAEditorToolbars
          showChoice={showChoice} showOngletPanels={showOngletPanels} showZoneDroite={showZoneDroite}
          ongletPanelsVisible={ongletPanelsVisible}
          handleSelectOnglet={handleSelectOnglet} handleSelectZoneDroite={handleSelectZoneDroite}
          handleBackToChoice={handleBackToChoice} handleSaveSession={handleSaveSession}
          handleAlignPanels={handleAlignPanels} handleToggleOngletPanels={handleToggleOngletPanels}
          setSaveThemeOpen={setSaveThemeOpen} editorCtx={editorCtx} vc={vc}
        />
        <main
          ref={contentZoneRef}
          className="flex-1 overflow-y-auto"
          style={!bgImageUrl && zone4Bg ? { background: zone4Bg } : undefined}
        >
          <CSAViewRenderer
            activeView={activeView} canHideTabs={canHideTabs} fullName={fullName}
            impersonated={impersonated} currentImpersonated={currentImpersonated}
            onConnectAsAdmin={onConnectAsAdmin}
            handleMessageSociete={handleMessageSociete}
            talvexAutoOpen={talvexAutoOpen}
            onTalvexAutoOpenConsumed={() => setTalvexAutoOpen(false)}
            handleNameUpdated={handleNameUpdated}
            chatInitialAdmin={chatInitialAdmin} setChatInitialAdmin={setChatInitialAdmin}
            markAdminMsgRead={markAdminMsgRead} chatCachedAdmins={chatCachedAdmins}
          />
        </main>
      </div>

      {showOngletPanels && <CSAEditorPanels
        tabsVisible={tabsVisible} setTabsVisible={setTabsVisible}
        tabsCollapsed={tabsCollapsed} setTabsCollapsed={setTabsCollapsed}
        fondsVisible={fondsVisible} setFondsVisible={setFondsVisible}
        couleurVisible={couleurVisible} setCouleurVisible={setCouleurVisible}
        savedVisible={savedVisible} setSavedVisible={setSavedVisible}
        savedRefreshKey={savedRefreshKey} setSavedRefreshKey={setSavedRefreshKey}
        getPositionFor={(panel) => getPositionFor(panel) ?? null} updatePositionFor={updatePositionFor}
        contenuPos={contenuPos}
        logoZoneRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef}
        topbarZoneRef={topbarZoneRef} contentZoneRef={contentZoneRef}
      />}
      <EditorSaveThemeModal open={saveThemeOpen} onClose={() => setSaveThemeOpen(false)} ownerUserId={impersonated.id} ownerCompanyId={impersonated.company_id} />
    </div>
  );
}
