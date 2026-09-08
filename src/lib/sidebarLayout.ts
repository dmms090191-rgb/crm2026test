/**
 * MOTEUR DE SIDEBAR V2 — logique pure, sans React ni Supabase.
 *
 * Principe unique : une sidebar EST une liste ordonnee d'entrees.
 * L'ordre du tableau est l'ordre affiche. Rien n'est nettoye implicitement.
 *
 * Ce que ce moteur ne fait JAMAIS :
 *   · supprimer un compartiment vide
 *   · supprimer un separateur final ou isole
 *   · retirer puis reinserer les onglets masques
 *   · tout jeter parce qu'un onglet a change dans le code
 *
 * Un element cree par l'utilisateur et valide reste, point.
 */

export type LayoutPanel = 'company_super_admin' | 'admin' | 'super_admin' | 'vendor';

export interface LayoutItem {
  kind: 'item';
  id: string;
  /** Libelle personnalise. Absent = celui des defauts. */
  label?: string;
  /** Masque : reste DANS la liste, a sa position exacte. */
  hidden?: boolean;
}

export interface LayoutSection {
  kind: 'section';
  /** Id stable, jamais derive du libelle : renommer ne change pas l'identite. */
  id: string;
  label: string;
}

export interface LayoutDivider {
  kind: 'divider';
  id: string;
}

export type LayoutEntry = LayoutItem | LayoutSection | LayoutDivider;

export interface SidebarLayout {
  v: 2;
  panel: LayoutPanel;
  /** Auth id de l'entite proprietaire. Garde anti-contamination. */
  entity: string;
  entries: LayoutEntry[];
}

/** Defauts d'un panel, sans icone : les icones sont resolues au rendu par id. */
export interface LayoutDefaultSection {
  title: string;
  /**
   * `hidden` : l'onglet fait partie du layout par defaut mais y demarre masque.
   * Il reste un onglet connu du moteur — donc jamais supprime d'une
   * configuration deja enregistree — et reste demasquable via « Reorganiser ».
   */
  items: { id: string; label: string; hidden?: boolean }[];
}

// ---------------------------------------------------------------------------
// Identifiants
// ---------------------------------------------------------------------------

function slug(s: string): string {
  return s
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'x';
}

let counter = 0;
function rand(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const makeSectionId = (): string => `sec_${rand()}`;
export const makeDividerId = (): string => `div_${rand()}`;

// ---------------------------------------------------------------------------
// Defauts
// ---------------------------------------------------------------------------

/**
 * Construit la structure par defaut d'un panel : un compartiment par section,
 * ses onglets, et un separateur entre deux compartiments — c'est-a-dire
 * exactement le rendu actuel.
 *
 * Les ids des compartiments et separateurs par defaut sont deterministes
 * (derives du titre), donc stables d'un chargement a l'autre.
 */
export function defaultEntries(sections: LayoutDefaultSection[]): LayoutEntry[] {
  const used = new Map<string, number>();
  const uniq = (base: string) => {
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  };

  const out: LayoutEntry[] = [];
  sections.forEach((section, i) => {
    const s = uniq(slug(section.title));
    out.push({ kind: 'section', id: `sec_def_${s}`, label: section.title });
    section.items.forEach(item => out.push(
      item.hidden ? { kind: 'item', id: item.id, hidden: true } : { kind: 'item', id: item.id },
    ));
    if (i < sections.length - 1) out.push({ kind: 'divider', id: `div_def_${s}` });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Reconciliation — le SEUL algorithme du moteur
// ---------------------------------------------------------------------------

/**
 * Confronte la configuration enregistree aux onglets reellement presents dans
 * le code. Deterministe, sans tout-ou-rien :
 *
 *   item     -> conserve si l'onglet existe encore, sinon retire (lui seul)
 *   section  -> TOUJOURS conserve
 *   divider  -> TOUJOURS conserve
 *   onglet ajoute au code et absent de la sauvegarde -> ajoute en fin
 *
 * La garde d'entite protege d'un cablage errone : une configuration ne peut
 * pas s'afficher chez une autre entite ni dans un autre panel.
 */
export function reconcileLayout(
  defaults: LayoutEntry[],
  saved: SidebarLayout | null | undefined,
  panel: LayoutPanel,
  entity: string,
): LayoutEntry[] {
  if (!saved || saved.v !== 2 || saved.panel !== panel || saved.entity !== entity) {
    return defaults;
  }
  if (!Array.isArray(saved.entries)) return defaults;

  const knownItems = new Set(defaults.filter(e => e.kind === 'item').map(e => e.id));
  const seenItems = new Set<string>();
  const seenOther = new Set<string>();
  const kept: LayoutEntry[] = [];

  for (const e of saved.entries) {
    if (!e || typeof e !== 'object') continue;
    if (e.kind === 'item') {
      if (!knownItems.has(e.id) || seenItems.has(e.id)) continue;
      seenItems.add(e.id);
      kept.push(e);
    } else if (e.kind === 'section' || e.kind === 'divider') {
      if (!e.id || seenOther.has(e.id)) continue;
      seenOther.add(e.id);
      kept.push(e);
    }
  }

  for (const d of defaults) {
    if (d.kind === 'item' && !seenItems.has(d.id)) kept.push(d);
  }
  return kept;
}

/** Ce qui s'affiche hors mode Reorganiser : tout, sauf les onglets masques. */
export function visibleEntries(entries: LayoutEntry[]): LayoutEntry[] {
  return entries.filter(e => !(e.kind === 'item' && e.hidden));
}

export function toLayout(entries: LayoutEntry[], panel: LayoutPanel, entity: string): SidebarLayout {
  return { v: 2, panel, entity, entries };
}

// ---------------------------------------------------------------------------
// Mutations — pures, toutes testables
// ---------------------------------------------------------------------------

export function moveEntry(entries: LayoutEntry[], from: number, to: number): LayoutEntry[] {
  if (from === to || from < 0 || to < 0 || from >= entries.length || to >= entries.length) return entries;
  const next = [...entries];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function addSectionEntry(entries: LayoutEntry[], label: string, id = makeSectionId()): LayoutEntry[] {
  return [...entries, { kind: 'section', id, label }];
}

export function addDividerEntry(entries: LayoutEntry[], id = makeDividerId()): LayoutEntry[] {
  return [...entries, { kind: 'divider', id }];
}

/** Retire une entree. Un ITEM ne peut pas etre retire : on le masque. */
export function removeEntry(entries: LayoutEntry[], index: number): LayoutEntry[] {
  const e = entries[index];
  if (!e || e.kind === 'item') return entries;
  return entries.filter((_, i) => i !== index);
}

export function renameEntry(entries: LayoutEntry[], index: number, label: string): LayoutEntry[] {
  const e = entries[index];
  if (!e || e.kind === 'divider') return entries;
  const trimmed = label.trim();
  if (!trimmed) return entries;
  return entries.map((x, i) => (i === index ? { ...x, label: trimmed } : x));
}

/**
 * Masque / demasque un onglet SANS le deplacer.
 * Un onglet protege (ex. Talvex : dashboard, mon-compte, system) est refuse.
 */
export function toggleHiddenEntry(
  entries: LayoutEntry[],
  index: number,
  protectedIds?: Set<string>,
): LayoutEntry[] {
  const e = entries[index];
  if (!e || e.kind !== 'item') return entries;
  if (protectedIds?.has(e.id)) return entries;
  return entries.map((x, i) => (i === index && x.kind === 'item' ? { ...x, hidden: !x.hidden } : x));
}

/** Libelle affiche : personnalise si defini, sinon celui des defauts. */
export function entryLabel(e: LayoutEntry, defaultLabels: Record<string, string>): string {
  if (e.kind === 'divider') return 'Séparateur';
  if (e.kind === 'section') return e.label;
  return e.label ?? defaultLabels[e.id] ?? e.id;
}
