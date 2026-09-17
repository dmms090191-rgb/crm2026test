// Tests unitaires de la politique pure (aucun reseau, aucun compte cree ni modifie).
//   node --test supabase/functions/update-user-password/passwordPolicy.test.ts
// Fichier NON importe par index.ts : il n est pas embarque au deploiement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decidePasswordChange, type PasswordPolicyInput, type PolicyLead, type PolicyTarget } from "./passwordPolicy.ts";

const G1 = "aaaaaaaa-0000-4000-8000-000000000001"; // Groupe 1
const G2 = "aaaaaaaa-0000-4000-8000-000000000002"; // Groupe 2
const SA_CO = "bbbbbbbb-0000-4000-8000-000000000001"; // Societe A (fille de G1)
const SB_CO = "bbbbbbbb-0000-4000-8000-000000000002"; // Societe B (fille de G2)
const TALVEX_ID = "cccccccc-0000-4000-8000-00000000000f";
const VENDOR_A = "dddddddd-0000-4000-8000-000000000001"; // vendors.id

const OUT = "Forbidden: target not in your scope";
const ROLE = "Forbidden: role not allowed";

const acct = (idx: string, role: string, companyId: string | null, email = `${idx}@x.test`): PolicyTarget => ({ id: idx, role, companyId, email });
const leadA = (email: string, vendorId: string | null = VENDOR_A): PolicyLead => ({ companyId: SA_CO, vendorId, emails: [email, email.toUpperCase()] });

function run(p: Partial<PasswordPolicyInput> & Pick<PasswordPolicyInput, "callerRole" | "target">) {
  return decidePasswordChange({
    callerId: "caller-id",
    callerCompanyId: null,
    callerVendorId: null,
    requestedRole: undefined,
    requestedEmail: undefined,
    lead: null,
    targetCompanyParentId: null,
    leadCompanyParentId: null,
    emailOnOtherCompanyLeads: false,
    ...p,
  });
}
const ok = (d: ReturnType<typeof run>, action: "update" | "create_client", label: string) =>
  assert.deepEqual(d, { ok: true, action }, label);
const no = (d: ReturnType<typeof run>, error: string, label: string) =>
  assert.deepEqual(d, { ok: false, status: 403, error }, label);

test("Prise de controle du compte Talvex : refusee pour Societe, Groupe, Commercial", () => {
  const talvex = acct(TALVEX_ID, "super_admin", SA_CO);
  no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: talvex }), OUT, "admin -> SA");
  no(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: talvex, targetCompanyParentId: G1 }), OUT, "CSA -> SA meme si company fille");
  no(run({ callerRole: "vendor", callerCompanyId: SA_CO, callerVendorId: VENDOR_A, target: talvex, lead: leadA(`${TALVEX_ID}@x.test`) }), OUT, "vendor -> SA via lead forge");
  no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: talvex, lead: leadA(`${TALVEX_ID}@x.test`) }), OUT, "admin -> SA via lead au meme email");
  ok(run({ callerRole: "super_admin", callerId: TALVEX_ID, target: talvex }), "update", "Talvex change son propre PIN");
});

test("Creation de compte : role client uniquement, jamais super_admin", () => {
  for (const r of ["super_admin", "company_super_admin", "admin", "vendor", "SUPER_ADMIN"]) {
    no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: null, requestedRole: r, requestedEmail: "c@x.test", lead: leadA("c@x.test") }), ROLE, `admin cree ${r}`);
    no(run({ callerRole: "super_admin", target: null, requestedRole: r, requestedEmail: "c@x.test" }), ROLE, `SA cree ${r}`);
  }
  ok(run({ callerRole: "super_admin", target: null, requestedRole: "client", requestedEmail: "c@x.test" }), "create_client", "SA cree client");
  ok(run({ callerRole: "admin", callerCompanyId: SA_CO, target: null, requestedRole: "client", requestedEmail: "c@x.test", lead: leadA("c@x.test") }), "create_client", "admin cree client de son lead (CrmPinDisplay)");
  ok(run({ callerRole: "admin", callerCompanyId: SA_CO, target: null, requestedEmail: " C@X.test ", lead: leadA("c@x.test") }), "create_client", "role absent = client, email normalise");
  no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: null, requestedRole: "client", requestedEmail: "c@x.test" }), OUT, "admin sans lead");
  no(run({ callerRole: "admin", callerCompanyId: SB_CO, target: null, requestedRole: "client", requestedEmail: "c@x.test", lead: leadA("c@x.test") }), OUT, "admin B avec un lead de A");
  no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: null, requestedRole: "client", requestedEmail: "autre@x.test", lead: leadA("c@x.test") }), OUT, "email different du lead");
});

test("Societe (admin) : commerciaux de sa Societe et clients de ses leads seulement", () => {
  ok(run({ callerRole: "admin", callerCompanyId: SA_CO, target: acct("v1", "vendor", SA_CO) }), "update", "PinDisplay vendor meme Societe");
  ok(run({ callerRole: "admin", callerCompanyId: SA_CO.toUpperCase(), target: acct("v1", "vendor", SA_CO) }), "update", "casse uuid");
  no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: acct("v2", "vendor", SB_CO) }), OUT, "vendor d une autre Societe");
  no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: acct("a2", "admin", SA_CO) }), OUT, "autre admin");
  no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: acct("g", "company_super_admin", G1) }), OUT, "Groupe");
  no(run({ callerRole: "admin", callerCompanyId: null, target: acct("v1", "vendor", null) }), OUT, "appelant et cible sans Societe");
  ok(run({ callerRole: "admin", callerCompanyId: SA_CO, target: acct("c1", "client", null, "c1@x.test"), lead: leadA("c1@x.test") }), "update", "client existant du lead");
  no(run({ callerRole: "admin", callerCompanyId: SA_CO, target: acct("c1", "client", null, "c1@x.test") }), OUT, "client sans lead");
  no(run({ callerRole: "admin", callerCompanyId: SB_CO, target: acct("c1", "client", null, "c1@x.test"), lead: leadA("c1@x.test") }), OUT, "client d un lead d une autre Societe");
  ok(run({ callerRole: "admin", callerId: "me", callerCompanyId: SA_CO, target: acct("me", "admin", SA_CO) }), "update", "soi-meme");
});

test("Groupe : admins/commerciaux de ses Societes filles uniquement", () => {
  ok(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: acct("a1", "admin", SA_CO), targetCompanyParentId: G1 }), "update", "admin fille (EntityPasswordTab / Visu)");
  ok(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: acct("v1", "vendor", SA_CO), targetCompanyParentId: G1 }), "update", "vendor fille (PinDisplay en Visu)");
  no(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: acct("b1", "admin", SB_CO), targetCompanyParentId: G2 }), OUT, "admin d un autre Groupe");
  no(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: acct("x", "admin", null), targetCompanyParentId: null }), OUT, "admin sans Societe");
  no(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: acct("g2", "company_super_admin", G2) }), OUT, "autre Groupe");
  ok(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: acct("c1", "client", null, "c1@x.test"), lead: leadA("c1@x.test"), leadCompanyParentId: G1 }), "update", "client d un lead d une fille");
  no(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: acct("c1", "client", null, "c1@x.test"), lead: leadA("c1@x.test"), leadCompanyParentId: G2 }), OUT, "client d un lead d un autre Groupe");
  no(run({ callerRole: "company_super_admin", callerCompanyId: G1, target: null, requestedEmail: "n@x.test" }), OUT, "creation sans lead");
});

test("Commercial : clients de ses leads uniquement", () => {
  const base = { callerRole: "vendor", callerCompanyId: SA_CO, callerVendorId: VENDOR_A } as const;
  ok(run({ ...base, target: acct("c1", "client", null, "c1@x.test"), lead: leadA("c1@x.test") }), "update", "client du lead assigne");
  no(run({ ...base, target: acct("c1", "client", null, "c1@x.test"), lead: leadA("c1@x.test", "autre-vendor") }), OUT, "lead d un autre commercial");
  no(run({ ...base, target: acct("v2", "vendor", SA_CO), lead: leadA("v2@x.test") }), OUT, "autre commercial");
  no(run({ ...base, target: acct("a1", "admin", SA_CO), lead: leadA("a1@x.test") }), OUT, "admin via lead au meme email");
  ok(run({ ...base, target: null, requestedEmail: "n@x.test", lead: leadA("n@x.test") }), "create_client", "creation client du lead");
});

test("Client d une autre Societe : email recopie dans un lead de l attaquant -> refuse (sauf Talvex)", () => {
  const victim = acct("cA", "client", null, "victime@x.test");
  // Societe B cree un lead dans SA Societe avec l email d un client de A
  const leadB: PolicyLead = { companyId: SB_CO, vendorId: null, emails: ["victime@x.test"] };
  no(run({ callerRole: "admin", callerCompanyId: SB_CO, target: victim, lead: leadB, emailOnOtherCompanyLeads: true }), OUT, "admin B -> client de A");
  no(run({ callerRole: "vendor", callerCompanyId: SB_CO, callerVendorId: VENDOR_A, target: victim, lead: { ...leadB, vendorId: VENDOR_A }, emailOnOtherCompanyLeads: true }), OUT, "vendor B -> client de A");
  no(run({ callerRole: "company_super_admin", callerCompanyId: G2, target: victim, lead: leadB, leadCompanyParentId: G2, emailOnOtherCompanyLeads: true }), OUT, "Groupe B -> client de A");
  no(run({ callerRole: "admin", callerCompanyId: SB_CO, target: null, requestedEmail: "prospect@x.test", lead: { ...leadB, emails: ["prospect@x.test"] }, emailOnOtherCompanyLeads: true }), OUT, "creation d un compte pour un prospect de A");
  // refus par defaut si l information manque
  no(run({ callerRole: "admin", callerCompanyId: SB_CO, target: victim, lead: leadB, emailOnOtherCompanyLeads: undefined }), OUT, "valeur absente = refus");
  // Talvex garde la main
  ok(run({ callerRole: "super_admin", target: victim, lead: leadB, emailOnOtherCompanyLeads: true }), "update", "Talvex");
});

test("Appelants hors liste refuses", () => {
  for (const c of ["client", undefined, null, "", "__proto__", "SUPER_ADMIN"]) {
    assert.deepEqual(run({ callerRole: c, target: acct("x", "vendor", SA_CO) }), { ok: false, status: 403, error: "Forbidden: insufficient role" }, String(c));
  }
});
