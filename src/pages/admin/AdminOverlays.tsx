import { SimulationBanner } from './views/sauvegarde/SimulationBanner';
import DemoEmitterLayer from '../../components/demo/DemoEmitterLayer';
import DemoReceiverLayer from '../../components/demo/DemoReceiverLayer';
import EditorToolbar from '../../components/editor/EditorToolbar';
import type { ActiveView, ImpersonatedAdminInfo } from './adminDashboardTypes';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface Props {
  setSaveThemeOpen: (v: boolean) => void;
  handleResetPanelPositions: () => void | Promise<unknown>;
  handleAlignPanels: () => void | Promise<unknown>;
  handleSaveSession: () => Promise<boolean>;
  isSAViewing?: boolean;
  impersonatedAdmin?: ImpersonatedAdminInfo | null;
  activeView: ActiveView;
  getBreadcrumb: () => string;
  adminAuthId: string | null;
  setActiveView: (v: ActiveView) => void;
  t: ThemeTokens;
}

/** Surcouches du panel Societe : editeur, demo, banniere de simulation. Extrait tel quel. */
export default function AdminOverlays({
  setSaveThemeOpen, handleResetPanelPositions, handleAlignPanels, handleSaveSession,
  isSAViewing, impersonatedAdmin, activeView, getBreadcrumb, adminAuthId, setActiveView, t,
}: Props) {
  return (
    <>
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
    </>
  );
}
