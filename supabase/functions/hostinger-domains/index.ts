// hostinger-domains : couche serveur Talvex vers l'API Hostinger centrale, en LECTURE SEULE.
//
// Secret requis (Supabase > Edge Functions > Secrets) : HOSTINGER_API_TOKEN.
// Il n'est lu qu'ici, cote serveur ; il n'est jamais renvoye, journalise ni transmis au navigateur.
// Sans ce secret, la fonction repond « impossible de verifier » : aucune valeur de remplacement.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { callerFromUser, handleRequest, LIMITS, type HandlerDeps } from "./handler.ts";
import { createHostingerClient } from "./hostingerClient.ts";
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

    async consumeQuota(userId, companyId, isTalvex) {
      const { data, error } = await admin.rpc("reserve_domain_provider_call", {
        p_user_id: userId,
        p_company_id: companyId,
        p_is_talvex: isTalvex,
        p_user_limit: LIMITS.userPerMinute,
        p_branch_limit: LIMITS.branchPerMinute,
        p_tenants_limit: LIMITS.tenantsPerMinute,
        p_global_limit: LIMITS.globalPerMinute,
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
