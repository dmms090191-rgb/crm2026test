export interface Statut {
  id: string;
  nom: string;
  couleur: string;
  created_at: string;
}

export const PRESET_COLORS = [
  '#38bdf8', '#22d3ee', '#34d399', '#4ade80',
  '#fbbf24', '#f97316', '#f87171', '#fb7185',
  '#a78bfa', '#818cf8', '#e879f9', '#94a3b8',
];

export const MAX_FAVORITES = 6;
export const FAVORITES_KEY = 'statuts_favorite_colors';

export function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export function colorWithAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
