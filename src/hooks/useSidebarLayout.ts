import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  defaultEntries, reconcileLayout, visibleEntries, toLayout,
  moveEntry, addSectionEntry, addDividerEntry, removeEntry, renameEntry, toggleHiddenEntry,
} from '../lib/sidebarLayout';
import type { LayoutEntry, LayoutPanel, LayoutDefaultSection, SidebarLayout } from '../lib/sidebarLayout';

/*
 * L'instrumentation [SIDEBAR-V2-DEBUG] a ete retiree le 27/10/2026, apres le diagnostic
 * qu'elle servait — elle etait marquee « a retirer apres diagnostic » depuis le depart.
 *
 * Elle n'etait plus seulement inutile : depuis que la coquille telephone tire sa
 * navigation de ce crochet, elle partait dans l'APK. Trois a quatre lignes de journal par
 * montage, avec la signature complete des onglets d'une Societe, dans la console d'un
 * telephone de production.
 */

/**
 * Cle dans user_preferences.sidebar_orders.
 *
 * Espace de noms distinct de l'ancien moteur (`<role>_<companyId>`) : les
 * anciennes cles restent intactes, le rollback consiste a ignorer `v2:`.
 * La LIGNE user_preferences est celle de l'entite (Groupe ou Societe), donc
 * la cle n'a pas besoin de porter l'identite — mais le blob l'embarque quand
 * meme comme garde.
 */
const layoutKey = (panel: LayoutPanel) => `v2:${panel}`;
const cacheKey = (panel: LayoutPanel, entity: string) => `sbl2:${panel}:${entity}`;

function readCache(key: string): SidebarLayout | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SidebarLayout) : null;
  } catch { return null; }
}

function writeCache(key: string, layout: SidebarLayout) {
  try { localStorage.setItem(key, JSON.stringify(layout)); } catch { /* noop */ }
}

async function loadRemote(entity: string, panel: LayoutPanel): Promise<SidebarLayout | null> {
  const { data } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', entity)
    .maybeSingle();
  const all = (data?.sidebar_orders ?? null) as Record<string, unknown> | null;
  const raw = all?.[layoutKey(panel)];
  return raw ? (raw as SidebarLayout) : null;
}

/**
 * Ecrit la configuration de CETTE entite, en preservant toutes les autres cles
 * de sidebar_orders — y compris celles de l'ancien moteur.
 */
async function saveRemote(entity: string, panel: LayoutPanel, layout: SidebarLayout) {
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', entity)
    .maybeSingle();
  const current = (existing?.sidebar_orders as Record<string, unknown> | null) ?? {};
  const merged = { ...current, [layoutKey(panel)]: layout };

  const { error } = await supabase.from('user_preferences').upsert(
    { user_id: entity, sidebar_orders: merged, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  ).select('user_id, sidebar_orders');

  return error ?? null;
}

interface Options {
  panel: LayoutPanel;
  /** Auth id de l'entite REELLE : le Groupe visualise, la Societe visualisee. */
  entityUserId: string | null;
  sections: LayoutDefaultSection[];
  /** Onglets qui ne peuvent JAMAIS etre masques (ex. Talvex : dashboard, mon-compte, system). */
  protectedIds?: string[];
}

export function useSidebarLayout({ panel, entityUserId, sections, protectedIds }: Options) {
  const protectedRef = useRef<Set<string>>(new Set());
  protectedRef.current = useMemo(() => new Set(protectedIds ?? []), [protectedIds]);

  const defaults = useMemo(() => defaultEntries(sections), [sections]);
  const defaultLabels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of sections) for (const it of s.items) m[it.id] = it.label;
    return m;
  }, [sections]);

  const entity = entityUserId ?? '';
  const lsKey = entity ? cacheKey(panel, entity) : '';

  const [entries, setEntries] = useState<LayoutEntry[]>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<LayoutEntry[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Le cache local peint immediatement ; la base fait autorite juste apres.
  const cacheRead = useRef<string>('');
  if (lsKey && cacheRead.current !== lsKey) {
    cacheRead.current = lsKey;
    const cached = readCache(lsKey);
    setEntries(reconcileLayout(defaults, cached, panel, entity));
    setLoaded(cached !== null);
  }

  useEffect(() => {
    if (!entity) return;
    let cancelled = false;
    (async () => {
      const remote = await loadRemote(entity, panel);
      if (cancelled) return;
      setEntries(reconcileLayout(defaults, remote, panel, entity));
      if (remote) writeCache(cacheKey(panel, entity), remote);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [entity, panel, defaults]);

  const startReorder = useCallback(() => {
    // Le brouillon contient TOUT, onglets masques compris, a leur place.
    setDraft(entries);
    setSaveError(null);
    setReordering(true);
  }, [entries]);

  const cancelReorder = useCallback(() => {
    setReordering(false);
    setDraft([]);
    setSaveError(null);
  }, []);

  const confirmReorder = useCallback(async () => {
    if (!entity) return;
    const next = draft;
    const layout = toLayout(next, panel, entity);
    setEntries(next);
    setReordering(false);
    setDraft([]);
    writeCache(cacheKey(panel, entity), layout);
    const err = await saveRemote(entity, panel, layout);
    setSaveError(err ? err.message : null);
  }, [draft, entity, panel]);

  const resetToDefault = useCallback(() => { setDraft(defaults); }, [defaults]);

  const mutate = (fn: (list: LayoutEntry[]) => LayoutEntry[]) => setDraft(prev => fn(prev));

  const visible = useMemo(() => visibleEntries(entries), [entries]);

  return {
    /** Structure complete, onglets masques inclus. */
    entries,
    /** Ce qu'il faut afficher hors mode Reorganiser. */
    visible,
    defaultLabels,
    protectedIds: protectedRef.current,
    loaded,
    saveError,

    reordering,
    draft,
    startReorder,
    cancelReorder,
    confirmReorder,
    resetToDefault,

    move: useCallback((from: number, to: number) => mutate(l => moveEntry(l, from, to)), []),
    addSection: useCallback((label: string) => mutate(l => addSectionEntry(l, label)), []),
    addDivider: useCallback(() => mutate(l => addDividerEntry(l)), []),
    remove: useCallback((index: number) => mutate(l => removeEntry(l, index)), []),
    rename: useCallback((index: number, label: string) => mutate(l => renameEntry(l, index, label)), []),
    toggleHidden: useCallback((index: number) => mutate(l => toggleHiddenEntry(l, index, protectedRef.current)), []),
  };
}
