import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
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
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerRole = caller.app_metadata?.role;

    const { target_user_id, first_name, last_name, company, phone, email, password } =
      await req.json();

    // Talvex agit sur n importe quel Groupe ; un Groupe uniquement sur
    // LUI-MEME. Le role et le company_id ne transitent jamais par cette
    // fonction : un self-service ne peut donc pas elever ses droits.
    const isSelfService =
      callerRole === "company_super_admin" && target_user_id === caller.id;

    if (callerRole !== "super_admin" && !isSelfService) {
      return new Response(
        JSON.stringify({ error: "Forbidden: super_admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: "target_user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: targetUser, error: fetchErr } =
      await supabaseAdmin.auth.admin.getUserById(target_user_id);

    if (fetchErr || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetUser.user.app_metadata?.role !== "company_super_admin") {
      return new Response(
        JSON.stringify({ error: "Target user is not a company_super_admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updates: Record<string, unknown> = {};

    // user_metadata est la SOURCE DE VERITE unique de ces quatre champs :
    // list-company-super-admins, list-admins-for-super-admin et
    // resolve-parent-super-admin les relisent tous depuis la. Aucun doublon.
    if (
      first_name !== undefined || last_name !== undefined ||
      company !== undefined || phone !== undefined
    ) {
      const meta = { ...targetUser.user.user_metadata };
      if (first_name !== undefined) meta.first_name = first_name;
      if (last_name !== undefined) meta.last_name = last_name;
      if (company !== undefined) meta.company = company;
      if (phone !== undefined) meta.phone = phone;
      updates.user_metadata = meta;
    }

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
        // Sans ceci le nouvel email peut rester non confirme, donc
        // inutilisable pour se connecter.
        updates.email_confirm = true;
      }
    }

    if (password) {
      if (!/^\d{6}$/.test(password)) {
        return new Response(
          JSON.stringify({ error: "Password must be exactly 6 digits" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      updates.password = password;
      const meta =
        (updates.user_metadata as Record<string, unknown>) ?? {
          ...targetUser.user.user_metadata,
        };
      meta.pin = password;
      updates.user_metadata = meta;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: "No fields to update" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      updates
    );

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
