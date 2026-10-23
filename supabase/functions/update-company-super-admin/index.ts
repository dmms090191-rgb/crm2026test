import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { reponseErreurAuth } from "./messageErreurAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * MODIFIER UN GROUPE (cible de role `company_super_admin`).
 *
 * ---------- POURQUOI DEUX ECRITURES ET NON UNE ----------
 *
 * Le 23 octobre 2026, modifier l'email d'un Groupe deja porte par un autre compte
 * rendait « Error updating user », et la modification entiere etait perdue. Le journal
 * Auth disait pourtant la cause exacte :
 *
 *     PUT /admin/users/{id} -> 500
 *     ERROR: duplicate key value violates unique constraint
 *     "users_email_partial_key" (SQLSTATE 23505)
 *
 * Deux defauts se cumulaient. Le message brut etait relaye verbatim, donc illisible.
 * Et l'identite partait dans le MEME `updateUserById` que l'email, donc un email deja
 * pris faisait aussi echouer le prenom, le nom, le telephone et le nom du Groupe — des
 * champs sans aucun rapport avec le conflit.
 *
 * Les deux ecritures sont desormais separees, dans cet ordre : l'identite d'abord,
 * l'email ensuite. Un conflit d'email laisse donc l'identite enregistree, et le dit.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (corps: unknown, statut = 200) =>
    new Response(JSON.stringify(corps), {
      status: statut,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return json({ error: "Unauthorized: invalid token" }, 401);
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
      return json({ error: "Forbidden: super_admin role required" }, 403);
    }

    if (!target_user_id) {
      return json({ error: "target_user_id is required" }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: targetUser, error: fetchErr } =
      await supabaseAdmin.auth.admin.getUserById(target_user_id);

    if (fetchErr || !targetUser?.user) {
      return json({ error: "Target user not found" }, 404);
    }

    if (targetUser.user.app_metadata?.role !== "company_super_admin") {
      return json({ error: "Target user is not a company_super_admin" }, 400);
    }

    /* ---------- 1. L'IDENTITE, ET LE MOT DE PASSE S'IL EST DEMANDE ---------- */

    const identiteDemandee =
      first_name !== undefined || last_name !== undefined ||
      company !== undefined || phone !== undefined;

    if (password !== undefined && password !== null && password !== "") {
      if (!/^\d{6}$/.test(password)) {
        return json({ error: "Password must be exactly 6 digits" }, 400);
      }
    }
    const motDePasseDemande =
      password !== undefined && password !== null && password !== "";

    let utilisateur = targetUser.user;

    if (identiteDemandee || motDePasseDemande) {
      // user_metadata est la SOURCE DE VERITE unique de ces quatre champs :
      // list-company-super-admins, list-admins-for-super-admin et
      // resolve-parent-super-admin les relisent tous depuis la. Aucun doublon.
      const meta = { ...targetUser.user.user_metadata };
      if (first_name !== undefined) meta.first_name = first_name;
      if (last_name !== undefined) meta.last_name = last_name;
      if (company !== undefined) meta.company = company;
      if (phone !== undefined) meta.phone = phone;
      if (motDePasseDemande) meta.pin = password;

      const updates: Record<string, unknown> = { user_metadata: meta };
      if (motDePasseDemande) updates.password = password;

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        target_user_id,
        updates,
      );
      if (error) {
        const r = reponseErreurAuth(error.message);
        return json({ error: r.message, email_applique: false }, r.statut);
      }
      if (data.user) utilisateur = data.user;

      /*
       * LE NOM DU GROUPE VIT A DEUX ENDROITS, et il faut les tenir ensemble.
       *
       * `user_metadata.company` est ce que lisent les listes ; `companies.name` est ce
       * que lisent les ecrans qui partent de la Societe. Jusqu'ici cette fonction
       * n'ecrivait que le premier, alors que son equivalent pour une Societe
       * (update-admin-for-super-admin) ecrivait les deux : renommer un Groupe laissait
       * donc `companies.name` sur l'ancien nom, sans que rien ne le signale.
       *
       * Un nom vide est ignore : on ne remplace jamais un nom existant par du vide.
       */
      const groupCompanyId = targetUser.user.app_metadata?.company_id as string | undefined;
      const companyName =
        typeof company === "string" && company.trim() ? company.trim() : undefined;

      if (
        groupCompanyId &&
        (first_name !== undefined || last_name !== undefined || companyName !== undefined)
      ) {
        const nameUpdate: Record<string, string> = {};
        if (first_name !== undefined) nameUpdate.admin_first_name = first_name;
        if (last_name !== undefined) nameUpdate.admin_last_name = last_name;
        if (companyName !== undefined) nameUpdate.name = companyName;
        await supabaseAdmin.from("companies").update(nameUpdate).eq("id", groupCompanyId);
      }
    }

    /* ---------- 2. L'EMAIL, SEPAREMENT ---------- */

    const emailActuel = (targetUser.user.email ?? "").toLowerCase();
    let emailApplique = false;

    if (typeof email === "string" && email.trim()) {
      const next = email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) {
        return json({ error: "Email invalide", email_applique: false }, 400);
      }

      if (next !== emailActuel) {
        // Sans `email_confirm` le nouvel email resterait non confirme, donc
        // inutilisable pour se connecter.
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          target_user_id,
          { email: next, email_confirm: true },
        );

        if (error) {
          const r = reponseErreurAuth(error.message);
          return json(
            {
              error: identiteDemandee || motDePasseDemande
                ? `${r.message} Les autres informations, elles, ont bien été enregistrées.`
                : r.message,
              email_applique: false,
              identite_enregistree: identiteDemandee || motDePasseDemande,
            },
            r.statut,
          );
        }
        if (data.user) utilisateur = data.user;
        emailApplique = true;
      }
    }

    if (!identiteDemandee && !motDePasseDemande && !emailApplique) {
      /*
       * Rien n'a change. On ne rend PAS une erreur : l'appel est valide, il n'avait
       * simplement rien a faire. Rendre 400 ici ferait apparaitre un message rouge
       * apres un enregistrement ou l'utilisateur n'a touche a aucun champ.
       */
      return json({
        success: true,
        user: utilisateur,
        email: utilisateur.email ?? null,
        email_applique: false,
        rien_a_changer: true,
      });
    }

    return json({
      success: true,
      user: utilisateur,
      email: utilisateur.email ?? null,
      email_applique: emailApplique,
    });
  } catch (err) {
    return json({ error: (err as Error).message ?? "Internal server error" }, 500);
  }
});
