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

export const NEUTRAL_STATUT_CFG = {
  color: '#6b7280',
  bg: 'rgba(107,114,128,0.07)',
  border: 'rgba(107,114,128,0.18)',
  dot: '#9ca3af',
};

export function getStatutCfg(couleur: string, isNeutral?: boolean) {
  if (isNeutral) return NEUTRAL_STATUT_CFG;
  return {
    color: couleur,
    bg: colorWithAlpha(couleur, 0.08),
    border: colorWithAlpha(couleur, 0.22),
    dot: couleur,
  };
}

export const FALLBACK_COLOR = '#38bdf8';

export function getInitials(nom: string, prenom: string) {
  return `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`;
}

export const gradients = [
  'linear-gradient(135deg, #22d3ee, #2563eb)',
  'linear-gradient(135deg, #60a5fa, #1d4ed8)',
  'linear-gradient(135deg, #2dd4bf, #0891b2)',
  'linear-gradient(135deg, #38bdf8, #0284c7)',
  'linear-gradient(135deg, #34d399, #0d9488)',
];
