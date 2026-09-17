/*
 * Modele pur de la recherche de domaine multi-extensions (onglet DOMAINE).
 * Les donnees viennent UNIQUEMENT du serveur Talvex (fonction hostinger-domains, action search_domains) :
 * aucune disponibilite ni aucun prix n'est calcule ou devine ici. Textes clients sans jargon.
 * Aucun import d'execution : testable avec node --test (scripts/site-interface).
 */
import type { StatusTone } from './siteWorkspaceModel';

/* not_offered : extension saisie que le compte ne vend pas (jamais un faux « indisponible »). */
export type RowStatus = 'available' | 'unavailable' | 'unknown' | 'not_offered';

export interface ProviderPrice {
  currency: string;
  first_year_cents: number;
  renewal_cents: number;
}

export interface SearchRow {
  domain: string;
  tld: string;
  status: RowStatus;
  restricted: boolean;
  /* Extension principale (.com, .fr, .net, .org, .eu, .io) : affichee en premier. */
  popular: boolean;
  /* Prix vendu au Groupe/Societe : pas encore defini (jamais le cout Hostinger). */
  client_price: null;
  /* Cout Hostinger : present UNIQUEMENT pour Talvex (le serveur ne l'envoie pas aux autres). */
  provider_price?: ProviderPrice | null;
  restriction_note?: string | null;
}

export type SearchStatus = 'ok' | 'invalid' | 'unknown';

export interface SearchPage {
  status: SearchStatus;
  reason: string | null;
  name: string | null;
  requested_tld: string | null;
  /* false : l'extension saisie n'est pas vendue par le compte (jamais presentee comme achetable). */
  requested_tld_offered: boolean | null;
  catalog_status: 'ok' | 'unavailable' | null;
  total_tlds: number | null;
  results: SearchRow[];
  offset: number;
  next_offset: number | null;
  retry_after_seconds: number | null;
}

export function unknownPage(reason: string, offset = 0): SearchPage {
  return {
    status: 'unknown', reason, name: null, requested_tld: null, requested_tld_offered: null, catalog_status: null,
    total_tlds: null, results: [], offset, next_offset: offset, retry_after_seconds: null,
  };
}

const ROW_STATUSES: RowStatus[] = ['available', 'unavailable', 'unknown', 'not_offered'];
const PAGE_STATUSES: SearchStatus[] = ['ok', 'invalid', 'unknown'];
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?){1,2}$/;
const int = (v: unknown): number | null => (Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : null);

function parsePrice(v: unknown): ProviderPrice | null {
  const p = v as ProviderPrice;
  if (typeof v !== 'object' || v === null || typeof p.currency !== 'string' || !/^[A-Z]{3}$/.test(p.currency)) return null;
  const first = int(p.first_year_cents);
  const renewal = int(p.renewal_cents);
  return first === null || renewal === null ? null : { currency: p.currency, first_year_cents: first, renewal_cents: renewal };
}

function parseRow(v: unknown): SearchRow | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.domain !== 'string' || !DOMAIN_RE.test(r.domain) || typeof r.tld !== 'string' || !r.domain.endsWith(`.${r.tld}`)) return null;
  if (!ROW_STATUSES.includes(r.status as RowStatus)) return null;
  const row: SearchRow = {
    domain: r.domain, tld: r.tld, status: r.status as RowStatus, restricted: r.restricted === true, popular: r.popular === true, client_price: null,
  };
  if ('provider_price' in r) row.provider_price = parsePrice(r.provider_price);
  if ('restriction_note' in r) row.restriction_note = typeof r.restriction_note === 'string' ? r.restriction_note.slice(0, 80) : null;
  return row;
}

/* Reponse HTTP du serveur -> page sure. Toute forme inattendue devient « impossible de verifier ». */
export function parseSearchResponse(httpStatus: number, body: unknown, offset: number): SearchPage {
  if (httpStatus === 401) return unknownPage('unauthenticated', offset);
  if (httpStatus === 403) return unknownPage('forbidden', offset);
  if (httpStatus !== 200 || typeof body !== 'object' || body === null) return unknownPage('provider_unavailable', offset);
  const r = (body as { ok?: unknown; result?: Record<string, unknown> }).result;
  if ((body as { ok?: unknown }).ok !== true || typeof r !== 'object' || r === null) return unknownPage('provider_unavailable', offset);
  if (!PAGE_STATUSES.includes(r.status as SearchStatus)) return unknownPage('provider_unavailable', offset);

  const results = Array.isArray(r.results) ? r.results.map(parseRow).filter((row): row is SearchRow => row !== null).slice(0, 50) : [];
  const nextOffset = int(r.next_offset);
  return {
    status: r.status as SearchStatus,
    reason: typeof r.reason === 'string' ? r.reason : null,
    name: typeof r.name === 'string' ? r.name : null,
    requested_tld: typeof r.requested_tld === 'string' ? r.requested_tld : null,
    requested_tld_offered: typeof r.requested_tld_offered === 'boolean' ? r.requested_tld_offered : null,
    catalog_status: r.catalog_status === 'ok' || r.catalog_status === 'unavailable' ? r.catalog_status : null,
    total_tlds: int(r.total_tlds),
    results,
    offset: int(r.offset) ?? offset,
    next_offset: nextOffset,
    retry_after_seconds: int(r.retry_after_seconds),
  };
}

/* Verification locale minimale : le serveur extrait le nom et refait la validation complete. */
export function precheckSearchQuery(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (value === '') return { ok: false, message: 'Saisissez un nom, par exemple : monentreprise ou monentreprise.com' };
  if (value.length > 253) return { ok: false, message: 'Ce nom est trop long.' };
  return { ok: true, value };
}

export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/* Codes de restriction renvoyes par Hostinger (constate : "requires_eu_residence" pour .fr et .eu). */
const RESTRICTION_LABELS: Record<string, string> = {
  requires_eu_residence: "réservé aux résidents de l'Union européenne",
};

export function restrictionLabel(code: string): string {
  return RESTRICTION_LABELS[code.trim().toLowerCase()] ?? code;
}

/* Message d'ensemble (recherche impossible, nom invalide, extension non vendue, liste incomplete). */
export function searchNotice(page: SearchPage): { tone: StatusTone; text: string } | null {
  if (page.status === 'invalid') {
    return {
      tone: 'warning',
      text: page.reason === 'unsupported_characters'
        ? 'Les lettres accentuées ne sont pas encore prises en charge.'
        : 'Saisissez un nom valide, par exemple : monentreprise ou monentreprise.com',
    };
  }
  if (page.status === 'unknown') return { tone: 'warning', text: `Impossible de vérifier pour le moment. ${retryText(page.reason, page.retry_after_seconds)}` };
  if (page.catalog_status === 'unavailable') {
    return { tone: 'neutral', text: 'Seules les extensions principales ont pu être vérifiées pour le moment.' };
  }
  return null;
}

export function retryText(reason: string | null, wait: number | null): string {
  const delay = wait && wait > 0 ? `${wait} s` : 'une minute';
  switch (reason) {
    case 'provider_not_configured':
      return 'La vérification des noms de domaine sera bientôt disponible.';
    case 'forbidden':
      return "Vous n'avez pas accès à cette vérification pour cette entreprise.";
    case 'unauthenticated':
      return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
    case 'rate_limited':
      return `Trop de recherches en peu de temps. Réessayez dans ${delay}.`;
    case 'busy':
      return `Beaucoup de recherches sont en cours. Réessayez dans ${delay}.`;
    default:
      return wait && wait > 0 ? `Réessayez dans ${delay}.` : 'Réessayez dans quelques instants.';
  }
}

export interface RowView {
  label: string;
  tone: StatusTone;
  /* Conditions d'enregistrement (ex. residence dans l'UE), sans jargon. */
  condition: string | null;
  priceLines: string[];
  /* Le futur bouton Acheter n'apparait (desactive) que pour un domaine reellement disponible. */
  showBuyPlaceholder: boolean;
}

export function describeRow(row: SearchRow, actorIsTalvex: boolean): RowView {
  if (row.status === 'available') {
    let condition: string | null = null;
    if (row.restricted) {
      condition = actorIsTalvex && row.restriction_note
        ? `Conditions : ${restrictionLabel(row.restriction_note)}`
        : "Conditions d'enregistrement particulières";
    }
    let priceLines: string[];
    if (!actorIsTalvex) {
      priceLines = ['Prix client : bientôt disponible'];
    } else if (row.provider_price) {
      const p = row.provider_price;
      priceLines = [
        `Coût Hostinger 1re année : ${formatMoney(p.first_year_cents, p.currency)}`,
        `Renouvellement : ${formatMoney(p.renewal_cents, p.currency)} / an · ${p.currency}`,
      ];
    } else {
      priceLines = ['Coût Hostinger : non disponible'];
    }
    return { label: 'Disponible', tone: 'success', condition, priceLines, showBuyPlaceholder: true };
  }
  if (row.status === 'not_offered') {
    return { label: 'Non proposée', tone: 'neutral', condition: `L'extension .${row.tld} n'est pas proposée.`, priceLines: [], showBuyPlaceholder: false };
  }
  if (row.status === 'unavailable') {
    return { label: 'Indisponible', tone: 'neutral', condition: null, priceLines: [], showBuyPlaceholder: false };
  }
  return { label: 'Impossible de vérifier', tone: 'warning', condition: null, priceLines: [], showBuyPlaceholder: false };
}

/* Ajoute une page aux resultats deja affiches (sans doublon, ordre conserve). */
export function appendRows(existing: SearchRow[], incoming: SearchRow[]): SearchRow[] {
  const seen = new Set(existing.map((row) => row.domain));
  return [...existing, ...incoming.filter((row) => !seen.has(row.domain))];
}

/* Nombre d'extensions restant a verifier (pour « Voir plus d'extensions »). */
export function remainingCount(page: SearchPage | null, shown: number): number | null {
  if (!page || page.total_tlds === null || page.next_offset === null) return null;
  return Math.max(0, page.total_tlds - shown);
}

/* Extensions reellement verifiees (la ligne « non proposee » n'en fait pas partie). */
export function checkedCount(rows: SearchRow[]): number {
  return rows.filter((row) => row.status !== 'not_offered').length;
}

/* Resume court pour les lecteurs d'ecran. */
export function searchSummary(allRows: SearchRow[]): string {
  const rows = allRows.filter((row) => row.status !== 'not_offered');
  const available = rows.filter((row) => row.status === 'available').length;
  return `${rows.length} extension${rows.length > 1 ? 's' : ''} vérifiée${rows.length > 1 ? 's' : ''}, ${available} disponible${available > 1 ? 's' : ''}.`;
}
