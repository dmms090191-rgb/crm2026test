import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerRole = caller.app_metadata?.role;
    if (callerRole !== "company_super_admin" && callerRole !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: company_super_admin or super_admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    let scopeCompanyId: string;

    if (callerRole === "company_super_admin") {
      const cid = caller.app_metadata?.company_id as string | undefined;
      if (!cid) {
        return new Response(
          JSON.stringify({ error: "No company_id found for caller" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      scopeCompanyId = cid;
    } else {
      const targetId = body.target_company_id as string | undefined;
      if (!targetId) {
        const cid = caller.app_metadata?.company_id as string | undefined;
        if (!cid) {
          return new Response(
            JSON.stringify({ error: "No company_id or target_company_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        scopeCompanyId = cid;
      } else {
        const { data: tc, error: tcErr } = await supabaseAdmin
          .from("companies")
          .select("id")
          .eq("id", targetId)
          .maybeSingle();
        if (tcErr || !tc) {
          return new Response(
            JSON.stringify({ error: "target_company_id not found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        scopeCompanyId = targetId;
      }
    }

    const { data: childCompanies } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("parent_company_id", scopeCompanyId);

    const childCompanyIds = new Set(
      (childCompanies || []).map((c: { id: string }) => c.id)
    );

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admins = users
      .filter((u) => {
        if (u.app_metadata?.role !== "admin") return false;
        const uid = u.app_metadata?.company_id as string | undefined;
        if (!uid) return false;
        return uid === scopeCompanyId || childCompanyIds.has(uid);
      })
      .map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.user_metadata?.first_name || "",
        last_name: u.user_metadata?.last_name || "",
        phone: u.user_metadata?.phone || "",
        company: u.user_metadata?.company || "",
        company_id: u.app_metadata?.company_id || "",
        role: u.app_metadata?.role || "",
        pin: u.user_metadata?.pin || "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        access_enabled: u.app_metadata?.access_enabled !== false,
      }));

    return new Response(JSON.stringify({ admins }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
