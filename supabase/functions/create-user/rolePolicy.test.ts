// Tests unitaires de la politique pure (aucun reseau, aucun compte cree).
//   node --test supabase/functions/create-user/rolePolicy.test.ts
// (Node >= 22.18 / 24 : types retires nativement ; sinon npx tsx --test ...)
// Fichier NON importe par index.ts : il n est pas embarque au deploiement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideCreateUser, type CreateUserDecision } from "./rolePolicy.ts";

const A = "11111111-1111-4111-8111-111111111111"; // Societe de l appelant (fictive)
const B = "22222222-2222-4222-8222-222222222222"; // autre Societe (fictive)
// Pas de valeur par defaut : un undefined explicite doit rester undefined.
const decide = (callerRole: unknown, requestedRole: unknown, callerCompanyId: unknown, bodyCompanyId: unknown) =>
  decideCreateUser({ callerRole, requestedRole, callerCompanyId, bodyCompanyId });
const refused = (x: CreateUserDecision, status: 400 | 403, error: string, label: string) => {
  assert.equal(x.ok, false, label);
  if (!x.ok) {
    assert.equal(x.status, status, label);
    assert.equal(x.error, error, label);
  }
};
const E_CALLER = "Forbidden: admin or super_admin role required";
const E_ROLE = "Forbidden: role non autorise pour cet appelant";
const E_NO_CO = "Forbidden: appelant sans societe";
const E_OTHER_CO = "Forbidden: company_id hors de votre societe";
const E_SA_CO = "company_id requis pour creer un commercial";
const E_REQ = "Role is required";

test("Societe (admin) : ne cree jamais super_admin, company_super_admin, admin, client", () => {
  for (const r of ["super_admin", "company_super_admin", "admin", "client", "SUPER_ADMIN", " vendor", "vendor ", "__proto__", "toString", "constructor"]) {
    refused(decide("admin", r, A, undefined), 403, E_ROLE, r);
  }
});

test("Societe (admin) : vendor uniquement dans SA Societe", () => {
  const ok = { ok: true, kind: "vendor", role: "vendor", companyId: A, mustVerifyCompany: false };
  assert.deepEqual(decide("admin", "vendor", A, undefined), ok);
  assert.deepEqual(decide("admin", "vendor", A, A), ok);
  assert.deepEqual(decide("admin", "vendor", A, null), ok);
  assert.deepEqual(decide("admin", "vendor", A, ""), ok);
  refused(decide("admin", "vendor", A, B), 403, E_OTHER_CO, "autre Societe");
  refused(decide("admin", "vendor", A, 42), 403, E_OTHER_CO, "company_id non texte");
  refused(decide("admin", "vendor", A, [A]), 403, E_OTHER_CO, "company_id tableau");
  refused(decide("admin", "vendor", undefined, B), 403, E_NO_CO, "admin sans company_id (undefined)");
  refused(decide("admin", "vendor", undefined, undefined), 403, E_NO_CO, "admin sans company_id, body vide");
  refused(decide("admin", "vendor", "", undefined), 403, E_NO_CO, "admin company_id vide");
});

test("Talvex (super_admin) : admin et vendor (Societe nommee) seulement", () => {
  assert.deepEqual(decide("super_admin", "admin", A, undefined), { ok: true, kind: "admin_new_company", role: "admin" });
  assert.deepEqual(decide("super_admin", "vendor", A, B), { ok: true, kind: "vendor", role: "vendor", companyId: B, mustVerifyCompany: true });
  refused(decide("super_admin", "vendor", A, undefined), 400, E_SA_CO, "Visu sans company_id : jamais la company du JWT Talvex");
  refused(decide("super_admin", "vendor", A, ""), 400, E_SA_CO, "Visu company_id vide (list-admins renvoie '')");
  refused(decide("super_admin", "vendor", A, "pas-un-uuid"), 400, E_SA_CO, "uuid invalide");
  refused(decide("super_admin", "vendor", A, B + "\n"), 400, E_SA_CO, "uuid suivi d un saut de ligne");
  for (const r of ["super_admin", "company_super_admin", "client"]) refused(decide("super_admin", r, A, B), 403, E_ROLE, r);
});

test("Autres appelants refuses (Groupe, Commercial, Client, sans role)", () => {
  for (const c of ["company_super_admin", "vendor", "client", undefined, null, "", "__proto__", "hasOwnProperty", "toString", "constructor"]) {
    refused(decide(c, "vendor", A, A), 403, E_CALLER, String(c));
  }
});

test("Role absent ou invalide -> 400", () => {
  for (const r of [undefined, null, "", "   ", 7, {}, ["vendor"]]) refused(decide("admin", r, A, undefined), 400, E_REQ, String(r));
});
