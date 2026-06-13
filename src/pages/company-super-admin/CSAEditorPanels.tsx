import type { RefObject, MutableRefObject } from 'react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import EditorBackgroundsModal from '../../components/editor/EditorBackgroundsModal';
import EditorColorModal from '../../components/editor/EditorColorModal';
import EditorSavedColorsModal from '../../components/editor/EditorSavedColorsModal';
import EditorZoneHighlight from '../../components/editor/EditorZoneHighlight';
import EditorTabsPanel, { EditorTabsCollapsedButton } from '../../components/editor/EditorTabsPanel';
import EditorTypographyPanel from '../../components/editor/EditorTypographyPanel';
import { getEditorPanelTokens } from '../../components/editor/editorPanelTheme';

interface Props {
  tabsVisible: boolean;
  setTabsVisible: (v: boolean) => void;
  tabsCollapsed: boolean;
  setTabsCollapsed: (v: boolean) => void;
  fondsVisible: boolean;
  setFondsVisible: (v: boolean) => void;
  couleurVisible: boolean;
  setCouleurVisible: (v: boolean) => void;
  savedVisible: boolean;
  setSavedVisible: (v: boolean) => void;
  savedRefreshKey: number;
  setSavedRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  getPositionFor: (panel: string) => { x: number; y: number } | null;
  updatePositionFor: (panel: string, x: number, y: number) => void;
  contenuPos: { x: number; y: number } | null;
  logoZoneRef: RefObject<HTMLDivElement | null>;
  sidebarBodyRef: RefObject<HTMLDivElement | null>;
  topbarZoneRef: RefObject<HTMLElement | null>;
  contentZoneRef: MutableRefObject<HTMLElement | null>;
}

export default function CSAEditorPanels({
  tabsVisible, setTabsVisible, tabsCollapsed, setTabsCollapsed,
  fondsVisible, setFondsVisible, couleurVisible, setCouleurVisible,
  savedVisible, setSavedVisible, savedRefreshKey, setSavedRefreshKey,
  getPositionFor, updatePositionFor, contenuPos,
  logoZoneRef, sidebarBodyRef, topbarZoneRef, contentZoneRef,
}: Props) {
  const editorCtx = useEditorMode();

  if (!editorCtx.editorOpen) return null;

  return (
    <>
      {tabsCollapsed && (
        <EditorTabsCollapsedButton
          onClick={() => { setTabsCollapsed(false); setTabsVisible(true); }}
          pt={getEditorPanelTokens(editorCtx.panelTheme, editorCtx.panelPalettePreview || editorCtx.customPanelPalette)}
          contenuPos={contenuPos}
        />
      )}
      <EditorTabsPanel
        visible={tabsVisible && !tabsCollapsed}
        onClose={() => setTabsVisible(false)}
        onCollapse={() => setTabsCollapsed(true)}
        initialPos={getPositionFor('onglets')}
        onPositionChange={(x, y) => updatePositionFor('onglets', x, y)}
      />
      <EditorBackgroundsModal
        visible={fondsVisible}
        onClose={() => setFondsVisible(false)}
        initialPos={getPositionFor('contenu')}
        onPositionChange={(x, y) => updatePositionFor('contenu', x, y)}
      />
      <EditorColorModal
        visible={couleurVisible}
        onClose={() => setCouleurVisible(false)}
        onColorSaved={() => setSavedRefreshKey(k => k + 1)}
        initialPos={getPositionFor('couleur')}
        onPositionChange={(x, y) => updatePositionFor('couleur', x, y)}
      />
      <EditorSavedColorsModal
        visible={savedVisible}
        onClose={() => setSavedVisible(false)}
        refreshKey={savedRefreshKey}
        initialPos={getPositionFor('saved')}
        onPositionChange={(x, y) => updatePositionFor('saved', x, y)}
      />
      <EditorTypographyPanel
        visible={editorCtx.typoTarget !== null}
        onClose={() => editorCtx.setTypoTarget(null)}
        initialPos={getPositionFor('typographie')}
        onPositionChange={(x, y) => updatePositionFor('typographie', x, y)}
      />
      <EditorZoneHighlight
        logoRef={logoZoneRef}
        sidebarBodyRef={sidebarBodyRef}
        topbarRef={topbarZoneRef}
        contentRef={contentZoneRef}
      />
    </>
  );
}
