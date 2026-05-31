export interface SavedLogo {
  id: string;
  url: string;
  file_name: string;
  is_active: boolean;
  is_favorite: boolean;
  position: number;
  created_at: string;
  generation_group_id?: string | null;
}

export type ReorderEntry =
  | { type: 'single'; logo: SavedLogo }
  | { type: 'group'; logos: SavedLogo[]; groupId: string };

export type GalleryEntry =
  | { type: 'single'; logo: SavedLogo; entryIdx: number }
  | { type: 'group'; logos: SavedLogo[]; groupId: string; entryIdx: number };

export type GalleryFilter = 'all' | 'favorites' | 'selection';
export type LogoTypeFilter = 'both' | 'logo' | 'icon';

export function isIconFileName(name: string | null | undefined): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.startsWith('icone application') || lower.startsWith('icône application');
}

export const CHECKER_BG = `linear-gradient(45deg,rgba(255,255,255,0.03) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.03) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,0.03) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,0.03) 75%)`;

export const ZOOM_MIN = 25;
export const ZOOM_MAX = 400;
export const ZOOM_STEP = 25;
export const ZOOM_DEFAULT = 100;

export const PREVIEW_BG_KEY = 'talvex_logo_preview_bg';
export const CUSTOM_COLORS_KEY = 'talvex_logo_custom_colors';

export const PREVIEW_BG_PRESETS: { label: string; value: string; border?: string }[] = [
  { label: 'Blanc', value: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)' },
  { label: 'Gris clair', value: '#F3F4F6' },
  { label: 'Gris', value: '#9CA3AF' },
  { label: 'Noir', value: '#111111' },
  { label: 'Bleu nuit', value: '#0F172A' },
  { label: 'Dore', value: '#D4A843' },
];

export function loadCustomColors(): string[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_COLORS_KEY) ?? '[]'); } catch { return []; }
}

export function saveCustomColors(colors: string[]) {
  try { localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors.slice(0, 12))); } catch { /* no-op */ }
}
