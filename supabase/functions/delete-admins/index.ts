import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function deleteCompanyData(supabase: ReturnType<typeof createClient>, companyId: string) {
  // Batch 1: Leaf nodes (no children depend on them)
  await supabase.from("sidebar_order").delete().eq("company_id", companyId);
  await supabase.from("doc_tab_labels").delete().eq("company_id", companyId);
  await supabase.from("crm_documentation").delete().eq("company_id", companyId);
  await supabase.from("crm_tasks").delete().eq("company_id", companyId);
  await supabase.from("crm_notes").delete().eq("company_id", companyId);
  await supabase.from("crm_page_checklist_items").delete().eq("company_id", companyId);
  await supabase.from("crm_custom_pages").delete().eq("company_id", companyId);
  await supabase.from("registrations").delete().eq("company_id", companyId);
  await supabase.from("statuts").delete().eq("company_id", companyId);

  // Batch 2: Vendor dependents
  await supabase.from("vendor_comments").delete().eq("company_id", companyId);
  await supabase.from("vendor_admin_messages").delete().eq("company_id", companyId);
  await supabase.from("client_messages").delete().eq("company_id", companyId);

  // Batch 3: Conversations (CASCADE deletes messages automatically)
  await supabase.from("conversations").delete().eq("company_id", companyId);

  // Batch 4: RDV proposals (self-ref parent_proposal_id is SET NULL)
  await supabase.from("rdv_proposals").delete().eq("company_id", companyId);

  // Batch 5: Leads and imports (leads CASCADE from import_history, but we delete by company_id directly)
  await supabase.from("leads").delete().eq("company_id", companyId);
  await supabase.from("import_history").delete().eq("company_id", companyId);

  // Batch 6: Vendors
  await supabase.from("vendors").delete().eq("company_id", companyId);

  // Batch 7: Delete the company itself
  await supabase.from("companies").delete().eq("id", companyId);
}

async function deleteAdminOrphanData(supabase: ReturnType<typeof createClient>, adminId: string) {
  await supabase.from("admin_comments").delete().eq("admin_id", adminId);
  await supabase.from("super_admin_messages").delete().or(`admin_id.eq.${adminId},super_admin_id.eq.${adminId}`);
  await supabase.from("rdv_proposals").update({ created_by_id: null }).eq("created_by_id", adminId);
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

    const { admin_ids } = await req.json();

    if (!Array.isArray(admin_ids) || admin_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "admin_ids must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (admin_ids.includes(caller.id)) {
      return new Response(
        JSON.stringify({ error: "Cannot delete the currently connected user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const adminId of admin_ids) {
      const { data: { user: targetUser }, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(adminId);

      if (fetchError || !targetUser) {
        results.push({ id: adminId, success: false, error: "User not found" });
        continue;
      }

      if (targetUser.app_metadata?.role !== "admin") {
        results.push({ id: adminId, success: false, error: "Target user is not an admin" });
        continue;
      }

      if (targetUser.app_metadata?.role === "super_admin") {
        results.push({ id: adminId, success: false, error: "Cannot delete a super_admin" });
        continue;
      }

      try {
        // 1. Delete all company data if admin has a company_id
        const companyId = targetUser.app_metadata?.company_id;
        if (companyId) {
          await deleteCompanyData(supabaseAdmin, companyId);
        }

        // 2. Delete admin-specific orphan data
        await deleteAdminOrphanData(supabaseAdmin, adminId);

        // 3. Delete the auth user (also cascades user_preferences)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(adminId);

        if (deleteError) {
          results.push({ id: adminId, success: false, error: deleteError.message });
        } else {
          results.push({ id: adminId, success: true });
        }
      } catch (e) {
        results.push({ id: adminId, success: false, error: String(e) });
      }
    }

    const deleted = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ success: true, deleted, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
