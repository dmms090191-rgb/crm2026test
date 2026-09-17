// Politique d autorisation PURE de l edge function update-user-password (etape 0.2 bis).
// Aucun import, aucune API Deno, aucun reseau : testable localement par
//   node --test supabase/functions/update-user-password/passwordPolicy.test.ts
//
// Appels reels du code (le perimetre ci-dessous les couvre tous) :
//   AdminDetailPasswordTab      super_admin        -> admin (auth_user_id)
//   EntityPasswordTab           super_admin        -> company_super_admin (auth_user_id)
//                               company_super_admin -> admin d une Societe fille (auth_user_id)
//   InfoAdminPasswordSection    super_admin / company_super_admin en Visu -> admin visualise
//   PinDisplay                  admin (ou Visu)    -> vendor de la Societe (auth_user_id)
//   CrmPinDisplay               admin / vendor (ou Visu) -> client d un lead (email + lead_id, role client)
// Regles :
//   - un compte peut toujours changer son propre PIN ;
//   - super_admin : toute cible ; creation de compte limitee au role client ;
//   - seul super_admin (ou soi-meme) touche un compte super_admin ou company_super_admin ;
//   - company_super_admin : admin/vendor d une Societe dont il est le parent, client d un lead d une Societe fille ;
//   - admin : vendor de sa Societe, client d un lead de sa Societe ;
//   - vendor : client d un lead qui lui est assigne ;
//   - un client n est jamais cible que via un lead du perimetre ET un email identique a celui du lead ;
//   - hors super_admin, un client dont l email figure sur un lead d une AUTRE Societe est refuse
//     (sinon une Societe recopie l email d un client d une autre Societe dans son CRM et prend son compte).

export type PasswordDecision =
  | { ok: true; action: "update" | "create_client" }
  | { ok: false; status: 403; error: string };

export interface PolicyTarget {
  id: string;
  role: unknown;
  companyId: unknown;
  email: unknown;
}

export interface PolicyLead {
  companyId: unknown;
  vendorId: unknown;
  /** leads.email et leads.data->>'Email' */
  emails: unknown[];
}

export interface PasswordPolicyInput {
  callerId: string;
  callerRole: unknown;
  callerCompanyId: unknown;
  /** vendors.id de l appelant quand il est vendor */
  callerVendorId: unknown;
  /** compte cible existant, ou null si aucun compte n existe pour l email demande */
  target: PolicyTarget | null;
  requestedRole: unknown;
  requestedEmail: unknown;
  /** lead charge depuis lead_id, ou null */
  lead: PolicyLead | null;
  /** parent_company_id de la Societe du compte cible (utile pour company_super_admin) */
  targetCompanyParentId: unknown;
  /** parent_company_id de la Societe du lead (utile pour company_super_admin) */
  leadCompanyParentId: unknown;
  /** true si l email vise figure sur un lead d une autre Societe que celle du lead fourni.
   *  Toute valeur autre que false est traitee comme true (refus par defaut). */
  emailOnOtherCompanyLeads: unknown;
}

const OUT_OF_SCOPE = "Forbidden: target not in your scope";
const ROLE_NOT_ALLOWED = "Forbidden: role not allowed";
const ALLOWED_CALLERS = ["super_admin", "company_super_admin", "admin", "vendor"];

function id(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

function sameId(a: unknown, b: unknown): boolean {
  const x = id(a);
  return x !== "" && x === id(b);
}

function emailMatchesLead(email: unknown, lead: PolicyLead | null): boolean {
  const e = id(email);
  if (!e || !lead) return false;
  return lead.emails.some((le) => id(le) === e);
}

function leadInScope(input: PasswordPolicyInput): boolean {
  const { callerRole, callerCompanyId, callerVendorId, lead, leadCompanyParentId } = input;
  if (!lead) return false;
  if (callerRole === "admin") return sameId(lead.companyId, callerCompanyId);
  if (callerRole === "company_super_admin") {
    return id(lead.companyId) !== "" && sameId(leadCompanyParentId, callerCompanyId);
  }
  if (callerRole === "vendor") return sameId(lead.vendorId, callerVendorId);
  return false;
}

export function decidePasswordChange(input: PasswordPolicyInput): PasswordDecision {
  const { callerId, callerRole, callerCompanyId, target, requestedRole, requestedEmail } = input;

  if (typeof callerRole !== "string" || !ALLOWED_CALLERS.includes(callerRole)) {
    return { ok: false, status: 403, error: "Forbidden: insufficient role" };
  }

  // --- Creation d un compte (aucun compte pour cet email) : role client uniquement ---
  if (target === null) {
    if (requestedRole !== undefined && requestedRole !== null && requestedRole !== "" && requestedRole !== "client") {
      return { ok: false, status: 403, error: ROLE_NOT_ALLOWED };
    }
    if (callerRole === "super_admin") return { ok: true, action: "create_client" };
    if (leadInScope(input) && emailMatchesLead(requestedEmail, input.lead) && input.emailOnOtherCompanyLeads === false) {
      return { ok: true, action: "create_client" };
    }
    return { ok: false, status: 403, error: OUT_OF_SCOPE };
  }

  // --- Compte existant ---
  if (sameId(target.id, callerId)) return { ok: true, action: "update" };
  if (callerRole === "super_admin") return { ok: true, action: "update" };

  const targetRole = target.role;
  if (targetRole === "super_admin" || targetRole === "company_super_admin") {
    return { ok: false, status: 403, error: OUT_OF_SCOPE };
  }

  if (targetRole === "client") {
    if (leadInScope(input) && emailMatchesLead(target.email, input.lead) && input.emailOnOtherCompanyLeads === false) {
      return { ok: true, action: "update" };
    }
    return { ok: false, status: 403, error: OUT_OF_SCOPE };
  }

  if (callerRole === "company_super_admin") {
    if (
      (targetRole === "admin" || targetRole === "vendor") &&
      id(target.companyId) !== "" &&
      sameId(input.targetCompanyParentId, callerCompanyId)
    ) {
      return { ok: true, action: "update" };
    }
    return { ok: false, status: 403, error: OUT_OF_SCOPE };
  }

  if (callerRole === "admin") {
    if (targetRole === "vendor" && sameId(target.companyId, callerCompanyId)) {
      return { ok: true, action: "update" };
    }
    return { ok: false, status: 403, error: OUT_OF_SCOPE };
  }

  // vendor : uniquement des clients (traites plus haut) ou soi-meme.
  return { ok: false, status: 403, error: OUT_OF_SCOPE };
}
