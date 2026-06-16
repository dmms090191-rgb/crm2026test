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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const callerRole = caller.app_metadata?.role;
    if (callerRole !== "admin" && callerRole !== "company_super_admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin or company_super_admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fast path: created_by_user_id stored during admin creation
    const createdBy = caller.app_metadata?.created_by_user_id as string | undefined;
    if (createdBy) {
      return new Response(
        JSON.stringify({ super_admin_id: createdBy }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback: resolve via company hierarchy
    const adminCompanyId = caller.app_metadata?.company_id as string | undefined;
    if (!adminCompanyId) {
      return new Response(
        JSON.stringify({ error: "No company_id for this admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("parent_company_id")
      .eq("id", adminCompanyId)
      .maybeSingle();

    const parentCompanyId = company?.parent_company_id;
    if (!parentCompanyId) {
      return new Response(
        JSON.stringify({ error: "No parent company found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find a super_admin or company_super_admin owning the parent company
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    const parentSA = users.find((u) => {
      const role = u.app_metadata?.role;
      const cid = u.app_metadata?.company_id;
      return (role === "super_admin" || role === "company_super_admin") && cid === parentCompanyId;
    });

    if (!parentSA) {
      return new Response(
        JSON.stringify({ error: "No super admin found for parent company" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ super_admin_id: parentSA.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
