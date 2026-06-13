import { useCallback, useState } from 'react';
import type { TypographyOverrides } from './editorModeTypes';
import { loadCachedTypography, cacheTypography, TYPOGRAPHY_DEFAULT_SENTINEL } from './editorModeHelpers';

export function useEditorTypographyState() {
  const [typographyOverrides, setTypographyOverridesRaw] = useState<TypographyOverrides>(loadCachedTypography);
  const [typographyPreview, setTypographyPreviewRaw] = useState<TypographyOverrides>({});
  const [typoTarget, setTypoTargetRaw] = useState<'categories' | 'items' | 'rdr' | null>(null);

  const setTypographyPreview = useCallback((ovr: TypographyOverrides) => {
    setTypographyPreviewRaw(ovr);
  }, []);

  const commitTypography = useCallback(() => {
    setTypographyPreviewRaw(prev => {
      if (prev.categoryFont || prev.itemFont || prev.rdrFont) {
        setTypographyOverridesRaw(cur => {
          const next = { ...cur };
          if (prev.categoryFont === TYPOGRAPHY_DEFAULT_SENTINEL) delete next.categoryFont;
          else if (prev.categoryFont) next.categoryFont = prev.categoryFont;
          if (prev.itemFont === TYPOGRAPHY_DEFAULT_SENTINEL) delete next.itemFont;
          else if (prev.itemFont) next.itemFont = prev.itemFont;
          if (prev.rdrFont === TYPOGRAPHY_DEFAULT_SENTINEL) delete next.rdrFont;
          else if (prev.rdrFont) next.rdrFont = prev.rdrFont;
          cacheTypography(next);
          return next;
        });
      }
      return {};
    });
  }, []);

  const clearTypographyPreview = useCallback(() => {
    setTypographyPreviewRaw({});
  }, []);

  const resetTypography = useCallback((target: 'categories' | 'items' | 'rdr' | 'all') => {
    setTypographyOverridesRaw(cur => {
      const next = { ...cur };
      if (target === 'categories' || target === 'all') delete next.categoryFont;
      if (target === 'items' || target === 'all') delete next.itemFont;
      if (target === 'rdr' || target === 'all') delete next.rdrFont;
      cacheTypography(next);
      return next;
    });
    setTypographyPreviewRaw({});
  }, []);

  const setTypoTarget = useCallback((target: 'categories' | 'items' | 'rdr' | null) => {
    setTypoTargetRaw(target);
  }, []);

  const applyTypographyFromTheme = useCallback((typo: TypographyOverrides | null | undefined) => {
    setTypographyOverridesRaw(typo ?? {});
    cacheTypography(typo ?? {});
    setTypographyPreviewRaw({});
  }, []);

  const resetTypographyAll = useCallback(() => {
    setTypographyOverridesRaw({});
    setTypographyPreviewRaw({});
    cacheTypography({});
  }, []);

  return {
    typographyOverrides, typographyPreview, setTypographyPreview,
    commitTypography, clearTypographyPreview, resetTypography,
    typoTarget, setTypoTarget, setTypoTargetRaw,
    applyTypographyFromTheme, resetTypographyAll,
  };
}
