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
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = caller.app_metadata?.role;
    if (callerRole !== "company_super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: company_super_admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerCompanyId = caller.app_metadata?.company_id as string | undefined;
    if (!callerCompanyId) {
      return new Response(JSON.stringify({ error: "No company_id found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { admin_id, access_enabled } = await req.json();
    if (!admin_id || typeof access_enabled !== "boolean") {
      return new Response(JSON.stringify({ error: "admin_id and access_enabled required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user: target }, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(admin_id);
    if (fetchErr || !target) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target.app_metadata?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Target is not an admin" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetCompanyId = target.app_metadata?.company_id as string | undefined;
    if (!targetCompanyId) {
      return new Response(JSON.stringify({ error: "Target has no company" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify target belongs to caller's company hierarchy
    if (targetCompanyId !== callerCompanyId) {
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("parent_company_id")
        .eq("id", targetCompanyId)
        .single();

      if (!company || company.parent_company_id !== callerCompanyId) {
        return new Response(JSON.stringify({ error: "Admin does not belong to your company" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(admin_id, {
      app_metadata: { ...target.app_metadata, access_enabled },
    });

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, access_enabled: data.user.app_metadata?.access_enabled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
