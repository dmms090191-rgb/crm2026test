import { SANS_FONTS, SERIF_FONTS, DISPLAY_FONTS, MONO_FONTS, HANDWRITING_FONTS } from './editorFontData';

export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';

export interface FontEntry {
  name: string;
  category: FontCategory;
}

export type FontFilterId = FontCategory | 'all' | 'favorites';

export const FONT_CATEGORIES: { id: FontFilterId; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'favorites', label: 'Favoris' },
  { id: 'sans-serif', label: 'Sans-serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'monospace', label: 'Mono' },
  { id: 'handwriting', label: 'Manuscrites' },
];

const FAVORITES_KEY = 'talvex_editor_font_favorites';

export function loadFontFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((s): s is string => typeof s === 'string'));
  } catch { /* ignore */ }
  return new Set();
}

export function saveFontFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch { /* ignore */ }
}

function buildList(): FontEntry[] {
  const entries: FontEntry[] = [];
  for (const n of SANS_FONTS) entries.push({ name: n, category: 'sans-serif' });
  for (const n of SERIF_FONTS) entries.push({ name: n, category: 'serif' });
  for (const n of DISPLAY_FONTS) entries.push({ name: n, category: 'display' });
  for (const n of MONO_FONTS) entries.push({ name: n, category: 'monospace' });
  for (const n of HANDWRITING_FONTS) entries.push({ name: n, category: 'handwriting' });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

export const FONT_LIST: FontEntry[] = buildList();

const CATEGORY_LABELS: Record<FontCategory, string> = {
  'sans-serif': 'Sans',
  'serif': 'Serif',
  'display': 'Display',
  'monospace': 'Mono',
  'handwriting': 'Script',
};

export function getCategoryLabel(cat: FontCategory): string {
  return CATEGORY_LABELS[cat];
}
