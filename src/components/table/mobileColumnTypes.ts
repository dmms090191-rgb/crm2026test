export type MobileFieldRole = 'visible' | 'hidden';
export type MobileCardStyle = 'compact' | 'comfort' | 'detailed';

export interface MobileColumnEntry {
  key: string;
  role: MobileFieldRole;
}

export interface MobileColumnConfig {
  order: MobileColumnEntry[];
  cardStyle: MobileCardStyle;
}

const VISIBLE_KEYS = new Set([
  'nom', 'prenom', 'societe', 'name', 'first_name', 'last_name',
  'manager_first_name', 'manager_last_name',
  'email', 'telephone', 'phone', 'statut', 'acces', 'vendeur',
  'secteur', 'date_ajout', 'cree_le', 'site', 'maps', 'role',
  'ia', 'budget', 'ville', 'source', 'priorite',
  'actions',
]);

const ALWAYS_HIDDEN = new Set(['hash']);

const TOP_KEYS = [
  'nom', 'prenom', 'societe', 'name', 'first_name', 'last_name',
  'manager_first_name', 'manager_last_name',
];

const ALWAYS_BOTTOM = new Set(['actions']);

export function autoLayoutMobile(columnKeys: string[], _fieldTypes?: Map<string, string | undefined>): MobileColumnEntry[] {
  const top: MobileColumnEntry[] = [];
  const middle: MobileColumnEntry[] = [];
  const bottom: MobileColumnEntry[] = [];

  for (const key of columnKeys) {
    if (ALWAYS_HIDDEN.has(key)) {
      middle.push({ key, role: 'hidden' });
    } else if (ALWAYS_BOTTOM.has(key)) {
      bottom.push({ key, role: 'visible' });
    } else if (TOP_KEYS.includes(key)) {
      top.push({ key, role: 'visible' });
    } else if (VISIBLE_KEYS.has(key) || key.startsWith('custom_')) {
      middle.push({ key, role: 'visible' });
    } else {
      middle.push({ key, role: 'visible' });
    }
  }

  return [...top, ...middle, ...bottom];
}

export function migrateLegacyRoles(entries: MobileColumnEntry[]): MobileColumnEntry[] {
  return entries.map(e => {
    const role = e.role as string;
    if (role === 'primary' || role === 'secondary') return { key: e.key, role: 'visible' as const };
    if (role === 'hidden') return e;
    return { key: e.key, role: 'visible' as const };
  });
}

export function mergeNewColumns(
  existing: MobileColumnEntry[],
  allKeys: string[],
  fieldTypes?: Map<string, string | undefined>,
): MobileColumnEntry[] {
  const migrated = migrateLegacyRoles(existing);
  const existingKeys = new Set(migrated.map(e => e.key));
  const newKeys = allKeys.filter(k => !existingKeys.has(k));
  if (newKeys.length === 0) return migrated.filter(e => allKeys.includes(e.key));

  const autoNew = autoLayoutMobile(newKeys, fieldTypes);
  const filtered = migrated.filter(e => allKeys.includes(e.key));
  return [...filtered, ...autoNew];
}
