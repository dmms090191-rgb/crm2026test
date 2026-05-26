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
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin or super_admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, role, first_name, last_name, phone, company, company_id: bodyCompanyId } = await req.json();

    if (!role) {
      return new Response(
        JSON.stringify({ error: "Role is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // --- Admin creation: new company + company_id in app_metadata ---
    if (role === "admin") {
      if (callerRole !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Forbidden: seul super_admin peut creer un admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!company || !company.trim()) {
        return new Response(
          JSON.stringify({ error: "Le champ Societe est obligatoire pour creer un admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: companyData, error: companyError } = await supabaseAdmin
        .from("companies")
        .insert({ name: company.trim() })
        .select("id")
        .single();

      if (companyError || !companyData) {
        return new Response(
          JSON.stringify({ error: "Erreur creation societe: " + (companyError?.message || "unknown") }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newCompanyId = companyData.id;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          role,
          pin: password,
          ...(phone ? { phone } : {}),
          company: company.trim(),
        },
        app_metadata: {
          role: "admin",
          company_id: newCompanyId,
        },
      });

      if (error) {
        await supabaseAdmin.from("companies").delete().eq("id", newCompanyId);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("companies").update({
        admin_first_name: first_name || "",
        admin_last_name: last_name || "",
      }).eq("id", newCompanyId);

      return new Response(JSON.stringify({ user: data.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Vendor / Client / other roles: inherit company_id from caller or body ---
    const callerCompanyId = caller.app_metadata?.company_id || bodyCompanyId || null;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
        pin: password,
        ...(phone ? { phone } : {}),
        ...(company ? { company } : {}),
      },
      app_metadata: {
        role,
        ...(callerCompanyId ? { company_id: callerCompanyId } : {}),
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
