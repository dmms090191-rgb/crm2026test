import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { lireSidebarOrders } from '../lib/preferencesUtilisateur';
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

/* La LECTURE passe par le lecteur mutualise : cinq autres crochets demandent la meme
   colonne de la meme ligne, et chacun envoyait sa propre requete. Voir
   src/lib/preferencesUtilisateur.ts. L'ecriture, plus bas, garde sa relecture directe. */
async function loadRemote(entity: string, panel: LayoutPanel): Promise<SidebarLayout | null> {
  const all = await lireSidebarOrders(entity);
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
  /*
   * ---------- `loaded` DIT « J'AI DE QUOI PEINDRE », PAS « LA BASE A REPONDU » ----------
   *
   * Il part donc a VRAI, et c'est le corps de ce hook qui le justifie : la ligne
   * au-dessus a deja rempli `entries` avec les onglets par defaut, qui sont corrects —
   * c'est la declaration du panel, pas un remplissage d'attente.
   *
   * L'ancien sens — « la base a repondu, ou le cache local existait » — avait un defaut
   * qu'aucune relecture de CE fichier ne pouvait montrer : la cle du cache local, juste
   * en dessous, contient l'identifiant du compte. Tant que l'appelant ne l'a pas,
   * `lsKey` est vide, le bloc de relecture ne s'execute pas, et `loaded` reste faux.
   * Le menu attendait donc le RESEAU pour afficher des onglets qui n'en dependaient
   * pas — le cache-first etait neutralise par sa propre cle.
   *
   * MESURE DU 13/11/2026, harnais montant ce hook derriere un client instrumente aux
   * latences de production : les 33 onglets du panel Talvex etaient calcules a 4 ms, et
   * le menu n'apparaissait qu'a 813 ms. Les 809 ms d'ecart n'achetaient rien : aux deux
   * instants, la liste peinte est la meme, a l'ordre personnalise pres.
   *
   * CE QUE CELA COUTE, ET POURQUOI C'EST LE BON COMPROMIS. A la toute premiere visite
   * sur un appareil, le menu peut se reordonner une fois quand la base repond. Aux
   * visites suivantes, le cache local porte deja l'ordre : aucun saut. L'alternative
   * etait un ecran de squelette systematique, y compris pour un ordre jamais
   * personnalise — donc pour rien, dans l'immense majorite des cas.
   *
   * La base reste seule autorite : elle ecrase ce qui est peint des qu'elle repond, et
   * aucune ecriture ne part d'ici.
   */
  const [loaded, setLoaded] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<LayoutEntry[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Le cache local peint immediatement ; la base fait autorite juste apres.
  const cacheRead = useRef<string>('');
  if (lsKey && cacheRead.current !== lsKey) {
    cacheRead.current = lsKey;
    const cached = readCache(lsKey);
    setEntries(reconcileLayout(defaults, cached, panel, entity));
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
