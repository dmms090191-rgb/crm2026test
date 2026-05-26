import { useState, useCallback, useMemo } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
  isCustom?: boolean;
  fieldType?: string;
}

export interface UseColumnOrderReturn {
  orderedKeys: string[];
  visibleOrderedKeys: string[];
  hiddenDesktopKeys: string[];
  labelOverrides: Record<string, string>;
  moveUp: (key: string) => void;
  moveDown: (key: string) => void;
  reorder: (fromIdx: number, toIdx: number) => void;
  reset: () => void;
  resetAll: () => void;
  save: (order: string[]) => void;
  saveDesktopVisibility: (hiddenKeys: string[]) => void;
  saveAll: (config: { order: string[]; hiddenDesktop: string[] }) => void;
  renameLabel: (key: string, newLabel: string) => void;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function persistJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function useColumnOrder(storageKey: string, defaultColumns: ColumnDef[]): UseColumnOrderReturn {
  const defaultKeys = useMemo(() => defaultColumns.map(c => c.key), [defaultColumns]);

  const hiddenStorageKey = `${storageKey}_hidden_desktop`;
  const labelsStorageKey = `${storageKey}_labels`;

  const [orderedKeys, setOrderedKeys] = useState<string[]>(() => {
    const saved = loadJson<string[]>(storageKey, []);
    if (!saved.length) return defaultKeys;
    const validKeys = saved.filter(k => defaultKeys.includes(k));
    const missing = defaultKeys.filter(k => !validKeys.includes(k));
    if (missing.length === 0) return validKeys;
    const merged = [...validKeys];
    for (const key of missing) {
      const defaultIdx = defaultKeys.indexOf(key);
      let insertAt = merged.length;
      for (let i = defaultIdx + 1; i < defaultKeys.length; i++) {
        const pos = merged.indexOf(defaultKeys[i]);
        if (pos !== -1) { insertAt = pos; break; }
      }
      merged.splice(insertAt, 0, key);
    }
    return merged;
  });

  const [hiddenDesktopKeys, setHiddenDesktopKeys] = useState<string[]>(() =>
    loadJson<string[]>(hiddenStorageKey, [])
  );

  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>(() =>
    loadJson<Record<string, string>>(labelsStorageKey, {})
  );

  const requiredKeySet = useMemo(() => new Set(defaultColumns.filter(c => c.required).map(c => c.key)), [defaultColumns]);

  const visibleOrderedKeys = useMemo(() => {
    const hiddenSet = new Set(hiddenDesktopKeys);
    return orderedKeys.filter(k => requiredKeySet.has(k) || !hiddenSet.has(k));
  }, [orderedKeys, hiddenDesktopKeys, requiredKeySet]);

  const persist = useCallback((keys: string[]) => {
    setOrderedKeys(keys);
    persistJson(storageKey, keys);
  }, [storageKey]);

  const moveUp = useCallback((key: string) => {
    setOrderedKeys(prev => {
      const idx = prev.indexOf(key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      persistJson(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const moveDown = useCallback((key: string) => {
    setOrderedKeys(prev => {
      const idx = prev.indexOf(key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      persistJson(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const reorder = useCallback((fromIdx: number, toIdx: number) => {
    setOrderedKeys(prev => {
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= prev.length || toIdx >= prev.length || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      persistJson(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const reset = useCallback(() => {
    persist(defaultKeys);
  }, [persist, defaultKeys]);

  const saveDesktopVisibility = useCallback((hidden: string[]) => {
    setHiddenDesktopKeys(hidden);
    persistJson(hiddenStorageKey, hidden);
  }, [hiddenStorageKey]);

  const renameLabel = useCallback((key: string, newLabel: string) => {
    setLabelOverrides(prev => {
      const next = { ...prev, [key]: newLabel };
      persistJson(labelsStorageKey, next);
      return next;
    });
  }, [labelsStorageKey]);

  const resetAll = useCallback(() => {
    persist(defaultKeys);
    saveDesktopVisibility([]);
    setLabelOverrides({});
    persistJson(labelsStorageKey, {});
  }, [persist, defaultKeys, saveDesktopVisibility, labelsStorageKey]);

  const save = useCallback((order: string[]) => {
    persist(order);
  }, [persist]);

  const saveAll = useCallback((config: { order: string[]; hiddenDesktop: string[] }) => {
    persist(config.order);
    saveDesktopVisibility(config.hiddenDesktop);
  }, [persist, saveDesktopVisibility]);

  return {
    orderedKeys,
    visibleOrderedKeys,
    hiddenDesktopKeys,
    labelOverrides,
    moveUp,
    moveDown,
    reorder,
    reset,
    resetAll,
    save,
    saveDesktopVisibility,
    saveAll,
    renameLabel,
  };
}
