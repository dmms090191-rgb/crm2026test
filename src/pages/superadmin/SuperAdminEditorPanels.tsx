import type { RefObject } from 'react';
import EditorBackgroundsModal from '../../components/editor/EditorBackgroundsModal';
import EditorColorModal from '../../components/editor/EditorColorModal';
import EditorSavedColorsModal from '../../components/editor/EditorSavedColorsModal';
import EditorTabsPanel, { EditorTabsCollapsedButton } from '../../components/editor/EditorTabsPanel';
import EditorTypographyPanel from '../../components/editor/EditorTypographyPanel';
import EditorZoneHighlight from '../../components/editor/EditorZoneHighlight';
import { getEditorPanelTokens } from '../../components/editor/editorPanelTheme';
import { useEditorMode } from '../../contexts/EditorModeContext';

interface EditorPanelsProps {
  tabsCollapsed: boolean;
  setTabsCollapsed: (v: boolean) => void;
  tabsVisible: boolean;
  setTabsVisible: (v: boolean) => void;
  fondsVisible: boolean;
  setFondsVisible: (v: boolean) => void;
  couleurVisible: boolean;
  setCouleurVisible: (v: boolean) => void;
  savedVisible: boolean;
  setSavedVisible: (v: boolean) => void;
  savedRefreshKey: number;
  setSavedRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  getPositionFor: (key: string) => { x: number; y: number };
  updatePositionFor: (key: string, x: number, y: number) => void;
  contenuPos: { x: number; y: number };
  logoZoneRef: RefObject<HTMLDivElement | null>;
  sidebarBodyRef: RefObject<HTMLDivElement | null>;
  topbarRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
}

export default function SuperAdminEditorPanels({
  tabsCollapsed, setTabsCollapsed,
  tabsVisible, setTabsVisible,
  fondsVisible, setFondsVisible,
  couleurVisible, setCouleurVisible,
  savedVisible, setSavedVisible,
  savedRefreshKey, setSavedRefreshKey,
  getPositionFor, updatePositionFor, contenuPos,
  logoZoneRef, sidebarBodyRef, topbarRef, contentRef,
}: EditorPanelsProps) {
  const editorCtx = useEditorMode();

  return (
    <>
      {tabsCollapsed && (
        <EditorTabsCollapsedButton onClick={() => { setTabsCollapsed(false); setTabsVisible(true); }} pt={getEditorPanelTokens(editorCtx.panelTheme, editorCtx.panelPalettePreview || editorCtx.customPanelPalette)} contenuPos={contenuPos} />
      )}
      <EditorTabsPanel visible={tabsVisible && !tabsCollapsed} onClose={() => setTabsVisible(false)} onCollapse={() => setTabsCollapsed(true)} initialPos={getPositionFor('onglets')} onPositionChange={(x, y) => updatePositionFor('onglets', x, y)} />
      <EditorBackgroundsModal visible={fondsVisible} onClose={() => setFondsVisible(false)} initialPos={getPositionFor('contenu')} onPositionChange={(x, y) => updatePositionFor('contenu', x, y)} />
      <EditorColorModal visible={couleurVisible} onClose={() => setCouleurVisible(false)} onColorSaved={() => setSavedRefreshKey(k => k + 1)} initialPos={getPositionFor('couleur')} onPositionChange={(x, y) => updatePositionFor('couleur', x, y)} />
      <EditorSavedColorsModal visible={savedVisible} onClose={() => setSavedVisible(false)} refreshKey={savedRefreshKey} initialPos={getPositionFor('saved')} onPositionChange={(x, y) => updatePositionFor('saved', x, y)} />
      <EditorTypographyPanel visible={editorCtx.typoTarget !== null} onClose={() => editorCtx.setTypoTarget(null)} initialPos={getPositionFor('typographie')} onPositionChange={(x, y) => updatePositionFor('typographie', x, y)} />
      <EditorZoneHighlight logoRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef} topbarRef={topbarRef} contentRef={contentRef} />
    </>
  );
}
