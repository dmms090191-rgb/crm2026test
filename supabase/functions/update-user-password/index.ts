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

    const { auth_user_id, email, password, role, lead_id } = await req.json();

    console.log("[update-user-password] Request:", { callerRole, callerId: caller.id, email, lead_id, hasPassword: !!password });

    if (callerRole === "company_super_admin" && auth_user_id) {
      const supabaseAdminCheck = createClient(supabaseUrl, serviceRoleKey);
      const { data: tu } = await supabaseAdminCheck.auth.admin.getUserById(auth_user_id);
      const targetCid = tu?.user?.app_metadata?.company_id;
      if (targetCid) {
        const callerCid = caller.app_metadata?.company_id;
        const { data: tc } = await supabaseAdminCheck.from("companies").select("parent_company_id").eq("id", targetCid).maybeSingle();
        if (!tc || tc.parent_company_id !== callerCid) {
          return new Response(
            JSON.stringify({ error: "Forbidden: admin not in your scope" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    if ((!auth_user_id && !email) || !password) {
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

      if (!vendor) {
        return new Response(
          JSON.stringify({ error: "Forbidden: vendor record not found" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("vendor_id")
        .eq("id", lead_id)
        .maybeSingle();

      if (!lead || lead.vendor_id !== vendor.id) {
        console.log("[update-user-password] Ownership check failed:", { vendorId: vendor.id, leadVendorId: lead?.vendor_id });
        return new Response(
          JSON.stringify({ error: "Forbidden: this lead is not assigned to you" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let userId = auth_user_id;

    if (!userId && email) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = usersData?.users?.find(
        (u: { email?: string }) => u.email === email
      );

      if (existing) {
        userId = existing.id;
      } else {
        const userRole = role || "client";
        const { data: created, error: createErr } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            app_metadata: { role: userRole },
            user_metadata: { role: userRole },
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
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { pin: password },
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
