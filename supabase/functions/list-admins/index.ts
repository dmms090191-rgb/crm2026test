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
    if (callerRole !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: super_admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch company AI flags in one query
    const companyIds = [...new Set(
      users
        .filter((u) => u.app_metadata?.role === "admin" && u.app_metadata?.company_id)
        .map((u) => u.app_metadata!.company_id as string)
    )];

    const aiFlags: Record<string, boolean> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await supabaseAdmin
        .from("companies")
        .select("id, sa_chat_ai_enabled")
        .in("id", companyIds);
      if (companies) {
        for (const c of companies) {
          aiFlags[c.id] = c.sa_chat_ai_enabled === true;
        }
      }
    }

    const admins = users
      .filter((u) => u.app_metadata?.role === "admin")
      .map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.user_metadata?.first_name || "",
        last_name: u.user_metadata?.last_name || "",
        phone: u.user_metadata?.phone || "",
        pin: u.user_metadata?.pin || "",
        company: u.user_metadata?.company || "",
        company_id: u.app_metadata?.company_id || "",
        role: u.app_metadata?.role || "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        access_enabled: u.app_metadata?.access_enabled !== false,
        ai_enabled: aiFlags[u.app_metadata?.company_id || ""] ?? false,
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
