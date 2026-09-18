// Tests de la DECONNEXION d'un domaine (dependances simulees : aucun appel reseau reel).
//   node --test scripts/hostinger-domains/disconnect.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { disconnectApply, disconnectPlan, type ReleaseDeps } from "../../supabase/functions/hostinger-domains/disconnect.ts";
import type { SiteDomainState } from "../../supabase/functions/hostinger-domains/connect.ts";
import { ProviderError } from "../../supabase/functions/hostinger-domains/hostingerClient.ts";

const DOMAIN = "johanna.com";
const APEX_TALVEX = ["216.198.79.1", "64.29.17.1"];
const WWW_TALVEX = "d10cf098dc750d59.vercel-dns-017.com";

const MAIL = [
  { name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }, { content: "mx2.hostinger.com." }] },
  { name: "@", type: "TXT", ttl: 14400, records: [{ content: "v=spf1 include:_spf.mail.hostinger.com ~all" }] },
  { name: "_dmarc", type: "TXT", ttl: 14400, records: [{ content: "v=DMARC1; p=none" }] },
];
const ORIGIN_RAW = [{ name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] }, ...MAIL];
const CONNECTED_RAW = [
  { name: "@", type: "A", ttl: 300, records: APEX_TALVEX.map((content) => ({ content })) },
  { name: "www", type: "CNAME", ttl: 300, records: [{ content: `${WWW_TALVEX}.` }] },
  ...MAIL,
];

const STATE: SiteDomainState = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222",
  domain: DOMAIN,
  connectionStatus: "active",
  dnsConfiguredAt: "2026-09-18T00:00:00Z",
  vercelAttachedAt: "2026-09-18T00:00:10Z",
  verifiedAt: "2026-09-18T00:00:12Z",
  activatedAt: "2026-09-18T00:00:14Z",
  technicalDetails: {
    www_attached: true,
    dns_backup: { taken_at: "2026-09-18T00:00:00.000Z", zone: ORIGIN_RAW },
    dns_applied: [
      { name: "@", type: "A", ttl: 300, values: APEX_TALVEX, previous: ["84.32.84.32"], reason: "adresse du site mise a jour" },
      { name: "www", type: "CNAME", ttl: 300, values: [WWW_TALVEX], previous: [], reason: "adresse www ajoutee" },
    ],
  },
};

interface Fake {
  deps: ReleaseDeps;
  calls: string[];
  puts: unknown[];
  deletes: Array<{ filters: Array<{ name: string; type: string }> }>;
  released: Array<Record<string, unknown>>;
}

function fake(opts: {
  zone?: unknown; zoneAfter?: unknown; state?: SiteDomainState;
  projectHas?: string[]; removeFails?: boolean; putFails?: boolean; deleteFails?: boolean; releaseFails?: boolean;
} = {}): Fake {
  const calls: string[] = [];
  const puts: unknown[] = [];
  const deletes: Fake["deletes"] = [];
  const released: Array<Record<string, unknown>> = [];
  let acted = false;
  const present = new Set(opts.projectHas ?? [DOMAIN, `www.${DOMAIN}`]);
  const deps: ReleaseDeps = {
    async getSiteDomain() { return opts.state ?? STATE; },
    async setConnection(input) { calls.push(`setConnection:${input.errorCode ?? "none"}`); return true; },
    async releaseSiteDomain(input) {
      calls.push("releaseSiteDomain");
      if (opts.releaseFails) return false;
      released.push(input.details);
      return true;
    },
    async promoteSiteDomain() { calls.push("promoteSiteDomain"); return true; },
    dns: {
      async getZone() {
        calls.push("getZone");
        return acted && opts.zoneAfter !== undefined ? opts.zoneAfter : (opts.zone ?? CONNECTED_RAW);
      },
      async listSnapshots() { return []; },
      async putZone(_domain, payload) {
        calls.push("putZone");
        if (opts.putFails) throw new ProviderError("provider_error");
        acted = true;
        puts.push(payload);
        return {};
      },
      async deleteRecords(_domain, payload) {
        calls.push("deleteRecords");
        if (opts.deleteFails) throw new ProviderError("provider_error");
        acted = true;
        deletes.push(payload);
        return {};
      },
    },
    vercel: {
      async getProject() { return { id: "prj_x", name: "crm2026test" }; },
      async getDomainConfig() { return {}; },
      async getProjectDomain(domain: string) {
        calls.push(`getProjectDomain:${domain}`);
        if (!present.has(domain)) throw new ProviderError("not_found");
        return { name: domain, verified: true };
      },
      async addProjectDomain() { calls.push("addProjectDomain"); return {}; },
      async verifyProjectDomain() { return { verified: true }; },
      async removeProjectDomain(domain: string) {
        calls.push(`removeProjectDomain:${domain}`);
        if (opts.removeFails) throw new ProviderError("provider_error");
        return {};
      },
    },
    async probeHttps() { return true; },
    log() {},
  };
  return { deps, calls, puts, deletes, released };
}

test("plan : lecture seule, montre ce qui serait defait et ce qui reste intact", async () => {
  const f = fake();
  const result = await disconnectPlan(f.deps, STATE) as { status: string; plan: { restore: unknown[]; remove: unknown[]; preserved: Array<{ type: string }> } };
  assert.equal(result.status, "ok");
  assert.equal(result.plan.restore.length, 1);
  assert.equal(result.plan.remove.length, 1);
  assert.ok(result.plan.preserved.some((p) => p.type === "MX"), "la messagerie est annoncee comme preservee");
  assert.ok(!f.calls.some((c) => c === "putZone" || c === "deleteRecords" || c.startsWith("removeProjectDomain")),
    "un plan n'ecrit et ne retire jamais rien");
  assert.ok(!f.calls.includes("releaseSiteDomain"));
});

test("deconnexion complete : hebergement d'abord, puis DNS, puis detachement ; messagerie intacte", async () => {
  const f = fake({ zoneAfter: ORIGIN_RAW });
  const result = await disconnectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.step, result.connection_status], ["ok", "done", "disconnected"]);

  // Ordre impose : le domaine cesse d'etre servi avant qu'on ne retouche au DNS.
  const order = f.calls.filter((c) => c.startsWith("removeProjectDomain") || c === "putZone" || c === "deleteRecords");
  assert.deepEqual(order, [`removeProjectDomain:www.${DOMAIN}`, `removeProjectDomain:${DOMAIN}`, "putZone", "deleteRecords"]);

  assert.equal(f.puts.length, 1);
  assert.deepEqual(f.deletes[0].filters, [{ name: "www", type: "CNAME" }]);
  assert.doesNotMatch(JSON.stringify(f.puts) + JSON.stringify(f.deletes), /MX|spf|dmarc|mx1/i,
    "aucune operation ne mentionne jamais la messagerie");
  assert.equal(f.released.length, 1);
  assert.deepEqual(f.released[0].release_dns_restored, ["@|A"]);
  assert.deepEqual(f.released[0].release_dns_removed, ["www|CNAME"]);
  assert.match(String(result.message), /propriete/i);
});

test("valeurs modifiees a la main : bloque AVANT toute action, rien n'est touche", async () => {
  const edited = [{ name: "@", type: "A", ttl: 300, records: [{ content: "203.0.113.9" }] }, ...MAIL];
  const f = fake({ zone: edited });
  const result = await disconnectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.step, result.reason], ["blocked", "dns", "dns_conflict"]);
  assert.equal(f.puts.length + f.deletes.length, 0);
  assert.ok(!f.calls.some((c) => c.startsWith("removeProjectDomain")), "l'hebergement n'est pas touche non plus");
  assert.ok(!f.calls.includes("releaseSiteDomain"), "le domaine reste attache tant que le conflit n'est pas regle");
  assert.match(String(result.message), /modifiee a la main/i);
});

test("retrait de l'hebergement impossible : on s'arrete AVANT d'ecrire le moindre DNS", async () => {
  const f = fake({ removeFails: true });
  const result = await disconnectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.step], ["unavailable", "vercel"]);
  assert.equal(f.puts.length + f.deletes.length, 0);
  assert.ok(!f.calls.includes("releaseSiteDomain"));
});

test("reprise : hebergement deja retire et DNS deja remis en etat -> detache quand meme", async () => {
  const f = fake({ zone: ORIGIN_RAW, projectHas: [] });
  const result = await disconnectApply(f.deps, STATE);
  assert.equal(result.status, "ok");
  assert.equal(f.puts.length + f.deletes.length, 0, "rien a refaire");
  assert.ok(!f.calls.some((c) => c.startsWith("removeProjectDomain")));
  assert.equal(f.released.length, 1);
});

test("aucune memoire de ce que Talvex avait ecrit : DNS laisse tel quel, domaine tout de meme detache", async () => {
  const noMemory: SiteDomainState = { ...STATE, technicalDetails: { www_attached: true } };
  const f = fake({ state: noMemory });
  const result = await disconnectApply(f.deps, noMemory);
  assert.equal(result.status, "ok");
  assert.equal(f.puts.length + f.deletes.length, 0, "on ne devine jamais une ancienne valeur");
  assert.ok(f.calls.includes(`removeProjectDomain:${DOMAIN}`));
  assert.equal(f.released.length, 1);
});

test("domaine jamais rattache a l'hebergement par Talvex : aucun retrait cote hebergement", async () => {
  const notAttached: SiteDomainState = { ...STATE, vercelAttachedAt: null };
  const f = fake({ state: notAttached, zoneAfter: ORIGIN_RAW });
  const result = await disconnectApply(f.deps, notAttached);
  assert.equal(result.status, "ok");
  assert.ok(!f.calls.some((c) => c.startsWith("getProjectDomain") || c.startsWith("removeProjectDomain")));
  assert.equal(f.puts.length, 1, "le DNS pose par Talvex est tout de meme remis en etat");
});

test("un enregistrement a preserver disparait : on bloque et on ne detache pas", async () => {
  const brokenAfter = [{ name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] }, ...MAIL.slice(1)];
  const f = fake({ zoneAfter: brokenAfter });
  const result = await disconnectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.step, result.reason], ["blocked", "verify", "records_missing"]);
  assert.ok(!f.calls.includes("releaseSiteDomain"), "l'equipe doit verifier avant toute suite");
  assert.match(String(result.message), /disparu/i);
});

test("panne d'ecriture DNS : etat explicite, domaine toujours attache", async () => {
  const f = fake({ putFails: true });
  const result = await disconnectApply(f.deps, STATE);
  assert.deepEqual([result.status, result.step], ["unavailable", "dns"]);
  assert.equal(f.deletes.length, 0, "on ne retire rien tant que la remise en etat a echoue");
  assert.ok(!f.calls.includes("releaseSiteDomain"));
});

test("verification finale impossible : on deconnecte, mais on ne promet PAS que rien d'autre n'a bouge", async () => {
  let reads = 0;
  const f = fake();
  const dns = f.deps.dns!;
  const vraiGetZone = dns.getZone.bind(dns);
  dns.getZone = async (domain: string) => {
    reads += 1;
    if (reads > 1) throw new ProviderError("provider_error");
    return await vraiGetZone(domain);
  };
  const result = await disconnectApply(f.deps, STATE);
  assert.equal(result.status, "ok");
  assert.equal(result.verified, false, "la relecture a echoue : on ne pretend pas avoir verifie");
  assert.doesNotMatch(String(result.message), /n'a pas ete touchee/i, "aucune promesse invérifiable");
  assert.match(String(result.message), /verification finale/i);
  assert.equal(f.released[0].release_verified, false, "la trace garde le fait que ce n'etait pas verifiable");
});

test("echec apres retrait de l'hebergement : la reponse dit ce qui a DEJA ete defait", async () => {
  const f = fake({ putFails: true });
  const result = await disconnectApply(f.deps, STATE);
  assert.deepEqual(result.undone, { hosting: [`www.${DOMAIN}`, DOMAIN], dns: false });

  // Conflit : rien du tout n'a bouge, et cela doit etre dit tel quel.
  const edited = [{ name: "@", type: "A", ttl: 300, records: [{ content: "203.0.113.9" }] }, ...MAIL];
  const bloque = await disconnectApply(fake({ zone: edited }).deps, STATE);
  assert.deepEqual(bloque.undone, { hosting: [], dns: false });
});
