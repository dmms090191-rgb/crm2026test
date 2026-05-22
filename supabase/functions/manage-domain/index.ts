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
    if (caller.app_metadata?.role !== "super_admin") {
      return jsonResponse({ error: "Acces reserve au super admin" }, 403);
    }

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");
    if (!vercelToken || !vercelProjectId) {
      return jsonResponse(
        { error: "Secrets Vercel manquants (VERCEL_API_TOKEN / VERCEL_PROJECT_ID)" },
        500,
      );
    }

    const { action, domain, page_id } = await req.json();
    if (!action || !page_id) {
      return jsonResponse({ error: "Parametres requis: action, page_id" }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
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

      if (!res.ok) {
        const msg = body.error?.message || `Vercel API ${res.status}`;
        await updatePage(supabaseAdmin, page_id, {
          custom_domain: domain,
          domain_provider: "vercel",
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
        domain_provider: "vercel",
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
      await updatePage(supabaseAdmin, page_id, {
        domain_status: verified ? "verified" : "pending",
        domain_verified: verified,
        domain_notes: verified ? null : "DNS non configure. Verification requise.",
        last_domain_check_at: now,
      });

      return jsonResponse({
        success: true,
        domain_status: verified ? "verified" : "pending",
        verified,
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
        domain_status: "not_configured",
        domain_verified: false,
        domain_notes: null,
        last_domain_check_at: now,
      });

      return jsonResponse({ success: true, domain_status: "not_configured" });
    }

    return jsonResponse({ error: `Action inconnue: ${action}` }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
