import type { BgConfig, ColorIsolationState } from './calquer-logo-types';
import { DEFAULT_BG_CONFIG } from './calquer-logo-types';

/** Persistance locale du zoom / pan / fond. Extrait tel quel, aucun changement. */
const STORAGE_KEY = 'calquer-logo-state';

interface SavedState { zoom: number; panX: number; panY: number; bgConfig: BgConfig; }
const DEFAULTS: SavedState = { zoom: 1, panX: 0, panY: 0, bgConfig: DEFAULT_BG_CONFIG };
function loadState(): SavedState {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return { ...DEFAULTS }; return { ...DEFAULTS, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULTS }; }
}
function saveState(s: SavedState) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* */ } }

const DEFAULT_CI: ColorIsolationState = { pickedColor: null, tolerance: 30, selectionMask: null, inverted: false };

export type { SavedState };
export { STORAGE_KEY, DEFAULTS, loadState, saveState, DEFAULT_CI };
