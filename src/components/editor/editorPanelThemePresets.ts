import type { EditorPanelThemeId, EditorPanelTokens } from './editorPanelThemeTypes';

const GRIS: EditorPanelTokens = {
  panel: {
    bg: 'rgba(28,30,42,0.92)',
    border: 'rgba(255,255,255,0.06)',
    shadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
    backdrop: 'blur(24px)',
  },
  header: {
    borderBottom: 'rgba(255,255,255,0.06)',
    title: 'rgba(255,255,255,0.92)',
    iconMuted: 'rgba(255,255,255,0.35)',
  },
  surface: {
    secondary: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.06)',
  },
  text: {
    primary: 'rgba(255,255,255,0.88)',
    secondary: 'rgba(255,255,255,0.50)',
  },
  label: {
    muted: 'rgba(255,255,255,0.35)',
  },
  input: {
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    text: 'rgba(255,255,255,0.88)',
  },
  accent: {
    bg: 'rgba(59,130,246,0.12)',
    bgHover: 'rgba(59,130,246,0.18)',
    border: 'rgba(59,130,246,0.25)',
    text: '#60a5fa',
    solid: '#3b82f6',
  },
  danger: {
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.20)',
    text: '#f87171',
  },
  success: {
    bg: 'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.30)',
    text: '#22c55e',
  },
  swatchBorder: 'rgba(255,255,255,0.15)',
};

const NOIR: EditorPanelTokens = {
  panel: {
    bg: 'rgba(4,4,8,0.97)',
    border: 'rgba(255,255,255,0.05)',
    shadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), 0 0 80px rgba(0,0,0,0.3)',
    backdrop: 'blur(32px) saturate(1.2)',
  },
  header: {
    borderBottom: 'rgba(255,255,255,0.05)',
    title: 'rgba(255,255,255,0.95)',
    iconMuted: 'rgba(255,255,255,0.30)',
  },
  surface: {
    secondary: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.05)',
  },
  text: {
    primary: 'rgba(255,255,255,0.92)',
    secondary: 'rgba(255,255,255,0.50)',
  },
  label: {
    muted: 'rgba(255,255,255,0.32)',
  },
  input: {
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.06)',
    text: 'rgba(255,255,255,0.90)',
  },
  accent: {
    bg: 'rgba(59,130,246,0.10)',
    bgHover: 'rgba(59,130,246,0.16)',
    border: 'rgba(59,130,246,0.22)',
    text: '#60a5fa',
    solid: '#3b82f6',
  },
  danger: {
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.18)',
    text: '#f87171',
  },
  success: {
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
    text: '#22c55e',
  },
  swatchBorder: 'rgba(255,255,255,0.10)',
};

const BLANC: EditorPanelTokens = {
  panel: {
    bg: 'rgba(252,252,253,0.97)',
    border: 'rgba(0,0,0,0.08)',
    shadow: '0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)',
    backdrop: 'blur(24px) saturate(1.1)',
  },
  header: {
    borderBottom: 'rgba(0,0,0,0.06)',
    title: 'rgba(0,0,0,0.88)',
    iconMuted: 'rgba(0,0,0,0.35)',
  },
  surface: {
    secondary: 'rgba(0,0,0,0.03)',
    border: 'rgba(0,0,0,0.07)',
  },
  text: {
    primary: 'rgba(0,0,0,0.85)',
    secondary: 'rgba(0,0,0,0.50)',
  },
  label: {
    muted: 'rgba(0,0,0,0.38)',
  },
  input: {
    bg: 'rgba(0,0,0,0.03)',
    border: 'rgba(0,0,0,0.10)',
    text: 'rgba(0,0,0,0.85)',
  },
  accent: {
    bg: 'rgba(59,130,246,0.08)',
    bgHover: 'rgba(59,130,246,0.14)',
    border: 'rgba(59,130,246,0.20)',
    text: '#2563eb',
    solid: '#3b82f6',
  },
  danger: {
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.16)',
    text: '#dc2626',
  },
  success: {
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.22)',
    text: '#16a34a',
  },
  swatchBorder: 'rgba(0,0,0,0.12)',
};

export const EDITOR_PANEL_THEMES: Record<EditorPanelThemeId, EditorPanelTokens> = {
  gris: GRIS,
  noir: NOIR,
  blanc: BLANC,
};

export const EDITOR_PANEL_THEME_LABELS: Record<EditorPanelThemeId, string> = {
  noir: 'Noir',
  gris: 'Gris',
  blanc: 'Blanc',
};
