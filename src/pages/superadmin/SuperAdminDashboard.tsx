import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import SuperAdminSidebar, { type SAView } from './SuperAdminSidebar';
import SuperAdminTopBar from './SuperAdminTopBar';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTheme } from '../../contexts/ThemeContext';
import { saveConnectReturnContext, consumeConnectReturnContext } from '../../lib/connectReturnContext';
import { supabase } from '../../lib/supabase';
import { useUnreadSuperAdminMessages } from '../../hooks/useUnreadSuperAdminMessages';
import { useAppIcon } from '../../hooks/useAppIcon';
import type { AdminUser } from './views/SAAdmins';
import type { CompanySuperAdmin } from './views/super-admins/superAdminTypes';
import { useAdminsCache } from './useAdminsCache';
import { useEditorLocateHandler } from './useEditorLocateHandler';
import GlassBackgroundLayer from '../../components/theme/GlassBackgroundLayer';
import { EditorModeProvider, useEditorMode, resolveZoneEffective } from '../../contexts/EditorModeContext';
import EditorSaveThemeModal from '../../components/editor/EditorSaveThemeModal';
import SuperAdminEditorPanels from './SuperAdminEditorPanels';
import { useEditorSessionPersistence } from './useEditorSessionPersistence';
import SAViewRouter from './SAViewRouter';
import { VisualCustomizeProvider, useVisualCustomize } from '../../components/visualCustomize/VisualCustomizeContext';
import VisualCustomizeOverlay from '../../components/visualCustomize/VisualCustomizeOverlay';
import VisualCustomizeModal from '../../components/visualCustomize/VisualCustomizeModal';
import VCPreviewToolbar from '../../components/visualCustomize/VCPreviewToolbar';
import EditorChoiceButtons from './EditorChoiceButtons';
import EditorSubModeToolbar from './EditorSubModeToolbar';

const SAchatAdmin = lazy(() => import('./views/SAchatAdmin'));

interface SuperAdminDashboardProps {
  onLogout: () => void;
  onConnectAsAdmin?: (admin: AdminUser) => void;
  onConnectAsCompanySuperAdmin?: (sa: CompanySuperAdmin) => void;
}

export type EditorSubMode = null | 'onglet' | 'zone_droite';

export default function SuperAdminDashboard(props: SuperAdminDashboardProps) {
  return (
    <EditorModeProvider scopeKey="sa">
      <VisualCustomizeProvider scope="sa_dashboard">
        <SuperAdminDashboardInner {...props} />
        <VisualCustomizeOverlay />
        <VisualCustomizeModal />
        <VCPreviewToolbar />
      </VisualCustomizeProvider>
    </EditorModeProvider>
  );
}

function SuperAdminDashboardInner({ onLogout, onConnectAsAdmin, onConnectAsCompanySuperAdmin }: SuperAdminDashboardProps) {
  const t = useThemeTokens();
  const [activeView, setActiveView] = useState<SAView>('dashboard');
  const [docInitialTab, setDocInitialTab] = useState<string | undefined>(undefined);
  const [docKey, setDocKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatAdmin, setChatAdmin] = useState<AdminUser | null>(null);
  const [saFirstName, setSaFirstName] = useState('');
  const [saLastName, setSaLastName] = useState('');
  const pendingScrollRef = useRef<{ adminId?: string; scrollY: number } | null>(null);
  const { unreadCount: unreadAdminMsgCount, unreadEntries: unreadAdminMsgEntries, markAsRead: markAdminMsgRead } = useUnreadSuperAdminMessages();
  const { appIconUrl: saAppIconUrl, appName: saAppName } = useAppIcon(null, 'super_admin');
  const editorCtx = useEditorMode();
  const vc = useVisualCustomize();
  const [saveThemeOpen, setSaveThemeOpen] = useState(false);
  const logoZoneRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const topbarZoneRef = useRef<HTMLElement>(null);
  const contentZoneRef = useRef<HTMLElement>(null);
  const [appIconSelectionMode, setAppIconSelectionMode] = useState(false);
  const [editorSubMode, setEditorSubMode] = useState<EditorSubMode>(null);

  const {
    getPositionFor, savedRefreshKey, setSavedRefreshKey,
    tabsVisible, setTabsVisible, tabsCollapsed, setTabsCollapsed,
    fondsVisible, setFondsVisible, couleurVisible, setCouleurVisible,
    savedVisible, setSavedVisible, handleSaveSession, handleAlignPanels,
    updatePositionFor, contenuPos,
  } = useEditorSessionPersistence();

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

  const showOngletPanels = editorCtx.editorOpen && editorSubMode === 'onglet';
  const showZoneDroite = editorCtx.editorOpen && editorSubMode === 'zone_droite';
  const showChoice = editorCtx.editorOpen && editorSubMode === null;

  const ongletPanelsVisible = tabsVisible || fondsVisible || couleurVisible || savedVisible;
  const handleToggleOngletPanels = useCallback(() => {
    if (ongletPanelsVisible) {
      setTabsVisible(false);
      setFondsVisible(false);
      setCouleurVisible(false);
      setSavedVisible(false);
    } else {
      setTabsVisible(true);
      setTabsCollapsed(false);
      setFondsVisible(true);
      setCouleurVisible(true);
      setSavedVisible(true);
    }
  }, [ongletPanelsVisible, setTabsVisible, setTabsCollapsed, setFondsVisible, setCouleurVisible, setSavedVisible]);

  const { cachedAdmins, adminsRefreshing, adminsError, fetchAdminsCache } = useAdminsCache();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata ?? {};
        if (meta.first_name) setSaFirstName(meta.first_name);
        if (meta.last_name) setSaLastName(meta.last_name);
      }
    });
  }, []);

  useEffect(() => {
    const ctx = consumeConnectReturnContext('super_admin');
    if (ctx) { setActiveView(ctx.fromTab as SAView); pendingScrollRef.current = { adminId: ctx.adminId, scrollY: ctx.scrollY }; }
  }, []);

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    const { adminId, scrollY } = pendingScrollRef.current;
    pendingScrollRef.current = null;
    if (!adminId) { window.scrollTo({ top: scrollY, behavior: 'smooth' }); return; }
    let n = 0;
    const poll = () => {
      const el = document.querySelector(`[data-row-id="${adminId}"]`);
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

  const handleNavigate = (view: SAView) => { setActiveView(view); };
  const handleConnectAsAdmin = (admin: AdminUser) => { saveConnectReturnContext({ fromRole: 'super_admin', fromTab: 'admins', adminId: admin.id, scrollY: window.scrollY }); onConnectAsAdmin?.(admin); };
  const handleConnectAsCompanySuperAdmin = (sa: CompanySuperAdmin) => { onConnectAsCompanySuperAdmin?.(sa); };
  const handleOpenChatAdmin = useCallback((admin: AdminUser) => { setChatAdmin(admin); setActiveView('chat-admin'); }, []);
  const handleChangeAppIcon = useCallback(() => { setAppIconSelectionMode(true); setActiveView('logo'); }, []);
  const handleAppIconSelected = useCallback(() => { setAppIconSelectionMode(false); setActiveView('application'); }, []);

  useEditorLocateHandler(activeView, setActiveView);

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
  const outerStyle: React.CSSProperties = { background: zone4Bg || t.main.bg };

  const getBgSize = (): string => {
    if (bgZoom !== 100) return `${bgZoom}%`;
    if (bgFit === 'contain') return 'contain';
    if (bgFit === 'fill') return '100% 100%';
    return 'cover';
  };

  return (
    <div className="flex h-screen overflow-hidden relative" style={outerStyle}>
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
      <GlassBackgroundLayer />
      {mobileOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ background: t.modal.overlayBg }} onClick={() => setMobileOpen(false)} />}

      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SuperAdminSidebar activeView={activeView} onNavigate={(v) => { handleNavigate(v); setMobileOpen(false); }} collapsed={false} onCollapse={() => setMobileOpen(false)} onLogout={onLogout} editorZone1Bg={zone1Bg} editorZone2Bg={zone2Bg} logoZoneRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef} />
      </div>

      <div className="hidden md:block relative z-[1]">
        <SuperAdminSidebar activeView={activeView} onNavigate={handleNavigate} collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed(prev => !prev)} onLogout={onLogout} editorZone1Bg={zone1Bg} editorZone2Bg={zone2Bg} logoZoneRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-[1]">
        <SuperAdminTopBar activeView={activeView} onMobileMenuToggle={() => setMobileOpen(prev => !prev)} unreadAdminMsgCount={unreadAdminMsgCount} unreadAdminMsgEntries={unreadAdminMsgEntries} onAdminMsgEntryClick={(entry) => { markAdminMsgRead(entry.adminId); setChatAdmin(cachedAdmins.find(a => a.id === entry.adminId) ?? { id: entry.adminId, email: entry.email, first_name: entry.firstName, last_name: entry.lastName, phone: '', role: 'admin', created_at: '', last_sign_in_at: null, access_enabled: true }); setActiveView('chat-admin'); }} saFirstName={saFirstName} saLastName={saLastName} appIconUrl={saAppIconUrl} appName={saAppName || 'Talvex'} topbarRef={topbarZoneRef} editorZone3Bg={zone3Bg} />

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

        <main ref={contentZoneRef} className={`flex-1 ${activeView === 'chat-admin' ? 'p-1.5 sm:p-2 md:p-3 lg:p-4' : ''}`} style={{ minHeight: 0, overflow: activeView === 'chat-admin' ? 'hidden' : 'auto' }}>
          {activeView === 'chat-admin' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
                <SAchatAdmin key={chatAdmin?.id ?? 'no-admin'} initialAdmin={chatAdmin} onAdminViewed={markAdminMsgRead} cachedAdmins={cachedAdmins} />
              </div>
            </Suspense>
          )}
          {activeView !== 'chat-admin' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <SAViewRouter activeView={activeView} handleNavigate={handleNavigate} handleConnectAsAdmin={handleConnectAsAdmin} handleConnectAsCompanySuperAdmin={handleConnectAsCompanySuperAdmin} handleOpenChatAdmin={handleOpenChatAdmin} cachedAdmins={cachedAdmins} adminsRefreshing={adminsRefreshing} adminsError={adminsError} fetchAdminsCache={fetchAdminsCache} docInitialTab={docInitialTab} setDocInitialTab={setDocInitialTab} docKey={docKey} setDocKey={setDocKey} setActiveView={setActiveView} saFirstName={saFirstName} saLastName={saLastName} setSaFirstName={setSaFirstName} setSaLastName={setSaLastName} appIconSelectionMode={appIconSelectionMode} handleAppIconSelected={handleAppIconSelected} handleChangeAppIcon={handleChangeAppIcon} />
            </Suspense>
          )}
        </main>
      </div>

      {showOngletPanels && (
        <SuperAdminEditorPanels
          tabsCollapsed={tabsCollapsed} setTabsCollapsed={setTabsCollapsed}
          tabsVisible={tabsVisible} setTabsVisible={setTabsVisible}
          fondsVisible={fondsVisible} setFondsVisible={setFondsVisible}
          couleurVisible={couleurVisible} setCouleurVisible={setCouleurVisible}
          savedVisible={savedVisible} setSavedVisible={setSavedVisible}
          savedRefreshKey={savedRefreshKey} setSavedRefreshKey={setSavedRefreshKey}
          getPositionFor={getPositionFor} updatePositionFor={updatePositionFor} contenuPos={contenuPos}
          logoZoneRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef} topbarRef={topbarZoneRef} contentRef={contentZoneRef}
        />
      )}
      <EditorSaveThemeModal open={saveThemeOpen} onClose={() => setSaveThemeOpen(false)} />
    </div>
  );
}
