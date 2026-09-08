import EditorChoiceButtons from '../superadmin/EditorChoiceButtons';
import EditorSubModeToolbar from '../superadmin/EditorSubModeToolbar';
import type { useVisualCustomize } from '../../components/visualCustomize/VisualCustomizeContext';

interface Props {
  showChoice: boolean;
  showOngletPanels: boolean;
  showZoneDroite: boolean;
  ongletPanelsVisible: boolean;
  handleSelectOnglet: () => void;
  handleSelectZoneDroite: () => void;
  handleBackToChoice: () => void;
  handleSaveSession: () => Promise<boolean>;
  handleAlignPanels: () => void | Promise<unknown>;
  handleToggleOngletPanels: () => void;
  setSaveThemeOpen: (v: boolean) => void;
  editorCtx: { closeEditor: () => void };
  vc: ReturnType<typeof useVisualCustomize>;
}

/** Barres du mode Editeur du panel Groupe. Extrait tel quel, aucun changement. */
export default function CSAEditorToolbars({
  showChoice, showOngletPanels, showZoneDroite, ongletPanelsVisible,
  handleSelectOnglet, handleSelectZoneDroite, handleBackToChoice,
  handleSaveSession, handleAlignPanels, handleToggleOngletPanels,
  setSaveThemeOpen, editorCtx, vc,
}: Props) {
  return (
    <>
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
    </>
  );
}
