// Politique d autorisation PURE de l edge function create-user (etape 0.2).
// Aucun import, aucune API Deno, aucun reseau : testable localement par
//   node --test supabase/functions/create-user/rolePolicy.test.ts
//
// Liste blanche deduite des SEULS appels reels du code :
//   super_admin -> admin  : SAAdminsCreateModal.tsx (cree aussi la Societe)
//   super_admin -> vendor : AjouterVendeur.tsx, Talvex en Visu sur une Societe
//   admin       -> vendor : AjouterVendeur.tsx, Societe en direct
// Tout le reste est refuse : creation de super_admin, company_super_admin,
// client ; appelant company_super_admin, vendor, client ou sans role.

export type CreateUserDecision =
  | { ok: true; kind: "admin_new_company"; role: "admin" }
  | { ok: true; kind: "vendor"; role: "vendor"; companyId: string; mustVerifyCompany: boolean }
  | { ok: false; status: 400 | 403; error: string };

export interface CreateUserPolicyInput {
  /** app_metadata.role de l appelant (issu de auth.getUser, non modifiable par lui). */
  callerRole: unknown;
  /** app_metadata.company_id de l appelant. */
  callerCompanyId: unknown;
  /** body.role (NON fiable). */
  requestedRole: unknown;
  /** body.company_id (NON fiable). */
  bodyCompanyId: unknown;
}

export const CREATABLE_ROLES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  super_admin: Object.freeze(["admin", "vendor"]),
  admin: Object.freeze(["vendor"]),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORBIDDEN_ROLE = "Forbidden: role non autorise pour cet appelant";

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function decideCreateUser(input: CreateUserPolicyInput): CreateUserDecision {
  const { callerRole, callerCompanyId, requestedRole, bodyCompanyId } = input;

  if (typeof callerRole !== "string" || !Object.hasOwn(CREATABLE_ROLES, callerRole)) {
    return { ok: false, status: 403, error: "Forbidden: admin or super_admin role required" };
  }
  if (!nonEmpty(requestedRole)) {
    return { ok: false, status: 400, error: "Role is required" };
  }
  if (!CREATABLE_ROLES[callerRole].includes(requestedRole)) {
    return { ok: false, status: 403, error: FORBIDDEN_ROLE };
  }

  if (requestedRole === "admin") {
    // Seul super_admin l a dans sa liste. La Societe est creee par l edge function.
    return { ok: true, kind: "admin_new_company", role: "admin" };
  }
  if (requestedRole !== "vendor") {
    // Garde-fou : un role ajoute a la liste sans branche dediee reste refuse.
    return { ok: false, status: 403, error: FORBIDDEN_ROLE };
  }

  if (callerRole === "admin") {
    // Une Societe ne cible JAMAIS une autre Societe : company_id vient du JWT.
    if (!nonEmpty(callerCompanyId)) {
      return { ok: false, status: 403, error: "Forbidden: appelant sans societe" };
    }
    if (
      bodyCompanyId !== undefined && bodyCompanyId !== null && bodyCompanyId !== "" &&
      bodyCompanyId !== callerCompanyId
    ) {
      return { ok: false, status: 403, error: "Forbidden: company_id hors de votre societe" };
    }
    return { ok: true, kind: "vendor", role: "vendor", companyId: callerCompanyId, mustVerifyCompany: false };
  }

  // super_admin (Visu) : la Societe cible est NOMMEE dans le body, jamais deduite
  // de son propre app_metadata.company_id. Existence verifiee par l edge function.
  if (!nonEmpty(bodyCompanyId) || !UUID_RE.test(bodyCompanyId)) {
    return { ok: false, status: 400, error: "company_id requis pour creer un commercial" };
  }
  return { ok: true, kind: "vendor", role: "vendor", companyId: bodyCompanyId, mustVerifyCompany: true };
}
