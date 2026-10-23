import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { reponseErreurAuth } from "./messageErreurAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * MODIFIER UNE SOCIETE (cible de role `admin`).
 *
 * ---------- TROIS APPELANTS, UN SEUL CHEMIN D'ECRITURE ----------
 *
 *   - Talvex (super_admin) agit sur n'importe quelle Societe ;
 *   - un Groupe (company_super_admin) uniquement sur SES Societes filles ;
 *   - un Admin (admin) uniquement sur LUI-MEME ;
 *   - Talvex sur SON PROPRE compte, pour l'ecran « Mon compte » — c'est pour ce cas que
 *     la garde ci-dessous ne peut pas exiger une cible de role `admin`.
 *
 * Les deux derniers cas sont arrives le 23 octobre 2026. Les ecrans « Societe > Acces &
 * securite > Info Admin » et « Talvex > Mon compte » ecrivaient, au caractere pres par le
 * meme code, leur email par `supabase.auth.updateUser({ email })`,
 * c'est-a-dire l'API de l'utilisateur courant. Or cette API NE POSE PAS l'email : elle
 * enregistre une DEMANDE et attend une confirmation par courriel. Deux comptes du projet
 * portaient ainsi un `email_change` en attente depuis plusieurs jours, pendant que
 * l'interface affichait « Email et mot de passe enregistrés ».
 *
 * `email_confirm: true` n'existe QUE sur l'API Admin, qui exige la cle de service. Le
 * navigateur ne peut donc pas l'employer, et ne doit pas : la cle de service y serait
 * lisible par tout le monde. D'ou cette fonction, et la garde d'auto-service ci-dessous.
 *
 * ---------- CE QUE LA GARDE D'AUTO-SERVICE AUTORISE, ET RIEN DE PLUS ----------
 *
 * Un appelant de role `admin` ou `super_admin` passe si et seulement si
 * `admin_id === caller.id` : son propre compte, lu dans le jeton verifie par le serveur,
 * jamais dans le corps de la requete. Ni `role` ni `company_id` ne transitent par cette
 * fonction : un auto-service ne peut donc pas s'elever, changer de Societe, ni toucher au
 * compte d'autrui. Meme forme que l'auto-service de `update-company-super-admin`.
 *
 * La liste des deux roles n'est pas decorative : sans elle, un Commercial ou un Client
 * pourrait renommer la Societe a laquelle il appartient, puisque cette fonction ecrit
 * aussi `companies`. Et `companies` n'est de toute facon tenue que pour une cible `admin`.
 *
 * ---------- POURQUOI DEUX ECRITURES ET NON UNE ----------
 *
 * L'identite et l'email partaient dans un seul `updateUserById`. Un email deja pris
 * faisait donc echouer AUSSI le changement de prenom, de nom et de telephone, pour une
 * raison sans rapport. Les deux ecritures sont desormais separees : l'identite d'abord,
 * l'email ensuite. Un conflit d'email laisse le reste enregistre, et le dit.
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
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return json({ error: "Unauthorized: invalid token" }, 401);
    }

    const callerRole = caller.app_metadata?.role;

    /*
     * Le corps est lu AVANT la garde de role : `admin_id` est necessaire pour decider
     * si l'appel est un auto-service. L'ordre inverse interdirait ce cas.
     */
    const { admin_id, first_name, last_name, phone, company, email, timezone } =
      await req.json();

    if (!admin_id) {
      return json({ error: "admin_id is required" }, 400);
    }

    /*
     * LA CIBLE VIENT DU JETON VERIFIE PAR LE SERVEUR, jamais du corps de la requete.
     *
     * L'auto-service est restreint a `admin` et `super_admin`, et UNIQUEMENT sur leur
     * propre compte. Ne pas le restreindre serait une porte ouverte : sans cette liste,
     * un Commercial ou un Client pourrait renommer la Societe a laquelle il appartient,
     * puisque cette fonction ecrit aussi `companies`.
     */
    const isSelfService =
      (callerRole === "admin" || callerRole === "super_admin") && admin_id === caller.id;

    if (
      callerRole !== "company_super_admin" &&
      callerRole !== "super_admin" &&
      !isSelfService
    ) {
      return json(
        { error: "Forbidden: company_super_admin or super_admin role required" },
        403,
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the target admin exists and is an admin
    const { data: targetUser, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(admin_id);
    if (fetchErr || !targetUser?.user) {
      return json({ error: "Admin user not found" }, 404);
    }

    /*
     * UNE CIBLE AUTRE QUE SOI-MEME doit etre un admin. Pour un auto-service, la cible
     * EST l'appelant : son role a deja ete verifie sur le jeton, et exiger `admin` ici
     * fermerait l'ecran « Mon compte » du Talvex Administrateur, qui est un super_admin.
     */
    const cibleEstAdmin = targetUser.user.app_metadata?.role === "admin";
    if (!isSelfService && !cibleEstAdmin) {
      return json({ error: "Target user is not an admin" }, 400);
    }

    /*
     * Le company_id ne sert qu'a deux choses : le controle de parente du Groupe, et la
     * mise a jour de `companies`. Un auto-service n'a besoin d'aucune des deux, et le
     * Talvex Administrateur n'a pas de ligne `companies` a tenir : son absence n'est
     * donc plus une erreur, elle desactive simplement ces deux traitements.
     */
    const adminCompanyId = targetUser.user.app_metadata?.company_id as string | undefined;
    if (!adminCompanyId && !isSelfService) {
      return json({ error: "Admin has no company_id" }, 400);
    }

    /*
     * Le controle de parente ne concerne QUE le Groupe : Talvex agit partout, et un
     * auto-service agit sur lui-meme — sa « parente » avec lui-meme n'a pas de sens.
     */
    if (callerRole === "company_super_admin") {
      const callerCompanyId = caller.app_metadata?.company_id as string | undefined;
      if (!callerCompanyId) {
        return json({ error: "No company_id for caller" }, 400);
      }

      const { data: adminCompany } = await supabaseAdmin
        .from("companies")
        .select("parent_company_id")
        .eq("id", adminCompanyId)
        .maybeSingle();

      if (!adminCompany || adminCompany.parent_company_id !== callerCompanyId) {
        return json({ error: "Forbidden: admin does not belong to your company" }, 403);
      }
    }

    /* ---------- 1. L'IDENTITE ---------- */

    const identiteDemandee =
      first_name !== undefined || last_name !== undefined ||
      phone !== undefined || company !== undefined || timezone !== undefined;

    let utilisateur = targetUser.user;

    if (identiteDemandee) {
      const updatedMetadata = {
        ...targetUser.user.user_metadata,
        ...(first_name !== undefined ? { first_name } : {}),
        ...(last_name !== undefined ? { last_name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(company !== undefined ? { company } : {}),
        /*
         * `timezone` : en Visu, le panneau Societe ne peut pas ecrire le fuseau de la
         * Societe par `auth.updateUser`, qui n'agit que sur l'utilisateur connecte —
         * c'etait le defaut qui faisait changer le fuseau du Talvex Administrateur.
         */
        ...(timezone !== undefined ? { timezone } : {}),
      };

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        admin_id,
        { user_metadata: updatedMetadata },
      );
      if (error) {
        const r = reponseErreurAuth(error.message);
        return json({ error: r.message, email_applique: false }, r.statut);
      }
      if (data.user) utilisateur = data.user;

      const companyName =
        typeof company === "string" && company.trim() ? company.trim() : undefined;

      /*
       * `companies` n'est tenue QUE pour une cible de role `admin`, et seulement si elle
       * a une company. Le Talvex Administrateur qui modifie son propre compte n'a pas de
       * ligne `companies` a renommer — et un auto-service d'un autre role ne doit
       * surtout pas pouvoir renommer la Societe a laquelle il appartient.
       */
      if (
        adminCompanyId && cibleEstAdmin &&
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
        // Email : bascule IMMEDIATE par l API admin, sans workflow de
        // confirmation — flux administrateur assume. `email_confirm` garantit
        // que le nouvel email est utilisable tout de suite pour se connecter,
        // avec le PIN inchange.
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          admin_id,
          { email: next, email_confirm: true },
        );

        if (error) {
          /*
           * L'identite est deja enregistree a ce stade : on le DIT, pour que
           * l'utilisateur ne reprenne pas une saisie qui a abouti.
           */
          const r = reponseErreurAuth(error.message);
          return json(
            {
              error: identiteDemandee
                ? `${r.message} Les autres informations, elles, ont bien été enregistrées.`
                : r.message,
              email_applique: false,
              identite_enregistree: identiteDemandee,
            },
            r.statut,
          );
        }
        if (data.user) utilisateur = data.user;
        emailApplique = true;
      }
    }

    /*
     * On rend l'email REELLEMENT en place, relu dans la reponse du serveur. C'est lui
     * que le client doit afficher : sans cela, l'ecran ne peut pas distinguer un email
     * applique d'un email reste inchange.
     */
    return json({
      success: true,
      user: utilisateur,
      email: utilisateur.email ?? null,
      email_applique: emailApplique,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
