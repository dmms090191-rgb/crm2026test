import type { Theme } from '../../contexts/ThemeContext';

export interface ThemeEntry {
  value: Theme;
  label: string;
  colors: [string, string, string];
}

export type ThemeTab = 'sombres' | 'clairs' | 'premium' | 'highlevel';

export const THEME_TABS: { key: ThemeTab; label: string }[] = [
  { key: 'sombres', label: 'Sombres' },
  { key: 'clairs', label: 'Clairs' },
  { key: 'premium', label: 'Premium' },
  { key: 'highlevel', label: 'HighLevel' },
];

const sombres: ThemeEntry[] = [
  { value: 'dark', label: 'Sombre', colors: ['#0c1222', '#1a2744', '#3b82f6'] },
  { value: 'graphite', label: 'Graphite', colors: ['#1e2024', '#2a2d33', '#6b7280'] },
];

const clairs: ThemeEntry[] = [
  { value: 'light', label: 'Clair', colors: ['#e8f0fe', '#ffffff', '#0ea5e9'] },
  { value: 'luxury', label: 'Blanc Luxe', colors: ['#f8f5f0', '#ffffff', '#b89b6a'] },
];

const premium: ThemeEntry[] = [
  { value: 'beige', label: 'Beige Premium', colors: ['#1a150e', '#2c2418', '#c9a55a'] },
  { value: 'rose', label: 'Violet Royal', colors: ['#1a0e22', '#2e1840', '#a855f7'] },
  { value: 'emerald', label: 'Vert Emeraude', colors: ['#0a1a12', '#122e1e', '#34d399'] },
  { value: 'pink', label: 'Rose Premium', colors: ['#1a0a14', '#2e1224', '#ec4899'] },
  { value: 'red', label: 'Rouge Premium', colors: ['#1a0a0a', '#2e1212', '#ef4444'] },
  { value: 'orange', label: 'Orange Premium', colors: ['#1a0f06', '#2e1a0c', '#f97316'] },
  { value: 'yellow', label: 'Jaune Premium', colors: ['#1a1806', '#2e280c', '#eab308'] },
];

const highlevel: ThemeEntry[] = [
  { value: 'highlevel_light', label: 'HighLevel Clair', colors: ['#f4f7fb', '#ffffff', '#2563eb'] },
  { value: 'highlevel_dark', label: 'HighLevel Bleu Nuit', colors: ['#0f172a', '#f3f6fb', '#2563eb'] },
  { value: 'highlevel_emerald', label: 'HighLevel Champagne Gold', colors: ['#111827', '#f8fafc', '#d4af37'] },
];

export const THEME_MAP: Record<ThemeTab, ThemeEntry[]> = {
  sombres,
  clairs,
  premium,
  highlevel,
};
