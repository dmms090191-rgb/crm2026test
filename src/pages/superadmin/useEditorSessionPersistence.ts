import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useEditorMode, type EditorZone, type EditorTab } from '../../contexts/EditorModeContext';
import { type EditorPanelThemeId } from '../../components/editor/editorPanelTheme';
import {
  loadSavedSolids,
  loadSavedGradients,
} from '../../components/editor/editorSavedStore';
import { loadPositionsFromLocalStorage, savePositionsToLocalStorage } from './editorSessionStorage';
import { restoreEditorOverrides } from './editorSessionRestore';

export function useEditorSessionPersistence(scopeKey: string = 'sa') {
  const editorCtx = useEditorMode();
  const panelPosRef = useRef<Record<string, { x: number; y: number }>>(
    loadPositionsFromLocalStorage() || {},
  );
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const overridesRestoredRef = useRef(false);
  const editorUiRestoredRef = useRef(false);

  const [tabsVisible, setTabsVisible] = useState(true);
  const [tabsCollapsed, setTabsCollapsedRaw] = useState(false);
  const tabsCollapsedRef = useRef(false);
  const setTabsCollapsed = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setTabsCollapsedRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      tabsCollapsedRef.current = next;
      return next;
    });
  }, []);
  const [fondsVisible, setFondsVisible] = useState(true);
  const [couleurVisible, setCouleurVisible] = useState(true);
  const [savedVisible, setSavedVisible] = useState(true);

  const [posVersion, setPosVersion] = useState(0);
  const [contenuPos, setContenuPos] = useState<{ x: number; y: number } | null>(null);
  const dbSessionRef = useRef<Record<string, unknown> | null>(null);

  const updatePositionFor = useCallback((key: string, x: number, y: number) => {
    panelPosRef.current = { ...panelPosRef.current, [key]: { x, y } };
    savePositionsToLocalStorage(panelPosRef.current);
    if (key === 'contenu') setContenuPos({ x, y });
  }, []);

  const getPositionFor = useCallback((key: string): { x: number; y: number } | undefined => {
    void posVersion;
    return panelPosRef.current[key];
  }, [posVersion]);

  useEffect(() => {
    if (overridesRestoredRef.current) return;
    overridesRestoredRef.current = true;
    (async () => {
      try {
        const data = await restoreEditorOverrides(editorCtx, () => setSavedRefreshKey(k => k + 1), scopeKey);
        if (data) dbSessionRef.current = data;
      } finally {
        editorCtx.markVisualReady();
      }
    })();
  }, []);

  useEffect(() => {
    if (editorCtx.editorOpen) {
      setTabsVisible(true);
      setFondsVisible(true);
      setCouleurVisible(true);
      setSavedVisible(true);

      if (!editorUiRestoredRef.current) {
        editorUiRestoredRef.current = true;
        const data = dbSessionRef.current;
        if (data) {
          if (data.active_zone) editorCtx.setActiveZone(data.active_zone as EditorZone);
          if (data.editor_tab) editorCtx.setEditorTab(data.editor_tab as EditorTab);
          if (data.unified_drag === false && editorCtx.unifiedDrag) editorCtx.toggleUnifiedDrag();
          if (data.tabs_collapsed === true) {
            setTabsCollapsed(true);
          }
          if (data.panel_theme && (data.panel_theme === 'noir' || data.panel_theme === 'gris' || data.panel_theme === 'blanc')) {
            editorCtx.setPanelTheme(data.panel_theme as EditorPanelThemeId);
          }
          if (data.panel_positions && typeof data.panel_positions === 'object') {
            const pp = data.panel_positions as Record<string, { x: number; y: number }>;
            panelPosRef.current = pp;
            savePositionsToLocalStorage(pp);
            if (pp.contenu) setContenuPos(pp.contenu);
            setPosVersion(v => v + 1);
          }
        }
      }
    }
  }, [editorCtx.editorOpen]);

  const handleSaveSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      editorCtx.commitPreview();
      editorCtx.commitTextPreview();

      savePositionsToLocalStorage(panelPosRef.current);

      const payload = {
        user_id: user.id,
        scope_key: scopeKey,
        zone_overrides: editorCtx.getOverridesWithPreview(),
        text_overrides: editorCtx.getTextOverridesWithPreview(),
        saved_solids: loadSavedSolids(),
        saved_gradients: loadSavedGradients(),
        panel_positions: panelPosRef.current,
        active_zone: editorCtx.activeZone || 'zone1',
        editor_tab: editorCtx.editorTab,
        color_mode: 'solid',
        unified_drag: editorCtx.unifiedDrag,
        tabs_collapsed: tabsCollapsedRef.current,
        background_image: editorCtx.backgroundImage || null,
        background_image_zoom: editorCtx.backgroundImageZoom !== 100 ? editorCtx.backgroundImageZoom : null,
        background_image_position_x: editorCtx.backgroundImagePositionX !== 0 ? editorCtx.backgroundImagePositionX : null,
        background_image_position_y: editorCtx.backgroundImagePositionY !== 0 ? editorCtx.backgroundImagePositionY : null,
        panel_theme: editorCtx.panelTheme,
        panel_palette: editorCtx.customPanelPalette || null,
        typography_overrides: editorCtx.typographyOverrides,
        button_overrides: Object.keys(editorCtx.buttonOverrides).length > 0 ? editorCtx.buttonOverrides : null,
        card_overrides: Object.keys(editorCtx.cardOverrides).length > 0 ? editorCtx.cardOverrides : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('editor_sessions')
        .upsert(payload, { onConflict: 'user_id,scope_key' });

      return !error;
    } catch {
      return false;
    }
  }, [editorCtx, scopeKey]);

  const handleAlignPanels = useCallback(() => {
    const panelW = 272;
    const gap = 12;
    const panelCount = tabsCollapsed ? 3 : 4;
    const totalW = panelW * panelCount + gap * (panelCount - 1);
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const topY = Math.max(80, Math.min(120, screenH * 0.12));

    let startX: number;
    if (totalW + 32 <= screenW) {
      startX = Math.round((screenW - totalW) / 2);
    } else {
      startX = 16;
    }

    const positions: Record<string, { x: number; y: number }> = {};
    let col = 0;

    if (!tabsCollapsed) {
      positions.onglets = { x: startX + (panelW + gap) * col, y: topY };
      col++;
    }
    positions.contenu = { x: startX + (panelW + gap) * col, y: topY };
    col++;
    positions.couleur = { x: startX + (panelW + gap) * col, y: topY };
    col++;
    positions.saved = { x: startX + (panelW + gap) * col, y: topY };

    panelPosRef.current = positions;
    savePositionsToLocalStorage(positions);
    setContenuPos(positions.contenu);
    setPosVersion(v => v + 1);
  }, [tabsCollapsed]);

  const handleResetPanelPositions = useCallback(() => {
    panelPosRef.current = {};
    savePositionsToLocalStorage({});
    setContenuPos(null);
    setTabsVisible(false);
    setTabsCollapsed(false);
    setFondsVisible(false);
    setCouleurVisible(false);
    setSavedVisible(false);
    requestAnimationFrame(() => {
      setTabsVisible(true);
      setFondsVisible(true);
      setCouleurVisible(true);
      setSavedVisible(true);
    });
  }, []);

  return {
    panelPosRef,
    getPositionFor,
    savedRefreshKey,
    setSavedRefreshKey,
    tabsVisible,
    setTabsVisible,
    tabsCollapsed,
    setTabsCollapsed,
    fondsVisible,
    setFondsVisible,
    couleurVisible,
    setCouleurVisible,
    savedVisible,
    setSavedVisible,
    handleSaveSession,
    handleAlignPanels,
    handleResetPanelPositions,
    updatePositionFor,
    contenuPos,
  };
}
