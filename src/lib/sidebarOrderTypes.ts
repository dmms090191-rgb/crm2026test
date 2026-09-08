export interface SidebarNavItem {
  kind: 'item';
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarSectionHeader {
  kind: 'section';
  title: string;
  _originalTitle?: string;
}

export interface SidebarDivider {
  kind: 'divider';
  afterSection: string;
}

export type SidebarEntry = SidebarNavItem | SidebarSectionHeader | SidebarDivider;

export interface SidebarSection {
  title: string;
  items: { id: string; label: string; icon: React.ReactNode }[];
}

export interface SidebarSaveData {
  order: string[];
  labels: Record<string, string>;
}

export function sectionsToEntries(sections: SidebarSection[]): SidebarEntry[] {
  const entries: SidebarEntry[] = [];
  sections.forEach((section, i) => {
    entries.push({ kind: 'section', title: section.title });
    section.items.forEach(item => {
      entries.push({ kind: 'item', id: item.id, label: item.label, icon: item.icon });
    });
    if (i < sections.length - 1) {
      entries.push({ kind: 'divider', afterSection: section.title });
    }
  });
  return entries;
}

export function applyOrder(defaultEntries: SidebarEntry[], saved: SidebarSaveData): SidebarEntry[] {
  if (!saved.order.length) return applyLabels(defaultEntries, saved.labels);

  const defaultItemIds = new Set(
    defaultEntries.filter(e => e.kind === 'item').map(e => (e as SidebarNavItem).id),
  );

  const savedItemKeys = saved.order.filter(k => k.startsWith('item:')).map(k => k.slice('item:'.length));
  const allDefaultItemsPresent = [...defaultItemIds].every(id => savedItemKeys.includes(id));
  const noUnknownItems = savedItemKeys.every(id => defaultItemIds.has(id));

  if (!allDefaultItemsPresent || !noUnknownItems) {
    return applyLabels(defaultEntries, {});
  }

  const map = new Map<string, SidebarEntry>();
  defaultEntries.forEach(e => map.set(entryKey(e), e));

  const ordered: SidebarEntry[] = [];
  saved.order.forEach(key => {
    const existing = map.get(key);
    if (existing) {
      ordered.push(existing);
      map.delete(key);
    } else if (key.startsWith('section:')) {
      ordered.push({ kind: 'section', title: key.slice('section:'.length), _originalTitle: key.slice('section:'.length) });
    } else if (key.startsWith('divider:')) {
      ordered.push({ kind: 'divider', afterSection: key.slice('divider:'.length) });
    }
  });
  map.forEach(e => ordered.push(e));
  return applyLabels(ordered, saved.labels);
}

function applyLabels(entries: SidebarEntry[], labels: Record<string, string>): SidebarEntry[] {
  if (!Object.keys(labels).length) return entries;
  return entries.map(e => {
    const key = entryKey(e);
    const custom = labels[key];
    if (!custom) return e;
    if (e.kind === 'item') return { ...e, label: custom };
    if (e.kind === 'section') return { ...e, _originalTitle: e._originalTitle ?? e.title, title: custom };
    return e;
  });
}

export function entryKey(e: SidebarEntry): string {
  switch (e.kind) {
    case 'item': return `item:${e.id}`;
    case 'section': return `section:${e._originalTitle ?? e.title}`;
    case 'divider': return `divider:${e.afterSection}`;
  }
}

export function entriesToSaveData(entries: SidebarEntry[], labels: Record<string, string>): SidebarSaveData {
  return { order: entries.map(entryKey), labels };
}

/** Un onglet masque, avec l'ancre qui permet de le remettre a SA place. */
export interface HiddenSlot {
  entry: SidebarEntry;
  /** Cle de l'entree qui le precedait. null = il etait en tete de liste. */
  afterKey: string | null;
}

/** Nettoyage historique : compartiments vides et separateurs orphelins. Inchange. */
export function cleanupEmptyEntries(list: SidebarEntry[]): SidebarEntry[] {
  const result: SidebarEntry[] = [];
  for (let i = 0; i < list.length; i++) {
    const cur = list[i];
    if (cur.kind === 'section') { const next = list[i + 1]; if (!next || next.kind === 'section' || next.kind === 'divider') continue; }
    if (cur.kind === 'divider') { const next = list[i + 1]; if (!next || next.kind === 'divider') continue; }
    result.push(cur);
  }
  if (result.length > 0 && result[result.length - 1].kind === 'divider') result.pop();
  return result;
}

/**
 * Retire les onglets masques de `entries`, puis les compartiments et separateurs
 * que CE masquage a rendus orphelins — et eux seuls.
 *
 * Un compartiment cree a la main est forcement vide tant qu'aucun onglet n'a ete
 * glisse dedans, et un separateur cree a la main est en derniere position. Le
 * nettoyage historique les supprimait donc immediatement. On ne retire desormais
 * que ce qui etait valide AVANT masquage et ne l'est plus apres : ce qui etait
 * deja vide en amont a ete cree volontairement.
 */
export function visibleAfterHiding(entries: SidebarEntry[], hidden: Set<string> | undefined): SidebarEntry[] {
  if (!hidden || hidden.size === 0) return entries;
  const keptBefore = new Set(cleanupEmptyEntries(entries).map(entryKey));
  const filtered = entries.filter(e => e.kind !== 'item' || !hidden.has(e.id));
  const keptAfter = new Set(cleanupEmptyEntries(filtered).map(entryKey));
  return filtered.filter(e => {
    if (e.kind === 'item') return true;
    const key = entryKey(e);
    if (keptAfter.has(key)) return true;     // survit au nettoyage
    if (!keptBefore.has(key)) return true;   // deja vide avant masquage : voulu
    return false;                            // orphelin CAUSE par le masquage
  });
}

/** Separe une structure en « visible » et « masques », en memorisant les positions. */
export function splitHiddenEntries(
  source: SidebarEntry[],
  hidden: Set<string> | undefined,
): { visible: SidebarEntry[]; hidden: HiddenSlot[] } {
  if (!hidden || hidden.size === 0) return { visible: [...source], hidden: [] };
  const visible = visibleAfterHiding(source, hidden);

  // L'ancre doit etre une entree qui SURVIT au masquage. Viser simplement
  // l'entree precedente ne suffit pas : elle peut elle-meme etre un
  // compartiment vide par le masquage, donc absente du brouillon. On remonte
  // alors jusqu'a la premiere entree reellement presente, sinon l'onglet
  // masque serait rejete en fin de liste et son compartiment perdu.
  const survivors = new Set(visible.map(entryKey));
  const slots: HiddenSlot[] = [];
  for (let i = 0; i < source.length; i++) {
    const e = source[i];
    if (e.kind !== 'item' || !hidden.has(e.id)) continue;
    let afterKey: string | null = null;
    for (let j = i - 1; j >= 0; j--) {
      const key = entryKey(source[j]);
      if (survivors.has(key) || (source[j].kind === 'item' && hidden.has((source[j] as SidebarNavItem).id))) {
        afterKey = key;
        break;
      }
    }
    slots.push({ entry: e, afterKey });
  }
  return { visible, hidden: slots };
}

/**
 * Remet les onglets masques a LEUR place d'origine, pas a la fin.
 *
 * Les concatener en queue deplacait durablement l'onglet hors de son
 * compartiment, et faussait le classement « orphelin » du dernier separateur.
 */
export function mergeHiddenEntries(draft: SidebarEntry[], slots: HiddenSlot[]): SidebarEntry[] {
  const merged = [...draft];
  for (const slot of slots) {
    if (slot.afterKey === null) { merged.unshift(slot.entry); continue; }
    const idx = merged.findIndex(e => entryKey(e) === slot.afterKey);
    if (idx >= 0) merged.splice(idx + 1, 0, slot.entry);
    else merged.push(slot.entry);
  }
  return merged;
}

export function displayLabel(entry: SidebarEntry): string {
  if (entry.kind === 'item') return entry.label;
  if (entry.kind === 'section') return entry.title;
  return 'Separateur';
}
