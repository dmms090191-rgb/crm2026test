export interface SidebarNavItem {
  kind: 'item';
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarSectionHeader {
  kind: 'section';
  title: string;
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

  const defaultSectionTitles = new Set(
    defaultEntries.filter(e => e.kind === 'section').map(e => (e as SidebarSectionHeader).title),
  );
  const defaultItemIds = new Set(
    defaultEntries.filter(e => e.kind === 'item').map(e => (e as SidebarNavItem).id),
  );

  const savedSectionKeys = saved.order.filter(k => k.startsWith('section:')).map(k => k.slice('section:'.length));
  const sectionStructureChanged = !defaultSectionTitles.size ||
    savedSectionKeys.filter(t => defaultSectionTitles.has(t)).length !== defaultSectionTitles.size;

  const savedItemKeys = saved.order.filter(k => k.startsWith('item:')).map(k => k.slice('item:'.length));
  const itemSetChanged = savedItemKeys.length !== defaultItemIds.size ||
    savedItemKeys.some(id => !defaultItemIds.has(id));

  if (sectionStructureChanged || itemSetChanged) {
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
      ordered.push({ kind: 'section', title: key.slice('section:'.length) });
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
    if (e.kind === 'section') return { ...e, title: custom };
    return e;
  });
}

export function entryKey(e: SidebarEntry): string {
  switch (e.kind) {
    case 'item': return `item:${e.id}`;
    case 'section': return `section:${e.title}`;
    case 'divider': return `divider:${e.afterSection}`;
  }
}

export function entriesToSaveData(entries: SidebarEntry[], labels: Record<string, string>): SidebarSaveData {
  return { order: entries.map(entryKey), labels };
}

export function displayLabel(entry: SidebarEntry): string {
  if (entry.kind === 'item') return entry.label;
  if (entry.kind === 'section') return entry.title;
  return 'Separateur';
}
