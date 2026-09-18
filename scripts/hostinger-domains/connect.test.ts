// Tests du raccordement automatique (dependances simulees : aucun appel reseau reel).
//   node --test scripts/hostinger-domains/connect.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { connectApply, connectPlan, mergeAppliedChanges, type ConnectDeps, type SiteDomainState } from "../../supabase/functions/hostinger-domains/connect.ts";
import { ProviderError } from "../../supabase/functions/hostinger-domains/hostingerClient.ts";
import type { PlanChange } from "../../supabase/functions/hostinger-domains/dnsPlan.ts";

const DOMAIN = "johanna.com";
const STATE: SiteDomainState = {
  id: "11111111-1111-4111-8111-111111111111", companyId: "22222222-2222-4222-8222-222222222222", domain: DOMAIN,
  connectionStatus: "not_started", dnsConfiguredAt: null, vercelAttachedAt: null, verifiedAt: null, activatedAt: null, technicalDetails: {},
};
const ZONE = [
  { name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] },
  { name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }, { content: "mx2.hostinger.com." }] },
  { name: "@", type: "TXT", ttl: 14400, records: [{ content: "v=spf1 include:_spf.mail.hostinger.com ~all" }] },
  { name: "_dmarc", type: "TXT", ttl: 14400, records: [{ content: "v=DMARC1; p=none" }] },
];
const CONFIG = {
  recommendedIPv4: [{ rank: 1, value: ["216.198.79.1"] }],
  recommendedCNAME: [{ rank: 1, value: "d10cf098dc750d59.vercel-dns-017.com" }],
  misconfigured: true, configuredBy: null, acceptedChallenges: ["http-01"],
};
const CORRECT_ZONE = [
  { name: "@", type: "A", ttl: 300, records: [{ content: "216.198.79.1" }] },
  { name: "www", type: "CNAME", ttl: 300, records: [{ content: "d10cf098dc750d59.vercel-dns-017.com." }] },
  ...ZONE.slice(1),
];

interface Fake {
  deps: ConnectDeps;
  calls: string[];
  writes: Array<{ overwrite: boolean; zone: unknown[] }>;
  updates: Array<{ status: string | null; marks: string[]; error: string | null; details: Record<string, unknown> | undefined }>;
}

function fake(opts: {
  zone?: unknown; config?: unknown; projectDomain?: unknown; verified?: boolean;
  https?: boolean; zoneWriteFails?: boolean; addFails?: boolean; configAfterWrite?: unknown;
} = {}): Fake {
  const calls: string[] = [];
  const writes: Fake["writes"] = [];
  const updates: Fake["updates"] = [];
  let written = false;
  const deps: ConnectDeps = {
    async getSiteDomain() { return STATE; },
    async setConnection(input) { updates.push({ status: input.status, marks: input.marks, error: input.errorCode ?? null, details: input.details }); return true; },
    dns: {
      async getZone() { calls.push("getZone"); return opts.zone ?? ZONE; },
      async listSnapshots() { calls.push("listSnapshots"); return []; },
      async deleteRecords(_domain, payload) {
        calls.push("deleteRecords:" + payload.filters.map((f) => f.name + "|" + f.type).join(","));
        return {};
      },
      async putZone(_domain, payload) {
        calls.push("putZone");
        if (opts.zoneWriteFails) throw new ProviderError("provider_error");
        written = true;
        writes.push(payload as { overwrite: boolean; zone: unknown[] });
        return {};
      },
    },
    vercel: {
      async getProject() { calls.push("getProject"); return { id: "prj_x", name: "crm2026test" }; },
      async getDomainConfig() {
        calls.push("getDomainConfig");
        return written && opts.configAfterWrite !== undefined ? opts.configAfterWrite : (opts.config ?? CONFIG);
      },
      async getProjectDomain(domain: string) {
        calls.push("getProjectDomain:" + domain);
        if (opts.projectDomain === undefined) throw new ProviderError("not_found");
        return opts.projectDomain;
      },
      async addProjectDomain(domain: string) {
        calls.push("addProjectDomain:" + domain);
        if (opts.addFails) throw new ProviderError("invalid_request");
        return { name: DOMAIN, verified: opts.verified ?? false, verification: [] };
      },
      async verifyProjectDomain() { calls.push("verifyProjectDomain"); return { verified: opts.verified ?? true }; },
      async removeProjectDomain(domain: string) { calls.push("removeProjectDomain:" + domain); return {}; },
    },
    async probeHttps() { calls.push("probeHttps"); return opts.https ?? true; },
    log() {},
  };
  return { deps, calls, writes, updates };
}

test("plan : lecture seule, montre ce qui serait ecrit et ce qui est preserve", async () => {
  const f = fake();
  const plan = await connectPlan(f.deps, STATE) as {
    status: string;
    plan: { changes: Array<{ name: string; type: string }>; preserved: Array<{ type: string }>; project: string };
  };
  assert.equal(plan.status, "ok");
  assert.deepEqual(plan.plan.changes.map((c) => `${c.name}|${c.type}`), ["@|A", "www|CNAME"]);
  assert.ok(plan.plan.preserved.some((p) => p.type === "MX"), "la messagerie est annoncee comme preservee");
  assert.equal(plan.plan.project, "crm2026test");
  assert.equal(f.calls.includes("putZone"), false, "aucune ecriture pendant un plan");
  assert.deepEqual(f.updates, [], "aucune progression enregistree pendant un plan");
});

test("application : sauvegarde AVANT ecriture, puis ecriture ciblee sans aucun enregistrement de messagerie", async () => {
  const f = fake({ verified: true, https: true, configAfterWrite: { ...CONFIG, misconfigured: false } });
  const result = await connectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.step, result.connection_status], ["ok", "done", "active"]);
  assert.equal(f.writes.length, 1, "une seule ecriture DNS");
  assert.deepEqual(
    f.writes[0].zone.map((z) => `${(z as { name: string }).name}|${(z as { type: string }).type}`),
    ["@|A", "www|CNAME"],
  );
  assert.doesNotMatch(JSON.stringify(f.writes[0]), /MX|spf|dmarc|mx1/i, "jamais de messagerie dans l'ecriture");
  const firstUpdate = f.updates[0];
  assert.deepEqual([firstUpdate.status, firstUpdate.marks], ["dns_configuring", []], "sauvegarde posee avant l'ecriture");
  assert.deepEqual(
    f.updates.map((u) => `${u.status}:${u.marks.join("+")}`).slice(-3),
    ["verifying:vercel", "verifying:verified", "active:https+active"],
  );
  assert.deepEqual(f.calls.filter((c) => c.startsWith("addProjectDomain")),
    ["addProjectDomain:johanna.com", "addProjectDomain:www.johanna.com"],
    "le www doit etre connu du projet, sinon son certificat est invalide");
});

test("application : zone deja correcte -> aucune ecriture DNS, le reste se poursuit", async () => {
  const f = fake({
    zone: CORRECT_ZONE, projectDomain: { name: DOMAIN, verified: true }, verified: true, https: true,
    configAfterWrite: { ...CONFIG, misconfigured: false }, config: { ...CONFIG, misconfigured: false },
  });
  const result = await connectApply(f.deps, STATE);
  assert.equal(result.connection_status, "active");
  assert.equal(f.writes.length, 0, "rien a ecrire");
  assert.equal(f.calls.some((c) => c.startsWith("addProjectDomain")), false, "domaine deja rattache : pas de nouvel ajout");
});

test("application : conflit DNS -> bloque, aucune ecriture, message clair", async () => {
  const f = fake({ zone: [...ZONE, { name: "@", type: "AAAA", ttl: 60, records: [{ content: "2001:db8::1" }] }] });
  const result = await connectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.connection_status], ["blocked", "dns_failed"]);
  assert.equal(f.writes.length, 0);
  assert.match(String(result.message), /IPv6/i);
});

test("application : echec d'ecriture DNS -> etat dns_failed, rien chez l'hebergeur", async () => {
  const f = fake({ zoneWriteFails: true });
  const result = await connectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.connection_status, result.step], ["unavailable", "dns_failed", "dns"]);
  assert.equal(f.calls.some((c) => c.startsWith("addProjectDomain")), false);
  assert.ok(f.updates.some((u) => u.error === "provider_error"));
});

test("application : verification pas encore passee -> en attente, jamais « connecte »", async () => {
  const f = fake({ verified: false, configAfterWrite: { ...CONFIG, misconfigured: false } });
  const result = await connectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.step, result.connection_status], ["pending", "verify", "verifying"]);
  assert.equal(f.updates.some((u) => u.status === "active"), false);
});

test("application : HTTPS pas encore pret -> en attente ; relance ensuite sans reecrire la zone", async () => {
  const f = fake({ verified: true, https: false, configAfterWrite: { ...CONFIG, misconfigured: false } });
  const result = await connectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.step], ["pending", "https"]);
  assert.equal(f.updates.some((u) => u.status === "active"), false);

  const again = fake({
    zone: CORRECT_ZONE, projectDomain: { name: DOMAIN, verified: true }, verified: true, https: true,
    config: { ...CONFIG, misconfigured: false }, configAfterWrite: { ...CONFIG, misconfigured: false },
  });
  const finished = await connectApply(again.deps, { ...STATE, connectionStatus: "verifying", dnsConfiguredAt: "2026-09-18T00:00:00Z" });
  assert.equal(finished.connection_status, "active");
  assert.equal(again.writes.length, 0);
});

test("application : domaine deja pris par un autre projet d'hebergement -> message sans jargon", async () => {
  const f = fake({ addFails: true });
  const result = await connectApply(f.deps, STATE);
  assert.equal(result.connection_status, "verification_failed");
  assert.match(String(result.message), /deja utilise par un autre projet/i);
});

test("memoire de ce que Talvex a ecrit : l'origine du client est conservee, jamais remplacee", () => {
  const premier: PlanChange[] = [
    { name: "@", type: "A", ttl: 300, values: ["216.198.79.1"], previous: ["84.32.84.32"], reason: "adresse du site mise a jour" },
    { name: "www", type: "CNAME", ttl: 300, values: ["abc.vercel-dns-017.com"], previous: [], reason: "adresse www ajoutee" },
  ];
  // Deuxieme ecriture : l'hebergeur change d'adresse. « previous » vaut alors une valeur de l'hebergeur.
  const second: PlanChange[] = [{ name: "@", type: "A", ttl: 300, values: ["216.198.79.2"], previous: ["216.198.79.1"], reason: "adresse du site mise a jour" }];
  const merged = mergeAppliedChanges(premier, second);

  const apex = merged.find((c) => c.name === "@")!;
  assert.deepEqual(apex.values, ["216.198.79.2"], "la valeur posee suit la derniere ecriture");
  assert.deepEqual(apex.previous, ["84.32.84.32"], "l'origine reste celle d'AVANT Talvex : une deconnexion doit y revenir");
  assert.equal(merged.length, 2, "les autres enregistrements poses restent memorises");
  // Memoire absente ou abimee : on repart de ce qui vient d'etre ecrit, sans inventer.
  assert.deepEqual(mergeAppliedChanges(undefined, second), second);
  assert.deepEqual(mergeAppliedChanges([{ name: 42 }, null, "x"], second), second);
});

test("sauvegarde de la zone : prise une seule fois, jamais ecrasee par une zone deja modifiee", async () => {
  const f = fake({ verified: true, https: true, configAfterWrite: { ...CONFIG, misconfigured: false } });
  await connectApply(f.deps, STATE);
  const sauvegardes = f.updates.filter((u) => u.details && "dns_backup" in (u.details as Record<string, unknown>));
  assert.equal(sauvegardes.length, 1, "premiere execution : la zone d'origine est sauvegardee");

  // Relance sur un domaine qui a deja une sauvegarde : elle ne doit plus jamais etre reecrite.
  const again = fake({ verified: true, https: true, configAfterWrite: { ...CONFIG, misconfigured: false } });
  await connectApply(again.deps, {
    ...STATE,
    technicalDetails: { dns_backup: { taken_at: "2026-09-18T00:00:00.000Z", zone: ZONE } },
  });
  const reprises = again.updates.filter((u) => u.details && "dns_backup" in (u.details as Record<string, unknown>));
  assert.equal(reprises.length, 0, "la zone d'origine ne doit jamais etre remplacee par une zone deja modifiee");
});
