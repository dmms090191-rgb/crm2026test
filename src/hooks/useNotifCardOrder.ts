import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface NotifCardOrderData {
  order: string[];
  labels: Record<string, string>;
}

function cacheKey(userId: string | null, companyId: string | null) {
  return `notif_card_order:${companyId ?? '_'}:${userId ?? '_'}`;
}

function loadCache(key: string): NotifCardOrderData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.order)) return null;
    return { order: parsed.order, labels: parsed.labels ?? {} };
  } catch { return null; }
}

function saveCache(key: string, data: NotifCardOrderData) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

async function loadFromDb(userId: string): Promise<NotifCardOrderData | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const orders = data.sidebar_orders as Record<string, unknown> | null;
  if (!orders) return null;
  const entry = orders['notif_cards'] as NotifCardOrderData | undefined;
  if (!entry || !Array.isArray(entry.order)) return null;
  return { order: entry.order, labels: entry.labels ?? {} };
}

async function saveToDb(userId: string, saveData: NotifCardOrderData) {
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', userId)
    .maybeSingle();
  const current = (existing?.sidebar_orders as Record<string, unknown> | null) ?? {};
  const merged = { ...current, notif_cards: saveData };
  await supabase.from('user_preferences').upsert(
    { user_id: userId, sidebar_orders: merged, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

const DEFAULT_KEYS = [
  'client', 'vendeur', 'agenda', 'propositions', 'rdv',
  'super-admin', 'equipe', 'decalages', 'demandes-decalage',
];

export function useNotifCardOrder(userId?: string | null, companyId?: string | null) {
  const lsKey = cacheKey(userId ?? null, companyId ?? null);
  const cached = loadCache(lsKey);

  const [order, setOrder] = useState<string[]>(cached?.order ?? DEFAULT_KEYS);
  const [labels, setLabels] = useState<Record<string, string>>(cached?.labels ?? {});
  const [loaded, setLoaded] = useState(cached !== null);

  const [reordering, setReordering] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const draftOrderRef = useRef<string[]>([]);
  const draftLabelsRef = useRef<Record<string, string>>({});
  draftOrderRef.current = draftOrder;
  draftLabelsRef.current = draftLabels;

  const skipRemoteRef = useRef(false);

  useEffect(() => {
    const c = loadCache(lsKey);
    if (c) {
      setOrder(c.order);
      setLabels(c.labels);
      setLoaded(true);
    }
    if (skipRemoteRef.current) {
      skipRemoteRef.current = false;
      return;
    }
    if (!userId) return;
    let cancelled = false;
    loadFromDb(userId).then(remote => {
      if (cancelled) return;
      if (remote && remote.order.length > 0) {
        setOrder(remote.order);
        setLabels(remote.labels);
        saveCache(lsKey, remote);
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [lsKey, userId]);

  const startReorder = useCallback(() => {
    setDraftOrder([...order]);
    setDraftLabels({ ...labels });
    setReordering(true);
  }, [order, labels]);

  const cancelReorder = useCallback(() => {
    setReordering(false);
    setDraftOrder([]);
    setDraftLabels({});
  }, []);

  const confirmReorder = useCallback(() => {
    const o = draftOrderRef.current;
    const l = draftLabelsRef.current;
    setOrder(o);
    setLabels(l);
    const saveData: NotifCardOrderData = { order: o, labels: l };
    saveCache(lsKey, saveData);
    skipRemoteRef.current = true;
    if (userId) saveToDb(userId, saveData);
    setReordering(false);
    setDraftOrder([]);
    setDraftLabels({});
  }, [lsKey, userId]);

  const moveDraft = useCallback((from: number, to: number) => {
    setDraftOrder(prev => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const renameDraft = useCallback((key: string, newLabel: string) => {
    setDraftLabels(prev => ({ ...prev, [key]: newLabel }));
  }, []);

  const resetToDefault = useCallback(() => {
    setDraftOrder([...DEFAULT_KEYS]);
    setDraftLabels({});
  }, []);

  return {
    order: reordering ? draftOrder : order,
    labels: reordering ? draftLabels : labels,
    loaded,
    reordering,
    startReorder,
    cancelReorder,
    confirmReorder,
    moveDraft,
    renameDraft,
    resetToDefault,
  };
}
