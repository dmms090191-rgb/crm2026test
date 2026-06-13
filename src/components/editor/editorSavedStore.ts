import type { ZoneBackground } from '../../contexts/EditorModeContext';

export interface SavedColor {
  id: string;
  bg: ZoneBackground;
}

const LS_KEY_SOLIDS = 'editor_saved_solids';
const LS_KEY_GRADIENTS = 'editor_saved_gradients';

export function loadSavedSolids(): SavedColor[] {
  try {
    const raw = localStorage.getItem(LS_KEY_SOLIDS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function loadSavedGradients(): SavedColor[] {
  try {
    const raw = localStorage.getItem(LS_KEY_GRADIENTS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function persistSolids(items: SavedColor[]) {
  localStorage.setItem(LS_KEY_SOLIDS, JSON.stringify(items));
}

export function persistGradients(items: SavedColor[]) {
  localStorage.setItem(LS_KEY_GRADIENTS, JSON.stringify(items));
}
