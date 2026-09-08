import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Kind = "talvex" | "groupe";

interface Interlocutor {
  id: string;
  kind: Kind;
  display_name: string;
  company: string;
}

/**
 * Cherche le compte qui detient une company, en PAGINANT.
 * listUsers() plafonne a 1000 par page : sans boucle, au-dela de 1000 comptes
 * la recherche echouerait silencieusement et renverrait « parent introuvable ».
 */
async function findUserOwningCompany(
  admin: SupabaseClient,
  companyId: string,
  roles: string[],
): Promise<User | null> {
  const perPage = 1000;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const hit = users.find((u) =>
      roles.includes(u.app_metadata?.role as string) && u.app_metadata?.company_id === companyId
    );
    if (hit) return hit;
    if (users.length < perPage) break;
  }
  return null;
}

const identity = (u: User, id?: string) => ({
  super_admin_id: id ?? u.id,
  first_name: (u.user_metadata?.first_name as string) ?? "",
  last_name: (u.user_metadata?.last_name as string) ?? "",
  company: (u.user_metadata?.company as string) ?? "",
});

function toInterlocutor(u: User): Interlocutor | null {
  const role = u.app_metadata?.role as string | undefined;
  if (role !== "super_admin" && role !== "company_super_admin") return null;
  const kind: Kind = role === "super_admin" ? "talvex" : "groupe";
  const meta = (u.user_metadata ?? {}) as Record<string, string>;
  const human = [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim();
  return {
    id: u.id,
    kind,
    display_name: kind === "talvex"
      ? "Talvex Administrateur"
      : (human || meta.company || u.email || "Groupe"),
    company: meta.company ?? "",
  };
}

/**
 * Le VRAI Groupe parent d'une Societe.
 *
 * Uniquement par la hierarchie : company de la Societe -> parent_company_id ->
 * compte Auth qui detient cette company parente.
 *
 * created_by_user_id est DELIBEREMENT ignore : ce champ contient l'auteur du
 * clic, donc Talvex quand la Societe a ete creee pendant une Visu sur le
 * Groupe. S'en servir renverrait Talvex pour une Societe qui appartient
 * pourtant a un Groupe.
 */
async function strictParentOfCompany(
  admin: SupabaseClient,
  companyId: string,
): Promise<User | null> {
  const { data: company } = await admin
    .from("companies")
    .select("parent_company_id")
    .eq("id", companyId)
    .maybeSingle();
  const parentCompanyId = company?.parent_company_id as string | null | undefined;
  if (!parentCompanyId) return null;

  return await findUserOwningCompany(admin, parentCompanyId, ["company_super_admin", "super_admin"]);
}

/**
 * Interlocuteurs d'un compte, pour la messagerie.
 *
 *   1. son parent hierarchique          -> TOUJOURS propose
 *   2. + tout super_admin_id deja present dans SON historique de messages
 *
 * L'historique est lu par le serveur, jamais fourni par le client : aucune
 * identite n'est revelee pour un uid que l'appelant ne voit pas deja.
 */
async function buildInterlocutors(admin: SupabaseClient, target: User): Promise<Interlocutor[]> {
  const role = target.app_metadata?.role as string | undefined;
  const companyId = target.app_metadata?.company_id as string | undefined;
  const ids: string[] = [];

  if (role === "admin") {
    // Societe : hierarchie STRICTE, jamais created_by_user_id.
    if (companyId) {
      const parent = await strictParentOfCompany(admin, companyId);
      if (parent) ids.push(parent.id);
    }
  } else {
    // Groupe : comportement historique conserve (son parent est Talvex).
    const createdBy = target.app_metadata?.created_by_user_id as string | undefined;
    if (createdBy) ids.push(createdBy);
    else if (companyId) {
      const parent = await strictParentOfCompany(admin, companyId);
      if (parent) ids.push(parent.id);
    }
  }

  // Conversations DEJA existantes : c'est ce qui fait apparaitre Talvex pour
  // une Societe rattachee a un Groupe, sans jamais en creer une nouvelle.
  const { data: rows } = await admin
    .from("super_admin_messages")
    .select("super_admin_id")
    .eq("admin_id", target.id);
  for (const r of rows ?? []) {
    const sid = (r as { super_admin_id: string }).super_admin_id;
    if (sid) ids.push(sid);
  }

  const seen = new Set<string>();
  const out: Interlocutor[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const { data: res } = await admin.auth.admin.getUserById(id);
    const u = res?.user;
    if (!u) continue;
    const it = toInterlocutor(u);
    if (it) out.push(it);
  }

  // Talvex d'abord, puis le ou les Groupes.
  out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "talvex" ? -1 : 1));
  return out;
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
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !caller) return json({ error: "Unauthorized" }, 401);

    const callerRole = caller.app_metadata?.role;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Corps optionnel : les appels GET historiques n'en ont pas.
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetUserId = typeof body?.target_user_id === "string" && body.target_user_id
      ? body.target_user_id
      : null;

    // ------------------------------------------------------------------
    // BRANCHE VISU — super_admin nomme EXPLICITEMENT la Societe cible.
    //
    // On ne resout PAS le parent de l'appelant : en Visu le JWT reste
    // super_admin, deduire depuis l'appelant renverrait Talvex, exactement
    // le mauvais routage qu'on cherche a supprimer.
    // Aucun repli : chaque maillon manquant est un refus explicite.
    // ------------------------------------------------------------------
    if (targetUserId) {
      if (callerRole !== "super_admin") {
        return json({ error: "Forbidden: target_user_id est reserve au role super_admin" }, 403);
      }

      const { data: targetRes } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      const target = targetRes?.user;
      if (!target) return json({ error: "Compte cible introuvable" }, 404);

      if (target.app_metadata?.role !== "admin") {
        return json({ error: "Le compte cible n'est pas une Societe" }, 400);
      }

      const targetCompanyId = target.app_metadata?.company_id as string | undefined;
      if (!targetCompanyId) {
        return json({ error: "Aucun company_id sur la Societe cible" }, 400);
      }

      const { data: targetCompany } = await supabaseAdmin
        .from("companies")
        .select("parent_company_id")
        .eq("id", targetCompanyId)
        .maybeSingle();
      if (!targetCompany) return json({ error: "Societe de la cible introuvable" }, 404);

      const parentCompanyId = targetCompany.parent_company_id as string | null;
      if (!parentCompanyId) return json({ error: "Cette Societe n'a aucun Groupe parent" }, 404);

      const { data: parentCompany } = await supabaseAdmin
        .from("companies").select("id").eq("id", parentCompanyId).maybeSingle();
      if (!parentCompany) return json({ error: "Societe parente introuvable" }, 404);

      const parentGroup = await findUserOwningCompany(
        supabaseAdmin,
        parentCompanyId,
        ["company_super_admin"],   // un Groupe, jamais Talvex
      );
      if (!parentGroup) {
        return json({ error: "Aucun Groupe ne detient la societe parente" }, 404);
      }

      return json({
        ...identity(parentGroup),
        interlocutors: await buildInterlocutors(supabaseAdmin, target),
      });
    }

    // ------------------------------------------------------------------
    // BRANCHES HISTORIQUES — admin et company_super_admin connectes pour de
    // vrai. Champs de reponse inchanges, « interlocutors » ajoute.
    // ------------------------------------------------------------------
    if (callerRole !== "admin" && callerRole !== "company_super_admin") {
      return json({ error: "Forbidden: admin or company_super_admin role required" }, 403);
    }

    const interlocutors = await buildInterlocutors(supabaseAdmin, caller);

    // Fast path: created_by_user_id stored during admin creation
    const createdBy = caller.app_metadata?.created_by_user_id as string | undefined;
    if (createdBy) {
      // Additif : on joint l'identite du parent. super_admin_id reste inchange.
      const { data: parent } = await supabaseAdmin.auth.admin.getUserById(createdBy);
      const meta = (parent?.user?.user_metadata ?? {}) as Record<string, string>;
      return json({
        super_admin_id: createdBy,
        first_name: meta.first_name ?? "",
        last_name: meta.last_name ?? "",
        company: meta.company ?? "",
        interlocutors,
      });
    }

    // Fallback: resolve via company hierarchy
    const adminCompanyId = caller.app_metadata?.company_id as string | undefined;
    if (!adminCompanyId) {
      return json({ error: "No company_id for this admin", interlocutors }, 400);
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("parent_company_id")
      .eq("id", adminCompanyId)
      .maybeSingle();

    const parentCompanyId = company?.parent_company_id;
    if (!parentCompanyId) {
      return json({ error: "No parent company found", interlocutors }, 404);
    }

    // Find a super_admin or company_super_admin owning the parent company
    const parentSA = await findUserOwningCompany(
      supabaseAdmin,
      parentCompanyId,
      ["super_admin", "company_super_admin"],
    );

    if (!parentSA) {
      return json({ error: "No super admin found for parent company", interlocutors }, 404);
    }

    return json({ ...identity(parentSA), interlocutors });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
