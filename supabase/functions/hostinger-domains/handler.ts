// Couche serveur Talvex -> Hostinger (LECTURE SEULE). Logique testable : toutes les dependances
// (authentification, droits, quotas, cache, client Hostinger) sont injectees par index.ts.
//
// Navigateur -> Talvex (cette fonction) -> Hostinger. Jamais navigateur -> Hostinger.
// Aucune action ici ne peut acheter, configurer un DNS, modifier un WHOIS ni renouveler.
// Aucune ecriture metier : seuls les compteurs de quota, la pause globale et le cache technique.
import { isUuid, parseDomainInput, parseTld } from "./domainInput.ts";
import { ProviderError, type HostingerClient, type ProviderResponse } from "./hostingerClient.ts";
import {
  countAvailabilityRows,
  interpretAvailability,
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
const TALVEX_ACTIONS = new Set(["provider_status", "catalog_price", "catalog_items", "portfolio_list", "portfolio_domain"]);

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
  | { ok: false; reason: UnavailableReason; retryAfterSeconds: number | null; fields: string[] };

const failure = (reason: UnavailableReason, retryAfterSeconds: number | null = null, fields: string[] = []) =>
  ({ ok: false as const, reason, retryAfterSeconds, fields });

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
        return failure("timeout");
      case "invalid_request":
        return failure("rejected_request", null, error.fields);
      case "not_found":
        return failure("not_found");
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
      case "provider_status":
        return reply(200, { ok: true, result: { configured: deps.hostinger !== null } });
      case "catalog_price":
        return await catalogPrice(body, caller, deps);
      case "catalog_items":
        return await catalogItems(body, caller, deps);
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
