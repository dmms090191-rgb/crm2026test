import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import SuperAdminSidebar, { type SAView } from './SuperAdminSidebar';
import SuperAdminTopBar from './SuperAdminTopBar';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { saveConnectReturnContext, consumeConnectReturnContext } from '../../lib/connectReturnContext';
import { supabase } from '../../lib/supabase';
import { SimulationProvider } from '../../contexts/SimulationContext';
import { useUnreadSuperAdminMessages } from '../../hooks/useUnreadSuperAdminMessages';
import { useAppIcon } from '../../hooks/useAppIcon';
import type { AdminUser } from './views/SAAdmins';
import GlassBackgroundLayer from '../../components/theme/GlassBackgroundLayer';

const SADashboard = lazy(() => import('./views/SADashboard'));
const SAAdmins = lazy(() => import('./views/SAAdmins'));
const SAchatAdmin = lazy(() => import('./views/SAchatAdmin'));
const SAMonCompte = lazy(() => import('./views/SAMonCompte'));
const DocumentationCrm = lazy(() => import('../admin/views/DocumentationCrm'));
const SystemPage = lazy(() => import('../admin/views/SystemPage'));
const SauvegardeRestauration = lazy(() => import('../admin/views/SauvegardeRestauration'));
const SATestsSysteme = lazy(() => import('./views/tests-systeme/SATestsSysteme'));
const SACrmSociete = lazy(() => import('./views/crm-societe/SACrmSociete'));
const SAStatuts = lazy(() => import('./views/SAStatuts'));
const SAApiIa = lazy(() => import('./views/SAApiIa'));
const SASites = lazy(() => import('./views/sites/SASites'));
const SAFonctionsTalvex = lazy(() => import('./views/fonctions-talvex/SAFonctionsTalvex'));
const SASiteTalvex = lazy(() => import('./views/site-builder/SASiteTalvex'));
const SACerveauIA = lazy(() => import('./views/cerveau-ia/SACerveauIA'));
const SALogoPage = lazy(() => import('./views/SALogoPage'));
const SAAmeliorations = lazy(() => import('./views/SAAmeliorations'));
const SAApplicationPage = lazy(() => import('./views/SAApplicationPage'));
const SAThemes = lazy(() => import('./views/themes/SAThemes'));

interface SuperAdminDashboardProps {
  onLogout: () => void;
  onConnectAsAdmin?: (admin: AdminUser) => void;
}

export default function SuperAdminDashboard({ onLogout, onConnectAsAdmin }: SuperAdminDashboardProps) {
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

  const [appIconSelectionMode, setAppIconSelectionMode] = useState(false);

  const [cachedAdmins, setCachedAdmins] = useState<AdminUser[]>([]);
  const [adminsRefreshing, setAdminsRefreshing] = useState(false);
  const [adminsError, setAdminsError] = useState('');
  const adminsLoadedRef = useRef(false);

  const fetchAdminsCache = useCallback(async () => {
    setAdminsRefreshing(true);
    setAdminsError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAdminsError('Non authentifie'); setAdminsRefreshing(false); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-admins`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) { setAdminsError(json.error || 'Erreur inconnue'); setAdminsRefreshing(false); return; }
      setCachedAdmins(json.admins || []);
      adminsLoadedRef.current = true;
    } catch (e) {
      setAdminsError(String(e));
    } finally {
      setAdminsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAdminsCache(); }, [fetchAdminsCache]);

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
    if (ctx) {
      setActiveView(ctx.fromTab as SAView);
      pendingScrollRef.current = { adminId: ctx.adminId, scrollY: ctx.scrollY };
    }
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

  const handleNavigate = (view: SAView) => {
    setActiveView(view);
  };

  const handleConnectAsAdmin = (admin: AdminUser) => {
    saveConnectReturnContext({ fromRole: 'super_admin', fromTab: 'admins', adminId: admin.id, scrollY: window.scrollY });
    onConnectAsAdmin?.(admin);
  };

  const handleOpenChatAdmin = useCallback((admin: AdminUser) => {
    setChatAdmin(admin);
    setActiveView('chat-admin');
  }, []);

  const handleChangeAppIcon = useCallback(() => {
    setAppIconSelectionMode(true);
    setActiveView('logo');
  }, []);

  const handleAppIconSelected = useCallback(() => {
    setAppIconSelectionMode(false);
    setActiveView('application');
  }, []);

  function renderView() {
    switch (activeView) {
      case 'dashboard': return <SADashboard onNavigate={handleNavigate} onNavigateToAudit={() => { setDocInitialTab('audit-technique'); setDocKey(k => k + 1); setActiveView('documentation-crm'); }} adminCount={cachedAdmins.length} adminsLoading={adminsRefreshing && cachedAdmins.length === 0} />;
      case 'admins': return <SAAdmins onConnectAsAdmin={handleConnectAsAdmin} onOpenChat={handleOpenChatAdmin} cachedAdmins={cachedAdmins} refreshing={adminsRefreshing} cachedError={adminsError} onRefresh={fetchAdminsCache} />;
      case 'chat-admin': return null;
      case 'documentation-crm': return <div className="p-4 md:p-6 flex flex-col h-full min-h-0"><DocumentationCrm key={docKey} initialTab={docInitialTab} onInitialTabConsumed={() => setDocInitialTab(undefined)} /></div>;
      case 'system': return <SystemPage />;
      case 'sauvegarde': return <SimulationProvider><SauvegardeRestauration /></SimulationProvider>;
      case 'mon-compte': return <SAMonCompte onNameChange={(fn, ln) => { setSaFirstName(fn); setSaLastName(ln); }} />;
      case 'tests-systeme': return <SATestsSysteme />;
      case 'crm-societe': return <SACrmSociete />;
      case 'statuts': return <SAStatuts />;
      case 'api-ia': return <SAApiIa />;
      case 'sites': return <SASites />;
      case 'fonctions-talvex': return <SAFonctionsTalvex />;
      case 'site-talvex': return <SASiteTalvex />;
      case 'cerveau-ia': return <SACerveauIA />;
      case 'logo': return <SALogoPage appIconSelectionMode={appIconSelectionMode} onAppIconSelected={handleAppIconSelected} />;
      case 'ameliorations': return <SAAmeliorations />;
      case 'application': return <SAApplicationPage onChangeAppIcon={handleChangeAppIcon} />;
      case 'themes': return <SAThemes />;
      case 'tuto': return <div className="p-6"><p className="text-sm" style={{ color: 'inherit' }}>Tuto - Contenu a venir</p></div>;
      default: return <SADashboard onNavigate={handleNavigate} adminCount={cachedAdmins.length} adminsLoading={adminsRefreshing && cachedAdmins.length === 0} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: t.main.bg }}>
      <GlassBackgroundLayer />
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: t.modal.overlayBg }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SuperAdminSidebar
          activeView={activeView}
          onNavigate={(v) => { handleNavigate(v); setMobileOpen(false); }}
          collapsed={false}
          onCollapse={() => setMobileOpen(false)}
          onLogout={onLogout}
        />
      </div>

      {/* Sidebar - desktop */}
      <div className="hidden md:block">
        <SuperAdminSidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(prev => !prev)}
          onLogout={onLogout}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SuperAdminTopBar
          activeView={activeView}
          onMobileMenuToggle={() => setMobileOpen(prev => !prev)}
          unreadAdminMsgCount={unreadAdminMsgCount}
          unreadAdminMsgEntries={unreadAdminMsgEntries}
          onAdminMsgEntryClick={(entry) => { markAdminMsgRead(entry.adminId); setChatAdmin(cachedAdmins.find(a => a.id === entry.adminId) ?? { id: entry.adminId, email: entry.email, first_name: entry.firstName, last_name: entry.lastName, phone: '', role: 'admin', created_at: '', last_sign_in_at: null, access_enabled: true }); setActiveView('chat-admin'); }}
          saFirstName={saFirstName}
          saLastName={saLastName}
          appIconUrl={saAppIconUrl}
          appName={saAppName || 'Talvex'}
        />

        <main
          className={`flex-1 ${activeView === 'chat-admin' ? 'p-2 sm:p-3 md:p-4' : ''}`}
          style={{ minHeight: 0, overflow: activeView === 'chat-admin' ? 'hidden' : 'auto' }}
        >
          {activeView === 'chat-admin' && (
            <Suspense
              fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
                <SAchatAdmin
                  key={chatAdmin?.id ?? 'no-admin'}
                  initialAdmin={chatAdmin}
                  onAdminViewed={markAdminMsgRead}
                  cachedAdmins={cachedAdmins}
                />
              </div>
            </Suspense>
          )}
          {activeView !== 'chat-admin' && (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              {renderView()}
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
