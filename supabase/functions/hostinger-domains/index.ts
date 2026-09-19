// hostinger-domains : couche serveur Talvex vers l'API Hostinger centrale, en LECTURE SEULE.
//
// Secret requis (Supabase > Edge Functions > Secrets) : HOSTINGER_API_TOKEN.
// Il n'est lu qu'ici, cote serveur ; il n'est jamais renvoye, journalise ni transmis au navigateur.
// Sans ce secret, la fonction repond « impossible de verifier » : aucune valeur de remplacement.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { callerFromUser, handleRequest, LIMITS, type HandlerDeps } from "./handler.ts";
import { createHostingerClient } from "./hostingerClient.ts";
import { createDnsZoneClient, createVercelClient } from "./connectClients.ts";
import type { SiteDomainState } from "./connect.ts";
import type { TalvexDomainRow } from "./providerData.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function asUserClient(authHeader: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hostingerFromEnv() {
  const token = Deno.env.get("HOSTINGER_API_TOKEN")?.trim() ?? "";
  return token === "" ? null : createHostingerClient({ token, fetchImpl: fetch });
}

/* Zone DNS du domaine (meme jeton Hostinger, client separe a liste blanche d'ecriture tres etroite). */
function dnsFromEnv() {
  const token = Deno.env.get("HOSTINGER_API_TOKEN")?.trim() ?? "";
  return token === "" ? null : createDnsZoneClient({ token, fetchImpl: fetch });
}

/* Projet d'hebergement Talvex (memes secrets que la fonction manage-domain existante). */
function vercelFromEnv() {
  const token = Deno.env.get("VERCEL_API_TOKEN")?.trim() ?? "";
  const projectId = Deno.env.get("VERCEL_PROJECT_ID")?.trim() ?? "";
  if (token === "" || projectId === "") return null;
  return createVercelClient({
    token, projectId, fetchImpl: fetch,
    teamId: Deno.env.get("VERCEL_TEAM_ID")?.trim() || null,
    teamSlug: Deno.env.get("VERCEL_TEAM_SLUG")?.trim() || null,
  });
}

/*
 * Le site repond-il vraiment en HTTPS sur ce domaine, et est-ce bien NOTRE deploiement qui repond ?
 * Une simple reponse ne suffit pas : pendant la propagation, l'ancien hebergeur du domaine peut encore
 * repondre 200 et le domaine serait declare « actif » a tort. On exige donc la signature de la
 * plateforme d'hebergement dans les en-tetes. Aucune donnee du site n'est lue.
 */
async function probeHttps(domain: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://${domain}/`, { method: "GET", redirect: "manual", signal: controller.signal });
    if (response.status <= 0 || response.status >= 500) return false;
    const served = (response.headers.get("x-vercel-id") ?? "") !== ""
      || (response.headers.get("server") ?? "").toLowerCase().includes("vercel");
    return served;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function toSiteDomainState(data: unknown): SiteDomainState | null {
  if (typeof data !== "object" || data === null) return null;
  const row = data as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.company_id !== "string" || typeof row.domain_name !== "string") return null;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    id: row.id,
    companyId: row.company_id,
    domain: row.domain_name,
    connectionStatus: typeof row.connection_status === "string" ? row.connection_status : "not_started",
    dnsConfiguredAt: str(row.dns_configured_at),
    vercelAttachedAt: str(row.vercel_attached_at),
    verifiedAt: str(row.verified_at),
    activatedAt: str(row.activated_at),
    technicalDetails: typeof row.technical_details === "object" && row.technical_details !== null ? row.technical_details as Record<string, unknown> : {},
  };
}

Deno.serve((req: Request) => {
  const deps: HandlerDeps = {
    async getCaller(authHeader) {
      if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
      const { data, error } = await admin.auth.getUser(authHeader.slice("Bearer ".length));
      // Role et coupure d'acces (access_enabled = false) interpretes par callerFromUser (teste).
      return callerFromUser(error ? null : data?.user);
    },

    async canSearchDomains(authHeader, companyId) {
      const { data, error } = await asUserClient(authHeader).rpc("can_search_domains", { p_company_id: companyId });
      if (error) throw new Error("permission_check_failed");
      return data === true;
    },

    // Etat d'association d'un domaine : lu en service_role, jamais depuis le navigateur.
    async domainAttachment(domain, companyId) {
      const { data, error } = await admin.rpc("domain_attachment_state", { p_domain: domain, p_company_id: companyId });
      if (error) return "unknown";
      return data === "free" || data === "mine" || data === "other" ? data : "unknown";
    },

    // Ecriture Talvex uniquement (site_domains + evenement). Aucune ecriture chez Hostinger.
    async attachDomain(input) {
      const { data, error } = await admin.rpc("attach_provider_domain", {
        p_company_id: input.companyId,
        p_domain: input.domain,
        p_provider_domain_id: input.providerDomainId,
        p_expires_at: input.expiresAt,
        p_registered_at: input.registeredAt,
        p_actor: input.actorId,
        p_actor_role: input.actorRole,
      });
      if (error) return "failed";
      const status = (data as { status?: unknown } | null)?.status;
      return status === "attached" || status === "taken" ? status : "failed";
    },

    // Raccordement : lecture de l'etat, progression, et clients DNS / hebergement.
    async getSiteDomain(companyId, domain) {
      const { data, error } = await admin.rpc("get_site_domain_for_connect", { p_company_id: companyId, p_domain: domain });
      if (error) return null;
      return toSiteDomainState(data);
    },

    // Domaine principal actuel : sert au changement de domaine (le navigateur ne le choisit jamais).
    async getPrimarySiteDomain(companyId) {
      const { data, error } = await admin.rpc("get_primary_site_domain_for_connect", { p_company_id: companyId });
      if (error) return null;
      return toSiteDomainState(data);
    },

    // Detachement cote Talvex : la ligne est conservee, le domaine reste au portefeuille Hostinger.
    async releaseSiteDomain(input) {
      const { data, error } = await admin.rpc("release_site_domain", {
        p_company_id: input.companyId,
        p_site_domain_id: input.siteDomainId,
        p_actor: input.actorId ?? null,
        p_actor_role: input.actorRole ?? "server",
        p_details: input.details ?? {},
      });
      if (error) return false;
      return (data as { status?: unknown } | null)?.status === "ok";
    },

    // Promotion : refusee en base tant que le domaine n'est pas reellement actif.
    async promoteSiteDomain(input) {
      const { data, error } = await admin.rpc("promote_site_domain", {
        p_company_id: input.companyId,
        p_site_domain_id: input.siteDomainId,
        p_actor: input.actorId ?? null,
        p_actor_role: input.actorRole ?? "server",
      });
      if (error) return false;
      return (data as { status?: unknown } | null)?.status === "ok";
    },

    async setConnection(input) {
      const { data, error } = await admin.rpc("set_site_domain_connection", {
        p_site_domain_id: input.siteDomainId,
        p_company_id: input.companyId,
        p_status: input.status,
        p_marks: input.marks,
        p_details: input.details ?? {},
        p_error_code: input.errorCode ?? null,
        p_error_message: input.errorMessage ?? null,
      });
      if (error) return false;
      return (data as { status?: unknown } | null)?.status === "ok";
    },

    dns: dnsFromEnv(),
    vercel: vercelFromEnv(),
    // Diagnostic seul : meme jeton, projet designe par son NOM public (aucun secret revele).
    vercelByName: (() => {
      const token = Deno.env.get("VERCEL_API_TOKEN")?.trim() ?? "";
      if (token === "") return null;
      return createVercelClient({
        token, projectId: "crm2026test", fetchImpl: fetch,
        teamId: Deno.env.get("VERCEL_TEAM_ID")?.trim() || null,
        teamSlug: Deno.env.get("VERCEL_TEAM_SLUG")?.trim() || null,
      });
    })(),
    probeHttps,
    // Ecriture DNS possible seulement si David a pose explicitement ce secret (defaut : aucune ecriture).
    connectEnabled: (Deno.env.get("DOMAIN_CONNECT_ENABLED")?.trim() ?? "") === "true",

    // Surcharge a 8 parametres (migration 20260919003302) : p_cost unites reservees d'un coup, ou aucune.
    async consumeQuota(userId, companyId, isTalvex, cost) {
      const { data, error } = await admin.rpc("reserve_domain_provider_call", {
        p_user_id: userId,
        p_company_id: companyId,
        p_is_talvex: isTalvex,
        p_user_limit: LIMITS.userPerMinute,
        p_branch_limit: LIMITS.branchPerMinute,
        p_tenants_limit: LIMITS.tenantsPerMinute,
        p_global_limit: LIMITS.globalPerMinute,
        p_cost: cost,
      });
      if (error) throw new Error("quota_check_failed");
      const row = Array.isArray(data) ? data[0] : data;
      return {
        allowed: row?.allowed === true,
        refusal: typeof row?.refusal === "string" ? row.refusal : null,
        retryAfterSeconds: Number.isFinite(row?.retry_after_seconds) ? row.retry_after_seconds : 60,
      };
    },

    async setBackoff(seconds, reason) {
      const { error } = await admin.rpc("set_domain_provider_backoff", { p_seconds: Math.round(seconds), p_reason: reason });
      if (error) throw new Error("backoff_failed");
    },

    async cacheGet(key) {
      const { data, error } = await admin.rpc("get_domain_provider_cache", { p_cache_key: key });
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? { payload: row.payload, fetchedAt: String(row.fetched_at) } : null;
    },

    async cachePut(key, kind, payload, ttlSeconds) {
      const { error } = await admin.rpc("put_domain_provider_cache", {
        p_cache_key: key,
        p_kind: kind,
        p_payload: payload,
        p_ttl_seconds: ttlSeconds,
      });
      if (error) throw new Error("cache_write_failed");
    },

    async listTalvexDomains(): Promise<TalvexDomainRow[]> {
      // Lignes vivantes uniquement, lues page par page (PostgREST plafonne chaque reponse).
      const rows: Array<Record<string, unknown>> = [];
      for (let from = 0; ; ) {
        const { data, error } = await admin
          .from("site_domains")
          .select("id, company_id, domain_name, provider, registration_status, connection_status, expires_at, provider_domain_id")
          .not("registration_status", "in", "(failed,released)")
          .order("id", { ascending: true })
          .range(from, from + 999);
        if (error) throw new Error("site_domains_read_failed");
        if (!data || data.length === 0) break;
        rows.push(...data);
        from += data.length;
      }
      return rows.map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        domainName: row.domain_name,
        provider: row.provider,
        registrationStatus: row.registration_status,
        connectionStatus: row.connection_status,
        expiresAt: row.expires_at,
        providerDomainId: row.provider_domain_id === null ? null : String(row.provider_domain_id),
      }));
    },

    hostinger: hostingerFromEnv(),
    now: () => new Date(),
    log(event) {
      console.log(JSON.stringify({ fn: "hostinger-domains", ...event }));
    },
  };

  return handleRequest(req, deps);
});
