import { useCallback, useRef, useState } from 'react';
import type { ButtonOverride, ButtonSubTarget, ZoneBackground } from './editorModeTypes';
import { loadCachedButtonOverrides, cacheButtonOverrides } from './editorModeHelpers';

export function useEditorButtonsState() {
  const [activeButtonTarget, setActiveButtonTargetRaw] = useState<string | null>(null);
  const [buttonSubTarget, setButtonSubTargetRaw] = useState<ButtonSubTarget>('fond');
  const [buttonOverrides, setButtonOverrides] = useState<Record<string, ButtonOverride>>(loadCachedButtonOverrides);
  const [buttonPreview, setButtonPreviewState] = useState<Record<string, ButtonOverride>>({});

  const setActiveButtonTarget = useCallback((id: string | null) => {
    setActiveButtonTargetRaw(id);
    setButtonPreviewState({});
  }, []);

  const setButtonSubTarget = useCallback((sub: ButtonSubTarget) => { setButtonSubTargetRaw(sub); }, []);

  const setButtonBgPreview = useCallback((id: string, bg: ZoneBackground, opacityMode?: 'transparent' | 'opaque') => {
    setButtonPreviewState(prev => ({ ...prev, [id]: { ...prev[id], bg, ...(opacityMode !== undefined ? { opacityMode } : {}) } }));
  }, []);

  const setButtonTextPreview = useCallback((id: string, color: string) => {
    setButtonPreviewState(prev => ({ ...prev, [id]: { ...prev[id], textColor: color } }));
  }, []);

  const clearButtonPreview = useCallback(() => { setButtonPreviewState({}); }, []);

  const applyButtonBg = useCallback((id: string, bg: ZoneBackground, opacityMode?: 'transparent' | 'opaque') => {
    setButtonOverrides(prev => {
      const next = { ...prev, [id]: { ...prev[id], bg, ...(opacityMode !== undefined ? { opacityMode } : {}) } };
      cacheButtonOverrides(next);
      return next;
    });
    setButtonPreviewState(prev => {
      const next = { ...prev };
      if (next[id]) { next[id] = { ...next[id], bg: undefined, opacityMode: undefined }; }
      return next;
    });
  }, []);

  const applyButtonTextColor = useCallback((id: string, color: string) => {
    setButtonOverrides(prev => {
      const next = { ...prev, [id]: { ...prev[id], textColor: color } };
      cacheButtonOverrides(next);
      return next;
    });
    setButtonPreviewState(prev => {
      const next = { ...prev };
      if (next[id]) { next[id] = { ...next[id], textColor: undefined }; }
      return next;
    });
  }, []);

  const getButtonOverridesWithPreview = useCallback((): Record<string, ButtonOverride> => {
    if (Object.keys(buttonPreview).length === 0) return buttonOverrides;
    const merged: Record<string, ButtonOverride> = { ...buttonOverrides };
    for (const [id, pv] of Object.entries(buttonPreview)) {
      merged[id] = {
        bg: pv.bg !== undefined ? pv.bg : merged[id]?.bg,
        textColor: pv.textColor !== undefined ? pv.textColor : merged[id]?.textColor,
        opacityMode: pv.opacityMode !== undefined ? pv.opacityMode : merged[id]?.opacityMode,
      };
    }
    return merged;
  }, [buttonOverrides, buttonPreview]);

  const [highlightedButtonId, setHighlightedButtonId] = useState<string | null>(null);
  const locateHandlerRef = useRef<((id: string) => void) | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerLocateHandler = useCallback((handler: ((id: string) => void) | null) => {
    locateHandlerRef.current = handler;
  }, []);

  const locateButton = useCallback((id: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedButtonId(id);
    if (locateHandlerRef.current) locateHandlerRef.current(id);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedButtonId(null);
      highlightTimerRef.current = null;
    }, 3000);
  }, []);

  const [buttonBgSyncSignal, setButtonBgSyncSignal] = useState<{ bg: ZoneBackground; seq: number } | null>(null);
  const syncSeqRef = useRef(0);
  const syncButtonBgFromSaved = useCallback((bg: ZoneBackground) => {
    syncSeqRef.current += 1;
    setButtonBgSyncSignal({ bg, seq: syncSeqRef.current });
  }, []);

  const applyButtonsFromTheme = useCallback((btnOverrides: Record<string, ButtonOverride> | null | undefined) => {
    setButtonOverrides(btnOverrides ?? {});
    cacheButtonOverrides(btnOverrides ?? {});
    setButtonPreviewState({});
    setActiveButtonTargetRaw(null);
  }, []);

  const resetButtonsAll = useCallback(() => {
    setButtonOverrides({});
    cacheButtonOverrides({});
    setButtonPreviewState({});
  }, []);

  return {
    activeButtonTarget, setActiveButtonTarget, setActiveButtonTargetRaw,
    buttonSubTarget, setButtonSubTarget,
    buttonOverrides, buttonPreview,
    setButtonBgPreview, setButtonTextPreview, clearButtonPreview,
    applyButtonBg, applyButtonTextColor, getButtonOverridesWithPreview,
    highlightedButtonId, locateButton, registerLocateHandler,
    buttonBgSyncSignal, syncButtonBgFromSaved,
    applyButtonsFromTheme, resetButtonsAll,
  };
}
