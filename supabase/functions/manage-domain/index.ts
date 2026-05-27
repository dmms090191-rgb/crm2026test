import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(action: string, domain: string | undefined, projectId: string, detail: string) {
  console.log(`[manage-domain] action=${action} domain=${domain ?? "?"} project=${projectId} | ${detail}`);
}

async function updatePage(
  supabaseAdmin: ReturnType<typeof createClient>,
  pageId: string,
  fields: Record<string, unknown>,
) {
  const { error } = await supabaseAdmin
    .from("company_home_pages")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", pageId);
  if (error) throw new Error(error.message);
}

async function isDomainAssignedToProject(
  domain: string,
  vercelProjectId: string,
  vercelHeaders: Record<string, string>,
): Promise<boolean> {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
    { method: "GET", headers: vercelHeaders },
  );
  if (!res.ok) return false;
  const body = await res.json();
  const domains: { name: string }[] = body.domains ?? body ?? [];
  return domains.some((d) => d.name?.toLowerCase() === domain.toLowerCase());
}

async function addDomainToProject(
  domain: string,
  vercelProjectId: string,
  vercelHeaders: Record<string, string>,
): Promise<{ ok: boolean; error?: string; alreadyExists?: boolean }> {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
    {
      method: "POST",
      headers: vercelHeaders,
      body: JSON.stringify({ name: domain }),
    },
  );
  const body = await res.json();

  if (res.ok) return { ok: true };

  const code = body.error?.code;
  if (code === "domain_already_in_use" || code === "DOMAIN_ALREADY_EXISTS") {
    return { ok: true, alreadyExists: true };
  }

  return { ok: false, error: body.error?.message || `Vercel API ${res.status}` };
}

async function fetchDnsConfig(
  domain: string,
  vercelHeaders: Record<string, string>,
  logAction: string,
  vercelProjectId: string,
): Promise<{ aRecord: string; cnameRecord: string } | null> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v6/domains/${domain}/config`,
      { method: "GET", headers: vercelHeaders },
    );
    if (!res.ok) {
      log(logAction, domain, vercelProjectId, `DNS config fetch failed: ${res.status}`);
      return null;
    }
    const body = await res.json();
    log(logAction, domain, vercelProjectId, `Vercel /v6/domains/config raw: ${JSON.stringify(body)}`);

    // Extract rank-1 (preferred) IPv4
    let aRecord = "";
    const ipv4List: { rank: number; value: string[] }[] = body.recommendedIPv4 ?? [];
    const rank1Ipv4 = ipv4List.find((e) => e.rank === 1);
    if (rank1Ipv4?.value?.length) {
      aRecord = rank1Ipv4.value[0];
    } else if (ipv4List.length && ipv4List[0].value?.length) {
      aRecord = ipv4List[0].value[0];
    }

    // Extract rank-1 (preferred) CNAME
    let cnameRecord = "";
    const cnameList: { rank: number; value: string }[] = body.recommendedCNAME ?? [];
    const rank1Cname = cnameList.find((e) => e.rank === 1);
    if (rank1Cname?.value) {
      cnameRecord = rank1Cname.value;
    } else if (cnameList.length && cnameList[0].value) {
      cnameRecord = cnameList[0].value;
    }

    const result = { aRecord, cnameRecord };
    log(logAction, domain, vercelProjectId, `DNS config normalized: ${JSON.stringify(result)}`);
    return result;
  } catch (e) {
    log(logAction, domain, vercelProjectId, `DNS config error: ${e}`);
    return null;
  }
}

async function removeDomainFromProject(
  domain: string,
  vercelProjectId: string,
  vercelHeaders: Record<string, string>,
): Promise<{ ok: boolean; notFound?: boolean; error?: string }> {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${vercelProjectId}/domains/${domain}`,
    { method: "DELETE", headers: vercelHeaders },
  );

  if (res.ok) return { ok: true };

  const body = await res.json();
  const msg = body.error?.message || "";
  const code = body.error?.code || "";

  if (
    res.status === 404 ||
    code === "not_found" ||
    msg.includes("not assigned to project") ||
    msg.includes("not found")
  ) {
    return { ok: true, notFound: true };
  }

  return { ok: false, error: msg || `Vercel API ${res.status}` };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Non authentifie" }, 401);

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !caller) return jsonResponse({ error: "Non authentifie" }, 401);

    const callerRole = caller.app_metadata?.role;
    const callerCompanyId = caller.app_metadata?.company_id;
    const isSuperAdmin = callerRole === "super_admin";
    const isAdmin = callerRole === "admin";

    if (!isSuperAdmin && !isAdmin) return jsonResponse({ error: "Acces reserve" }, 403);

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");
    if (!vercelToken || !vercelProjectId) {
      return jsonResponse({ error: "Secrets Vercel manquants" }, 500);
    }

    const { action, domain, page_id, domain_provider: reqProvider, domain_type: reqType } =
      await req.json();
    if (!action || !page_id) {
      return jsonResponse({ error: "Parametres requis: action, page_id" }, 400);
    }

    if (isAdmin && action !== "verify") {
      return jsonResponse({ error: "Les admins peuvent uniquement verifier un domaine" }, 403);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    if (isAdmin) {
      const { data: pageCheck } = await supabaseAdmin
        .from("company_home_pages")
        .select("company_id")
        .eq("id", page_id)
        .maybeSingle();
      if (!pageCheck || pageCheck.company_id !== callerCompanyId) {
        return jsonResponse({ error: "Acces refuse: cette page ne vous appartient pas" }, 403);
      }
    }

    const vercelHeaders = {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json",
    };
    const now = new Date().toISOString();

    // ── ADD ──────────────────────────────────────────────────
    if (action === "add") {
      if (!domain) return jsonResponse({ error: "Le domaine est requis" }, 400);

      log("add", domain, vercelProjectId, "Starting domain assignment");

      const addResult = await addDomainToProject(domain, vercelProjectId, vercelHeaders);
      log("add", domain, vercelProjectId, `Vercel add result: ok=${addResult.ok} error=${addResult.error ?? "none"} alreadyExists=${addResult.alreadyExists ?? false}`);

      const provider = reqProvider || "vercel";
      const dtype = reqType || null;

      if (!addResult.ok) {
        await updatePage(supabaseAdmin, page_id, {
          custom_domain: domain,
          domain_provider: provider,
          domain_type: dtype,
          domain_status: "error",
          domain_verified: false,
          domain_notes: JSON.stringify({ vercel_assigned: false, error: addResult.error }),
          last_domain_check_at: now,
        });
        log("add", domain, vercelProjectId, `Failed: ${addResult.error}`);
        return jsonResponse({ error: addResult.error, vercel_assigned: false }, 200);
      }

      // Verify assignment is real
      const assigned = await isDomainAssignedToProject(domain, vercelProjectId, vercelHeaders);
      log("add", domain, vercelProjectId, `Assignment confirmed: ${assigned}`);

      const dnsConfig = await fetchDnsConfig(domain, vercelHeaders, "add", vercelProjectId);

      await updatePage(supabaseAdmin, page_id, {
        custom_domain: domain,
        domain_provider: provider,
        domain_type: dtype,
        domain_status: "pending",
        domain_verified: false,
        domain_notes: JSON.stringify({ vercel_assigned: assigned, dns_config: dnsConfig }),
        last_domain_check_at: now,
      });

      log("add", domain, vercelProjectId, "Supabase updated, domain saved as pending");
      return jsonResponse({
        success: true,
        domain_status: "pending",
        vercel_assigned: assigned,
        dns_config: dnsConfig,
      });
    }

    // ── VERIFY ──────────────────────────────────────────────
    if (action === "verify") {
      if (!domain) return jsonResponse({ error: "Le domaine est requis" }, 400);

      log("verify", domain, vercelProjectId, "Starting verification");

      // Step 1: check if domain is assigned, if not add it
      let assigned = await isDomainAssignedToProject(domain, vercelProjectId, vercelHeaders);
      log("verify", domain, vercelProjectId, `Currently assigned: ${assigned}`);

      if (!assigned) {
        log("verify", domain, vercelProjectId, "Domain not assigned, adding now");
        const addResult = await addDomainToProject(domain, vercelProjectId, vercelHeaders);
        log("verify", domain, vercelProjectId, `Auto-add result: ok=${addResult.ok} error=${addResult.error ?? "none"}`);

        if (!addResult.ok) {
          await updatePage(supabaseAdmin, page_id, {
            domain_status: "error",
            domain_verified: false,
            domain_notes: JSON.stringify({ vercel_assigned: false, error: addResult.error }),
            last_domain_check_at: now,
          });
          return jsonResponse({
            error: `Impossible d'assigner le domaine au projet Vercel: ${addResult.error}`,
            vercel_assigned: false,
          }, 200);
        }

        assigned = await isDomainAssignedToProject(domain, vercelProjectId, vercelHeaders);
        log("verify", domain, vercelProjectId, `Re-check assignment: ${assigned}`);
      }

      // Step 2: verify DNS via Vercel
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}/verify`,
        { method: "POST", headers: vercelHeaders },
      );
      const body = await res.json();
      log("verify", domain, vercelProjectId, `Vercel verify response: status=${res.status} verified=${body.verified ?? "?"}`);

      if (!res.ok) {
        const msg = body.error?.message || `Vercel API ${res.status}`;
        log("verify", domain, vercelProjectId, `Verify failed: ${msg}`);

        await updatePage(supabaseAdmin, page_id, {
          domain_status: "error",
          domain_verified: false,
          domain_notes: JSON.stringify({ vercel_assigned: assigned, error: msg }),
          last_domain_check_at: now,
        });
        return jsonResponse({ error: msg, vercel_assigned: assigned }, 200);
      }

      const verified = body.verified === true;
      const dnsConfig = await fetchDnsConfig(domain, vercelHeaders, "verify", vercelProjectId);

      await updatePage(supabaseAdmin, page_id, {
        domain_status: verified ? "verified" : "pending",
        domain_verified: verified,
        domain_notes: JSON.stringify({ vercel_assigned: assigned, verified, dns_config: dnsConfig }),
        last_domain_check_at: now,
      });

      log("verify", domain, vercelProjectId, `Result: verified=${verified} assigned=${assigned}`);
      return jsonResponse({
        success: true,
        domain_status: verified ? "verified" : "pending",
        verified,
        vercel_assigned: assigned,
        verification: body.verification ?? null,
        dns_config: dnsConfig,
      });
    }

    // ── CHECK-CONFIG ─────────────────────────────────────────
    if (action === "check-config") {
      if (!domain) return jsonResponse({ error: "Le domaine est requis" }, 400);

      log("check-config", domain, vercelProjectId, "Checking DNS config");

      const dnsConfig = await fetchDnsConfig(domain, vercelHeaders, "check-config", vercelProjectId);

      const res = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config`,
        { method: "GET", headers: vercelHeaders },
      );
      const body = await res.json();
      log("check-config", domain, vercelProjectId, `Raw config: ${JSON.stringify(body)}`);

      await updatePage(supabaseAdmin, page_id, { last_domain_check_at: now });

      return jsonResponse({
        success: true,
        misconfigured: body.misconfigured ?? null,
        configuredBy: body.configuredBy ?? null,
        dns_config: dnsConfig,
      });
    }

    // ── REMOVE ───────────────────────────────────────────────
    if (action === "remove") {
      if (!domain) return jsonResponse({ error: "Le domaine est requis" }, 400);

      log("remove", domain, vercelProjectId, "Starting domain removal");

      // Try to remove from Vercel -- tolerate not-found
      const removeResult = await removeDomainFromProject(domain, vercelProjectId, vercelHeaders);
      log("remove", domain, vercelProjectId, `Vercel remove result: ok=${removeResult.ok} notFound=${removeResult.notFound ?? false} error=${removeResult.error ?? "none"}`);

      if (!removeResult.ok) {
        log("remove", domain, vercelProjectId, `Vercel removal failed but proceeding with DB cleanup: ${removeResult.error}`);
      }

      // Always clean up Supabase regardless of Vercel result
      await updatePage(supabaseAdmin, page_id, {
        custom_domain: null,
        domain_provider: null,
        domain_type: null,
        domain_status: "not_configured",
        domain_verified: false,
        domain_notes: null,
        last_domain_check_at: now,
      });

      log("remove", domain, vercelProjectId, "Supabase cleaned up, domain removed");
      return jsonResponse({
        success: true,
        domain_status: "not_configured",
        vercel_removed: removeResult.ok,
        vercel_not_found: removeResult.notFound ?? false,
      });
    }

    return jsonResponse({ error: `Action inconnue: ${action}` }, 400);
  } catch (err) {
    console.error("[manage-domain] Unexpected error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
