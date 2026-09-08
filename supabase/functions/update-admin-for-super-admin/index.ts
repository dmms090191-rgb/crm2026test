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

    const { admin_id, first_name, last_name, phone, company, email } = await req.json();

    if (!admin_id) {
      return new Response(
        JSON.stringify({ error: "admin_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the target admin exists and is an admin
    const { data: targetUser, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(admin_id);
    if (fetchErr || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: "Admin user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetUser.user.app_metadata?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Target user is not an admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify scope: admin's company must be child of caller's company
    const adminCompanyId = targetUser.user.app_metadata?.company_id as string | undefined;
    if (!adminCompanyId) {
      return new Response(
        JSON.stringify({ error: "Admin has no company_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let callerCompanyId: string;
    if (callerRole === "company_super_admin") {
      callerCompanyId = caller.app_metadata?.company_id as string;
      if (!callerCompanyId) {
        return new Response(
          JSON.stringify({ error: "No company_id for caller" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // super_admin: allow any admin
      callerCompanyId = "";
    }

    if (callerRole === "company_super_admin") {
      const { data: adminCompany } = await supabaseAdmin
        .from("companies")
        .select("parent_company_id")
        .eq("id", adminCompanyId)
        .maybeSingle();

      if (!adminCompany || adminCompany.parent_company_id !== callerCompanyId) {
        return new Response(
          JSON.stringify({ error: "Forbidden: admin does not belong to your company" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const updatedMetadata = {
      ...targetUser.user.user_metadata,
      ...(first_name !== undefined ? { first_name } : {}),
      ...(last_name !== undefined ? { last_name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(company !== undefined ? { company } : {}),
    };

    const updates: Record<string, unknown> = { user_metadata: updatedMetadata };

    // Email : bascule IMMEDIATE par l API admin, sans workflow de
    // confirmation — flux administrateur assume. `email_confirm` garantit
    // que le nouvel email est utilisable tout de suite pour se connecter,
    // avec le PIN inchange.
    if (typeof email === "string" && email.trim()) {
      const next = email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) {
        return new Response(
          JSON.stringify({ error: "Email invalide" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (next !== (targetUser.user.email ?? "").toLowerCase()) {
        updates.email = next;
        updates.email_confirm = true;
      }
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(admin_id, updates);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyName =
      typeof company === "string" && company.trim() ? company.trim() : undefined;

    if (
      adminCompanyId &&
      (first_name !== undefined || last_name !== undefined || companyName !== undefined)
    ) {
      const nameUpdate: Record<string, string> = {};
      if (first_name !== undefined) nameUpdate.admin_first_name = first_name;
      if (last_name !== undefined) nameUpdate.admin_last_name = last_name;
      // `companies.name` et `user_metadata.company` sont poses ENSEMBLE a la
      // creation : on les maintient ensemble ici. Un nom vide est ignore,
      // pour ne jamais effacer le nom de la company.
      if (companyName !== undefined) nameUpdate.name = companyName;
      await supabaseAdmin.from("companies").update(nameUpdate).eq("id", adminCompanyId);
    }

    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
