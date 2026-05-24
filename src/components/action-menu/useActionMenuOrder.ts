import { useState, useCallback } from 'react';

export function useActionMenuOrder(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length === defaultOrder.length && defaultOrder.every(k => parsed.includes(k))) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return defaultOrder;
  });

  const save = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
    try { localStorage.setItem(storageKey, JSON.stringify(newOrder)); } catch { /* ignore */ }
  }, [storageKey]);

  const moveItem = useCallback((id: string, direction: 'up' | 'down') => {
    setOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  const reorderDrop = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  return { order, save, moveItem, reorderDrop };
}
