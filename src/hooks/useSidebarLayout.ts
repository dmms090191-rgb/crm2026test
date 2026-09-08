import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  defaultEntries, reconcileLayout, visibleEntries, toLayout,
  moveEntry, addSectionEntry, addDividerEntry, removeEntry, renameEntry, toggleHiddenEntry,
} from '../lib/sidebarLayout';
import type { LayoutEntry, LayoutPanel, LayoutDefaultSection, SidebarLayout } from '../lib/sidebarLayout';

// ===================== INSTRUMENTATION TEMPORAIRE =====================
// A retirer apres diagnostic. Tout est prefixe [SIDEBAR-V2-DEBUG].
const DBG = '[SIDEBAR-V2-DEBUG]';
const sig = (l: LayoutEntry[] | null | undefined) =>
  Array.isArray(l) ? l.map(e => `${e.kind}:${e.id}${e.kind === 'item' && e.hidden ? '(masque)' : ''}`) : l;
let instanceSeq = 0;
// ======================================================================

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

async function loadRemote(entity: string, panel: LayoutPanel, inst: number): Promise<SidebarLayout | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', entity)
    .maybeSingle();
  const all = (data?.sidebar_orders ?? null) as Record<string, unknown> | null;
  const raw = all?.[layoutKey(panel)];
  console.log(DBG, '6a.F5.lecture_brute_supabase', {
    inst, entityUserId: entity, panel, cle: layoutKey(panel),
    erreurLecture: error ? error.message : null,
    lignePresente: !!data,
    toutesLesCles: all ? Object.keys(all) : null,
    valeurBrutePourLaCle: raw ?? null,
    entriesBrutes: raw ? sig((raw as SidebarLayout).entries) : null,
  });
  return raw ? (raw as SidebarLayout) : null;
}

/**
 * Ecrit la configuration de CETTE entite, en preservant toutes les autres cles
 * de sidebar_orders — y compris celles de l'ancien moteur.
 */
async function saveRemote(entity: string, panel: LayoutPanel, layout: SidebarLayout, inst: number) {
  const { data: existing, error: readErr } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', entity)
    .maybeSingle();
  const current = (existing?.sidebar_orders as Record<string, unknown> | null) ?? {};
  const merged = { ...current, [layoutKey(panel)]: layout };

  console.log(DBG, '4a.sauvegarde.payload', {
    inst, entityUserId: entity, panel, cle: layoutKey(panel),
    lectureAvantEcriture: readErr ? readErr.message : 'ok',
    clesPreservees: Object.keys(current),
    entriesEnvoyees: sig(layout.entries),
  });

  const { data: returned, error } = await supabase.from('user_preferences').upsert(
    { user_id: entity, sidebar_orders: merged, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  ).select('user_id, sidebar_orders');

  const written = returned?.[0]?.sidebar_orders as Record<string, unknown> | undefined;
  const back = written?.[layoutKey(panel)] as SidebarLayout | undefined;
  console.log(DBG, '4b.sauvegarde.resultat', {
    inst,
    ok: !error,
    error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
    lignesRetournees: returned ? returned.length : 0,
    // Ce que la base RENVOIE reellement pour notre cle, apres ecriture :
    entriesRelues: back ? sig(back.entries) : null,
  });
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
  const instRef = useRef<number>(0);
  if (instRef.current === 0) { instanceSeq += 1; instRef.current = instanceSeq; }
  const inst = instRef.current;

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
    const next = reconcileLayout(defaults, cached, panel, entity);
    console.log(DBG, '6b.montage.cache_local', {
      inst, entityUserId: entity, panel, cleCache: lsKey,
      cachePresent: cached !== null,
      entriesEnCache: cached ? sig(cached.entries) : null,
      resultatReconcile: sig(next),
    });
    setEntries(next);
    setLoaded(cached !== null);
  }

  useEffect(() => {
    if (!entity) return;
    let cancelled = false;
    (async () => {
      const remote = await loadRemote(entity, panel, inst);
      if (cancelled) return;
      const next = reconcileLayout(defaults, remote, panel, entity);
      console.log(DBG, '6c.F5.reconcile', {
        inst, entityUserId: entity, panel,
        distantPresent: remote !== null,
        entriesDistantes: remote ? sig(remote.entries) : null,
        entriesFinales: sig(next),
        visibleFinales: sig(visibleEntries(next)),
        ecraseLeCacheLocal: remote !== null,
      });
      setEntries(next);
      if (remote) writeCache(cacheKey(panel, entity), remote);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [entity, panel, defaults, inst]);

  const startReorder = useCallback(() => {
    // Le brouillon contient TOUT, onglets masques compris, a leur place.
    console.log(DBG, '0.startReorder', { inst, entityUserId: entity, panel, draftInitial: sig(entries) });
    setDraft(entries);
    setSaveError(null);
    setReordering(true);
  }, [entries, entity, panel, inst]);

  const cancelReorder = useCallback(() => {
    setReordering(false);
    setDraft([]);
    setSaveError(null);
  }, []);

  const confirmReorder = useCallback(async () => {
    if (!entity) { console.log(DBG, '!! confirmReorder ANNULE : entityUserId vide', { inst }); return; }
    const next = draft;
    const layout = toLayout(next, panel, entity);
    console.log(DBG, '3.Valider', {
      inst, entityUserId: entity, panel, cle: layoutKey(panel), cleCache: cacheKey(panel, entity),
      draftComplet: sig(next),
      layoutV2: layout,
    });
    setEntries(next);
    setReordering(false);
    setDraft([]);
    writeCache(cacheKey(panel, entity), layout);
    console.log(DBG, '5.apres_Valider.etat_React', {
      inst,
      entriesDansEtatReact: sig(next),
      visibleQuiSeraRendu: sig(visibleEntries(next)),
      relectureImmediateDuCache: sig(readCache(cacheKey(panel, entity))?.entries),
    });
    const err = await saveRemote(entity, panel, layout, inst);
    setSaveError(err ? err.message : null);
  }, [draft, entity, panel, inst]);

  const resetToDefault = useCallback(() => { setDraft(defaults); }, [defaults]);

  const mutate = (fn: (list: LayoutEntry[]) => LayoutEntry[], etape: string) =>
    setDraft(prev => {
      const next = fn(prev);
      console.log(DBG, etape, { inst, avant: sig(prev), apres: sig(next) });
      return next;
    });

  const visible = useMemo(() => visibleEntries(entries), [entries]);

  // Ce qui part reellement au rendu, journalise seulement quand ca change.
  const lastRender = useRef<string>('');
  const renderSig = JSON.stringify({ r: reordering, e: sig(reordering ? draft : visible) });
  if (renderSig !== lastRender.current) {
    lastRender.current = renderSig;
    console.log(DBG, '7.rendu', {
      inst, reordering,
      entriesEnvoyeesAuRendu: sig(reordering ? draft : visible),
    });
  }

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

    move: useCallback((from: number, to: number) => mutate(l => moveEntry(l, from, to), 'move'), []),
    addSection: useCallback((label: string) => mutate(l => addSectionEntry(l, label), '1.addCompartiment'), []),
    addDivider: useCallback(() => mutate(l => addDividerEntry(l), '2.addSeparateur'), []),
    remove: useCallback((index: number) => mutate(l => removeEntry(l, index), 'remove'), []),
    rename: useCallback((index: number, label: string) => mutate(l => renameEntry(l, index, label), 'rename'), []),
    toggleHidden: useCallback((index: number) => mutate(l => toggleHiddenEntry(l, index, protectedRef.current), 'toggleHidden'), []),
  };
}
