// Client Hostinger en LECTURE SEULE (module pur : le jeton et fetch sont injectes).
// Source : OpenAPI officielle Hostinger v1.53.0 (https://developers.hostinger.com).
//
// Garde-fous :
// - liste blanche stricte : seules 4 routes de lecture existent ici ; toute autre route
//   (achat, /setup, DNS, WHOIS, renouvellement, auth-code...) est refusee AVANT tout reseau ;
// - le jeton ne sort jamais : aucune erreur, aucun resultat, aucun journal ne le contient ;
// - pas de redirection suivie (le jeton ne peut pas partir vers un autre hote) ;
// - delai maximal par appel, lecture du corps comprise.

export const HOSTINGER_BASE_URL = "https://developers.hostinger.com";
// Mesure reelle (17/09) depuis Supabase : portefeuille ~7 s, disponibilite et catalogue > 8 s.
export const DEFAULT_TIMEOUT_MS = 25000;
const MAX_BODY_BYTES = 2_000_000;

export type ProviderErrorCode =
  | "not_configured"
  | "forbidden_call"
  | "unauthorized"
  | "forbidden_by_provider"
  | "rate_limited"
  | "invalid_request"
  | "not_found"
  | "provider_error"
  | "timeout"
  | "network"
  | "bad_response";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly httpStatus: number | null;
  readonly retryAfterSeconds: number | null;
  readonly correlationId: string | null;
  /* 422 : NOMS des champs refuses (ex. "domain", "tlds.0"), jamais les messages. */
  readonly fields: string[];

  constructor(code: ProviderErrorCode, detail: { httpStatus?: number | null; retryAfterSeconds?: number | null; correlationId?: string | null; fields?: string[] } = {}) {
    // Message = code uniquement : jamais de corps de reponse, d'en-tete ni de jeton.
    super(code);
    this.name = "ProviderError";
    this.code = code;
    this.httpStatus = detail.httpStatus ?? null;
    this.retryAfterSeconds = detail.retryAfterSeconds ?? null;
    this.correlationId = detail.correlationId ?? null;
    this.fields = detail.fields ?? [];
  }
}

type Method = "GET" | "POST";

/* Les SEULES routes autorisees. Aucune ne peut couter de l'argent ni modifier le compte. */
export const READ_ONLY_ROUTES: ReadonlyArray<{ method: Method; pattern: RegExp; purpose: string }> = [
  { method: "POST", pattern: /^\/api\/domains\/v1\/availability$/, purpose: "disponibilite (+ alternatives)" },
  { method: "GET", pattern: /^\/api\/billing\/v1\/catalog$/, purpose: "catalogue de prix" },
  { method: "GET", pattern: /^\/api\/domains\/v1\/portfolio$/, purpose: "portefeuille" },
  { method: "GET", pattern: /^\/api\/domains\/v1\/portfolio\/[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/, purpose: "detail d'un domaine" },
];

export function isReadOnlyRoute(method: string, path: string): boolean {
  if (path === "/api/domains/v1/portfolio/claim") return false;
  return READ_ONLY_ROUTES.some((route) => route.method === method && route.pattern.test(path));
}

export interface RateInfo {
  remaining: number | null;
  resetSeconds: number | null;
}

export interface ProviderResponse<T> {
  data: T;
  rate: RateInfo;
}

export interface HostingerClientOptions {
  token: string;
  fetchImpl: typeof fetch;
  timeoutMs?: number;
  baseUrl?: string;
}

export interface HostingerClient {
  checkAvailability(sld: string, tld: string, withAlternatives: boolean): Promise<ProviderResponse<unknown>>;
  listDomainCatalog(tld: string): Promise<ProviderResponse<unknown>>;
  listPortfolio(): Promise<ProviderResponse<unknown>>;
  getPortfolioDomain(domain: string): Promise<ProviderResponse<unknown>>;
}

function parseIntHeader(value: string | null): number | null {
  if (value === null) return null;
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* En-tetes documentes : RateLimit: "api";r=89;t=60 (+ X-RateLimit-* historiques) et Retry-After. */
export function parseRateInfo(headers: Headers): RateInfo {
  const modern = headers.get("ratelimit");
  if (modern) {
    const r = /(?:^|;)\s*r=(\d+)/.exec(modern);
    const t = /(?:^|;)\s*t=(\d+)/.exec(modern);
    if (r || t) return { remaining: r ? Number(r[1]) : null, resetSeconds: t ? Number(t[1]) : null };
  }
  return {
    remaining: parseIntHeader(headers.get("x-ratelimit-remaining")),
    resetSeconds: parseIntHeader(headers.get("x-ratelimit-reset")),
  };
}

export function parseRetryAfter(headers: Headers): number | null {
  const direct = parseIntHeader(headers.get("retry-after"));
  if (direct !== null) return direct;
  return parseRateInfo(headers).resetSeconds;
}

function safeCorrelationId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const id = (body as { correlation_id?: unknown }).correlation_id;
  return typeof id === "string" && /^[A-Za-z0-9-]{1,64}$/.test(id) ? id : null;
}

/* Corps 422 documente (UnprocessableContentResponse) : { message, errors: { champ: [...] } }. */
function rejectedFields(body: unknown): string[] {
  if (typeof body !== "object" || body === null) return [];
  const errors = (body as { errors?: unknown }).errors;
  if (typeof errors !== "object" || errors === null || Array.isArray(errors)) return [];
  return Object.keys(errors).filter((key) => /^[a-z_]{1,40}(\.\d{1,3})?$/.test(key)).slice(0, 10);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function createHostingerClient(options: HostingerClientOptions): HostingerClient {
  const token = options.token.trim();
  const baseUrl = options.baseUrl ?? HOSTINGER_BASE_URL;
  const origin = new URL(baseUrl).origin;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(method: Method, path: string, init: { query?: Record<string, string>; body?: unknown } = {}): Promise<ProviderResponse<T>> {
    if (!isReadOnlyRoute(method, path)) throw new ProviderError("forbidden_call");
    if (token === "") throw new ProviderError("not_configured");

    const url = new URL(path, baseUrl);
    if (url.origin !== origin || url.pathname !== path) throw new ProviderError("forbidden_call");
    for (const [key, value] of Object.entries(init.query ?? {})) url.searchParams.set(key, value);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let status: number;
    let headers: Headers;
    let text: string;
    try {
      const response = await options.fetchImpl(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        redirect: "error",
        signal: controller.signal,
      });
      status = response.status;
      headers = response.headers;
      text = await response.text();
    } catch {
      throw new ProviderError(controller.signal.aborted ? "timeout" : "network");
    } finally {
      clearTimeout(timer);
    }

    if (text.length > MAX_BODY_BYTES) throw new ProviderError("bad_response", { httpStatus: status });
    const body = parseJson(text);
    const correlationId = safeCorrelationId(body);

    if (status >= 200 && status < 300) {
      if (body === undefined) throw new ProviderError("bad_response", { httpStatus: status, correlationId });
      return { data: body as T, rate: parseRateInfo(headers) };
    }
    // 401 = jeton refuse (touche tout le compte) ; 403 = refus limite a cette ressource.
    if (status === 401) throw new ProviderError("unauthorized", { httpStatus: status, correlationId });
    if (status === 403) throw new ProviderError("forbidden_by_provider", { httpStatus: status, correlationId });
    if (status === 404) throw new ProviderError("not_found", { httpStatus: status, correlationId });
    if (status === 422) throw new ProviderError("invalid_request", { httpStatus: status, correlationId, fields: rejectedFields(body) });
    if (status === 429) {
      const wait = Math.min(Math.max(parseRetryAfter(headers) ?? 60, 1), 3600);
      throw new ProviderError("rate_limited", { httpStatus: status, correlationId, retryAfterSeconds: wait });
    }
    throw new ProviderError("provider_error", { httpStatus: status, correlationId });
  }

  return {
    checkAvailability(sld, tld, withAlternatives) {
      return request("POST", "/api/domains/v1/availability", {
        body: { domain: sld, tlds: [tld], with_alternatives: withAlternatives },
      });
    },
    listDomainCatalog(tld) {
      return request("GET", "/api/billing/v1/catalog", { query: { category: "DOMAIN", name: `.${tld.toUpperCase()}*` } });
    },
    listPortfolio() {
      return request("GET", "/api/domains/v1/portfolio");
    },
    getPortfolioDomain(domain) {
      return request("GET", `/api/domains/v1/portfolio/${domain}`);
    },
  };
}
