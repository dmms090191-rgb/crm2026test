import { useState, useCallback, useEffect, useRef } from 'react';
import type { SidebarEntry, SidebarSection, SidebarSaveData } from '../lib/sidebarOrderTypes';
import { sectionsToEntries, applyOrder, entriesToSaveData, entryKey } from '../lib/sidebarOrderTypes';

function storageKey(role: string, userId?: string | null, companyId?: string | null): string {
  const parts = ['sidebar_order', role];
  if (companyId) parts.push(companyId);
  if (userId) parts.push(userId);
  return parts.join('_');
}

function loadSave(key: string): SidebarSaveData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { order: [], labels: {} };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { order: parsed, labels: {} };
    return { order: parsed.order ?? [], labels: parsed.labels ?? {} };
  } catch { return { order: [], labels: {} }; }
}

function persistSave(key: string, data: SidebarSaveData) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

interface UseSidebarOrderOptions {
  role: 'super_admin' | 'admin' | 'vendor' | 'company_super_admin';
  sections: SidebarSection[];
  userId?: string | null;
  companyId?: string | null;
}

export function useSidebarOrder({ role, sections, userId, companyId }: UseSidebarOrderOptions) {
  const key = storageKey(role, userId, companyId);
  const defaultEntries = useRef(sectionsToEntries(sections));
  const labelsRef = useRef<Record<string, string>>({});

  const [entries, setEntries] = useState<SidebarEntry[]>(() => {
    const saved = loadSave(key);
    labelsRef.current = saved.labels;
    return applyOrder(defaultEntries.current, saved);
  });
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<SidebarEntry[]>([]);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const dragIdx = useRef<number | null>(null);
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [dropEdge, setDropEdge] = useState<'before' | 'after'>('before');

  useEffect(() => {
    defaultEntries.current = sectionsToEntries(sections);
    const saved = loadSave(key);
    labelsRef.current = saved.labels;
    setEntries(applyOrder(defaultEntries.current, saved));
  }, [key, sections]);

  const startReorder = useCallback(() => {
    setDraft([...entries]);
    setDraftLabels({ ...labelsRef.current });
    setReordering(true);
  }, [entries]);

  const cancelReorder = useCallback(() => {
    setReordering(false);
    setDraft([]);
    setDraftLabels({});
  }, []);

  const confirmReorder = useCallback(() => {
    labelsRef.current = draftLabels;
    setEntries(draft);
    persistSave(key, entriesToSaveData(draft, draftLabels));
    setReordering(false);
    setDraft([]);
    setDraftLabels({});
  }, [draft, draftLabels, key]);

  const move = useCallback((from: number, to: number) => {
    setDraft(prev => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((idx: number) => {
    dragIdx.current = idx;
    setDragSourceIdx(idx);
    setDropTargetIdx(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) {
      if (dragIdx.current === idx) setDropTargetIdx(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const edge: 'before' | 'after' = e.clientY < midY ? 'before' : 'after';
    setDropTargetIdx(idx);
    setDropEdge(edge);
  }, []);

  const applyDrop = useCallback(() => {
    if (dragIdx.current === null || dropTargetIdx === null) return;
    const from = dragIdx.current;
    let to = dropEdge === 'after' ? dropTargetIdx + 1 : dropTargetIdx;
    if (from < to) to -= 1;
    if (from !== to && to >= 0) {
      move(from, to);
    }
    dragIdx.current = null;
    setDragSourceIdx(null);
    setDropTargetIdx(null);
  }, [dropTargetIdx, dropEdge, move]);

  const handleDragEnd = useCallback(() => {
    applyDrop();
  }, [applyDrop]);

  const renameEntry = useCallback((idx: number, newLabel: string) => {
    setDraft(prev => {
      const e = prev[idx];
      if (!e) return prev;
      const next = [...prev];
      if (e.kind === 'item') next[idx] = { ...e, label: newLabel };
      else if (e.kind === 'section') next[idx] = { ...e, title: newLabel };
      return next;
    });
    setDraftLabels(prev => {
      const e = draft[idx];
      if (!e) return prev;
      return { ...prev, [entryKey(e)]: newLabel };
    });
  }, [draft]);

  const addSection = useCallback((title: string) => {
    setDraft(prev => [...prev, { kind: 'section' as const, title }]);
  }, []);

  const addDivider = useCallback(() => {
    const id = `added_${Date.now()}`;
    setDraft(prev => [...prev, { kind: 'divider' as const, afterSection: id }]);
  }, []);

  const removeEntry = useCallback((idx: number) => {
    setDraft(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const resetToDefault = useCallback(() => {
    const fresh = sectionsToEntries(sections);
    setDraft(fresh);
    setDraftLabels({});
  }, [sections]);

  return {
    entries: reordering ? draft : entries,
    reordering,
    startReorder, cancelReorder, confirmReorder,
    move, handleDragStart, handleDragOver, handleDragEnd,
    draftLength: draft.length,
    renameEntry, addSection, addDivider, removeEntry, resetToDefault,
    dragSourceIdx,
    dropTargetIdx,
    dropEdge,
  };
}
