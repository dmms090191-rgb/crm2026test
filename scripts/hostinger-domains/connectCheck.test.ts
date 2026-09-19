// Tests de la verification LEGERE (connect_check) : dependances simulees, aucun appel reseau reel.
//   node --test scripts/hostinger-domains/connectCheck.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { connectCheck, type CheckDeps } from "../../supabase/functions/hostinger-domains/connectCheck.ts";
import type { SiteDomainState } from "../../supabase/functions/hostinger-domains/connect.ts";
import { ProviderError } from "../../supabase/functions/hostinger-domains/hostingerClient.ts";

const VERIFYING: SiteDomainState = {
  id: "11111111-1111-4111-8111-111111111111", companyId: "22222222-2222-4222-8222-222222222222", domain: "johanna.com",
  connectionStatus: "verifying", dnsConfiguredAt: "2026-09-19T01:03:13Z", vercelAttachedAt: "2026-09-19T01:03:14Z",
  verifiedAt: "2026-09-19T01:03:14Z", activatedAt: null, technicalDetails: {},
};

function fakes(opts: {
  attached?: boolean; verified?: boolean; verifyAnswer?: boolean; misconfigured?: boolean; https?: boolean;
} = {}) {
  const calls: string[] = [];
  const connections: Array<{ status: string | null; marks: string[] }> = [];
  // Pieges : si la verification legere touchait au DNS ou rattachait le domaine, on le saurait.
  const trap = (name: string) => () => { calls.push(`INTERDIT:${name}`); throw new Error(`${name} ne doit jamais etre appele`); };
  const vercel = {
    async getProjectDomain(domain: string) {
      calls.push(`getProjectDomain:${domain}`);
      if (opts.attached === false) throw new ProviderError("not_found", { httpStatus: 404 });
      return { name: domain, verified: opts.verified !== false };
    },
    async getDomainConfig(domain: string) {
      calls.push(`getDomainConfig:${domain}`);
      return { misconfigured: opts.misconfigured === true, recommendedIPv4: [{ rank: 1, value: ["216.198.79.1"] }] };
    },
    async verifyProjectDomain(domain: string) {
      calls.push(`verifyProjectDomain:${domain}`);
      return { name: domain, verified: opts.verifyAnswer === true };
    },
    addProjectDomain: trap("addProjectDomain"),
    removeProjectDomain: trap("removeProjectDomain"),
  };
  const deps = {
    vercel,
    // Presents sur l'objet mais hors du contrat : connect_check ne doit jamais les atteindre.
    dns: { getZone: trap("dns.getZone"), putZone: trap("dns.putZone"), deleteRecords: trap("dns.deleteRecords") },
    async setConnection(input: { status: string | null; marks: string[] }) {
      connections.push({ status: input.status, marks: input.marks });
      return true;
    },
    async probeHttps(domain: string) {
      calls.push(`probeHttps:${domain}`);
      return opts.https !== false;
    },
    log() {},
  };
  return { deps: deps as unknown as CheckDeps, calls, connections };
}

test("connect_check : tout est pret -> la MEME ligne passe de verifying a active", async () => {
  const f = fakes();
  const r = await connectCheck(f.deps, VERIFYING);
  assert.deepEqual([r.status, r.step, r.connection_status], ["ok", "done", "active"]);
  assert.deepEqual(f.connections, [{ status: "active", marks: ["https", "active"] }]);
  assert.deepEqual(f.calls, ["getProjectDomain:johanna.com", "getDomainConfig:johanna.com", "probeHttps:johanna.com"]);
});

test("connect_check : jamais de DNS, jamais de rattachement, jamais Hostinger, quel que soit le cas", async () => {
  const cas = [{}, { https: false }, { misconfigured: true }, { verified: false }, { verified: false, verifyAnswer: true }, { attached: false }];
  for (const opts of cas) {
    const f = fakes(opts);
    await connectCheck(f.deps, VERIFYING);
    assert.deepEqual(f.calls.filter((c) => c.startsWith("INTERDIT")), [], JSON.stringify(opts));
    assert.ok(f.calls.every((c) => /^(getProjectDomain|getDomainConfig|verifyProjectDomain|probeHttps):/.test(c)), JSON.stringify(f.calls));
  }
});

test("connect_check : HTTPS pas encore pret -> attente, la ligne reste verifying", async () => {
  const f = fakes({ https: false });
  const r = await connectCheck(f.deps, VERIFYING);
  assert.deepEqual([r.status, r.step, r.reason], ["pending", "https", "https_pending"]);
  assert.deepEqual(f.connections, [], "aucune ecriture d'etat");
});

test("connect_check : l'hebergeur ne voit pas encore les enregistrements -> attente, sans sonde HTTPS", async () => {
  const f = fakes({ misconfigured: true });
  const r = await connectCheck(f.deps, VERIFYING);
  assert.deepEqual([r.status, r.reason], ["pending", "dns_propagating"]);
  assert.ok(!f.calls.some((c) => c.startsWith("probeHttps")));
  assert.deepEqual(f.connections, []);
});

test("connect_check : verification d'appartenance completee si besoin, puis activation", async () => {
  const f = fakes({ verified: false, verifyAnswer: true });
  const r = await connectCheck(f.deps, VERIFYING);
  assert.equal(r.status, "ok");
  assert.ok(f.calls.includes("verifyProjectDomain:johanna.com"));
  assert.deepEqual(f.connections.map((c) => c.status), ["verifying", "active"]);
  // Pas encore verifiable : on attend, sans rien ecrire.
  const g = fakes({ verified: false, verifyAnswer: false });
  const pending = await connectCheck(g.deps, VERIFYING);
  assert.deepEqual([pending.status, pending.step, pending.reason], ["pending", "verify", "not_verified_yet"]);
  assert.deepEqual(g.connections, []);
});

test("connect_check : domaine plus rattache -> reprise necessaire, JAMAIS de rattachement ici", async () => {
  const f = fakes({ attached: false });
  const r = await connectCheck(f.deps, VERIFYING);
  assert.deepEqual([r.status, r.reason], ["blocked", "resume_required"]);
  assert.deepEqual(f.calls, ["getProjectDomain:johanna.com"]);
  assert.deepEqual(f.connections, []);
});

test("connect_check : ligne deja active ou a reprendre -> reponse immediate, aucun appel exterieur", async () => {
  const active = fakes();
  const ok = await connectCheck(active.deps, { ...VERIFYING, connectionStatus: "active" });
  assert.deepEqual([ok.status, ok.step], ["ok", "done"]);
  assert.deepEqual(active.calls, []);
  for (const connectionStatus of ["not_started", "dns_configuring", "dns_failed", "verification_failed"]) {
    const f = fakes();
    const r = await connectCheck(f.deps, { ...VERIFYING, connectionStatus });
    assert.deepEqual([r.status, r.reason], ["blocked", "resume_required"], connectionStatus);
    assert.deepEqual(f.calls, [], connectionStatus);
    assert.deepEqual(f.connections, [], connectionStatus);
  }
});
