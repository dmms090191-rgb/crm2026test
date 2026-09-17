// Couche serveur Talvex -> Hostinger (LECTURE SEULE). Logique testable : toutes les dependances
// (authentification, droits, quotas, cache, client Hostinger) sont injectees par index.ts.
//
// Navigateur -> Talvex (cette fonction) -> Hostinger. Jamais navigateur -> Hostinger.
// Aucune action ici ne peut acheter, configurer un DNS, modifier un WHOIS ni renouveler.
// Aucune ecriture metier : seuls les compteurs de quota, la pause globale et le cache technique.
import { isUuid, parseDomainInput, parseSearchQuery, parseTld } from "./domainInput.ts";
import { ProviderError, type HostingerClient, type ProviderResponse } from "./hostingerClient.ts";
import {
  countAvailabilityRows,
  interpretAvailability,
  interpretBatchAvailability,
  listSellableTlds,
  orderSearchTlds,
  POPULAR_TLDS,
  type BatchAvailabilityRow,
  type SellableTld,
  parsePortfolio,
  pickDomainDetails,
  pickYearlyPrices,
  reconcilePortfolio,
  summarizeCatalogItems,
  type AvailabilityOutcome,
  type TalvexDomainRow,
} from "./providerData.ts";

/*
 * Quota en fenetre glissante de 60 s (public.reserve_domain_provider_call) :
 * Hostinger accepte 90 appels/min pour tout le compte ; Talvex s'arrete a 75 (marge de 15).
 * Groupes et Societes ensemble : 55 au plus, ce qui reserve au moins 20 appels a Talvex.
 * Une branche (Groupe + Societes filles) : 20. Un utilisateur : 10.
 */
export const LIMITS = {
  userPerMinute: 10,
  branchPerMinute: 20,
  tenantsPerMinute: 55,
  globalPerMinute: 75,
  availabilityTtlSeconds: 120,
  catalogTtlSeconds: 3600,
  catalogMissTtlSeconds: 600,
  unauthorizedBackoffSeconds: 120,
  // Recherche multi-extensions : 1 requete Hostinger par page (toutes les extensions de la page en une fois).
  // Mesures reelles : 10 extensions pour un nom neuf = 7 a 10 s ; 20 = erreurs 500 plus frequentes.
  searchPageSize: 10,
  searchMaxOffset: 2000,
  searchPageBudgetMs: 30000,
  sellableCatalogTtlSeconds: 21600,
  lowRemainingThreshold: 2,
  maxBodyBytes: 4096,
} as const;

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export interface Caller {
  id: string;
  /* Role lu dans app_metadata ; "disabled" si l'acces du compte a ete coupe (access_enabled = false). */
  role: string;
}

/*
 * Appelant a partir de l'utilisateur renvoye par Supabase Auth (getUser relit l'etat a jour).
 * Un compte dont l'acces a ete coupe (app_metadata.access_enabled = false) devient « disabled » : refuse.
 */
export function callerFromUser(user: { id?: unknown; app_metadata?: Record<string, unknown> | null } | null | undefined): Caller | null {
  if (!user || typeof user.id !== "string" || user.id === "") return null;
  if (user.app_metadata?.access_enabled === false) return { id: user.id, role: "disabled" };
  const role = user.app_metadata?.role;
  return { id: user.id, role: typeof role === "string" ? role : "" };
}

export interface QuotaDecision {
  allowed: boolean;
  refusal: string | null;
  retryAfterSeconds: number;
}

export interface HandlerDeps {
  getCaller(authHeader: string | null): Promise<Caller | null>;
  canSearchDomains(authHeader: string, companyId: string): Promise<boolean>;
  /* companyId : entreprise deja verifiee (branche calculee en base) ; null pour les actions Talvex. */
  consumeQuota(userId: string, companyId: string | null, isTalvex: boolean): Promise<QuotaDecision>;
  setBackoff(seconds: number, reason: "rate_limited" | "unauthorized"): Promise<void>;
  cacheGet(key: string): Promise<{ payload: unknown; fetchedAt: string } | null>;
  cachePut(key: string, kind: "availability" | "catalog", payload: unknown, ttlSeconds: number): Promise<void>;
  listTalvexDomains(): Promise<TalvexDomainRow[]>;
  hostinger: HostingerClient | null;
  now(): Date;
  log(event: Record<string, string | number | boolean | null>): void;
}

type Json = Record<string, unknown>;

function reply(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const DOMAIN_ROLES = new Set(["super_admin", "company_super_admin", "admin"]);
const TALVEX_ACTIONS = new Set(["provider_status", "catalog_price", "catalog_items", "availability_probe", "portfolio_list", "portfolio_domain"]);

export type UnavailableReason =
  | "provider_not_configured"
  | "rate_limited"
  | "busy"
  | "provider_unavailable"
  | "timeout"
  | "rejected_request"
  | "not_found";

type ProviderCall<T> =
  | { ok: true; data: T }
  /* providerFault : Hostinger a reellement echoue (5xx, reponse illisible, reseau, delai) — pas un refus Talvex. */
  | { ok: false; reason: UnavailableReason; retryAfterSeconds: number | null; fields: string[]; providerFault: boolean };

const failure = (reason: UnavailableReason, retryAfterSeconds: number | null = null, fields: string[] = [], providerFault = false) =>
  ({ ok: false as const, reason, retryAfterSeconds, fields, providerFault });

async function quietly(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // Une protection secondaire (pause, cache) ne doit jamais casser la reponse.
  }
}

/* Un appel Hostinger : configuration, reservation de quota, puis traduction des erreurs. */
async function callProvider<T>(
  deps: HandlerDeps,
  caller: Caller,
  companyId: string | null,
  action: string,
  run: (client: HostingerClient) => Promise<ProviderResponse<T>>,
): Promise<ProviderCall<T>> {
  if (!deps.hostinger) return failure("provider_not_configured");

  let quota: QuotaDecision;
  try {
    quota = await deps.consumeQuota(caller.id, companyId, caller.role === "super_admin");
  } catch {
    // Ferme par defaut : sans quota confirme, aucun appel Hostinger.
    deps.log({ action, outcome: "quota_check_failed" });
    return failure("provider_unavailable");
  }
  if (!quota.allowed) {
    deps.log({ action, outcome: `quota_${quota.refusal ?? "refused"}` });
    if (quota.refusal === "provider_backoff") return failure("provider_unavailable", quota.retryAfterSeconds);
    if (quota.refusal === "user_limit" || quota.refusal === "branch_limit") return failure("rate_limited", quota.retryAfterSeconds);
    return failure("busy", quota.retryAfterSeconds);
  }

  const startedAt = Date.now();
  try {
    const response = await run(deps.hostinger);
    const { remaining, resetSeconds } = response.rate;
    if (remaining !== null && remaining <= LIMITS.lowRemainingThreshold) {
      await quietly(() => deps.setBackoff(resetSeconds ?? 60, "rate_limited"));
    }
    deps.log({ action, outcome: "provider_ok", elapsed_ms: Date.now() - startedAt, rate_remaining: remaining });
    return { ok: true, data: response.data };
  } catch (error) {
    if (!(error instanceof ProviderError)) {
      deps.log({ action, outcome: "provider_unexpected_error", elapsed_ms: Date.now() - startedAt });
      return failure("provider_unavailable");
    }
    deps.log({ action, outcome: `provider_${error.code}`, http: error.httpStatus, correlation: error.correlationId, elapsed_ms: Date.now() - startedAt });
    switch (error.code) {
      case "rate_limited": {
        const wait = Math.min(error.retryAfterSeconds ?? 60, 3600);
        await quietly(() => deps.setBackoff(wait, "rate_limited"));
        return failure("busy", wait);
      }
      case "unauthorized":
        await quietly(() => deps.setBackoff(LIMITS.unauthorizedBackoffSeconds, "unauthorized"));
        return failure("provider_unavailable");
      case "forbidden_by_provider":
        // Refus limite a une ressource : pas de pause globale pour tout le monde.
        return failure("provider_unavailable");
      case "not_configured":
        return failure("provider_not_configured");
      case "timeout":
        return failure("timeout", null, [], true);
      case "invalid_request":
        return failure("rejected_request", null, error.fields);
      case "not_found":
        return failure("not_found");
      case "provider_error":
      case "bad_response":
      case "network":
        return failure("provider_unavailable", null, [], true);
      default:
        return failure("provider_unavailable");
    }
  }
}

/* ---------- Prix Hostinger (cout Talvex) : reserve a Talvex ---------- */

interface ProviderPricePayload {
  status: "found" | "not_found" | "ambiguous" | "unavailable";
  prices: Array<{ currency: string; first_year_cents: number; renewal_cents: number }>;
}

function isPricePayload(value: unknown): value is ProviderPricePayload {
  const v = value as ProviderPricePayload;
  return typeof value === "object" && value !== null && ["found", "not_found", "ambiguous"].includes(v.status) && Array.isArray(v.prices);
}

async function providerPrice(deps: HandlerDeps, caller: Caller, tld: string): Promise<ProviderPricePayload> {
  const key = `catalog:${tld}`;
  const cached = await deps.cacheGet(key);
  if (cached && isPricePayload(cached.payload)) return cached.payload;

  const call = await callProvider(deps, caller, null, "catalog_price", (client) => client.listDomainCatalog(tld));
  // Reponse hors specification (pas un tableau) : pas de prix, et surtout rien en cache.
  if (!call.ok || !Array.isArray(call.data)) return { status: "unavailable", prices: [] };

  const pick = pickYearlyPrices(call.data, tld);
  const payload: ProviderPricePayload = pick.status === "found"
    ? { status: "found", prices: pick.prices.map((p) => ({ currency: p.currency, first_year_cents: p.firstYearCents, renewal_cents: p.renewalCents })) }
    : { status: pick.status, prices: [] };
  await quietly(() => deps.cachePut(key, "catalog", payload, pick.status === "found" ? LIMITS.catalogTtlSeconds : LIMITS.catalogMissTtlSeconds));
  return payload;
}

/* ---------- Actions ---------- */

function isAvailabilityPayload(value: unknown): value is AvailabilityOutcome {
  const v = value as AvailabilityOutcome;
  return typeof value === "object" && value !== null && (v.status === "available" || v.status === "unavailable")
    && typeof v.restricted === "boolean" && Array.isArray(v.alternatives);
}

/* 422 de la verification : on ne conclut que si Hostinger designe clairement le champ en cause. */
function rejectionReason(fields: string[]): { status: "invalid" | "unknown"; reason: string } {
  if (fields.length > 0 && fields.every((f) => f === "tlds" || f.startsWith("tlds."))) return { status: "invalid", reason: "unsupported_extension" };
  if (fields.includes("domain")) return { status: "invalid", reason: "invalid_domain" };
  return { status: "unknown", reason: "provider_unavailable" };
}

async function checkAvailability(body: Json, caller: Caller, authHeader: string, deps: HandlerDeps): Promise<Response> {
  const companyId = body.company_id;
  if (!isUuid(companyId)) return reply(400, { ok: false, error: "invalid_request" });
  if (!(await deps.canSearchDomains(authHeader, companyId))) {
    deps.log({ action: "check_availability", outcome: "forbidden_company" });
    return reply(403, { ok: false, error: "forbidden" });
  }

  const isTalvex = caller.role === "super_admin";
  const nowIso = deps.now().toISOString();
  // Le cache de disponibilite est partage entre entreprises : seul Talvex le LIT. Un Groupe/Societe
  // passe toujours par son quota et par Hostinger ; sinon la reponse (vitesse, quota non consomme,
  // horodatage) revelerait qu'une autre entreprise vient de chercher le meme nom.
  const base = { client_price: null, alternatives: [] as string[], restricted: false, from_cache: false, checked_at: null as string | null, retry_after_seconds: null as number | null };
  const talvexExtras = (extra: Json = {}) => (isTalvex ? { provider_price: { status: "not_requested", prices: [] }, restriction_note: null, ...extra } : {});

  const input = parseDomainInput(body.domain);
  if (!input.ok) {
    return reply(200, { ok: true, result: { ...base, domain: null, status: "invalid", reason: input.error, ...talvexExtras() } });
  }

  const key = `availability:${input.domain}`;
  let outcome: AvailabilityOutcome | null = null;
  let checkedAt = nowIso;
  let fromCache = false;
  let rowCounts: Json | null = null;

  const cached = isTalvex ? await deps.cacheGet(key) : null;
  if (cached && isAvailabilityPayload(cached.payload)) {
    outcome = cached.payload;
    checkedAt = cached.fetchedAt;
    fromCache = true;
  } else {
    const call = await callProvider(deps, caller, companyId, "check_availability", (client) => client.checkAvailability(input.sld, input.tld, true));
    if (!call.ok) {
      if (call.reason === "rejected_request") {
        const rejected = rejectionReason(call.fields);
        return reply(200, { ok: true, result: { ...base, domain: input.domain, status: rejected.status, reason: rejected.reason, ...talvexExtras() } });
      }
      const reason = call.reason === "not_found" ? "provider_unavailable" : call.reason;
      return reply(200, { ok: true, result: { ...base, domain: input.domain, status: "unknown", reason, retry_after_seconds: call.retryAfterSeconds, ...talvexExtras() } });
    }
    outcome = interpretAvailability(input.domain, call.data);
    rowCounts = countAvailabilityRows(call.data);
    if (outcome.status !== "unknown") {
      const toCache = outcome;
      await quietly(() => deps.cachePut(key, "availability", toCache, LIMITS.availabilityTtlSeconds));
    }
  }

  const result: Json = {
    ...base,
    domain: input.domain,
    status: outcome.status,
    reason: outcome.status === "unknown" ? "provider_unavailable" : null,
    restricted: outcome.restricted,
    alternatives: outcome.alternatives,
    checked_at: isTalvex ? checkedAt : nowIso,
    from_cache: isTalvex ? fromCache : false,
  };
  if (isTalvex) {
    result.provider_rows = rowCounts;
    result.restriction_note = outcome.restrictionNote;
    result.provider_price = outcome.status === "available"
      ? await providerPrice(deps, caller, input.tld)
      : { status: "not_requested", prices: [] };
  }
  return reply(200, { ok: true, result });
}

async function catalogPrice(body: Json, caller: Caller, deps: HandlerDeps): Promise<Response> {
  const tld = parseTld(body.tld);
  if (!tld) return reply(400, { ok: false, error: "invalid_request" });
  if (!deps.hostinger) return reply(200, { ok: true, result: { tld, status: "unknown", reason: "provider_not_configured" } });
  const price = await providerPrice(deps, caller, tld);
  return reply(200, { ok: true, result: { tld, ...price } });
}

/* ---------- Recherche multi-extensions ---------- */

function isSellablePayload(value: unknown): value is { tlds: Array<{ tld: string; first_year_cents: number; renewal_cents: number; currency: string }> } {
  const v = value as { tlds?: unknown };
  return typeof value === "object" && value !== null && Array.isArray(v.tlds) && v.tlds.length > 0;
}

type CatalogLoad =
  | { ok: true; tlds: SellableTld[] }
  /* refused : refus Talvex (quota, pause, non configure) ; sinon panne ou reponse inutilisable chez Hostinger. */
  | { ok: false; refused: boolean; reason: UnavailableReason; retryAfterSeconds: number | null };

/* Extensions vendues par le compte (catalogue complet, cache serveur 6 h ; contient des couts : jamais renvoye tel quel). */
async function sellableCatalog(deps: HandlerDeps, caller: Caller, companyId: string | null): Promise<CatalogLoad> {
  const key = "catalog:.all";
  const cached = await deps.cacheGet(key);
  if (cached && isSellablePayload(cached.payload)) {
    return { ok: true, tlds: cached.payload.tlds.map((t) => ({ tld: t.tld, firstYearCents: t.first_year_cents, renewalCents: t.renewal_cents, currency: t.currency })) };
  }
  const call = await callProvider(deps, caller, companyId, "catalog_all", (client) => client.listDomainCatalogAll());
  if (!call.ok) {
    const refused = !call.providerFault && call.reason !== "rejected_request" && call.reason !== "not_found";
    return { ok: false, refused, reason: call.reason, retryAfterSeconds: call.retryAfterSeconds };
  }
  const list = listSellableTlds(call.data);
  if (!list || list.length === 0) return { ok: false, refused: false, reason: "provider_unavailable", retryAfterSeconds: null };
  const payload = { tlds: list.map((t) => ({ tld: t.tld, first_year_cents: t.firstYearCents, renewal_cents: t.renewalCents, currency: t.currency })) };
  await quietly(() => deps.cachePut(key, "catalog", payload, LIMITS.sellableCatalogTtlSeconds));
  return { ok: true, tlds: list };
}

/* 422 designant des extensions precises (« tlds.3 ») : indices a retirer pour un unique nouvel essai. */
function rejectedTldIndexes(fields: string[], count: number): number[] {
  const indexes = fields.map((f) => /^tlds\.(\d{1,3})$/.exec(f)).filter((m): m is RegExpExecArray => m !== null).map((m) => Number(m[1]));
  return indexes.length > 0 && indexes.length === fields.length && indexes.every((i) => i < count) ? indexes : [];
}

type PageCheck =
  | { ok: true; rows: BatchAvailabilityRow[] }
  | { ok: false; reason: UnavailableReason; retryAfterSeconds: number | null; invalidDomain: boolean };

/*
 * Une page d'extensions = 1 requete Hostinger. Constat reel (17/09) : UNE extension capricieuse (ex. .be pour
 * un nom libre) fait echouer tout le lot en erreur 500. Dans ce cas seulement, la page est coupee en deux
 * moities verifiees l'une apres l'autre (3 appels au plus, sous plafond de temps) ; ce qui echoue encore
 * reste « inconnu » sans bloquer le reste. Un refus Talvex (quota, pause) ne rappelle jamais Hostinger.
 */
async function checkPage(deps: HandlerDeps, caller: Caller, companyId: string, name: string, tlds: string[]): Promise<PageCheck> {
  const startedAt = Date.now();
  const unknownRows = (list: string[]) => interpretBatchAvailability(name, list, null);
  const merge = (checked: BatchAvailabilityRow[]) => {
    const byTld = new Map(checked.map((row) => [row.tld, row]));
    return tlds.map((tld) => byTld.get(tld) ?? unknownRows([tld])[0]);
  };

  const first = await callProvider(deps, caller, companyId, "search_domains", (client) => client.checkAvailabilityBatch(name, tlds));
  if (first.ok) return { ok: true, rows: interpretBatchAvailability(name, tlds, first.data) };

  if (first.reason === "rejected_request") {
    if (first.fields.includes("domain")) return { ok: false, reason: "rejected_request", retryAfterSeconds: null, invalidDomain: true };
    const rejected = rejectedTldIndexes(first.fields, tlds.length);
    if (rejected.length > 0 && rejected.length < tlds.length) {
      const kept = tlds.filter((_, index) => !rejected.includes(index));
      const retry = await callProvider(deps, caller, companyId, "search_domains_retry", (client) => client.checkAvailabilityBatch(name, kept));
      if (retry.ok) return { ok: true, rows: merge(interpretBatchAvailability(name, kept, retry.data)) };
    }
    return { ok: true, rows: unknownRows(tlds) };
  }

  if (!first.providerFault) {
    return { ok: false, reason: first.reason === "not_found" ? "provider_unavailable" : first.reason, retryAfterSeconds: first.retryAfterSeconds, invalidDomain: false };
  }
  // Delai deja depasse, ou page d'une seule extension : inutile d'insister.
  if (first.reason === "timeout" || tlds.length < 2) return { ok: true, rows: unknownRows(tlds) };

  const middle = Math.ceil(tlds.length / 2);
  const checked: BatchAvailabilityRow[] = [];
  for (const half of [tlds.slice(0, middle), tlds.slice(middle)]) {
    if (Date.now() - startedAt > LIMITS.searchPageBudgetMs) break;
    const call = await callProvider(deps, caller, companyId, "search_domains_split", (client) => client.checkAvailabilityBatch(name, half));
    if (call.ok) checked.push(...interpretBatchAvailability(name, half, call.data));
    else if (!call.providerFault) break;
  }
  return { ok: true, rows: merge(checked) };
}

async function searchDomains(body: Json, caller: Caller, authHeader: string, deps: HandlerDeps): Promise<Response> {
  const companyId = body.company_id;
  if (!isUuid(companyId)) return reply(400, { ok: false, error: "invalid_request" });
  const offset = body.offset === undefined ? 0 : body.offset;
  if (!Number.isSafeInteger(offset) || (offset as number) < 0 || (offset as number) > LIMITS.searchMaxOffset) {
    return reply(400, { ok: false, error: "invalid_request" });
  }
  if (!(await deps.canSearchDomains(authHeader, companyId))) {
    deps.log({ action: "search_domains", outcome: "forbidden_company" });
    return reply(403, { ok: false, error: "forbidden" });
  }

  const isTalvex = caller.role === "super_admin";
  const empty = { results: [] as Json[], offset, next_offset: null as number | null, total_tlds: null as number | null, retry_after_seconds: null as number | null };
  const query = parseSearchQuery(body.query);
  if (!query.ok) {
    return reply(200, { ok: true, result: { status: "invalid", reason: query.error, name: null, requested_tld: null, requested_tld_offered: null, catalog_status: null, ...empty } });
  }

  const catalogLoad = await sellableCatalog(deps, caller, companyId);
  const start = offset as number;
  // Refus Talvex (quota, pause), ou panne du catalogue sur une page « Voir plus » : rien n'est affirme,
  // la meme page reste a reessayer. Panne sur la 1re page : repli sur les extensions principales.
  if (!catalogLoad.ok && (catalogLoad.refused || start > 0)) {
    return reply(200, { ok: true, result: {
      status: "unknown", reason: catalogLoad.reason === "not_found" || catalogLoad.reason === "rejected_request" ? "provider_unavailable" : catalogLoad.reason,
      name: query.name, requested_tld: query.requestedTld, requested_tld_offered: null, catalog_status: "unavailable", total_tlds: null,
      results: [], offset: start, next_offset: start, retry_after_seconds: catalogLoad.retryAfterSeconds,
    } });
  }
  const catalog = catalogLoad.ok ? catalogLoad.tlds : null;
  const ordered = catalog ? orderSearchTlds(catalog.map((t) => t.tld), query.requestedTld) : [...POPULAR_TLDS];
  // Premiere page : extensions principales (+ celle saisie) ; ensuite des pages de taille fixe.
  const firstPageSize = ordered.findIndex((tld) => !POPULAR_TLDS.includes(tld) && tld !== query.requestedTld);
  const firstCount = firstPageSize === -1 ? ordered.length : firstPageSize;
  const pageTlds = !catalog
    ? (start === 0 ? ordered : [])
    : start === 0 ? ordered.slice(0, firstCount) : ordered.slice(start, start + LIMITS.searchPageSize);
  const end = start + pageTlds.length;
  const nextOffset = catalog && pageTlds.length > 0 && end < ordered.length ? end : null;

  const header = {
    name: query.name,
    requested_tld: query.requestedTld,
    // L'extension saisie n'est jamais presentee comme achetable si le compte ne la vend pas.
    requested_tld_offered: query.requestedTld ? (catalog ? catalog.some((t) => t.tld === query.requestedTld) : null) : null,
    catalog_status: catalog ? "ok" : "unavailable",
    total_tlds: catalog ? ordered.length : null,
  };
  if (pageTlds.length === 0) {
    return reply(200, { ok: true, result: { status: "ok", ...header, results: [], offset: start, next_offset: null, retry_after_seconds: null } });
  }

  const page = await checkPage(deps, caller, companyId, query.name, pageTlds);
  if (!page.ok) {
    if (page.invalidDomain) {
      return reply(200, { ok: true, result: { status: "invalid", reason: "invalid_domain", ...header, ...empty, offset: start } });
    }
    // Refus Talvex (quota, pause) : rien n'est affirme ; next_offset = page courante pour reessayer au meme endroit.
    return reply(200, { ok: true, result: { status: "unknown", reason: page.reason, ...header, results: [], offset: start, next_offset: start, retry_after_seconds: page.retryAfterSeconds } });
  }

  const prices = new Map((catalog ?? []).map((t) => [t.tld, t]));
  const results = page.rows.map((row) => {
    const item: Json = {
      domain: row.domain,
      tld: row.tld,
      status: row.status,
      restricted: row.restricted,
      popular: POPULAR_TLDS.includes(row.tld),
      client_price: null,
    };
    if (isTalvex) {
      const price = prices.get(row.tld);
      item.restriction_note = row.restrictionNote;
      item.provider_price = row.status === "available" && price
        ? { currency: price.currency, first_year_cents: price.firstYearCents, renewal_cents: price.renewalCents }
        : null;
    }
    return item;
  });

  // Extension saisie mais non vendue par le compte : ligne explicite « non proposee » en tete de la 1re page
  // (aucun appel Hostinger pour elle), jamais un faux « indisponible ».
  if (start === 0 && query.requestedTld && header.requested_tld_offered === false) {
    results.unshift({
      domain: `${query.name}.${query.requestedTld}`, tld: query.requestedTld, status: "not_offered",
      restricted: false, popular: false, client_price: null,
      ...(isTalvex ? { restriction_note: null, provider_price: null } : {}),
    });
  }

  return reply(200, { ok: true, result: { status: "ok", ...header, results, offset: start, next_offset: nextOffset, retry_after_seconds: null } });
}

/* Diagnostic Talvex : disponibilite groupee sur une liste d'extensions choisie (lecture seule, 25 max). */
async function availabilityProbe(body: Json, caller: Caller, deps: HandlerDeps): Promise<Response> {
  const query = parseSearchQuery(body.name);
  const rawTlds = Array.isArray(body.tlds) ? body.tlds : [];
  const tlds = rawTlds.map(parseTld);
  if (!query.ok || tlds.length === 0 || tlds.length > 25 || tlds.some((t) => t === null)) return reply(400, { ok: false, error: "invalid_request" });
  const list = tlds as string[];
  const call = await callProvider(deps, caller, null, "availability_probe", (client) => client.checkAvailabilityBatch(query.name, list));
  if (!call.ok) return reply(200, { ok: true, result: { status: "unknown", reason: call.reason, fields: call.fields, tlds: list } });
  return reply(200, { ok: true, result: { status: "ok", rows: countAvailabilityRows(call.data), results: interpretBatchAvailability(query.name, list, call.data).map((r) => ({ tld: r.tld, status: r.status })) } });
}

/* Diagnostic Talvex : articles du catalogue pour une extension + regle de correspondance appliquee. */
async function catalogItems(body: Json, caller: Caller, deps: HandlerDeps): Promise<Response> {
  const tld = parseTld(body.tld);
  if (!tld) return reply(400, { ok: false, error: "invalid_request" });
  const call = await callProvider(deps, caller, null, "catalog_items", (client) => client.listDomainCatalog(tld));
  if (!call.ok) return reply(200, { ok: true, result: { tld, status: "unknown", reason: call.reason, retry_after_seconds: call.retryAfterSeconds } });
  const summary = summarizeCatalogItems(call.data);
  if (!summary) return reply(200, { ok: true, result: { tld, status: "unknown", reason: "provider_unavailable" } });
  const pick = pickYearlyPrices(call.data, tld);
  return reply(200, {
    ok: true,
    result: {
      tld,
      status: "ok",
      ...summary,
      match: pick.status === "found"
        ? { status: "found", item_id: pick.prices[0].itemId, prices: pick.prices.map((p) => ({ price_id: p.priceId, currency: p.currency, first_year_cents: p.firstYearCents, renewal_cents: p.renewalCents })) }
        : { status: pick.status },
    },
  });
}

async function portfolioList(caller: Caller, deps: HandlerDeps): Promise<Response> {
  const call = await callProvider(deps, caller, null, "portfolio_list", (client) => client.listPortfolio());
  if (!call.ok) return reply(200, { ok: true, result: { status: "unknown", reason: call.reason, retry_after_seconds: call.retryAfterSeconds } });
  const parsed = parsePortfolio(call.data);
  if (!parsed) return reply(200, { ok: true, result: { status: "unknown", reason: "provider_unavailable", retry_after_seconds: null } });

  const reconciliation = reconcilePortfolio(parsed.domains, await deps.listTalvexDomains());
  return reply(200, {
    ok: true,
    result: {
      status: "ok",
      checked_at: deps.now().toISOString(),
      domains: parsed.domains.map((d) => ({
        provider_domain_id: d.providerDomainId, domain: d.domain, type: d.type, status: d.status, created_at: d.createdAt, expires_at: d.expiresAt,
      })),
      unclaimed_free_domains: parsed.unclaimedFreeDomains,
      ignored_rows: parsed.ignoredRows,
      reconciliation: {
        linked: reconciliation.linked.map((l) => ({
          domain: l.domain, site_domain_id: l.siteDomainId, company_id: l.companyId, provider_status: l.providerStatus,
          provider_expires_at: l.providerExpiresAt, talvex_registration_status: l.talvexRegistrationStatus, differences: l.differences,
        })),
        unlinked: reconciliation.unlinked.map((u) => ({ domain: u.domain, provider_status: u.providerStatus, provider_expires_at: u.providerExpiresAt })),
        conflicts: reconciliation.conflicts.map((c) => ({ domain: c.domain, site_domain_id: c.siteDomainId, company_id: c.companyId, reason: c.reason })),
        missing_at_provider: reconciliation.missingAtProvider.map((m) => ({
          domain: m.domain, site_domain_id: m.siteDomainId, company_id: m.companyId, talvex_registration_status: m.talvexRegistrationStatus,
        })),
      },
    },
  });
}

async function portfolioDomain(body: Json, caller: Caller, deps: HandlerDeps): Promise<Response> {
  const input = parseDomainInput(body.domain);
  if (!input.ok) return reply(400, { ok: false, error: "invalid_request" });
  const call = await callProvider(deps, caller, null, "portfolio_domain", (client) => client.getPortfolioDomain(input.domain));
  if (!call.ok) {
    if (call.reason === "not_found") return reply(200, { ok: true, result: { domain: input.domain, status: "not_in_portfolio" } });
    return reply(200, { ok: true, result: { domain: input.domain, status: "unknown", reason: call.reason, retry_after_seconds: call.retryAfterSeconds } });
  }
  const details = pickDomainDetails(call.data, input.domain);
  if (!details) return reply(200, { ok: true, result: { domain: input.domain, status: "unknown", reason: "provider_unavailable" } });
  const link = (await deps.listTalvexDomains()).find(
    (row) => row.domainName === input.domain && row.registrationStatus !== "failed" && row.registrationStatus !== "released",
  );
  return reply(200, {
    ok: true,
    result: {
      domain: input.domain,
      status: "in_portfolio",
      provider: {
        status: details.status, registered_at: details.registeredAt, expires_at: details.expiresAt,
        is_locked: details.isLocked, is_privacy_protected: details.isPrivacyProtected, name_servers: details.nameServers,
      },
      talvex_link: link
        ? { site_domain_id: link.id, company_id: link.companyId, provider: link.provider, registration_status: link.registrationStatus, connection_status: link.connectionStatus }
        : null,
    },
  });
}

async function readJsonBody(req: Request): Promise<Json | null> {
  const text = await req.text();
  if (text.length === 0 || text.length > LIMITS.maxBodyBytes) return null;
  try {
    const value = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;
  } catch {
    return null;
  }
}

export async function handleRequest(req: Request, deps: HandlerDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return reply(405, { ok: false, error: "method_not_allowed" });

  let action = "unknown";
  try {
    const authHeader = req.headers.get("Authorization");
    const caller = await deps.getCaller(authHeader);
    if (!caller || !authHeader) return reply(401, { ok: false, error: "unauthenticated" });
    if (!DOMAIN_ROLES.has(caller.role)) {
      deps.log({ action, outcome: "forbidden_role" });
      return reply(403, { ok: false, error: "forbidden" });
    }

    const body = await readJsonBody(req);
    if (!body || typeof body.action !== "string") return reply(400, { ok: false, error: "invalid_request" });
    action = body.action.slice(0, 40);

    if (TALVEX_ACTIONS.has(action) && caller.role !== "super_admin") {
      deps.log({ action, outcome: "forbidden_role" });
      return reply(403, { ok: false, error: "forbidden" });
    }

    switch (action) {
      case "check_availability":
        return await checkAvailability(body, caller, authHeader, deps);
      case "search_domains":
        return await searchDomains(body, caller, authHeader, deps);
      case "provider_status":
        return reply(200, { ok: true, result: { configured: deps.hostinger !== null } });
      case "catalog_price":
        return await catalogPrice(body, caller, deps);
      case "catalog_items":
        return await catalogItems(body, caller, deps);
      case "availability_probe":
        return await availabilityProbe(body, caller, deps);
      case "portfolio_list":
        return await portfolioList(caller, deps);
      case "portfolio_domain":
        return await portfolioDomain(body, caller, deps);
      default:
        return reply(400, { ok: false, error: "invalid_request" });
    }
  } catch {
    deps.log({ action, outcome: "internal_error" });
    return reply(500, { ok: false, error: "internal_error" });
  }
}
