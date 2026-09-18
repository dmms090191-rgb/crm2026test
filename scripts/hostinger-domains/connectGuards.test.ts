// Garde-fous du raccordement : valeurs generiques refusees, projet illisible = arret.
//   node --test scripts/hostinger-domains/connectGuards.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { connectApply, connectPlan, type ConnectDeps, type SiteDomainState } from "../../supabase/functions/hostinger-domains/connect.ts";
import { ProviderError } from "../../supabase/functions/hostinger-domains/hostingerClient.ts";

const STATE: SiteDomainState = {
  id: "11111111-1111-4111-8111-111111111111", companyId: "22222222-2222-4222-8222-222222222222", domain: "exemple.fr",
  connectionStatus: "not_started", dnsConfiguredAt: null, vercelAttachedAt: null, verifiedAt: null, activatedAt: null, technicalDetails: {},
};
const ZONE = [{ name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }] }];

function deps(opts: { project?: unknown; projectThrows?: boolean; config: unknown }): { deps: ConnectDeps; writes: number } {
  const state = { writes: 0 };
  const d: ConnectDeps = {
    async getSiteDomain() { return STATE; },
    async setConnection() { return true; },
    dns: {
      async getZone() { return ZONE; },
      async listSnapshots() { return []; },
      async putZone() { state.writes += 1; return {}; },
      async deleteRecords() { state.writes += 1; return {}; },
    },
    vercel: {
      async getProject() {
        if (opts.projectThrows) throw new ProviderError("not_found");
        return opts.project ?? { id: "prj_1", name: "crm2026test" };
      },
      async getDomainConfig() { return opts.config; },
      async getProjectDomain() { throw new ProviderError("not_found"); },
      async addProjectDomain() { return { name: STATE.domain, verified: true }; },
      async verifyProjectDomain() { return { verified: true }; },
      async removeProjectDomain() { return {}; },
    },
    async probeHttps() { return true; },
    log() {},
  };
  return { deps: d, get writes() { return state.writes; } } as unknown as { deps: ConnectDeps; writes: number };
}

const GENERIC = { recommendedIPv4: [{ rank: 1, value: ["76.76.21.21"] }], recommendedCNAME: [{ rank: 1, value: "cname.vercel-dns.com" }], misconfigured: true, configuredBy: null };
const PROJECT_SPECIFIC = { recommendedIPv4: [{ rank: 1, value: ["216.198.79.1"] }], recommendedCNAME: [{ rank: 1, value: "d10cf098dc750d59.vercel-dns-017.com" }], misconfigured: true, configuredBy: null };

test("valeurs generiques de l'hebergeur : refus net, jamais ecrites", async () => {
  for (const config of [
    GENERIC,
    { ...GENERIC, recommendedCNAME: [{ rank: 1, value: "CNAME.VERCEL-DNS.COM." }] },
    { recommendedIPv4: [{ rank: 1, value: ["76.76.21.21"] }], recommendedCNAME: [{ rank: 1, value: "d1.vercel-dns-017.com" }], misconfigured: true, configuredBy: null },
  ]) {
    const plan = deps({ config });
    const result = await connectPlan(plan.deps, STATE);
    assert.deepEqual([result.status, result.reason], ["unavailable", "generic_config"], JSON.stringify(config).slice(0, 60));
    const apply = deps({ config });
    const applied = await connectApply(apply.deps, STATE);
    assert.equal(applied.reason, "generic_config");
    assert.equal(apply.writes, 0, "aucune ecriture DNS");
  }
});

test("projet d'hebergement illisible : arret avant tout calcul de plan", async () => {
  const unreachable = deps({ projectThrows: true, config: PROJECT_SPECIFIC });
  const result = await connectPlan(unreachable.deps, STATE);
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "not_found");
  const unnamed = deps({ project: { id: "prj_1" }, config: PROJECT_SPECIFIC });
  assert.equal((await connectPlan(unnamed.deps, STATE)).reason, "project_unreachable");
  const applied = await connectApply(unnamed.deps, STATE);
  assert.equal(applied.connection_status, "dns_failed");
  assert.equal(unnamed.writes, 0);
});

test("configuration propre au projet : plan calcule et zone actuelle rendue telle quelle", async () => {
  const ok = deps({ config: PROJECT_SPECIFIC });
  const result = await connectPlan(ok.deps, STATE) as { status: string; plan: { project: string; changes: Array<{ values: string[] }>; current_zone: Array<{ type: string }> } };
  assert.equal(result.status, "ok");
  assert.equal(result.plan.project, "crm2026test");
  assert.deepEqual(result.plan.changes.map((c) => c.values[0]), ["216.198.79.1", "d10cf098dc750d59.vercel-dns-017.com"]);
  assert.deepEqual(result.plan.current_zone.map((r) => r.type), ["MX"], "la zone actuelle est rendue pour le rapport");
  assert.equal(ok.writes, 0, "un plan n'ecrit jamais");
});
