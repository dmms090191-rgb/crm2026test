const LS_POSITIONS_KEY = 'talvex_editor_panel_positions';

export function loadPositionsFromLocalStorage(): Record<string, { x: number; y: number }> | null {
  try {
    const raw = localStorage.getItem(LS_POSITIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function savePositionsToLocalStorage(pos: Record<string, { x: number; y: number }>): void {
  try {
    localStorage.setItem(LS_POSITIONS_KEY, JSON.stringify(pos));
  } catch {}
}
