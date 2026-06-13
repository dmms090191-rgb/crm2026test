import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { loadEditorPanelTheme, saveEditorPanelTheme, loadCustomPanelPalette, saveCustomPanelPalette, type EditorPanelThemeId, type CustomPanelPalette } from '../components/editor/editorPanelTheme';
import { wipeEditorSession } from './editorModeSessionWipe';
import { applyTabSwitch } from './editorModeTabSwitch';
import { EMPTY_OVERRIDES, type EditorModeContextValue, type EditorZone, type EditorTab, type ZoneBackground, type TextTarget, type TypographyOverrides, type ButtonOverride, type BgImageFitMode, type CardOverride } from './editorModeTypes';
import {
  loadCachedZoneOverrides, loadCachedTextOverrides,
  cacheZoneOverrides, cacheTextOverrides,
  setEditorScopePrefix,
} from './editorModeHelpers';
import { useEditorBgImageState } from './editorModeBgImageState';
import { useEditorTypographyState } from './editorModeTypographyState';
import { useEditorButtonsState } from './editorModeButtonsState';
import { useEditorCardsState } from './editorModeCardsState';

export type { EditorZone, ZoneBackground, EditorTab, TextTarget, TypographyOverrides, BgImageFitMode };
export { resolveTextColor, resolveZoneEffective, resolveZoneBg, resolveTypography } from './editorModeHelpers';

const EditorModeContext = createContext<EditorModeContextValue | undefined>(undefined);

export function EditorModeProvider({ children, scopeKey = 'sa' }: { children: ReactNode; scopeKey?: string }) {
  setEditorScopePrefix(scopeKey);
  const visualReady = true;
  const markVisualReady = useCallback(() => {}, []);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTabRaw] = useState<EditorTab>('fonds');
  const [activeZone, setActiveZoneRaw] = useState<EditorZone | null>(null);
  const [zoneOverrides, setZoneOverrides] = useState<Record<EditorZone, ZoneBackground | null>>(loadCachedZoneOverrides);
  const [preview, setPreviewState] = useState<{ zone: EditorZone; bg: ZoneBackground } | null>(null);

  const [textTarget, setTextTargetRaw] = useState<TextTarget | null>(null);
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>(loadCachedTextOverrides);
  const [textPreview, setTextPreviewState] = useState<Record<string, string>>({});

  const [unifiedDrag, setUnifiedDrag] = useState(true);
  const dragBroadcast = useRef<((dx: number, dy: number, sourceId: string) => void)[]>([]);
  const dragPanelRects = useRef<(() => DOMRect | null)[]>([]);
  const toggleUnifiedDrag = useCallback(() => setUnifiedDrag(prev => !prev), []);

  const bgImg = useEditorBgImageState();
  const typo = useEditorTypographyState();
  const btn = useEditorButtonsState();
  const card = useEditorCardsState();

  const [editingThemeKey, setEditingThemeKey] = useState<string | null>(null);
  const [panelTheme, setPanelThemeRaw] = useState<EditorPanelThemeId>(loadEditorPanelTheme);
  const setPanelTheme = useCallback((id: EditorPanelThemeId) => {
    setPanelThemeRaw(id);
    saveEditorPanelTheme(id);
  }, []);

  const [customPanelPalette, setCustomPanelPaletteRaw] = useState<CustomPanelPalette | null>(loadCustomPanelPalette);
  const [panelPalettePreview, setPanelPalettePreviewRaw] = useState<CustomPanelPalette | null>(null);
  const setPanelPalettePreview = useCallback((palette: CustomPanelPalette | null) => {
    setPanelPalettePreviewRaw(palette);
  }, []);
  const commitPanelPalette = useCallback(() => {
    setPanelPalettePreviewRaw(prev => {
      if (prev) {
        setCustomPanelPaletteRaw(prev);
        saveCustomPanelPalette(prev);
      }
      return null;
    });
  }, []);
  const resetPanelPalette = useCallback(() => {
    setCustomPanelPaletteRaw(null);
    setPanelPalettePreviewRaw(null);
    saveCustomPanelPalette(null);
  }, []);

  const loadCustomTheme = useCallback((themeKey: string, zones: Record<EditorZone, ZoneBackground | null>, texts: Record<string, string>, bgImage?: string | null, typoOvr?: TypographyOverrides | null, palette?: CustomPanelPalette | null, btnOverrides?: Record<string, ButtonOverride> | null, bgImageZoom?: number | null, bgImagePosX?: number | null, bgImagePosY?: number | null, cardOvr?: Record<string, CardOverride> | null, bgImageFit?: BgImageFitMode | null) => {
    setEditorOpen(true);
    setEditorTabRaw('fonds');
    setActiveZoneRaw('zone1');
    setZoneOverrides(zones);
    cacheZoneOverrides(zones);
    setTextOverrides(texts);
    cacheTextOverrides(texts);
    bgImg.applyBgImageFromTheme(bgImage, bgImageZoom, bgImagePosX, bgImagePosY, bgImageFit);
    typo.applyTypographyFromTheme(typoOvr);
    setPreviewState(null);
    setTextPreviewState({});
    setEditingThemeKey(themeKey);
    if (palette !== undefined) {
      setCustomPanelPaletteRaw(palette);
      saveCustomPanelPalette(palette);
      setPanelPalettePreviewRaw(null);
    }
    btn.applyButtonsFromTheme(btnOverrides);
    card.applyCardsFromTheme(cardOvr);
  }, [bgImg, typo, btn, card]);

  const clearEditingTheme = useCallback(() => { setEditingThemeKey(null); }, []);

  const openEditor = useCallback(() => {
    setEditorOpen(true);
    setEditorTabRaw('fonds');
    setActiveZoneRaw('zone1');
  }, []);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setActiveZoneRaw(null);
    setPreviewState(null);
    setTextTargetRaw(null);
    setTextPreviewState({});
    setEditingThemeKey(null);
    typo.setTypoTargetRaw(null);
    btn.setActiveButtonTargetRaw(null);
    btn.clearButtonPreview();
    card.setActiveCardTargetRaw(null);
    card.clearCardPreview();
  }, [typo, btn, card]);

  const setEditorTab = useCallback((tab: EditorTab) => {
    setPreviewState(null);
    setTextPreviewState({});
    btn.clearButtonPreview();
    card.clearCardPreview();
    applyTabSwitch(tab, {
      activeZone,
      setActiveZoneRaw,
      setTextTargetRaw,
      setTypoTargetRaw: typo.setTypoTargetRaw,
      setActiveButtonTargetRaw: btn.setActiveButtonTargetRaw,
      setActiveCardTargetRaw: card.setActiveCardTargetRaw,
    });
    setEditorTabRaw(tab);
  }, [activeZone, typo, btn, card]);

  const setActiveZone = useCallback((zone: EditorZone | null) => {
    setPreviewState(null);
    setActiveZoneRaw(zone);
  }, []);

  const applyZoneBackground = useCallback((zone: EditorZone, bg: ZoneBackground) => {
    setZoneOverrides(prev => {
      const next = { ...prev, [zone]: bg };
      cacheZoneOverrides(next);
      return next;
    });
    setPreviewState(null);
  }, []);

  const clearZoneBackground = useCallback((zone: EditorZone) => {
    setZoneOverrides(prev => {
      const next = { ...prev, [zone]: null };
      cacheZoneOverrides(next);
      return next;
    });
  }, []);

  const clearAllOverrides = useCallback(() => {
    setZoneOverrides({ ...EMPTY_OVERRIDES });
    cacheZoneOverrides(EMPTY_OVERRIDES);
    setPreviewState(null);
    setTextOverrides({});
    cacheTextOverrides({});
    setTextPreviewState({});
    bgImg.resetBgImageAll();
    typo.resetTypographyAll();
    btn.resetButtonsAll();
    card.resetCardsAll();
    setCustomPanelPaletteRaw(null);
    setPanelPalettePreviewRaw(null);
    saveCustomPanelPalette(null);
    void wipeEditorSession(scopeKey);
  }, [bgImg, typo, btn, card, scopeKey]);

  const getAllOverrides = useCallback(() => zoneOverrides, [zoneOverrides]);
  const getOverridesWithPreview = useCallback(() => {
    if (!preview) return zoneOverrides;
    return { ...zoneOverrides, [preview.zone]: preview.bg };
  }, [zoneOverrides, preview]);

  const setPreview = useCallback((zone: EditorZone, bg: ZoneBackground) => { setPreviewState({ zone, bg }); }, []);
  const clearPreview = useCallback(() => { setPreviewState(null); }, []);
  const commitPreview = useCallback(() => {
    setPreviewState(prev => {
      if (prev) {
        setZoneOverrides(ovr => {
          const next = { ...ovr, [prev.zone]: prev.bg };
          cacheZoneOverrides(next);
          return next;
        });
      }
      return null;
    });
  }, []);

  const setTextTarget = useCallback((target: TextTarget | null) => {
    setTextPreviewState({});
    setTextTargetRaw(target);
  }, []);

  const applyTextColor = useCallback((key: string, color: string) => {
    setTextOverrides(prev => {
      const next = { ...prev, [key]: color };
      cacheTextOverrides(next);
      return next;
    });
    setTextPreviewState({});
  }, []);

  const clearTextColor = useCallback((key: string) => {
    setTextOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      cacheTextOverrides(next);
      return next;
    });
  }, []);

  const getAllTextOverrides = useCallback(() => textOverrides, [textOverrides]);
  const getTextOverridesWithPreview = useCallback(() => {
    if (Object.keys(textPreview).length === 0) return textOverrides;
    return { ...textOverrides, ...textPreview };
  }, [textOverrides, textPreview]);

  const setTextPreview = useCallback((keys: string[], color: string) => {
    const map: Record<string, string> = {};
    keys.forEach(k => { map[k] = color; });
    setTextPreviewState(map);
  }, []);

  const clearTextPreview = useCallback(() => { setTextPreviewState({}); }, []);
  const commitTextPreview = useCallback(() => {
    setTextPreviewState(prev => {
      if (Object.keys(prev).length > 0) {
        setTextOverrides(ovr => {
          const next = { ...ovr, ...prev };
          cacheTextOverrides(next);
          return next;
        });
      }
      return {};
    });
  }, []);

  return (
    <EditorModeContext.Provider value={{
      visualReady, markVisualReady,
      editorOpen, openEditor, closeEditor,
      editorTab, setEditorTab,
      activeZone, setActiveZone,
      zoneOverrides, applyZoneBackground, clearZoneBackground, clearAllOverrides, getAllOverrides, getOverridesWithPreview,
      preview, setPreview, clearPreview, commitPreview,
      textTarget, setTextTarget,
      textOverrides, applyTextColor, clearTextColor, getAllTextOverrides, getTextOverridesWithPreview,
      textPreview, setTextPreview, clearTextPreview, commitTextPreview,
      backgroundImage: bgImg.backgroundImage, setBackgroundImage: bgImg.setBackgroundImage,
      backgroundImageZoom: bgImg.backgroundImageZoom, setBackgroundImageZoom: bgImg.setBackgroundImageZoom,
      backgroundImagePositionX: bgImg.backgroundImagePositionX, backgroundImagePositionY: bgImg.backgroundImagePositionY,
      setBackgroundImagePosition: bgImg.setBackgroundImagePosition,
      backgroundImageFit: bgImg.backgroundImageFit, setBackgroundImageFit: bgImg.setBackgroundImageFit,
      unifiedDrag, toggleUnifiedDrag, dragBroadcast, dragPanelRects,
      editingThemeKey, loadCustomTheme, clearEditingTheme,
      panelTheme, setPanelTheme,
      customPanelPalette, panelPalettePreview, setPanelPalettePreview, commitPanelPalette, resetPanelPalette,
      typographyOverrides: typo.typographyOverrides, typographyPreview: typo.typographyPreview, setTypographyPreview: typo.setTypographyPreview,
      commitTypography: typo.commitTypography, clearTypographyPreview: typo.clearTypographyPreview, resetTypography: typo.resetTypography,
      typoTarget: typo.typoTarget, setTypoTarget: typo.setTypoTarget,
      activeButtonTarget: btn.activeButtonTarget, setActiveButtonTarget: btn.setActiveButtonTarget,
      buttonSubTarget: btn.buttonSubTarget, setButtonSubTarget: btn.setButtonSubTarget,
      buttonOverrides: btn.buttonOverrides, buttonPreview: btn.buttonPreview,
      setButtonBgPreview: btn.setButtonBgPreview, setButtonTextPreview: btn.setButtonTextPreview, clearButtonPreview: btn.clearButtonPreview,
      applyButtonBg: btn.applyButtonBg, applyButtonTextColor: btn.applyButtonTextColor, getButtonOverridesWithPreview: btn.getButtonOverridesWithPreview,
      highlightedButtonId: btn.highlightedButtonId, locateButton: btn.locateButton, registerLocateHandler: btn.registerLocateHandler,
      buttonBgSyncSignal: btn.buttonBgSyncSignal, syncButtonBgFromSaved: btn.syncButtonBgFromSaved,
      activeCardTarget: card.activeCardTarget, setActiveCardTarget: card.setActiveCardTarget,
      cardOverrides: card.cardOverrides, cardPreview: card.cardPreview,
      setCardBgPreview: card.setCardBgPreview, clearCardPreview: card.clearCardPreview,
      applyCardBg: card.applyCardBg, getCardOverridesWithPreview: card.getCardOverridesWithPreview,
    }}>
      {children}
    </EditorModeContext.Provider>
  );
}

export function useEditorMode(): EditorModeContextValue {
  const ctx = useContext(EditorModeContext);
  if (!ctx) throw new Error('useEditorMode must be used within EditorModeProvider');
  return ctx;
}

export function useEditorModeSafe(): EditorModeContextValue | null {
  return useContext(EditorModeContext) ?? null;
}
