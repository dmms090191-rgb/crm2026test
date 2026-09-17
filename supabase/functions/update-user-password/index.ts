import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { decidePasswordChange, type PolicyLead, type PolicyTarget } from "./passwordPolicy.ts";

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
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerRole = caller.app_metadata?.role;
    if (callerRole !== "admin" && callerRole !== "vendor" && callerRole !== "super_admin" && callerRole !== "company_super_admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: insufficient role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      body = parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { auth_user_id, email, password, role, lead_id } = body as {
      auth_user_id?: string; email?: string; password?: string; role?: string; lead_id?: string;
    };

    console.log("[update-user-password] Request:", { callerRole, callerId: caller.id, email, lead_id, hasPassword: !!password });

    if ((!auth_user_id && !email) || typeof password !== "string" || !password) {
      return new Response(
        JSON.stringify({ error: "auth_user_id or email, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^\d{6}$/.test(password)) {
      return new Response(
        JSON.stringify({ error: "Password must be exactly 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const forbidden = (error: string) => new Response(
      JSON.stringify({ error }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    let callerVendorId: string | null = null;
    if (callerRole === "vendor") {
      if (!lead_id) {
        return new Response(
          JSON.stringify({ error: "lead_id is required for vendor role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: vendor } = await supabaseAdmin
        .from("vendors")
        .select("id")
        .eq("auth_user_id", caller.id)
        .maybeSingle();

      if (!vendor) return forbidden("Forbidden: vendor record not found");
      callerVendorId = vendor.id;
    }

    // --- Lead eventuel (perimetre des clients) ---
    let lead: PolicyLead | null = null;
    if (lead_id) {
      const { data: leadRow } = await supabaseAdmin
        .from("leads")
        .select("company_id, vendor_id, email, data")
        .eq("id", lead_id)
        .maybeSingle();
      if (leadRow) {
        const dataEmail = (leadRow.data as Record<string, unknown> | null)?.["Email"];
        lead = { companyId: leadRow.company_id, vendorId: leadRow.vendor_id, emails: [leadRow.email, dataEmail] };
      }
    }
    if (callerRole === "vendor" && (!lead || lead.vendorId !== callerVendorId)) {
      console.log("[update-user-password] Ownership check failed:", { vendorId: callerVendorId, leadVendorId: lead?.vendorId });
      return forbidden("Forbidden: this lead is not assigned to you");
    }

    // --- Compte cible : par identifiant, sinon par email ---
    let target: PolicyTarget | null = null;
    if (auth_user_id) {
      const { data: byId } = await supabaseAdmin.auth.admin.getUserById(auth_user_id);
      if (!byId?.user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      target = { id: byId.user.id, role: byId.user.app_metadata?.role, companyId: byId.user.app_metadata?.company_id, email: byId.user.email };
    } else {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = usersData?.users?.find(
        (u: { email?: string }) => u.email === email
      );
      if (existing) {
        target = { id: existing.id, role: existing.app_metadata?.role, companyId: existing.app_metadata?.company_id, email: existing.email };
      }
    }

    // --- Parents de Societe, utiles au perimetre d un Groupe ---
    const parentOf = async (companyId: unknown): Promise<string | null> => {
      if (typeof companyId !== "string" || !companyId) return null;
      const { data: c } = await supabaseAdmin.from("companies").select("parent_company_id").eq("id", companyId).maybeSingle();
      return c?.parent_company_id ?? null;
    };
    const isGroup = callerRole === "company_super_admin";

    // --- Email present sur un lead d une AUTRE Societe (prise de compte client inter-Societes) ---
    // Comparaison exacte et filtre de Societe faits en base (fonction SQL reservee a service_role,
    // migration 20260917021917_email_on_other_company_leads). Refus par defaut en cas d erreur.
    const emailOnOtherCompanyLeads = async (rawEmail: unknown, leadCompanyId: unknown): Promise<boolean> => {
      if (typeof rawEmail !== "string" || !rawEmail.trim()) return true;
      const { data: isForeign, error: rpcErr } = await supabaseAdmin.rpc("email_on_other_company_leads", {
        p_email: rawEmail,
        p_company_id: typeof leadCompanyId === "string" && leadCompanyId ? leadCompanyId : null,
      });
      if (rpcErr) return true;
      return isForeign !== false;
    };
    const needsForeignCheck = callerRole !== "super_admin" && lead !== null &&
      (target === null || target.role === "client");
    const foreignEmail = needsForeignCheck
      ? await emailOnOtherCompanyLeads(target ? target.email : email, lead!.companyId)
      : false;

    const decision = decidePasswordChange({
      callerId: caller.id,
      callerRole,
      callerCompanyId: caller.app_metadata?.company_id,
      callerVendorId,
      target,
      requestedRole: role,
      requestedEmail: email,
      lead,
      targetCompanyParentId: isGroup && target ? await parentOf(target.companyId) : null,
      leadCompanyParentId: isGroup && lead ? await parentOf(lead.companyId) : null,
      emailOnOtherCompanyLeads: foreignEmail,
    });

    if (!decision.ok) {
      console.log("[update-user-password] Refused:", { callerRole, callerId: caller.id, reason: decision.error });
      return forbidden(decision.error);
    }

    if (decision.action === "create_client") {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role: "client" },
          user_metadata: { role: "client" },
        });

      if (createErr) {
        console.error("[update-user-password] Create user error:", createErr.message);
        return new Response(
          JSON.stringify({ error: createErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[update-user-password] Created new user:", created.user.id);
      return new Response(
        JSON.stringify({ success: true, created: true, auth_user_id: created.user.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = target!.id;

    // On PRESERVE le reste de user_metadata (prenom, nom, societe, telephone).
    // Toutes les autres fonctions du projet font ce spread ; celle-ci ecrasait
    // l objet entier, au risque d effacer l identite a chaque changement de
    // mot de passe.
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(userId);
    const mergedMeta = { ...(existing?.user?.user_metadata ?? {}), pin: password };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: mergedMeta,
    });

    if (error) {
      console.error("[update-user-password] Update password error:", error.message);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[update-user-password] Password updated for userId:", userId);
    return new Response(
      JSON.stringify({ success: true, auth_user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[update-user-password] Unhandled error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
