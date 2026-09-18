// Tests du CHANGEMENT de domaine (dependances simulees : aucun appel reseau reel).
// Regle verifiee par tous ces tests : l'ancien domaine ne bouge JAMAIS avant que le nouveau ne soit actif.
//   node --test scripts/hostinger-domains/switch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { switchApply } from "../../supabase/functions/hostinger-domains/switchDomain.ts";
import type { ReleaseDeps } from "../../supabase/functions/hostinger-domains/disconnect.ts";
import type { SiteDomainState } from "../../supabase/functions/hostinger-domains/connect.ts";
import { ProviderError } from "../../supabase/functions/hostinger-domains/hostingerClient.ts";

const OLD = "ancienne-adresse.fr";
const NEW = "nouvelle-adresse.fr";
const COMPANY = "22222222-2222-4222-8222-222222222222";
const APEX = ["216.198.79.1"];
const CNAME = "d10cf098dc750d59.vercel-dns-017.com";

const MAIL = [
  { name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }] },
  { name: "@", type: "TXT", ttl: 14400, records: [{ content: "v=spf1 include:_spf.mail.hostinger.com ~all" }] },
];
const parked = [{ name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] }, ...MAIL];
const connectedZone = [
  { name: "@", type: "A", ttl: 300, records: APEX.map((content) => ({ content })) },
  { name: "www", type: "CNAME", ttl: 300, records: [{ content: `${CNAME}.` }] },
  ...MAIL,
];

const state = (domain: string, over: Partial<SiteDomainState> = {}): SiteDomainState => ({
  id: `id-${domain}`,
  companyId: COMPANY,
  domain,
  connectionStatus: "not_started",
  dnsConfiguredAt: null, vercelAttachedAt: null, verifiedAt: null, activatedAt: null,
  technicalDetails: {},
  ...over,
});

/* L'ancien domaine est actif et garde la memoire de ce que Talvex lui avait ecrit. */
const CURRENT = state(OLD, {
  connectionStatus: "active",
  dnsConfiguredAt: "2026-09-17T00:00:00Z", vercelAttachedAt: "2026-09-17T00:00:10Z",
  verifiedAt: "2026-09-17T00:00:12Z", activatedAt: "2026-09-17T00:00:14Z",
  technicalDetails: {
    dns_backup: { taken_at: "2026-09-17T00:00:00.000Z", zone: parked },
    dns_applied: [
      { name: "@", type: "A", ttl: 300, values: APEX, previous: ["84.32.84.32"], reason: "adresse du site mise a jour" },
      { name: "www", type: "CNAME", ttl: 300, values: [CNAME], previous: [], reason: "adresse www ajoutee" },
    ],
  },
});
const NEXT = state(NEW);

interface Fake {
  deps: ReleaseDeps;
  calls: string[];
  promoted: string[];
  released: string[];
  /* Marques « detachement a terminer » posees sur le nouveau domaine. */
  pending: Array<string | null>;
}

/* Zones par domaine : le nouveau part d'une page parquee, l'ancien est deja raccorde. */
function fake(opts: { https?: boolean; verified?: boolean; oldZone?: unknown; promoteOk?: boolean; oldPutFails?: boolean } = {}): Fake {
  const calls: string[] = [];
  const promoted: string[] = [];
  const released: string[] = [];
  const pending: Array<string | null> = [];
  const zones: Record<string, unknown> = { [NEW]: parked, [OLD]: opts.oldZone ?? connectedZone };
  const written = new Set<string>();
  const inProject = new Set<string>([OLD, `www.${OLD}`]);

  const deps: ReleaseDeps = {
    async getSiteDomain(_companyId: string, domain: string) {
      calls.push("getSiteDomain:" + domain);
      return domain === OLD ? CURRENT : null;
    },
    async setConnection(input) {
      calls.push(`setConnection:${input.status ?? "-"}`);
      const details = input.details as { switch_release_domain?: string | null } | undefined;
      if (details && "switch_release_domain" in details) pending.push(details.switch_release_domain ?? null);
      return true;
    },
    async promoteSiteDomain(input) {
      calls.push(`promote:${input.siteDomainId}`);
      if (opts.promoteOk === false) return false;
      promoted.push(input.siteDomainId);
      return true;
    },
    async releaseSiteDomain(input) { calls.push(`release:${input.siteDomainId}`); released.push(input.siteDomainId); return true; },
    dns: {
      async getZone(domain: string) { calls.push(`getZone:${domain}`); return zones[domain]; },
      async listSnapshots() { return []; },
      async putZone(domain: string, payload) {
        calls.push(`putZone:${domain}`);
        if (opts.oldPutFails && domain === OLD) throw new ProviderError("provider_error");
        written.add(domain);
        zones[domain] = connectedZone;
        void payload;
        return {};
      },
      async deleteRecords(domain: string) { calls.push(`deleteRecords:${domain}`); return {}; },
    },
    vercel: {
      async getProject() { return { id: "prj_x", name: "crm2026test" }; },
      async getDomainConfig(domain: string) {
        return {
          recommendedIPv4: [{ rank: 1, value: APEX }],
          recommendedCNAME: [{ rank: 1, value: CNAME }],
          misconfigured: !written.has(domain),
          configuredBy: null,
        };
      },
      async getProjectDomain(domain: string) {
        calls.push(`getProjectDomain:${domain}`);
        if (!inProject.has(domain)) throw new ProviderError("not_found");
        return { name: domain, verified: true };
      },
      async addProjectDomain(domain: string) {
        calls.push(`addProjectDomain:${domain}`);
        inProject.add(domain);
        return { name: domain, verified: opts.verified ?? true, verification: [] };
      },
      async verifyProjectDomain(domain: string) { calls.push(`verify:${domain}`); return { verified: opts.verified ?? true }; },
      async removeProjectDomain(domain: string) { calls.push(`removeProjectDomain:${domain}`); inProject.delete(domain); return {}; },
    },
    async probeHttps(domain: string) { calls.push(`probeHttps:${domain}`); return opts.https ?? true; },
    log() {},
  };
  return { deps, calls, promoted, released, pending };
}

/* Toute action qui modifierait l'ancien domaine. */
const touchedOld = (calls: string[]) =>
  calls.filter((c) => (c.startsWith("putZone:") || c.startsWith("deleteRecords:") || c.startsWith("removeProjectDomain:")) && c.includes(OLD));

test("changement reussi : nouveau prepare, promu, PUIS ancien detache proprement", async () => {
  const f = fake();
  const result = await switchApply(f.deps, { next: NEXT, current: CURRENT });
  assert.deepEqual([result.status, result.step, result.previous_state], ["ok", "done", "detached"]);
  assert.equal(result.domain, NEW);
  assert.equal(result.previous_domain, OLD);

  // L'ancien n'est touche qu'APRES la promotion du nouveau.
  const promoteAt = f.calls.findIndex((c) => c.startsWith("promote:"));
  const firstOldAction = f.calls.findIndex((c) => touchedOld([c]).length > 0);
  assert.ok(promoteAt >= 0 && firstOldAction > promoteAt, "rien sur l'ancien domaine avant la promotion du nouveau");
  assert.deepEqual(f.promoted, [NEXT.id]);
  assert.deepEqual(f.released, [CURRENT.id]);
  // Le nouveau domaine a bien recu apex ET www cote hebergement.
  assert.ok(f.calls.includes(`addProjectDomain:${NEW}`) && f.calls.includes(`addProjectDomain:www.${NEW}`));
});

test("nouveau domaine pas encore pret : ancien totalement intact et toujours en service", async () => {
  const f = fake({ https: false });
  const result = await switchApply(f.deps, { next: NEXT, current: CURRENT });
  assert.deepEqual([result.status, result.step, result.previous_state], ["pending", "connect", "kept"]);
  assert.deepEqual(touchedOld(f.calls), [], "aucune action sur l'ancien domaine");
  assert.deepEqual(f.promoted, []);
  assert.deepEqual(f.released, []);
  assert.match(String(result.message), new RegExp(OLD), "le client est rassure : son site reste accessible");
});

test("verification du nouveau domaine impossible : ancien intact, changement en attente", async () => {
  const f = fake({ verified: false });
  const result = await switchApply(f.deps, { next: NEXT, current: CURRENT });
  assert.equal(result.status, "pending");
  assert.deepEqual(touchedOld(f.calls), []);
  assert.deepEqual(f.released, []);
});

test("ancien domaine modifie a la main : changement reussi quand meme, ancien conserve et annonce", async () => {
  const edited = [{ name: "@", type: "A", ttl: 300, records: [{ content: "203.0.113.9" }] }, ...MAIL];
  const f = fake({ oldZone: edited });
  const result = await switchApply(f.deps, { next: NEXT, current: CURRENT });
  assert.deepEqual([result.status, result.previous_state], ["ok", "kept"]);
  assert.deepEqual(f.promoted, [NEXT.id], "le nouveau domaine est bien devenu le principal");
  assert.deepEqual(f.released, [], "l'ancien n'est pas detache tant que son conflit n'est pas regle");
  assert.match(String(result.message), new RegExp(`${NEW}.*${OLD}`, "s"));
});

test("promotion impossible : l'ancien reste le domaine du site", async () => {
  const f = fake({ promoteOk: false });
  const result = await switchApply(f.deps, { next: NEXT, current: CURRENT });
  assert.deepEqual([result.status, result.step, result.previous_state], ["unavailable", "promote", "kept"]);
  assert.deepEqual(f.released, []);
  assert.deepEqual(touchedOld(f.calls), []);
});

test("premier domaine du site (aucun ancien) : simple raccordement, rien a detacher", async () => {
  const f = fake();
  const result = await switchApply(f.deps, { next: NEXT, current: null });
  assert.deepEqual([result.status, result.step, result.previous_state], ["ok", "done", null]);
  assert.equal(result.previous_domain, null);
  assert.deepEqual(f.released, []);
  assert.deepEqual(f.promoted, [NEXT.id]);
});

test("interruption APRES la promotion : l'intention est memorisee, la relance termine le detachement", async () => {
  // 1er passage : le nouveau devient actif et principal, mais l'ancien ne peut pas etre detache.
  const premier = fake({ oldZone: [{ name: "@", type: "A", ttl: 300, records: [{ content: "203.0.113.9" }] }, ...MAIL] });
  const interrompu = await switchApply(premier.deps, { next: NEXT, current: CURRENT });
  assert.deepEqual([interrompu.status, interrompu.previous_state], ["ok", "kept"]);
  assert.deepEqual(premier.promoted, [NEXT.id]);
  assert.deepEqual(premier.released, [], "rien n'a pu etre detache");
  // L'intention est memorisee SUR le nouveau domaine : c'est elle qui rend la reprise possible.
  assert.deepEqual(premier.pending, [OLD], "le domaine a detacher est memorise");

  // 2e passage : le client relance. Le serveur ne voit plus d'« ancien » (le nouveau est principal),
  // mais la marque memorisee lui fait reprendre le detachement, cette fois sans conflit.
  const second = fake();
  const repris = await switchApply(second.deps, {
    next: state(NEW, {
      connectionStatus: "active", dnsConfiguredAt: "2026-09-18T00:00:00Z", vercelAttachedAt: "2026-09-18T00:00:02Z",
      technicalDetails: { switch_release_domain: OLD },
    }),
    current: null,
  });
  assert.deepEqual([repris.status, repris.previous_state], ["ok", "detached"]);
  assert.deepEqual(second.released, ["id-" + OLD], "l'ancien domaine est enfin detache");
  assert.equal(second.pending.at(-1), null, "la marque est effacee une fois le travail termine");
});

test("ancien domaine deja retire de l'hebergement : on ne pretend pas qu'il fonctionne encore", async () => {
  // La remise en etat du DNS echoue APRES le retrait de l'hebergement : l'ancienne adresse ne sert plus.
  const f = fake({ oldPutFails: true });
  const result = await switchApply(f.deps, { next: NEXT, current: CURRENT });
  assert.deepEqual([result.status, result.previous_state], ["ok", "partial"]);
  assert.doesNotMatch(String(result.message), /continue de fonctionner/i);
  assert.match(String(result.message), /ne m[eè]ne plus au site/i);
  assert.deepEqual(f.pending, [OLD], "la reprise reste possible");
});
