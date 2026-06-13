import { useCallback, useState } from 'react';
import type { CardOverride, CardTarget, ZoneBackground } from './editorModeTypes';
import { loadCachedCardOverrides, cacheCardOverrides } from './editorModeHelpers';

export function useEditorCardsState() {
  const [activeCardTarget, setActiveCardTargetRaw] = useState<CardTarget | null>(null);
  const [cardOverrides, setCardOverrides] = useState<Record<string, CardOverride>>(loadCachedCardOverrides);
  const [cardPreview, setCardPreviewState] = useState<Record<string, CardOverride>>({});

  const setActiveCardTarget = useCallback((target: CardTarget | null) => {
    setActiveCardTargetRaw(target);
    setCardPreviewState({});
  }, []);

  const setCardBgPreview = useCallback((target: CardTarget, bg: ZoneBackground) => {
    setCardPreviewState(prev => ({ ...prev, [target]: { ...prev[target], bg } }));
  }, []);

  const clearCardPreview = useCallback(() => { setCardPreviewState({}); }, []);

  const applyCardBg = useCallback((target: CardTarget, bg: ZoneBackground) => {
    setCardOverrides(prev => {
      const next = { ...prev, [target]: { ...prev[target], bg } };
      cacheCardOverrides(next);
      return next;
    });
    setCardPreviewState(prev => {
      const next = { ...prev };
      if (next[target]) next[target] = { ...next[target], bg: undefined };
      return next;
    });
  }, []);

  const getCardOverridesWithPreview = useCallback((): Record<string, CardOverride> => {
    if (Object.keys(cardPreview).length === 0) return cardOverrides;
    const merged: Record<string, CardOverride> = { ...cardOverrides };
    for (const [k, pv] of Object.entries(cardPreview)) {
      merged[k] = { bg: pv.bg !== undefined ? pv.bg : merged[k]?.bg };
    }
    return merged;
  }, [cardOverrides, cardPreview]);

  const applyCardsFromTheme = useCallback((cardOvr: Record<string, CardOverride> | null | undefined) => {
    setCardOverrides(cardOvr ?? {});
    cacheCardOverrides(cardOvr ?? {});
    setCardPreviewState({});
    setActiveCardTargetRaw(null);
  }, []);

  const resetCardsAll = useCallback(() => {
    setCardOverrides({});
    cacheCardOverrides({});
    setCardPreviewState({});
  }, []);

  return {
    activeCardTarget, setActiveCardTarget, setActiveCardTargetRaw,
    cardOverrides, cardPreview,
    setCardBgPreview, clearCardPreview, applyCardBg, getCardOverridesWithPreview,
    applyCardsFromTheme, resetCardsAll,
  };
}
