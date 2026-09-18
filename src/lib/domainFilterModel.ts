/*
 * Modele pur du filtre « Filtrer par extension » (onglet DOMAINE).
 * La liste des extensions vient UNIQUEMENT du serveur Talvex (action search_extensions = catalogue vendu,
 * en cache cote serveur) : aucune extension n'est ecrite en dur ici. Aucun import d'execution : testable avec node --test.
 */
import type { SearchRow } from './domainSearchModel';

export interface ExtensionCatalog {
  status: 'ok' | 'unknown';
  reason: string | null;
  /* Noms des extensions vendues, dans l'ordre de la recherche (sans point). */
  tlds: string[];
  retry_after_seconds: number | null;
}

/* Taille d'une verification ciblee : identique a une page de « Voir plus » (limite serveur). */
export const SELECTED_BATCH_SIZE = 10;
const MAX_EXTENSIONS = 2000;
const TLD_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)?$/;

export function unknownExtensions(reason: string): ExtensionCatalog {
  return { status: 'unknown', reason, tlds: [], retry_after_seconds: null };
}

/* Reponse du serveur -> liste sure (forme inattendue = « impossible de charger »). */
export function parseExtensionsResponse(httpStatus: number, body: unknown): ExtensionCatalog {
  if (httpStatus === 401) return unknownExtensions('unauthenticated');
  if (httpStatus === 403) return unknownExtensions('forbidden');
  const r = (body as { ok?: unknown; result?: Record<string, unknown> } | null)?.result;
  if (httpStatus !== 200 || (body as { ok?: unknown } | null)?.ok !== true || typeof r !== 'object' || r === null) {
    return unknownExtensions('provider_unavailable');
  }
  const retry = Number.isSafeInteger(r.retry_after_seconds) && (r.retry_after_seconds as number) > 0 ? (r.retry_after_seconds as number) : null;
  if (r.status !== 'ok') return { ...unknownExtensions(typeof r.reason === 'string' ? r.reason : 'provider_unavailable'), retry_after_seconds: retry };
  const raw = Array.isArray(r.tlds) ? r.tlds : [];
  const tlds = [...new Set(raw.filter((tld): tld is string => typeof tld === 'string' && TLD_RE.test(tld)))].slice(0, MAX_EXTENSIONS);
  return tlds.length > 0 ? { status: 'ok', reason: null, tlds, retry_after_seconds: null } : unknownExtensions('provider_unavailable');
}

/* Saisie du menu : « co », « .CO », « .co » -> « co ». */
export function normalizeExtensionTerm(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\.+/, '');
}

/* Recherche dans le catalogue : correspondance exacte, puis debut, puis contenu ; ordre du catalogue conserve. */
export function matchExtensions(tlds: string[], rawTerm: string): string[] {
  const term = normalizeExtensionTerm(rawTerm);
  if (term === '') return tlds;
  const exact = tlds.filter((tld) => tld === term);
  const prefix = tlds.filter((tld) => tld !== term && tld.startsWith(term));
  const inside = tlds.filter((tld) => !tld.startsWith(term) && tld.includes(term));
  return [...exact, ...prefix, ...inside];
}

export function toggleExtension(selected: string[], tld: string): string[] {
  return selected.includes(tld) ? selected.filter((item) => item !== tld) : [...selected, tld];
}

/* Lignes affichees : toutes sans filtre, sinon uniquement les extensions choisies (ordre inchange). */
export function filterRows(rows: SearchRow[], selected: string[]): SearchRow[] {
  if (selected.length === 0) return rows;
  const wanted = new Set(selected);
  return rows.filter((row) => wanted.has(row.tld));
}

/* Extensions choisies qui restent a verifier (ni deja chargees, ni en cours, ni en echec). */
export function missingExtensions(selected: string[], rows: SearchRow[], pending: string[], failed: string[]): string[] {
  const known = new Set([...rows.map((row) => row.tld), ...pending, ...failed]);
  return selected.filter((tld) => !known.has(tld));
}

export function chunkExtensions(tlds: string[], size = SELECTED_BATCH_SIZE): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < tlds.length; index += size) chunks.push(tlds.slice(index, index + size));
  return chunks;
}

/*
 * « Autres extensions » dans l'ordre du catalogue : une extension verifiee depuis le filtre reprend sa place
 * parmi celles chargees par « Voir plus ». Tri stable ; une extension hors catalogue reste en fin de liste.
 */
export function orderByCatalog(rows: SearchRow[], catalog: string[]): SearchRow[] {
  if (catalog.length === 0) return rows;
  const rank = new Map(catalog.map((tld, index) => [tld, index]));
  return rows
    .map((row, index) => ({ row, index, rank: rank.get(row.tld) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.row);
}
