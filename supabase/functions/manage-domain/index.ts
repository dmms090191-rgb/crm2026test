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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Non authentifie" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return jsonResponse({ error: "Non authentifie" }, 401);
    }

    const callerRole = caller.app_metadata?.role;
    const callerCompanyId = caller.app_metadata?.company_id;
    const isSuperAdmin = callerRole === "super_admin";
    const isAdmin = callerRole === "admin";

    if (!isSuperAdmin && !isAdmin) {
      return jsonResponse({ error: "Acces reserve" }, 403);
    }

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");
    if (!vercelToken || !vercelProjectId) {
      return jsonResponse(
        { error: "Secrets Vercel manquants (VERCEL_API_TOKEN / VERCEL_PROJECT_ID)" },
        500,
      );
    }

    const { action, domain, page_id, domain_provider: reqProvider, domain_type: reqType } = await req.json();
    if (!action || !page_id) {
      return jsonResponse({ error: "Parametres requis: action, page_id" }, 400);
    }

    if (isAdmin && action !== "verify" && action !== "health-check") {
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

    if (action === "add") {
      if (!domain) {
        return jsonResponse({ error: "Le domaine est requis" }, 400);
      }

      const res = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        { method: "POST", headers: vercelHeaders, body: JSON.stringify({ name: domain }) },
      );
      const body = await res.json();

      const provider = reqProvider || "vercel";
      const dtype = reqType || null;

      if (!res.ok) {
        const msg = body.error?.message || `Vercel API ${res.status}`;
        await updatePage(supabaseAdmin, page_id, {
          custom_domain: domain,
          domain_provider: provider,
          domain_type: dtype,
          domain_status: "error",
          domain_verified: false,
          domain_notes: msg,
          last_domain_check_at: now,
        });
        return jsonResponse({ error: msg, vercel: body }, 200);
      }

      const verified = body.verified === true;
      await updatePage(supabaseAdmin, page_id, {
        custom_domain: domain,
        domain_provider: provider,
        domain_type: dtype,
        domain_status: verified ? "verified" : "pending",
        domain_verified: verified,
        domain_notes: null,
        last_domain_check_at: now,
      });

      return jsonResponse({
        success: true,
        domain_status: verified ? "verified" : "pending",
        vercel: body,
      });
    }

    if (action === "verify") {
      if (!domain) {
        return jsonResponse({ error: "Le domaine est requis" }, 400);
      }

      const res = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}/verify`,
        { method: "POST", headers: vercelHeaders },
      );
      const body = await res.json();

      if (!res.ok) {
        const msg = body.error?.message || `Vercel API ${res.status}`;
        await updatePage(supabaseAdmin, page_id, {
          domain_status: "error",
          domain_verified: false,
          domain_notes: msg,
          last_domain_check_at: now,
        });
        return jsonResponse({ error: msg, vercel: body }, 200);
      }

      const verified = body.verified === true;

      let reallyActive = verified;
      let healthNote: string | null = null;
      if (verified) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const hRes = await fetch(`https://${domain}`, {
            method: "GET",
            headers: { "User-Agent": "TalvexHealthCheck/1.0" },
            signal: controller.signal,
            redirect: "follow",
          });
          clearTimeout(timeout);
          const hBody = await hRes.text();
          const lower = hBody.toLowerCase();
          const isParked =
            lower.includes("start your online journey") ||
            lower.includes("hostinger") ||
            lower.includes("this domain is parked") ||
            lower.includes("domain parking") ||
            lower.includes("godaddy") ||
            (lower.includes("buy this domain") && !lower.includes("talvex"));
          if (isParked) {
            reallyActive = false;
            healthNote = "DNS verifie par Vercel mais le domaine pointe vers une page parking. Configurez les DNS chez votre registrar.";
          } else if (!hRes.ok) {
            reallyActive = false;
            healthNote = `DNS verifie mais le site repond avec le statut ${hRes.status}.`;
          }
        } catch {
          reallyActive = false;
          healthNote = "DNS verifie par Vercel mais le site n'est pas encore accessible. Attendez la propagation DNS.";
        }
      }

      await updatePage(supabaseAdmin, page_id, {
        domain_status: reallyActive ? "verified" : verified ? "pending" : "pending",
        domain_verified: reallyActive,
        domain_notes: reallyActive ? null : (healthNote || "DNS non configure. Verification requise."),
        last_domain_check_at: now,
      });

      return jsonResponse({
        success: true,
        domain_status: reallyActive ? "verified" : "pending",
        verified: reallyActive,
        vercel_verified: verified,
        health_note: healthNote,
        verification: body.verification ?? null,
      });
    }

    if (action === "check-config") {
      if (!domain) {
        return jsonResponse({ error: "Le domaine est requis" }, 400);
      }

      const res = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config`,
        { method: "GET", headers: vercelHeaders },
      );
      const body = await res.json();

      await updatePage(supabaseAdmin, page_id, {
        last_domain_check_at: now,
      });

      return jsonResponse({
        success: true,
        misconfigured: body.misconfigured ?? null,
        cnames: body.cnames ?? [],
        aValues: body.aValues ?? [],
        conflicts: body.conflicts ?? [],
      });
    }

    if (action === "remove") {
      if (!domain) {
        return jsonResponse({ error: "Le domaine est requis" }, 400);
      }

      const res = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains/${domain}`,
        { method: "DELETE", headers: vercelHeaders },
      );

      if (!res.ok) {
        const body = await res.json();
        const msg = body.error?.message || `Vercel API ${res.status}`;
        return jsonResponse({ error: msg, vercel: body }, 200);
      }

      await updatePage(supabaseAdmin, page_id, {
        custom_domain: null,
        domain_provider: null,
        domain_type: null,
        domain_status: "not_configured",
        domain_verified: false,
        domain_notes: null,
        last_domain_check_at: now,
      });

      return jsonResponse({ success: true, domain_status: "not_configured" });
    }

    if (action === "health-check") {
      if (!domain) {
        return jsonResponse({ error: "Le domaine est requis" }, 400);
      }

      let siteReachable = false;
      let isParkedPage = false;
      let httpStatus = 0;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`https://${domain}`, {
          method: "GET",
          headers: { "User-Agent": "TalvexHealthCheck/1.0" },
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);
        httpStatus = res.status;
        siteReachable = res.ok;
        const body = await res.text();
        const lower = body.toLowerCase();
        isParkedPage =
          lower.includes("start your online journey") ||
          lower.includes("hostinger") ||
          lower.includes("this domain is parked") ||
          lower.includes("domain parking") ||
          lower.includes("godaddy") ||
          lower.includes("this site can't be reached") ||
          (lower.includes("buy this domain") && !lower.includes("talvex"));
      } catch {
        siteReachable = false;
      }

      const isReallyActive = siteReachable && !isParkedPage;

      if (!isReallyActive) {
        await updatePage(supabaseAdmin, page_id, {
          domain_status: "pending",
          domain_verified: false,
          domain_notes: isParkedPage
            ? "Le domaine pointe vers une page parking (DNS non configure vers Vercel)."
            : siteReachable
              ? "Le site repond mais ne semble pas etre Talvex."
              : "Le site n'est pas accessible (DNS non propage ou mal configure).",
          last_domain_check_at: now,
        });
      } else {
        await updatePage(supabaseAdmin, page_id, {
          domain_status: "verified",
          domain_verified: true,
          domain_notes: null,
          last_domain_check_at: now,
        });
      }

      return jsonResponse({
        success: true,
        site_reachable: siteReachable,
        is_parked_page: isParkedPage,
        is_really_active: isReallyActive,
        http_status: httpStatus,
        domain_status: isReallyActive ? "verified" : "pending",
      });
    }

    return jsonResponse({ error: `Action inconnue: ${action}` }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
