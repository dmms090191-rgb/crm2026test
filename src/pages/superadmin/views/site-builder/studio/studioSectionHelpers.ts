import type { GradientConfig, LocalEdits, CanvasBg, CanvasGradient, CanvasPageHeight, CanvasBgMode, BgMode } from './studioSectionTypes';
import { DEFAULT_CANVAS_BG, DIRECTION_POSITIONS, DEFAULT_PAGE_HEIGHT, DEFAULT_MOBILE_HEIGHT } from './studioSectionTypes';
import type { Dispatch, SetStateAction } from 'react';

export function normalizeGradient(g: unknown): GradientConfig | null {
  if (!g || typeof g !== 'object') return null;
  const raw = g as Record<string, unknown>;
  if (!raw.color1 || !raw.color2) return null;
  const rawDir = raw.direction as string | undefined;
  const migratedDir = rawDir === 'horizontal' ? 'right' : rawDir === 'vertical' ? 'bottom' : rawDir;
  const direction = (migratedDir as GradientConfig['direction']) ?? 'bottom';
  const positions = DIRECTION_POSITIONS[direction] ?? DIRECTION_POSITIONS.bottom;
  const result: GradientConfig = {
    color1: raw.color1 as string,
    color2: raw.color2 as string,
    direction,
    strength: typeof raw.strength === 'number' ? raw.strength
      : typeof raw.intensity === 'number' ? raw.intensity
      : raw.intensity === 'soft' ? 20
      : raw.intensity === 'strong' ? 80
      : 50,
    balance: typeof raw.balance === 'number' ? raw.balance : 50,
    showGuideLine: (raw.showGuideLine as boolean) ?? false,
    showBalanceLine: (raw.showBalanceLine as boolean) ?? false,
    startX: typeof raw.startX === 'number' ? raw.startX : positions.startX,
    startY: typeof raw.startY === 'number' ? raw.startY : positions.startY,
    endX: typeof raw.endX === 'number' ? raw.endX : positions.endX,
    endY: typeof raw.endY === 'number' ? raw.endY : positions.endY,
  };
  return result;
}

export function buildCanvasBgValues(
  localEdits: LocalEdits,
  dbCanvasBg: CanvasBg,
) {
  const canvasBgDesktop = localEdits.canvasBg?.desktop !== undefined
    ? (localEdits.canvasBg.desktop ?? DEFAULT_CANVAS_BG)
    : (dbCanvasBg.desktop ?? DEFAULT_CANVAS_BG);

  const canvasBgMobile = localEdits.canvasBg?.mobile !== undefined
    ? (localEdits.canvasBg.mobile ?? DEFAULT_CANVAS_BG)
    : (dbCanvasBg.mobile ?? DEFAULT_CANVAS_BG);

  return { canvasBgDesktop, canvasBgMobile };
}

export function buildGradientValues(
  localEdits: LocalEdits,
  dbCanvasGradient: CanvasGradient,
) {
  const gradientDesktop: GradientConfig | null =
    localEdits.canvasGradient?.desktop !== undefined
      ? localEdits.canvasGradient.desktop
      : dbCanvasGradient.desktop;

  const gradientMobile: GradientConfig | null =
    localEdits.canvasGradient?.mobile !== undefined
      ? localEdits.canvasGradient.mobile
      : dbCanvasGradient.mobile;

  return { gradientDesktop, gradientMobile };
}

export function createCanvasBgSetters(setLocalEdits: Dispatch<SetStateAction<LocalEdits>>) {
  const setCanvasBgDesktop = (color: string) => {
    setLocalEdits(prev => ({
      ...prev,
      canvasBg: { ...(prev.canvasBg ?? {}), desktop: color },
    }));
  };

  const setCanvasBgMobile = (color: string) => {
    setLocalEdits(prev => ({
      ...prev,
      canvasBg: { ...(prev.canvasBg ?? {}), mobile: color },
    }));
  };

  const resetCanvasBg = (mode: 'desktop' | 'mobile') => {
    setLocalEdits(prev => ({
      ...prev,
      canvasBg: { ...(prev.canvasBg ?? {}), [mode]: DEFAULT_CANVAS_BG },
    }));
  };

  return { setCanvasBgDesktop, setCanvasBgMobile, resetCanvasBg };
}

export function createGradientSetters(setLocalEdits: Dispatch<SetStateAction<LocalEdits>>) {
  const setGradientDesktop = (gradient: GradientConfig | null) => {
    setLocalEdits(prev => ({
      ...prev,
      canvasGradient: { ...(prev.canvasGradient ?? {}), desktop: gradient },
    }));
  };

  const setGradientMobile = (gradient: GradientConfig | null) => {
    setLocalEdits(prev => ({
      ...prev,
      canvasGradient: { ...(prev.canvasGradient ?? {}), mobile: gradient },
    }));
  };

  const resetGradient = (mode: 'desktop' | 'mobile') => {
    setLocalEdits(prev => ({
      ...prev,
      canvasGradient: { ...(prev.canvasGradient ?? {}), [mode]: null },
    }));
  };

  return { setGradientDesktop, setGradientMobile, resetGradient };
}

export function buildPageHeightValues(
  localEdits: LocalEdits,
  dbPageHeight: CanvasPageHeight,
) {
  const pageHeightDesktop = localEdits.canvasPageHeight?.desktop !== undefined
    ? (localEdits.canvasPageHeight.desktop ?? DEFAULT_PAGE_HEIGHT)
    : (dbPageHeight.desktop ?? DEFAULT_PAGE_HEIGHT);

  const pageHeightMobile = localEdits.canvasPageHeight?.mobile !== undefined
    ? (localEdits.canvasPageHeight.mobile ?? DEFAULT_MOBILE_HEIGHT)
    : (dbPageHeight.mobile ?? DEFAULT_MOBILE_HEIGHT);

  return { pageHeightDesktop, pageHeightMobile };
}

export function createPageHeightSetters(setLocalEdits: Dispatch<SetStateAction<LocalEdits>>) {
  const setPageHeightDesktop = (h: number) => {
    setLocalEdits(prev => ({
      ...prev,
      canvasPageHeight: { ...(prev.canvasPageHeight ?? {}), desktop: h },
    }));
  };

  const setPageHeightMobile = (h: number) => {
    setLocalEdits(prev => ({
      ...prev,
      canvasPageHeight: { ...(prev.canvasPageHeight ?? {}), mobile: h },
    }));
  };

  return { setPageHeightDesktop, setPageHeightMobile };
}

function parseBgMode(val: unknown): BgMode {
  if (val === 'solid' || val === 'gradient') return val;
  return 'default';
}

export function buildBgModeValues(
  localEdits: LocalEdits,
  dbBgMode: CanvasBgMode,
) {
  const bgModeDesktop: BgMode = localEdits.canvasBgMode?.desktop !== undefined
    ? localEdits.canvasBgMode.desktop
    : dbBgMode.desktop;

  const bgModeMobile: BgMode = localEdits.canvasBgMode?.mobile !== undefined
    ? localEdits.canvasBgMode.mobile
    : dbBgMode.mobile;

  return { bgModeDesktop, bgModeMobile };
}

export function createBgModeSetters(setLocalEdits: Dispatch<SetStateAction<LocalEdits>>) {
  const setBgModeDesktop = (mode: BgMode) => {
    setLocalEdits(prev => ({
      ...prev,
      canvasBgMode: { ...(prev.canvasBgMode ?? {}), desktop: mode },
    }));
  };

  const setBgModeMobile = (mode: BgMode) => {
    setLocalEdits(prev => ({
      ...prev,
      canvasBgMode: { ...(prev.canvasBgMode ?? {}), mobile: mode },
    }));
  };

  return { setBgModeDesktop, setBgModeMobile };
}

export { parseBgMode };
