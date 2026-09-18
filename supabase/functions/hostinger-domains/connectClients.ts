// Clients du raccordement : zone DNS Hostinger et projet Vercel.
//
// Volontairement SEPARE de hostingerClient.ts, qui reste strictement en lecture seule.
// Ici il existe des ecritures, donc chaque route est nommee une par une et rien d'autre n'est joignable.
//
// Interdit absolu, jamais implemente : POST /api/dns/v1/zones/{domain}/reset — il remet la zone aux
// valeurs par defaut et emporterait la messagerie.
//
// DELETE /api/dns/v1/zones/{domain} EST implemente, mais uniquement pour retirer des ENREGISTREMENTS
// nommes un par un (corps « filters » : couples nom+type). Il ne supprime jamais le domaine ni la zone.
// Trois garde-fous : liste blanche de couples (dnsRelease.buildDeletePayload), refus d'une liste de
// filtres vide (qui viderait la zone), et verification prealable que la valeur en place est bien celle
// posee par Talvex. Aucune route du cycle de vie du domaine (/api/domains/...) n'est joignable ici.
import { ProviderError } from "./hostingerClient.ts";

const HOSTINGER_BASE = "https://developers.hostinger.com";
const VERCEL_BASE = "https://api.vercel.com";
const DEFAULT_TIMEOUT_MS = 20000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

type Method = "GET" | "POST" | "PUT" | "DELETE";

/*
 * Zone DNS : lecture, instantanes, ecriture ciblee, et retrait cible d'enregistrements.
 * Le retrait porte sur des ENREGISTREMENTS DNS (couples nom+type envoyes en filtres), jamais sur le
 * domaine : aucune route du cycle de vie du domaine (/api/domains/...) n'est joignable par ce client.
 */
const DNS_ROUTES: ReadonlyArray<{ method: Method; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/api\/dns\/v1\/zones\/[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/ },
  { method: "PUT", pattern: /^\/api\/dns\/v1\/zones\/[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/ },
  { method: "DELETE", pattern: /^\/api\/dns\/v1\/zones\/[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/ },
  { method: "GET", pattern: /^\/api\/dns\/v1\/snapshots\/[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/ },
];

/* Projet Vercel : lecture de l'etat, rattachement et retrait du domaine du projet. */
const VERCEL_ROUTES: ReadonlyArray<{ method: Method; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/v9\/projects\/[^/]+$/ },
  { method: "GET", pattern: /^\/v9\/projects\/[^/]+\/domains\/[^/]+$/ },
  { method: "GET", pattern: /^\/v6\/domains\/[^/]+\/config$/ },
  { method: "POST", pattern: /^\/v10\/projects\/[^/]+\/domains$/ },
  { method: "POST", pattern: /^\/v9\/projects\/[^/]+\/domains\/[^/]+\/verify$/ },
  { method: "DELETE", pattern: /^\/v9\/projects\/[^/]+\/domains\/[^/]+$/ },
];

export function isAllowedConnectRoute(kind: "dns" | "vercel", method: string, path: string): boolean {
  // Interdits absolus, quelle que soit la suite : reset global de zone, et tout le cycle de vie du
  // domaine chez Hostinger (achat, transfert, auth-code, renouvellement, suppression du domaine).
  if (/\/reset$/.test(path)) return false;
  if (kind === "dns" && !/^\/api\/dns\//.test(path)) return false;
  const routes = kind === "dns" ? DNS_ROUTES : VERCEL_ROUTES;
  return routes.some((route) => route.method === method && route.pattern.test(path));
}

interface Options {
  token: string;
  fetchImpl: typeof fetch;
  timeoutMs?: number;
  baseUrl?: string;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/* Requete commune : liste blanche, delai, aucune redirection suivie, aucun corps ni en-tete renvoye. */
async function call(kind: "dns" | "vercel", options: Options, method: Method, path: string, init: { query?: Record<string, string>; body?: unknown } = {}): Promise<unknown> {
  if (!isAllowedConnectRoute(kind, method, path)) throw new ProviderError("forbidden_call");
  const token = options.token.trim();
  if (token === "") throw new ProviderError("not_configured");
  const base = options.baseUrl ?? (kind === "dns" ? HOSTINGER_BASE : VERCEL_BASE);
  const url = new URL(path, base);
  if (url.origin !== new URL(base).origin || url.pathname !== path) throw new ProviderError("forbidden_call");
  for (const [key, value] of Object.entries(init.query ?? {})) url.searchParams.set(key, value);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let status: number;
  let text: string;
  try {
    const response = await options.fetchImpl(url.toString(), {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      redirect: "error",
      signal: controller.signal,
    });
    status = response.status;
    text = await response.text();
  } catch {
    throw new ProviderError(controller.signal.aborted ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }

  if (text.length > MAX_BODY_BYTES) throw new ProviderError("bad_response", { httpStatus: status });
  const body = parseJson(text);
  if (status >= 200 && status < 300) return body ?? {};
  if (status === 401) throw new ProviderError("unauthorized", { httpStatus: status });
  if (status === 403) throw new ProviderError("forbidden_by_provider", { httpStatus: status });
  if (status === 404) throw new ProviderError("not_found", { httpStatus: status });
  if (status === 409) throw new ProviderError("invalid_request", { httpStatus: status, fields: ["domain"] });
  if (status === 422 || status === 400) throw new ProviderError("invalid_request", { httpStatus: status });
  if (status === 429) throw new ProviderError("rate_limited", { httpStatus: status, retryAfterSeconds: 60 });
  throw new ProviderError("provider_error", { httpStatus: status });
}

export interface DnsZoneClient {
  getZone(domain: string): Promise<unknown>;
  listSnapshots(domain: string): Promise<unknown>;
  /* Ecriture ciblee : le corps vient de buildZonePayload (liste blanche deja appliquee). */
  putZone(domain: string, payload: { overwrite: boolean; zone: unknown[] }): Promise<unknown>;
  /*
   * Retrait cible d'ENREGISTREMENTS (le corps vient de buildDeletePayload : couples nom+type de la
   * liste blanche, liste jamais vide). Ne supprime jamais le domaine ni la zone entiere.
   */
  deleteRecords(domain: string, payload: { filters: Array<{ name: string; type: string }> }): Promise<unknown>;
}

export function createDnsZoneClient(options: Options): DnsZoneClient {
  return {
    getZone: (domain) => call("dns", options, "GET", `/api/dns/v1/zones/${domain}`),
    listSnapshots: (domain) => call("dns", options, "GET", `/api/dns/v1/snapshots/${domain}`),
    putZone: (domain, payload) => call("dns", options, "PUT", `/api/dns/v1/zones/${domain}`, { body: payload }),
    // async : le refus doit arriver comme un rejet de promesse, jamais comme une exception synchrone
    // qui echapperait a un appelant qui se contente de .catch().
    deleteRecords: async (domain, payload) => {
      // Double garde-fou, cote client cette fois : une liste de filtres vide effacerait toute la zone.
      if (!Array.isArray(payload?.filters) || payload.filters.length === 0) throw new ProviderError("forbidden_call");
      return await call("dns", options, "DELETE", `/api/dns/v1/zones/${domain}`, { body: payload });
    },
  };
}

export interface VercelProjectClient {
  getProject(): Promise<unknown>;
  getDomainConfig(domain: string): Promise<unknown>;
  getProjectDomain(domain: string): Promise<unknown>;
  addProjectDomain(domain: string): Promise<unknown>;
  verifyProjectDomain(domain: string): Promise<unknown>;
  /* Retire le domaine du projet d'hebergement. N'agit que sur l'hebergement : le domaine reste au portefeuille. */
  removeProjectDomain(domain: string): Promise<unknown>;
}

export function createVercelClient(options: Options & { projectId: string; teamId?: string | null; teamSlug?: string | null }): VercelProjectClient {
  const project = encodeURIComponent(options.projectId);
  // Vercel accepte teamId OU slug : sans l'un des deux, un projet d'equipe est invisible au jeton.
  const scope: Record<string, string> = options.teamId
    ? { teamId: options.teamId }
    : options.teamSlug ? { slug: options.teamSlug } : {};
  return {
    getProject: () => call("vercel", options, "GET", `/v9/projects/${project}`, { query: scope }),
    getDomainConfig: (domain) =>
      call("vercel", options, "GET", `/v6/domains/${encodeURIComponent(domain)}/config`, { query: { ...scope, projectIdOrName: options.projectId } }),
    getProjectDomain: (domain) => call("vercel", options, "GET", `/v9/projects/${project}/domains/${encodeURIComponent(domain)}`, { query: scope }),
    addProjectDomain: (domain) => call("vercel", options, "POST", `/v10/projects/${project}/domains`, { query: scope, body: { name: domain } }),
    verifyProjectDomain: (domain) => call("vercel", options, "POST", `/v9/projects/${project}/domains/${encodeURIComponent(domain)}/verify`, { query: scope }),
    removeProjectDomain: (domain) => call("vercel", options, "DELETE", `/v9/projects/${project}/domains/${encodeURIComponent(domain)}`, { query: scope }),
  };
}

/* Lecture sure de GET /v6/domains/{domain}/config : aucune valeur codee en dur cote Talvex. */
export function readVercelConfig(data: unknown): { ipv4: string[]; cname: string | null; misconfigured: boolean; configuredBy: string | null } | null {
  if (typeof data !== "object" || data === null) return null;
  const raw = data as { recommendedIPv4?: unknown; recommendedCNAME?: unknown; misconfigured?: unknown; configuredBy?: unknown };
  const firstRank = (list: unknown): string[] => {
    if (!Array.isArray(list)) return [];
    const entry = list.find((item) => typeof item === "object" && item !== null && (item as { rank?: unknown }).rank === 1) ?? list[0];
    const value = (entry as { value?: unknown } | undefined)?.value;
    if (typeof value === "string") return [value];
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  };
  const cname = firstRank(raw.recommendedCNAME)[0] ?? null;
  return {
    ipv4: firstRank(raw.recommendedIPv4),
    cname,
    misconfigured: raw.misconfigured === true,
    configuredBy: typeof raw.configuredBy === "string" ? raw.configuredBy : null,
  };
}

/* Defi d'appartenance eventuel renvoye par l'ajout au projet ou par la lecture du domaine. */
export function readVercelChallenge(data: unknown): { name: string; value: string } | null {
  if (typeof data !== "object" || data === null) return null;
  const list = (data as { verification?: unknown }).verification;
  if (!Array.isArray(list)) return null;
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as { type?: unknown; domain?: unknown; value?: unknown };
    if (row.type === "TXT" && typeof row.domain === "string" && typeof row.value === "string") {
      return { name: row.domain, value: row.value };
    }
  }
  return null;
}

export function readVercelVerified(data: unknown): boolean {
  return typeof data === "object" && data !== null && (data as { verified?: unknown }).verified === true;
}
