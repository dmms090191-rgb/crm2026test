// Interpretation des reponses Hostinger (module pur). Tout champ inattendu est ignore ;
// en cas de doute, le resultat est « inconnu » : jamais de disponibilite ni de prix inventes.
import { isValidDomainName, normalizeDomainName, parseTld } from "./domainInput.ts";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/* ---------- Disponibilite ---------- */

export type AvailabilityStatus = "available" | "unavailable" | "unknown";

export interface AvailabilityOutcome {
  status: AvailabilityStatus;
  restricted: boolean;
  restrictionNote: string | null;
  alternatives: string[];
}

/* Decompte de diagnostic (Talvex) : forme reelle de la reponse, sans aucun contenu. */
export function countAvailabilityRows(data: unknown) {
  if (!Array.isArray(data)) return { rows: null, alternative_rows: null, available_alternative_rows: null };
  const rows = data.filter(isObj);
  return {
    rows: rows.length,
    alternative_rows: rows.filter((r) => r.is_alternative === true).length,
    available_alternative_rows: rows.filter((r) => r.is_alternative === true && r.is_available === true).length,
  };
}

const MAX_ALTERNATIVES = 5;

/* Reponse de POST /api/domains/v1/availability : [{ domain, is_available, is_alternative, restriction }]. */
export function interpretAvailability(requestedDomain: string, data: unknown): AvailabilityOutcome {
  const unknown: AvailabilityOutcome = { status: "unknown", restricted: false, restrictionNote: null, alternatives: [] };
  if (!Array.isArray(data)) return unknown;
  const rows = data.filter(isObj);

  const exact = rows.filter((row) => row.is_alternative !== true && normalizeDomainName(row.domain) === requestedDomain);
  if (exact.length !== 1 || typeof exact[0].is_available !== "boolean") return unknown;
  const match = exact[0];

  const note = typeof match.restriction === "string" && match.restriction.trim() !== "" ? match.restriction.trim().slice(0, 300) : null;
  const alternatives: string[] = [];
  for (const row of rows) {
    if (row.is_alternative !== true || row.is_available !== true) continue;
    const name = normalizeDomainName(row.domain);
    if (!name || name === requestedDomain || !isValidDomainName(name) || alternatives.includes(name)) continue;
    alternatives.push(name);
    if (alternatives.length === MAX_ALTERNATIVES) break;
  }

  return {
    status: match.is_available ? "available" : "unavailable",
    restricted: note !== null,
    restrictionNote: note,
    alternatives,
  };
}

/* ---------- Catalogue (prix Hostinger = cout Talvex) ---------- */

export interface ProviderYearlyPrice {
  currency: string;
  firstYearCents: number;
  renewalCents: number;
  priceId: string;
  itemId: string;
}

export type CatalogPriceResult =
  | { status: "found"; prices: ProviderYearlyPrice[] }
  | { status: "not_found" | "ambiguous" };

/*
 * Nommage reel constate le 17/09 (compte Hostinger France) : ".COM Domain", ".COM.CO Domain",
 * ".COMPANY Domain", ".COMPUTER Domain Transfer". Regle stricte = nom exact ".TLD" ou ".TLD Domain".
 */
function namesTld(name: unknown, tld: string, strict: boolean): boolean {
  if (typeof name !== "string") return false;
  const value = name.trim().toLowerCase().replace(/\s+/g, " ");
  const target = `.${tld}`;
  if (value === target || value === `${target} domain`) return true;
  if (strict || !value.startsWith(target)) return false;
  const rest = value.slice(target.length);
  return /^[\s(]/.test(rest) && !/transfer|renew/.test(rest);
}

/*
 * Reponse de GET /api/billing/v1/catalog?category=DOMAIN&name=.TLD* : articles et prix (centimes).
 * Regle volontairement stricte : un seul article dont le nom designe exactement l'extension,
 * prix d'une periode d'un an, une seule ligne par devise. Sinon : pas de prix.
 */
export function pickYearlyPrices(data: unknown, tld: string): CatalogPriceResult {
  if (!Array.isArray(data)) return { status: "not_found" };
  const domainItems = data.filter((item) => isObj(item) && String(item.category ?? "").toUpperCase() === "DOMAIN") as Obj[];

  let candidates = domainItems.filter((item) => namesTld(item.name, tld, true));
  if (candidates.length === 0) candidates = domainItems.filter((item) => namesTld(item.name, tld, false));
  if (candidates.length === 0) return { status: "not_found" };
  if (candidates.length > 1) return { status: "ambiguous" };

  const item = candidates[0];
  if (typeof item.id !== "string" || !Array.isArray(item.prices)) return { status: "not_found" };

  const byCurrency = new Map<string, ProviderYearlyPrice[]>();
  for (const price of item.prices) {
    if (!isObj(price)) continue;
    if (price.period !== 1 || price.period_unit !== "year") continue;
    if (typeof price.id !== "string" || typeof price.currency !== "string" || !/^[A-Z]{3}$/.test(price.currency)) continue;
    if (!Number.isSafeInteger(price.price) || (price.price as number) < 0) continue;
    const first = Number.isSafeInteger(price.first_period_price) && (price.first_period_price as number) >= 0
      ? (price.first_period_price as number)
      : (price.price as number);
    const list = byCurrency.get(price.currency) ?? [];
    list.push({ currency: price.currency, firstYearCents: first, renewalCents: price.price as number, priceId: price.id, itemId: item.id });
    byCurrency.set(price.currency, list);
  }

  const prices: ProviderYearlyPrice[] = [];
  for (const list of byCurrency.values()) {
    if (list.length !== 1) return { status: "ambiguous" };
    prices.push(list[0]);
  }
  return prices.length === 0 ? { status: "not_found" } : { status: "found", prices };
}

/*
 * Diagnostic Talvex : articles bruts du catalogue pour une extension (identifiants, noms, periodes, devises),
 * afin de verifier la correspondance article <-> extension. Tronque et nettoye ; aucune donnee de compte.
 */
export function summarizeCatalogItems(data: unknown) {
  if (!Array.isArray(data)) return null;
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
  const int = (v: unknown) => (Number.isSafeInteger(v) ? (v as number) : null);
  return {
    total: data.length,
    items: data.filter(isObj).slice(0, 30).map((item) => ({
      id: text(item.id, 100),
      name: text(item.name, 100),
      category: text(item.category, 30),
      prices: (Array.isArray(item.prices) ? item.prices : []).filter(isObj).slice(0, 20).map((p) => ({
        id: text(p.id, 100),
        name: text(p.name, 100),
        currency: text(p.currency, 3),
        price_cents: int(p.price),
        first_period_price_cents: int(p.first_period_price),
        period: int(p.period),
        period_unit: text(p.period_unit, 10),
      })),
    })),
  };
}

/* ---------- Recherche multi-extensions ---------- */

/* Extensions affichees en premier (si le compte les vend reellement). */
export const POPULAR_TLDS: readonly string[] = ["com", "fr", "net", "org", "eu", "io"];
/* Ordre de priorite des extensions suivantes ; toutes les autres viennent ensuite par ordre alphabetique. */
const SECONDARY_TLDS: readonly string[] = [
  "co", "info", "shop", "store", "online", "site", "app", "dev", "tech", "pro", "biz", "me", "xyz",
  "be", "ch", "de", "es", "it", "nl", "pt", "co.uk", "uk", "ca", "us",
];

export interface SellableTld {
  tld: string;
  firstYearCents: number;
  renewalCents: number;
  currency: string;
}

/*
 * Extensions REELLEMENT vendues par le compte, d'apres GET /api/billing/v1/catalog?category=DOMAIN.
 * Nommage reel : ".COM Domain" (achat) ; les ".XXX Domain Transfer" sont exclus. Il faut un prix sur 1 an
 * dans une devise unique ; une extension ambigue (plusieurs articles) est ecartee plutot que devinee.
 */
export function listSellableTlds(data: unknown): SellableTld[] | null {
  if (!Array.isArray(data)) return null;
  const byTld = new Map<string, SellableTld[]>();
  for (const item of data) {
    if (!isObj(item) || typeof item.name !== "string") continue;
    const match = /^\.([a-z0-9][a-z0-9.-]*[a-z0-9])(?: domain)?$/i.exec(item.name.trim().replace(/\s+/g, " "));
    if (!match) continue;
    const tld = parseTld(match[1]);
    if (!tld) continue;
    const picked = pickYearlyPrices([item], tld);
    if (picked.status !== "found" || picked.prices.length !== 1) continue;
    const p = picked.prices[0];
    byTld.set(tld, [...(byTld.get(tld) ?? []), { tld, firstYearCents: p.firstYearCents, renewalCents: p.renewalCents, currency: p.currency }]);
  }
  const list: SellableTld[] = [];
  for (const entries of byTld.values()) if (entries.length === 1) list.push(entries[0]);
  return list;
}

/*
 * Ordre de recherche : extension saisie EN PREMIER (si vendue), puis les principales (.com .fr .net .org .eu .io),
 * les prioritaires, et enfin toutes les autres (alphabetique). Saisir une extension ne restreint jamais la recherche.
 */
export function orderSearchTlds(sellable: string[], requestedTld: string | null): string[] {
  const available = new Set(sellable);
  const ordered: string[] = [];
  const push = (tld: string) => {
    if (available.has(tld) && !ordered.includes(tld)) ordered.push(tld);
  };
  if (requestedTld) push(requestedTld);
  POPULAR_TLDS.forEach(push);
  SECONDARY_TLDS.forEach(push);
  [...available].sort().forEach(push);
  return ordered;
}

export interface BatchAvailabilityRow {
  tld: string;
  domain: string;
  status: AvailabilityStatus;
  restricted: boolean;
  restrictionNote: string | null;
}

/* Reponse groupee : une ligne par extension demandee ; une extension absente de la reponse reste « inconnue ». */
export function interpretBatchAvailability(name: string, tlds: string[], data: unknown): BatchAvailabilityRow[] {
  const rows = Array.isArray(data) ? data : null;
  return tlds.map((tld) => {
    const domain = `${name}.${tld}`;
    const outcome = rows ? interpretAvailability(domain, rows) : { status: "unknown" as const, restricted: false, restrictionNote: null };
    return { tld, domain, status: outcome.status, restricted: outcome.restricted, restrictionNote: outcome.restrictionNote };
  });
}

/* ---------- Portefeuille ---------- */

export interface ProviderDomain {
  providerDomainId: number | null;
  domain: string;
  type: string | null;
  status: string | null;
  createdAt: string | null;
  expiresAt: string | null;
}

export interface PortfolioParse {
  domains: ProviderDomain[];
  unclaimedFreeDomains: number;
  ignoredRows: number;
}

const str = (v: unknown, max = 64): string | null => (typeof v === "string" && v.length <= max ? v : null);

/*
 * Reponse de GET /api/domains/v1/portfolio : tableau simple [{ id, domain, type, status, created_at, expires_at }]
 * (DomainCollection, sans pagination dans la specification). Toute autre forme est refusee : un portefeuille
 * partiel ne doit jamais passer pour complet.
 */
export function parsePortfolio(data: unknown): PortfolioParse | null {
  if (!Array.isArray(data)) return null;
  const rows = data;
  const result: PortfolioParse = { domains: [], unclaimedFreeDomains: 0, ignoredRows: 0 };
  for (const row of rows) {
    if (!isObj(row)) { result.ignoredRows++; continue; }
    if (row.domain === null) { result.unclaimedFreeDomains++; continue; }
    const name = normalizeDomainName(row.domain);
    if (!name || !isValidDomainName(name)) { result.ignoredRows++; continue; }
    result.domains.push({
      providerDomainId: Number.isSafeInteger(row.id) ? (row.id as number) : null,
      domain: name,
      type: str(row.type),
      status: str(row.status),
      createdAt: str(row.created_at),
      expiresAt: str(row.expires_at),
    });
  }
  return result;
}

const PORTFOLIO_STATUSES = ["active", "pending_setup", "expired", "requested", "pending_verification", "deleted", "suspended", "failed"];

/*
 * Detail GET /api/domains/v1/portfolio/{domain} : sous-ensemble utile, sans les contacts WHOIS.
 * Exige le domaine demande et un statut documente, sinon aucune affirmation (null).
 */
export function pickDomainDetails(data: unknown, expectedDomain: string) {
  if (!isObj(data)) return null;
  if (normalizeDomainName(data.domain) !== expectedDomain) return null;
  if (typeof data.status !== "string" || !PORTFOLIO_STATUSES.includes(data.status)) return null;
  const ns = isObj(data.name_servers) ? data.name_servers : {};
  return {
    domain: expectedDomain,
    status: str(data.status),
    registeredAt: str(data.registered_at),
    expiresAt: str(data.expires_at),
    isLocked: typeof data.is_locked === "boolean" ? data.is_locked : null,
    isPrivacyProtected: typeof data.is_privacy_protected === "boolean" ? data.is_privacy_protected : null,
    nameServers: [str(ns.ns1, 253), str(ns.ns2, 253)].filter((v): v is string => v !== null),
  };
}

/* ---------- Rapprochement portefeuille <-> site_domains (lecture seule) ---------- */

export interface TalvexDomainRow {
  id: string;
  companyId: string;
  domainName: string;
  provider: "hostinger" | "external";
  registrationStatus: string;
  connectionStatus: string;
  expiresAt: string | null;
  providerDomainId: string | null;
}

export interface Reconciliation {
  linked: Array<{
    domain: string;
    siteDomainId: string;
    companyId: string;
    providerStatus: string | null;
    providerExpiresAt: string | null;
    talvexRegistrationStatus: string;
    differences: string[];
  }>;
  /* Present chez Hostinger, rattache a aucune entreprise : JAMAIS attribue automatiquement. */
  unlinked: Array<{ domain: string; providerStatus: string | null; providerExpiresAt: string | null }>;
  /*
   * Verification manuelle requise : declare « externe » chez Talvex alors qu'il est dans le compte central,
   * identifiant Hostinger different de celui enregistre (domaine re-enregistre, par exemple),
   * ou plusieurs lignes Hostinger pour ce nom sans identifiant enregistre pour les departager.
   */
  conflicts: Array<{ domain: string; siteDomainId: string; companyId: string; reason: "declared_external" | "provider_id_mismatch" | "multiple_provider_rows" }>;
  missingAtProvider: Array<{ domain: string; siteDomainId: string; companyId: string; talvexRegistrationStatus: string }>;
}

const EXPECTED_REGISTRATION: Record<string, string[]> = {
  active: ["registered"],
  expired: ["expired"],
  suspended: ["suspended"],
  pending_setup: ["pending"],
  requested: ["pending"],
  pending_verification: ["pending"],
  failed: ["failed"],
  deleted: ["released", "transfer_out"],
};

const sameDay = (a: string | null, b: string | null): boolean => {
  if (!a || !b) return a === b;
  const da = new Date(a.replace(" ", "T")), db = new Date(b.replace(" ", "T"));
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return da.toISOString().slice(0, 10) === db.toISOString().slice(0, 10);
};

/*
 * Correspondance par nom EXACT uniquement avec des lignes site_domains deja creees par Talvex
 * (rattachement explicite anterieur). Aucune ecriture, aucune attribution deduite d'un nom.
 */
export function reconcilePortfolio(providerDomains: ProviderDomain[], talvexRows: TalvexDomainRow[]): Reconciliation {
  const live = talvexRows.filter((row) => row.registrationStatus !== "failed" && row.registrationStatus !== "released");
  const byName = new Map(live.map((row) => [row.domainName, row]));
  const seen = new Set<string>();
  const result: Reconciliation = { linked: [], unlinked: [], conflicts: [], missingAtProvider: [] };

  // Un meme nom peut figurer plusieurs fois au portefeuille (ancienne inscription supprimee, transfert) :
  // on raisonne par nom, jamais ligne par ligne.
  const byProviderName = new Map<string, ProviderDomain[]>();
  for (const pd of providerDomains) byProviderName.set(pd.domain, [...(byProviderName.get(pd.domain) ?? []), pd]);

  for (const [name, entries] of byProviderName) {
    seen.add(name);
    const row = byName.get(name);
    if (!row) {
      const shown = entries.find((e) => e.status !== "deleted") ?? entries[0];
      result.unlinked.push({ domain: name, providerStatus: shown.status, providerExpiresAt: shown.expiresAt });
      continue;
    }
    if (row.provider !== "hostinger") {
      result.conflicts.push({ domain: name, siteDomainId: row.id, companyId: row.companyId, reason: "declared_external" });
      continue;
    }
    let pd: ProviderDomain | undefined;
    if (row.providerDomainId !== null) {
      pd = entries.find((e) => e.providerDomainId !== null && String(e.providerDomainId) === row.providerDomainId)
        ?? (entries.length === 1 && entries[0].providerDomainId === null ? entries[0] : undefined);
      if (!pd) {
        result.conflicts.push({ domain: name, siteDomainId: row.id, companyId: row.companyId, reason: "provider_id_mismatch" });
        continue;
      }
    } else {
      if (entries.length > 1) {
        result.conflicts.push({ domain: name, siteDomainId: row.id, companyId: row.companyId, reason: "multiple_provider_rows" });
        continue;
      }
      pd = entries[0];
    }
    const differences: string[] = [];
    const expected = pd.status ? EXPECTED_REGISTRATION[pd.status] : undefined;
    if (!expected || !expected.includes(row.registrationStatus)) differences.push("registration_status");
    if (!sameDay(pd.expiresAt, row.expiresAt)) differences.push("expires_at");
    if (row.providerDomainId === null) differences.push("provider_domain_id_unknown");
    result.linked.push({
      domain: pd.domain,
      siteDomainId: row.id,
      companyId: row.companyId,
      providerStatus: pd.status,
      providerExpiresAt: pd.expiresAt,
      talvexRegistrationStatus: row.registrationStatus,
      differences,
    });
  }

  for (const row of live) {
    if (row.provider === "hostinger" && !seen.has(row.domainName)) {
      result.missingAtProvider.push({ domain: row.domainName, siteDomainId: row.id, companyId: row.companyId, talvexRegistrationStatus: row.registrationStatus });
    }
  }
  return result;
}
