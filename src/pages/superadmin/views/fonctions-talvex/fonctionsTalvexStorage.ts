export const LS_KEY_CAT = 'talvex_fn_categories';
export const LS_KEY_FN = 'talvex_fn_fonctions';

export function loadState<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); if (v) return JSON.parse(v); } catch { /* ignore */ }
  return fallback;
}

export function saveState<T>(key: string, v: T) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}
