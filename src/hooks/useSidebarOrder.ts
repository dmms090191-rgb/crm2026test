import { useState, useCallback, useEffect, useRef } from 'react';
import type { SidebarEntry, SidebarSection, SidebarSaveData } from '../lib/sidebarOrderTypes';
import { sectionsToEntries, applyOrder, entriesToSaveData, entryKey } from '../lib/sidebarOrderTypes';
import { supabase } from '../lib/supabase';

function scopeKey(role: string, companyId?: string | null): string {
  return companyId ? `${role}_${companyId}` : role;
}

function lsKey(role: string, userId?: string | null, companyId?: string | null): string {
  const parts = ['sidebar_order', role];
  if (companyId) parts.push(companyId);
  if (userId) parts.push(userId);
  return parts.join('_');
}

function loadLocal(key: string): SidebarSaveData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { order: [], labels: {} };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { order: parsed, labels: {} };
    return { order: parsed.order ?? [], labels: parsed.labels ?? {} };
  } catch { return { order: [], labels: {} }; }
}

function saveLocal(key: string, data: SidebarSaveData) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* noop */ }
}

async function loadFromSupabase(targetUserId: string, scope: string): Promise<SidebarSaveData | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', targetUserId)
    .maybeSingle();
  if (error || !data) return null;
  const orders = data.sidebar_orders as Record<string, SidebarSaveData> | null;
  if (!orders || !orders[scope]) return null;
  const entry = orders[scope];
  return { order: entry.order ?? [], labels: entry.labels ?? {} };
}

async function saveToSupabase(targetUserId: string, scope: string, saveData: SidebarSaveData) {
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', targetUserId)
    .maybeSingle();
  const current = (existing?.sidebar_orders as Record<string, unknown> | null) ?? {};
  const merged = { ...current, [scope]: saveData };
  await supabase.from('user_preferences').upsert(
    { user_id: targetUserId, sidebar_orders: merged, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

interface UseSidebarOrderOptions {
  role: 'super_admin' | 'admin' | 'vendor' | 'company_super_admin';
  sections: SidebarSection[];
  userId?: string | null;
  companyId?: string | null;
  hiddenTabs?: Set<string>;
}

export function useSidebarOrder({ role, sections, userId, companyId, hiddenTabs }: UseSidebarOrderOptions) {
  const localKey = lsKey(role, userId, companyId);
  const scope = scopeKey(role, companyId);
  const defaultEntries = useRef(sectionsToEntries(sections));
  const labelsRef = useRef<Record<string, string>>({});

  const [entries, setEntries] = useState<SidebarEntry[]>(() => {
    const saved = loadLocal(localKey);
    labelsRef.current = saved.labels;
    return applyOrder(defaultEntries.current, saved);
  });
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<SidebarEntry[]>([]);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const draftRef = useRef<SidebarEntry[]>([]);
  const draftLabelsRef = useRef<Record<string, string>>({});
  const hiddenEntriesRef = useRef<SidebarEntry[]>([]);
  draftRef.current = draft;
  draftLabelsRef.current = draftLabels;

  const skipRemoteLoadRef = useRef(false);
  const dragIdx = useRef<number | null>(null);
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [dropEdge, setDropEdge] = useState<'before' | 'after'>('before');

  useEffect(() => {
    defaultEntries.current = sectionsToEntries(sections);
    const saved = loadLocal(localKey);
    labelsRef.current = saved.labels;
    setEntries(applyOrder(defaultEntries.current, saved));

    if (skipRemoteLoadRef.current) {
      skipRemoteLoadRef.current = false;
      return;
    }
    if (!userId) return;

    let cancelled = false;
    loadFromSupabase(userId, scope).then(remote => {
      if (cancelled || !remote || remote.order.length === 0) return;
      labelsRef.current = remote.labels;
      const applied = applyOrder(defaultEntries.current, remote);
      setEntries(applied);
      saveLocal(localKey, remote);
    });
    return () => { cancelled = true; };
  }, [localKey, scope, sections, userId]);

  const hiddenTabsRef = useRef(hiddenTabs);
  hiddenTabsRef.current = hiddenTabs;

  const startReorder = useCallback(() => {
    const ht = hiddenTabsRef.current;
    if (ht && ht.size > 0) {
      const hidden: SidebarEntry[] = [];
      const filtered: SidebarEntry[] = [];
      for (const e of entries) {
        if (e.kind === 'item' && ht.has(e.id)) { hidden.push(e); continue; }
        filtered.push(e);
      }
      const cleaned: SidebarEntry[] = [];
      for (let i = 0; i < filtered.length; i++) {
        const cur = filtered[i];
        if (cur.kind === 'section') {
          const next = filtered[i + 1];
          if (!next || next.kind === 'section' || next.kind === 'divider') continue;
        }
        if (cur.kind === 'divider') {
          const next = filtered[i + 1];
          if (!next || next.kind === 'divider') continue;
        }
        cleaned.push(cur);
      }
      if (cleaned.length > 0 && cleaned[cleaned.length - 1].kind === 'divider') cleaned.pop();
      hiddenEntriesRef.current = hidden;
      setDraft(cleaned);
    } else {
      hiddenEntriesRef.current = [];
      setDraft([...entries]);
    }
    setDraftLabels({ ...labelsRef.current });
    setReordering(true);
  }, [entries]);

  const cancelReorder = useCallback(() => {
    setReordering(false);
    setDraft([]);
    setDraftLabels({});
    hiddenEntriesRef.current = [];
  }, []);

  const confirmReorder = useCallback(() => {
    const currentDraft = draftRef.current;
    const currentLabels = draftLabelsRef.current;
    labelsRef.current = currentLabels;
    const merged = [...currentDraft, ...hiddenEntriesRef.current];
    setEntries(merged);
    const saveData = entriesToSaveData(merged, currentLabels);
    saveLocal(localKey, saveData);
    skipRemoteLoadRef.current = true;
    if (userId) saveToSupabase(userId, scope, saveData);
    setReordering(false);
    setDraft([]);
    setDraftLabels({});
    hiddenEntriesRef.current = [];
  }, [localKey, scope, userId]);

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
    if (from !== to && to >= 0) move(from, to);
    dragIdx.current = null;
    setDragSourceIdx(null);
    setDropTargetIdx(null);
  }, [dropTargetIdx, dropEdge, move]);

  const handleDragEnd = useCallback(() => { applyDrop(); }, [applyDrop]);

  const renameEntry = useCallback((idx: number, newLabel: string) => {
    const currentDraft = draftRef.current;
    const e = currentDraft[idx];
    if (!e) return;
    const key = entryKey(e);
    setDraftLabels(dl => ({ ...dl, [key]: newLabel }));
    setDraft(prev => {
      const next = [...prev];
      const entry = next[idx];
      if (!entry) return prev;
      if (entry.kind === 'item') next[idx] = { ...entry, label: newLabel };
      else if (entry.kind === 'section') next[idx] = { ...entry, _originalTitle: entry._originalTitle ?? entry.title, title: newLabel };
      return next;
    });
  }, []);

  const addSection = useCallback((title: string) => {
    setDraft(prev => [...prev, { kind: 'section' as const, title, _originalTitle: title } as SidebarEntry]);
  }, []);

  const addDivider = useCallback(() => {
    const id = `added_${Date.now()}`;
    setDraft(prev => [...prev, { kind: 'divider' as const, afterSection: id }]);
  }, []);

  const removeEntry = useCallback((idx: number) => {
    setDraft(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const resetToDefault = useCallback(() => {
    setDraft(sectionsToEntries(sections));
    setDraftLabels({});
  }, [sections]);

  return {
    entries: reordering ? draft : entries,
    reordering,
    startReorder, cancelReorder, confirmReorder,
    move, handleDragStart, handleDragOver, handleDragEnd,
    draftLength: draft.length,
    renameEntry, addSection, addDivider, removeEntry, resetToDefault,
    dragSourceIdx, dropTargetIdx, dropEdge,
  };
}
