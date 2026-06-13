import type { EditorZone, ZoneBackground, TypographyOverrides, ButtonOverride, BgImageFitMode, CardOverride } from './editorModeTypes';

let editorScopePrefix = 'sa';
export function setEditorScopePrefix(prefix: string): void {
  editorScopePrefix = prefix || 'sa';
}
export function getEditorScopePrefix(): string {
  return editorScopePrefix;
}
function k(base: string): string {
  return `${base}__${editorScopePrefix}`;
}

const LS_ZONE_OVERRIDES = 'talvex_editor_zone_overrides';
const LS_TEXT_OVERRIDES = 'talvex_editor_text_overrides';
const LS_BG_IMAGE = 'talvex_editor_bg_image';
const LS_BG_IMAGE_ZOOM = 'talvex_editor_bg_image_zoom';

const EMPTY: Record<EditorZone, ZoneBackground | null> = {
  zone1: null, zone2: null, zone3: null, zone4: null,
};

export function loadCachedZoneOverrides(): Record<EditorZone, ZoneBackground | null> {
  try {
    const raw = localStorage.getItem(k(LS_ZONE_OVERRIDES));
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...EMPTY };
}

export function loadCachedTextOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(k(LS_TEXT_OVERRIDES));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function cacheZoneOverrides(overrides: Record<EditorZone, ZoneBackground | null>): void {
  try {
    const hasAny = Object.values(overrides).some(Boolean);
    if (hasAny) localStorage.setItem(k(LS_ZONE_OVERRIDES), JSON.stringify(overrides));
    else localStorage.removeItem(k(LS_ZONE_OVERRIDES));
  } catch { /* ignore */ }
}

export function cacheTextOverrides(overrides: Record<string, string>): void {
  try {
    if (Object.keys(overrides).length > 0) localStorage.setItem(k(LS_TEXT_OVERRIDES), JSON.stringify(overrides));
    else localStorage.removeItem(k(LS_TEXT_OVERRIDES));
  } catch { /* ignore */ }
}

export function loadCachedBgImage(): string | null {
  try {
    return localStorage.getItem(k(LS_BG_IMAGE)) || null;
  } catch { /* ignore */ }
  return null;
}

export function cacheBgImage(url: string | null): void {
  try {
    if (url) localStorage.setItem(k(LS_BG_IMAGE), url);
    else localStorage.removeItem(k(LS_BG_IMAGE));
  } catch { /* ignore */ }
}

export function loadCachedBgImageZoom(): number {
  try {
    const raw = localStorage.getItem(k(LS_BG_IMAGE_ZOOM));
    if (raw) {
      const v = Number(raw);
      if (v >= 50 && v <= 200) return v;
    }
  } catch { /* ignore */ }
  return 100;
}

export function cacheBgImageZoom(zoom: number): void {
  try {
    if (zoom !== 100) localStorage.setItem(k(LS_BG_IMAGE_ZOOM), String(zoom));
    else localStorage.removeItem(k(LS_BG_IMAGE_ZOOM));
  } catch { /* ignore */ }
}

const LS_BG_IMAGE_POS = 'talvex_editor_bg_image_pos';

export function loadCachedBgImagePosition(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(k(LS_BG_IMAGE_POS));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
    }
  } catch { /* ignore */ }
  return { x: 0, y: 0 };
}

export function cacheBgImagePosition(x: number, y: number): void {
  try {
    if (x !== 0 || y !== 0) localStorage.setItem(k(LS_BG_IMAGE_POS), JSON.stringify({ x, y }));
    else localStorage.removeItem(k(LS_BG_IMAGE_POS));
  } catch { /* ignore */ }
}

const LS_BG_IMAGE_FIT = 'talvex_editor_bg_image_fit';

export function loadCachedBgImageFit(): BgImageFitMode {
  try {
    const raw = localStorage.getItem(k(LS_BG_IMAGE_FIT));
    if (raw === 'cover' || raw === 'contain' || raw === 'fill') return raw;
  } catch { /* ignore */ }
  return 'cover';
}

export function cacheBgImageFit(fit: BgImageFitMode): void {
  try {
    if (fit !== 'cover') localStorage.setItem(k(LS_BG_IMAGE_FIT), fit);
    else localStorage.removeItem(k(LS_BG_IMAGE_FIT));
  } catch { /* ignore */ }
}

const LS_TYPOGRAPHY = 'talvex_editor_typography';

export function loadCachedTypography(): TypographyOverrides {
  try {
    const raw = localStorage.getItem(k(LS_TYPOGRAPHY));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function cacheTypography(overrides: TypographyOverrides): void {
  try {
    const hasAny = overrides.categoryFont || overrides.itemFont || overrides.rdrFont;
    if (hasAny) localStorage.setItem(k(LS_TYPOGRAPHY), JSON.stringify(overrides));
    else localStorage.removeItem(k(LS_TYPOGRAPHY));
  } catch { /* ignore */ }
}

const LS_BUTTON_OVERRIDES = 'talvex_editor_button_overrides';

export function loadCachedButtonOverrides(): Record<string, ButtonOverride> {
  try {
    const raw = localStorage.getItem(k(LS_BUTTON_OVERRIDES));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function cacheButtonOverrides(overrides: Record<string, ButtonOverride>): void {
  try {
    if (Object.keys(overrides).length > 0) localStorage.setItem(k(LS_BUTTON_OVERRIDES), JSON.stringify(overrides));
    else localStorage.removeItem(k(LS_BUTTON_OVERRIDES));
  } catch { /* ignore */ }
}

const LS_CARD_OVERRIDES = 'talvex_editor_card_overrides';

export function loadCachedCardOverrides(): Record<string, CardOverride> {
  try {
    const raw = localStorage.getItem(k(LS_CARD_OVERRIDES));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function cacheCardOverrides(overrides: Record<string, CardOverride>): void {
  try {
    if (Object.keys(overrides).length > 0) localStorage.setItem(k(LS_CARD_OVERRIDES), JSON.stringify(overrides));
    else localStorage.removeItem(k(LS_CARD_OVERRIDES));
  } catch { /* ignore */ }
}

export const TYPOGRAPHY_DEFAULT_SENTINEL = '__default__';

export function resolveTypography(
  target: 'category' | 'item' | 'rdr',
  overrides: TypographyOverrides,
  preview: TypographyOverrides,
): string | undefined {
  const key = target === 'category' ? 'categoryFont' : target === 'item' ? 'itemFont' : 'rdrFont';
  const previewVal = preview[key];
  if (previewVal === TYPOGRAPHY_DEFAULT_SENTINEL) return undefined;
  return previewVal || overrides[key] || undefined;
}

export function resolveTextColor(
  key: string,
  overrides: Record<string, string>,
  preview: Record<string, string>,
): string | undefined {
  return preview[key] || overrides[key] || undefined;
}

export function resolveZoneEffective(
  zone: EditorZone,
  overrides: Record<EditorZone, ZoneBackground | null>,
  preview: { zone: EditorZone; bg: ZoneBackground } | null,
): string | undefined {
  const bg = (preview && preview.zone === zone) ? preview.bg : overrides[zone];
  return bg ? resolveZoneBg(bg) : undefined;
}

export function resolveZoneBg(bg: ZoneBackground): string {
  if (bg.type === 'solid') {
    const c = bg.color || '#000000';
    const o = bg.opacity ?? 1;
    if (o < 1) {
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${o})`;
    }
    return c;
  }
  if (bg.type === 'gradient' && bg.gradient) {
    const { color1, color2, direction } = bg.gradient;
    return `linear-gradient(${direction}deg, ${color1}, ${color2})`;
  }
  return 'transparent';
}
