import { useCallback, useState } from 'react';
import type { BgImageFitMode } from './editorModeTypes';
import {
  loadCachedBgImage, cacheBgImage,
  loadCachedBgImageZoom, cacheBgImageZoom,
  loadCachedBgImagePosition, cacheBgImagePosition,
  loadCachedBgImageFit, cacheBgImageFit,
} from './editorModeHelpers';

export function useEditorBgImageState() {
  const [backgroundImage, setBackgroundImageRaw] = useState<string | null>(loadCachedBgImage);
  const [backgroundImageZoom, setBackgroundImageZoomRaw] = useState<number>(loadCachedBgImageZoom);
  const cachedPos = loadCachedBgImagePosition();
  const [backgroundImagePositionX, setBgPosXRaw] = useState<number>(cachedPos.x);
  const [backgroundImagePositionY, setBgPosYRaw] = useState<number>(cachedPos.y);
  const [backgroundImageFit, setBgImageFitRaw] = useState<BgImageFitMode>(loadCachedBgImageFit);

  const setBackgroundImage = useCallback((url: string | null) => {
    setBackgroundImageRaw(url);
    cacheBgImage(url);
    setBackgroundImageZoomRaw(100);
    cacheBgImageZoom(100);
    setBgPosXRaw(0);
    setBgPosYRaw(0);
    cacheBgImagePosition(0, 0);
    setBgImageFitRaw('cover');
    cacheBgImageFit('cover');
  }, []);

  const setBackgroundImageZoom = useCallback((zoom: number) => {
    setBackgroundImageZoomRaw(zoom);
    cacheBgImageZoom(zoom);
  }, []);

  const setBackgroundImagePosition = useCallback((x: number, y: number) => {
    setBgPosXRaw(x);
    setBgPosYRaw(y);
    cacheBgImagePosition(x, y);
  }, []);

  const setBackgroundImageFit = useCallback((fit: BgImageFitMode) => {
    setBgImageFitRaw(fit);
    cacheBgImageFit(fit);
  }, []);

  const resetBgImageAll = useCallback(() => {
    setBackgroundImageRaw(null);
    cacheBgImage(null);
    setBackgroundImageZoomRaw(100);
    cacheBgImageZoom(100);
    setBgPosXRaw(0);
    setBgPosYRaw(0);
    cacheBgImagePosition(0, 0);
    setBgImageFitRaw('cover');
    cacheBgImageFit('cover');
  }, []);

  const applyBgImageFromTheme = useCallback((bgImage: string | null | undefined, zoom?: number | null, posX?: number | null, posY?: number | null, fit?: BgImageFitMode | null) => {
    setBackgroundImageRaw(bgImage ?? null);
    cacheBgImage(bgImage ?? null);
    const z = (zoom != null && zoom >= 50 && zoom <= 200) ? zoom : 100;
    setBackgroundImageZoomRaw(z);
    cacheBgImageZoom(z);
    const x = (posX != null && typeof posX === 'number') ? posX : 0;
    const y = (posY != null && typeof posY === 'number') ? posY : 0;
    setBgPosXRaw(x);
    setBgPosYRaw(y);
    cacheBgImagePosition(x, y);
    const f: BgImageFitMode = (fit === 'contain' || fit === 'fill') ? fit : 'cover';
    setBgImageFitRaw(f);
    cacheBgImageFit(f);
  }, []);

  return {
    backgroundImage, setBackgroundImage,
    backgroundImageZoom, setBackgroundImageZoom,
    backgroundImagePositionX, backgroundImagePositionY, setBackgroundImagePosition,
    backgroundImageFit, setBackgroundImageFit,
    resetBgImageAll, applyBgImageFromTheme,
  };
}
