import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_HISTORY = 15;

interface StoredState {
  activeId: string | null;
  history: string[];
  index: number;
  enabled: boolean;
}

function loadState(key: string): StoredState | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      Array.isArray(parsed.history) &&
      typeof parsed.index === 'number'
    ) {
      return parsed as StoredState;
    }
  } catch { /* ignore corrupt data */ }
  return null;
}

function saveState(key: string, state: StoredState) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

export function useWorkMode(storageKey: string) {
  const [enabled, setEnabled] = useState(() => {
    const s = loadState(storageKey);
    return s ? s.enabled : false;
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    const s = loadState(storageKey);
    return s ? s.activeId : null;
  });
  const historyRef = useRef<string[]>([]);
  const indexRef = useRef<number>(-1);
  const keyRef = useRef(storageKey);

  // Initialize refs properly (useRef with function initializer doesn't call the fn)
  const didInit = useRef(false);
  if (!didInit.current) {
    didInit.current = true;
    const s = loadState(storageKey);
    if (s) {
      historyRef.current = s.history.slice(0, MAX_HISTORY);
      indexRef.current = Math.min(s.index, historyRef.current.length - 1);
    } else {
      historyRef.current = [];
      indexRef.current = -1;
    }
  }

  // Handle storageKey changes (e.g. when userId becomes available)
  useEffect(() => {
    if (keyRef.current === storageKey) return;
    keyRef.current = storageKey;
    const s = loadState(storageKey);
    if (s) {
      historyRef.current = s.history.slice(0, MAX_HISTORY);
      indexRef.current = Math.min(s.index, historyRef.current.length - 1);
      setEnabled(s.enabled);
      setActiveId(s.activeId);
    } else {
      historyRef.current = [];
      indexRef.current = -1;
      setEnabled(false);
      setActiveId(null);
    }
  }, [storageKey]);

  // Persist on every state change
  useEffect(() => {
    saveState(storageKey, {
      activeId,
      history: historyRef.current,
      index: indexRef.current,
      enabled,
    });
  }, [storageKey, activeId, enabled]);

  const select = useCallback((id: string) => {
    const history = historyRef.current.slice(0, indexRef.current + 1);
    history.push(id);
    while (history.length > MAX_HISTORY) history.shift();
    historyRef.current = history;
    indexRef.current = history.length - 1;
    setActiveId(id);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    setActiveId(historyRef.current[indexRef.current]);
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    setActiveId(historyRef.current[indexRef.current]);
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    indexRef.current = -1;
    setActiveId(null);
  }, []);

  const activate = useCallback(() => setEnabled(true), []);
  const deactivate = useCallback(() => setEnabled(false), []);

  const historyPosition = indexRef.current + 1;
  const historyLength = historyRef.current.length;

  return { enabled, activeId, select, undo, redo, canUndo, canRedo, activate, deactivate, historyPosition, historyLength, resetHistory };
}
