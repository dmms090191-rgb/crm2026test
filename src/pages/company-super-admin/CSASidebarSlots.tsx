import CSASidebar from './CSASidebar';
import type { CSAView } from './CSASidebar';
import type { ImpersonatedCompanySuperAdmin } from '../../App';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface Props {
  activeView: CSAView;
  setActiveView: (v: CSAView) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (fn: (p: boolean) => boolean) => void;
  handleLogout: () => void;
  currentImpersonated: ImpersonatedCompanySuperAdmin;
  impersonated: ImpersonatedCompanySuperAdmin;
  isImpersonation: boolean;
  onBack: () => void;
  visuBadgeLabel?: string;
  backLabel?: string;
  canHideTabs?: boolean;
  logoZoneRef: React.RefObject<HTMLDivElement | null>;
  sidebarBodyRef: React.RefObject<HTMLDivElement | null>;
  zone1Bg?: string;
  zone2Bg?: string;
  sidebarBadgeCounts: Record<string, number>;
  t: ThemeTokens;
}

/**
 * Les deux montages de la sidebar Groupe : tiroir mobile et colonne desktop.
 * Extrait tel quel du dashboard, aucun changement de comportement.
 */
export default function CSASidebarSlots({
  activeView, setActiveView, mobileOpen, setMobileOpen, sidebarCollapsed, setSidebarCollapsed,
  handleLogout, currentImpersonated, impersonated, isImpersonation, onBack,
  visuBadgeLabel, backLabel, canHideTabs, logoZoneRef, sidebarBodyRef,
  zone1Bg, zone2Bg, sidebarBadgeCounts, t,
}: Props) {
  return (
    <>

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
    </>
  );
}
