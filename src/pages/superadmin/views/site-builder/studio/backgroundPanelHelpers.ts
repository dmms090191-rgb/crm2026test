const MAX_CUSTOM = 4;
const CUSTOM_KEY = 'talvex_studio_saved_background_colors';

export { MAX_CUSTOM };

export function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export function loadCustomColors(): (string | null)[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return Array(MAX_CUSTOM).fill(null);
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return Array(MAX_CUSTOM).fill(null);
    const result: (string | null)[] = arr
      .slice(0, MAX_CUSTOM)
      .map((c: unknown) => (typeof c === 'string' && isValidHex(c) ? c : null));
    while (result.length < MAX_CUSTOM) result.push(null);
    return result;
  } catch {
    return Array(MAX_CUSTOM).fill(null);
  }
}

export function saveCustomColors(colors: (string | null)[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(colors.slice(0, MAX_CUSTOM)));
  } catch { /* */ }
}

export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export function hasEyeDropper(): boolean {
  return typeof window !== 'undefined' && 'EyeDropper' in window;
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}
