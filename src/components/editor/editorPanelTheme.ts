export type { EditorPanelThemeId, EditorPanelTokens, CustomPanelPalette } from './editorPanelThemeTypes';
import type { EditorPanelThemeId, EditorPanelTokens, CustomPanelPalette } from './editorPanelThemeTypes';
import { EDITOR_PANEL_THEMES, EDITOR_PANEL_THEME_LABELS } from './editorPanelThemePresets';
import { getEditorScopePrefix } from '../../contexts/editorModeHelpers';
export { EDITOR_PANEL_THEMES, EDITOR_PANEL_THEME_LABELS };

const LS_KEY = 'talvex_editor_panel_theme';
const LS_PALETTE_KEY = 'talvex_editor_panel_palette';

function sk(base: string): string {
  return `${base}__${getEditorScopePrefix()}`;
}

export function loadEditorPanelTheme(): EditorPanelThemeId {
  try {
    const v = localStorage.getItem(sk(LS_KEY));
    if (v === 'noir' || v === 'gris' || v === 'blanc') return v;
  } catch {}
  return 'gris';
}

export function saveEditorPanelTheme(id: EditorPanelThemeId): void {
  try {
    localStorage.setItem(sk(LS_KEY), id);
  } catch {}
}

export const DEFAULT_PANEL_PALETTE: CustomPanelPalette | null = null;

export const PRESET_PALETTES: { id: EditorPanelThemeId; label: string; palette: CustomPanelPalette }[] = [
  { id: 'noir', label: 'Noir', palette: { background: '#04040a', surface: '#111118', accent: '#3b82f6' } },
  { id: 'gris', label: 'Gris', palette: { background: '#1c1e2a', surface: '#252838', accent: '#3b82f6' } },
  { id: 'blanc', label: 'Blanc', palette: { background: '#fcfcfd', surface: '#f3f4f6', accent: '#3b82f6' } },
];

export function loadCustomPanelPalette(): CustomPanelPalette | null {
  try {
    const raw = localStorage.getItem(sk(LS_PALETTE_KEY));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && typeof obj.background === 'string' && typeof obj.surface === 'string' && typeof obj.accent === 'string') return obj;
  } catch {}
  return null;
}

export function saveCustomPanelPalette(palette: CustomPanelPalette | null): void {
  try {
    if (palette) localStorage.setItem(sk(LS_PALETTE_KEY), JSON.stringify(palette));
    else localStorage.removeItem(sk(LS_PALETTE_KEY));
  } catch {}
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function buildPaletteTokens(palette: CustomPanelPalette): EditorPanelTokens {
  const { background, surface, accent } = palette;
  const isLight = luminance(background) > 0.5;
  const fg = isLight ? 'rgba(0,0,0,' : 'rgba(255,255,255,';
  const bdr = isLight ? 'rgba(0,0,0,' : 'rgba(255,255,255,';
  const { r: ar, g: ag, b: ab } = hexToRgb(accent);
  const { r: sr, g: sg, b: sb } = hexToRgb(surface);
  const accentRgba = (a: number) => `rgba(${ar},${ag},${ab},${a})`;
  const surfaceRgba = (a: number) => `rgba(${sr},${sg},${sb},${a})`;

  return {
    panel: {
      bg: background,
      border: `${bdr}${isLight ? '0.08' : '0.06'})`,
      shadow: isLight
        ? '0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)'
        : '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
      backdrop: 'blur(24px)',
    },
    header: {
      borderBottom: `${bdr}${isLight ? '0.06' : '0.06'})`,
      title: `${fg}${isLight ? '0.88' : '0.92'})`,
      iconMuted: `${fg}0.35)`,
    },
    surface: {
      secondary: surfaceRgba(isLight ? 0.5 : 0.18),
      border: `${bdr}${isLight ? '0.07' : '0.06'})`,
    },
    text: {
      primary: `${fg}${isLight ? '0.85' : '0.88'})`,
      secondary: `${fg}0.50)`,
    },
    label: {
      muted: `${fg}${isLight ? '0.38' : '0.35'})`,
    },
    input: {
      bg: surfaceRgba(isLight ? 0.4 : 0.12),
      border: `${bdr}${isLight ? '0.10' : '0.08'})`,
      text: `${fg}${isLight ? '0.85' : '0.88'})`,
    },
    accent: {
      bg: accentRgba(isLight ? 0.08 : 0.12),
      bgHover: accentRgba(isLight ? 0.14 : 0.18),
      border: accentRgba(isLight ? 0.20 : 0.25),
      text: accent,
      solid: accent,
    },
    danger: {
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.20)',
      text: isLight ? '#dc2626' : '#f87171',
    },
    success: {
      bg: 'rgba(34,197,94,0.15)',
      border: 'rgba(34,197,94,0.30)',
      text: isLight ? '#16a34a' : '#22c55e',
    },
    swatchBorder: `${bdr}${isLight ? '0.12' : '0.15'})`,
  };
}

export function getEditorPanelTokens(id: EditorPanelThemeId, palette?: CustomPanelPalette | null): EditorPanelTokens {
  if (palette) return buildPaletteTokens(palette);
  return EDITOR_PANEL_THEMES[id];
}
