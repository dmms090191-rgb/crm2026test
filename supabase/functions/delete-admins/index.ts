import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CompanyDeleteLog {
  company_id: string;
  leads_deleted: number;
  vendors_deleted: number;
  vendor_auth_deleted: number;
  vendor_auth_errors: string[];
  tables_cleaned: string[];
}

async function deleteCompanyData(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
): Promise<CompanyDeleteLog> {
  const log: CompanyDeleteLog = {
    company_id: companyId,
    leads_deleted: 0,
    vendors_deleted: 0,
    vendor_auth_deleted: 0,
    vendor_auth_errors: [],
    tables_cleaned: [],
  };

  // Count leads before deleting
  const { count: leadsCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  log.leads_deleted = leadsCount ?? 0;

  // Batch 1: Leaf nodes (no children depend on them)
  await supabase.from("sidebar_order").delete().eq("company_id", companyId);
  log.tables_cleaned.push("sidebar_order");

  await supabase.from("doc_tab_labels").delete().eq("company_id", companyId);
  log.tables_cleaned.push("doc_tab_labels");

  await supabase.from("crm_documentation").delete().eq("company_id", companyId);
  log.tables_cleaned.push("crm_documentation");

  await supabase.from("crm_tasks").delete().eq("company_id", companyId);
  log.tables_cleaned.push("crm_tasks");

  await supabase.from("crm_notes").delete().eq("company_id", companyId);
  log.tables_cleaned.push("crm_notes");

  await supabase.from("crm_page_checklist_items").delete().eq("company_id", companyId);
  log.tables_cleaned.push("crm_page_checklist_items");

  await supabase.from("crm_custom_pages").delete().eq("company_id", companyId);
  log.tables_cleaned.push("crm_custom_pages");

  await supabase.from("registrations").delete().eq("company_id", companyId);
  log.tables_cleaned.push("registrations");

  await supabase.from("statuts").delete().eq("company_id", companyId);
  log.tables_cleaned.push("statuts");

  await supabase.from("company_home_pages").delete().eq("company_id", companyId);
  log.tables_cleaned.push("company_home_pages");

  await supabase.from("chat_automation_config").delete().eq("company_id", companyId);
  log.tables_cleaned.push("chat_automation_config");

  await supabase.from("admin_announcements").delete().eq("company_id", companyId);
  log.tables_cleaned.push("admin_announcements");

  // Batch 2: Vendor dependents
  await supabase.from("vendor_comments").delete().eq("company_id", companyId);
  log.tables_cleaned.push("vendor_comments");

  await supabase.from("vendor_admin_messages").delete().eq("company_id", companyId);
  log.tables_cleaned.push("vendor_admin_messages");

  await supabase.from("client_messages").delete().eq("company_id", companyId);
  log.tables_cleaned.push("client_messages");

  // Batch 3: Conversations (CASCADE deletes messages automatically)
  await supabase.from("conversations").delete().eq("company_id", companyId);
  log.tables_cleaned.push("conversations");
  log.tables_cleaned.push("messages (cascade)");

  // Batch 4: RDV proposals (self-ref parent_proposal_id is SET NULL)
  await supabase.from("rdv_proposals").delete().eq("company_id", companyId);
  log.tables_cleaned.push("rdv_proposals");

  // Batch 5: Leads and imports
  await supabase.from("leads").delete().eq("company_id", companyId);
  log.tables_cleaned.push("leads");

  await supabase.from("import_history").delete().eq("company_id", companyId);
  log.tables_cleaned.push("import_history");

  // Batch 6: Delete vendor auth accounts, then vendor rows
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, auth_user_id")
    .eq("company_id", companyId);

  const vendorList = vendors ?? [];
  log.vendors_deleted = vendorList.length;

  for (const vendor of vendorList) {
    if (vendor.auth_user_id) {
      const { error: vendorAuthErr } = await supabase.auth.admin.deleteUser(vendor.auth_user_id);
      if (vendorAuthErr) {
        log.vendor_auth_errors.push(`vendor ${vendor.id}: ${vendorAuthErr.message}`);
      } else {
        log.vendor_auth_deleted++;
      }
    }
  }
  log.tables_cleaned.push("vendors (+ auth accounts)");

  await supabase.from("vendors").delete().eq("company_id", companyId);

  // Batch 7: Delete the company itself
  await supabase.from("companies").delete().eq("id", companyId);
  log.tables_cleaned.push("companies");

  return log;
}

interface OrphanDeleteLog {
  tables_cleaned: string[];
}

async function deleteAdminOrphanData(
  supabase: ReturnType<typeof createClient>,
  adminId: string,
): Promise<OrphanDeleteLog> {
  const log: OrphanDeleteLog = { tables_cleaned: [] };

  await supabase.from("admin_comments").delete().eq("admin_id", adminId);
  log.tables_cleaned.push("admin_comments");

  await supabase.from("super_admin_messages").delete().or(`admin_id.eq.${adminId},super_admin_id.eq.${adminId}`);
  log.tables_cleaned.push("super_admin_messages");

  await supabase.from("sa_admin_order").delete().eq("admin_id", adminId);
  log.tables_cleaned.push("sa_admin_order");

  await supabase.from("rdv_proposals").update({ created_by_id: null }).eq("created_by_id", adminId);
  log.tables_cleaned.push("rdv_proposals (nullified created_by_id)");

  return log;
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const callerRole = caller.app_metadata?.role;
    if (callerRole !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: super_admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { admin_ids } = await req.json();

    if (!Array.isArray(admin_ids) || admin_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "admin_ids must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (admin_ids.includes(caller.id)) {
      return new Response(
        JSON.stringify({ error: "Cannot delete the currently connected user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    interface AdminResult {
      id: string;
      success: boolean;
      error?: string;
      company_id?: string;
      details?: {
        leads_deleted: number;
        vendors_deleted: number;
        vendor_auth_deleted: number;
        vendor_auth_errors: string[];
        tables_cleaned: string[];
      };
    }

    const results: AdminResult[] = [];

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
        const allTablesCleaned: string[] = [];
        let leadsDeleted = 0;
        let vendorsDeleted = 0;
        let vendorAuthDeleted = 0;
        let vendorAuthErrors: string[] = [];

        // 1. Delete all company data if admin has a company_id
        const companyId = targetUser.app_metadata?.company_id;
        if (companyId) {
          const companyLog = await deleteCompanyData(supabaseAdmin, companyId);
          leadsDeleted = companyLog.leads_deleted;
          vendorsDeleted = companyLog.vendors_deleted;
          vendorAuthDeleted = companyLog.vendor_auth_deleted;
          vendorAuthErrors = companyLog.vendor_auth_errors;
          allTablesCleaned.push(...companyLog.tables_cleaned);
        }

        // 2. Delete admin-specific orphan data
        const orphanLog = await deleteAdminOrphanData(supabaseAdmin, adminId);
        allTablesCleaned.push(...orphanLog.tables_cleaned);

        // 3. Delete the auth user (also cascades user_preferences)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(adminId);
        allTablesCleaned.push("user_preferences (cascade)");
        allTablesCleaned.push("auth.users (admin)");

        if (deleteError) {
          results.push({ id: adminId, success: false, error: deleteError.message, company_id: companyId });
        } else {
          results.push({
            id: adminId,
            success: true,
            company_id: companyId ?? null,
            details: {
              leads_deleted: leadsDeleted,
              vendors_deleted: vendorsDeleted,
              vendor_auth_deleted: vendorAuthDeleted,
              vendor_auth_errors: vendorAuthErrors,
              tables_cleaned: allTablesCleaned,
            },
          });
        }
      } catch (e) {
        results.push({ id: adminId, success: false, error: String(e) });
      }
    }

    const deleted = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ success: true, deleted, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
