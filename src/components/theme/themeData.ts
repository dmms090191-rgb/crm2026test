import type { Theme } from '../../contexts/ThemeContext';

export interface ThemeEntry {
  value: Theme;
  label: string;
  colors: [string, string, string];
  isGlassCustom?: boolean;
  description: string;
  tags: string[];
  category: ThemeCategory;
}

export type ThemeCategory = 'dark' | 'light' | 'premium' | 'business' | 'glass';

export type ThemeTab = 'all' | 'dark' | 'light' | 'premium' | 'business' | 'glass';

export const THEME_TABS: { key: ThemeTab; label: string; count?: number }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'dark', label: 'Sombres' },
  { key: 'light', label: 'Clairs' },
  { key: 'premium', label: 'Premium' },
  { key: 'business', label: 'Business' },
  { key: 'glass', label: 'Glass' },
];

export const ALL_THEMES: ThemeEntry[] = [
  { value: 'dark', label: 'Midnight Blue', colors: ['#0c1222', '#1a2744', '#3b82f6'], description: 'Theme sombre professionnel aux tons bleu nuit', tags: ['populaire', 'pro'], category: 'dark' },
  { value: 'graphite', label: 'Graphite', colors: ['#1e2024', '#2a2d33', '#6b7280'], description: 'Tons neutres sombres, style minimal', tags: ['minimal'], category: 'dark' },
  { value: 'beige', label: 'Gold Noir', colors: ['#1a150e', '#2c2418', '#c9a55a'], description: 'Noir et or pour un rendu luxueux', tags: ['luxury', 'nouveau'], category: 'premium' },
  { value: 'rose', label: 'Violet Royal', colors: ['#1a0e22', '#2e1840', '#a855f7'], description: 'Tons violets profonds et royaux', tags: ['neon'], category: 'premium' },
  { value: 'emerald', label: 'Emeraude', colors: ['#0a1a12', '#122e1e', '#34d399'], description: 'Vert emeraude premium et profond', tags: ['populaire'], category: 'premium' },
  { value: 'pink', label: 'Rose Neon', colors: ['#1a0a14', '#2e1224', '#ec4899'], description: 'Rose vif sur fond sombre intense', tags: ['neon'], category: 'premium' },
  { value: 'red', label: 'Crimson', colors: ['#1a0a0a', '#2e1212', '#ef4444'], description: 'Rouge intense et dramatique', tags: [], category: 'premium' },
  { value: 'orange', label: 'Ember', colors: ['#1a0f06', '#2e1a0c', '#f97316'], description: 'Orange chaleureux sur fond sombre', tags: [], category: 'premium' },
  { value: 'yellow', label: 'Soleil Noir', colors: ['#1a1806', '#2e280c', '#eab308'], description: 'Jaune dore sur fond sombre', tags: [], category: 'premium' },
  { value: 'light', label: 'Clair Azur', colors: ['#e8f0fe', '#ffffff', '#0ea5e9'], description: 'Theme clair moderne et lumineux', tags: ['populaire'], category: 'light' },
  { value: 'luxury', label: 'Blanc Luxe', colors: ['#f8f5f0', '#ffffff', '#b89b6a'], description: 'Blanc creme elegant avec accents dores', tags: ['luxury'], category: 'light' },
  { value: 'highlevel_light', label: 'HighLevel Clair', colors: ['#f4f7fb', '#ffffff', '#2563eb'], description: 'Style HighLevel professionnel clair', tags: ['pro'], category: 'business' },
  { value: 'highlevel_dark', label: 'HighLevel Nuit', colors: ['#0f172a', '#f3f6fb', '#2563eb'], description: 'Style HighLevel professionnel sombre', tags: ['pro'], category: 'business' },
  { value: 'highlevel_emerald', label: 'HighLevel Champagne', colors: ['#111827', '#f8fafc', '#d4af37'], description: 'Style HighLevel ton champagne premium', tags: ['pro', 'luxury'], category: 'business' },
];

export function getThemesByTab(tab: ThemeTab): ThemeEntry[] {
  if (tab === 'all') return ALL_THEMES;
  return ALL_THEMES.filter(t => t.category === tab);
}

export function getThemesBySearch(query: string): ThemeEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_THEMES;
  return ALL_THEMES.filter(t =>
    t.label.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q)) ||
    t.category.includes(q),
  );
}
