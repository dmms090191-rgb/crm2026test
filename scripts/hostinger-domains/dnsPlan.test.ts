// Tests du plan de raccordement DNS (module pur, aucun reseau).
//   node --test scripts/hostinger-domains/dnsPlan.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildZonePayload, parseZone, planDnsChanges, CONNECT_TTL, type VercelExpectation } from "../../supabase/functions/hostinger-domains/dnsPlan.ts";

const DOMAIN = "johanna.com";
/* Zone reelle typique d'un domaine Hostinger avec messagerie Hostinger. */
const ZONE_JSON = [
  { name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] },
  { name: "www", type: "CNAME", ttl: 14400, records: [{ content: "johanna.com." }] },
  { name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }, { content: "mx2.hostinger.com." }] },
  { name: "@", type: "TXT", ttl: 14400, records: [{ content: "v=spf1 include:_spf.mail.hostinger.com ~all" }] },
  { name: "hostingermail-a._domainkey", type: "CNAME", ttl: 14400, records: [{ content: "hostingermail-a.dkim.mail.hostinger.com." }] },
  { name: "_dmarc", type: "TXT", ttl: 14400, records: [{ content: "v=DMARC1; p=none" }] },
  { name: "@", type: "NS", ttl: 14400, records: [{ content: "ns1.dns-parking.com." }] },
];
const expected = (over: Partial<VercelExpectation> = {}): VercelExpectation =>
  ({ ipv4: ["216.198.79.1"], cname: "d10cf098dc750d59.vercel-dns-017.com", misconfigured: true, configuredBy: null, challenge: null, ...over });

test("zone lue : noms normalises, contenus extraits, formes inattendues ignorees", () => {
  const zone = parseZone(ZONE_JSON, DOMAIN);
  assert.ok(zone);
  assert.equal(zone!.length, 7);
  assert.deepEqual(zone!.find((r) => r.type === "MX")?.contents, ["mx1.hostinger.com.", "mx2.hostinger.com."]);
  assert.equal(parseZone([{ name: "@" }, "x", null, { type: "A" }], DOMAIN)!.length, 0, "lignes incompletes ignorees");
  assert.equal(parseZone({ zone: [] }, DOMAIN), null, "forme inattendue : aucune zone");
  const absolu = parseZone([{ name: "www.johanna.com.", type: "CNAME", ttl: 60, records: [{ content: "x." }] }], DOMAIN);
  assert.equal(absolu![0].name, "www");
});

test("plan : seuls l'apex et www sont ecrits ; messagerie et delegation intactes", () => {
  const zone = parseZone(ZONE_JSON, DOMAIN)!;
  const plan = planDnsChanges(DOMAIN, zone, expected());
  assert.deepEqual(plan.changes.map((c) => `${c.name}|${c.type}`), ["@|A", "www|CNAME"]);
  assert.deepEqual(plan.changes[0].values, ["216.198.79.1"]);
  assert.deepEqual(plan.changes[0].previous, ["84.32.84.32"]);
  assert.equal(plan.changes[0].ttl, CONNECT_TTL);
  const touched = new Set(plan.changes.map((c) => `${c.name}|${c.type}`));
  for (const record of zone) {
    if (["MX", "TXT", "NS"].includes(record.type)) {
      assert.ok(!touched.has(`${record.name}|${record.type}`), `${record.name} ${record.type} ne doit jamais etre ecrit`);
    }
  }
  assert.ok(plan.preserved.some((p) => p.type === "MX"), "la messagerie est listee comme preservee");
  assert.ok(plan.preserved.some((p) => p.name === "hostingermail-a._domainkey"), "les CNAME DKIM sont listes comme preserves");
  assert.equal(plan.preserved.some((p) => p.name === "@" && p.type === "A"), false, "ce qui est reecrit n est pas annonce comme preserve");
  assert.ok(plan.preserved.some((p) => p.name === "_dmarc"));
  // Le corps envoye a Hostinger ne contient QUE les deux entrees du plan.
  const payload = buildZonePayload(plan)!;
  assert.equal(payload.overwrite, true);
  assert.deepEqual(payload.zone.map((z) => `${z.name}|${z.type}`), ["@|A", "www|CNAME"]);
  assert.doesNotMatch(JSON.stringify(payload), /MX|spf|dkim|dmarc|hostinger\.com/i, "aucun enregistrement de messagerie dans l'ecriture");
});

test("plan : rien a faire quand la zone est deja correcte (relance sans effet)", () => {
  const zone = parseZone([
    { name: "@", type: "A", ttl: 300, records: [{ content: "216.198.79.1" }] },
    { name: "www", type: "CNAME", ttl: 300, records: [{ content: "d10cf098dc750d59.vercel-dns-017.com." }] },
    { name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }] },
  ], DOMAIN)!;
  const plan = planDnsChanges(DOMAIN, zone, expected());
  assert.deepEqual(plan.changes, []);
  assert.equal(plan.alreadyCorrect, true);
  assert.equal(buildZonePayload(plan), null, "aucune requete d'ecriture");
});

test("plan : defi de propriete Vercel ecrit seulement s'il est demande et absent", () => {
  const zone = parseZone(ZONE_JSON, DOMAIN)!;
  const withChallenge = planDnsChanges(DOMAIN, zone, expected({ challenge: { name: "_vercel.johanna.com", value: "vc-domain-verify=abc" } }));
  const txt = withChallenge.changes.find((c) => c.type === "TXT");
  assert.deepEqual([txt?.name, txt?.values], ["_vercel", ["vc-domain-verify=abc"]]);
  const already = parseZone([...ZONE_JSON, { name: "_vercel", type: "TXT", ttl: 60, records: [{ content: "\"vc-domain-verify=abc\"" }] }], DOMAIN)!;
  assert.equal(planDnsChanges(DOMAIN, already, expected({ challenge: { name: "_vercel.johanna.com", value: "vc-domain-verify=abc" } })).changes.some((c) => c.type === "TXT"), false);
});

test("conflits signales, jamais corriges tout seuls", () => {
  const zone = parseZone([
    { name: "@", type: "CNAME", ttl: 60, records: [{ content: "autre.tld." }] },
    { name: "www", type: "A", ttl: 60, records: [{ content: "1.2.3.4" }] },
    { name: "@", type: "AAAA", ttl: 60, records: [{ content: "2001:db8::1" }] },
    { name: "@", type: "CAA", ttl: 60, records: [{ content: "0 issue \"digicert.com\"" }] },
    { name: "_acme-challenge", type: "TXT", ttl: 60, records: [{ content: "vieux" }] },
  ], DOMAIN)!;
  const plan = planDnsChanges(DOMAIN, zone, expected());
  const kinds = plan.conflicts.map((c) => `${c.name}|${c.type}`);
  assert.deepEqual(kinds.sort(), ["@|AAAA", "@|CAA", "@|CNAME", "_acme-challenge|TXT", "www|A"].sort());
  assert.ok(plan.changes.every((c) => ["@|A", "www|CNAME"].includes(`${c.name}|${c.type}`)), "aucune suppression automatique");
});

test("garde-fou final : un plan hors liste blanche n'est jamais transformable en requete", () => {
  const plan = planDnsChanges(DOMAIN, [], expected());
  const forged = { ...plan, changes: [...plan.changes, { name: "@", type: "MX" as never, ttl: 60, values: ["mx.attaquant.tld"], previous: [], reason: "x" }] };
  assert.equal(buildZonePayload(forged), null, "tout le plan est refuse, aucune ecriture partielle");
  const empty = { ...plan, changes: [{ name: "@", type: "A" as const, ttl: 60, values: [], previous: [], reason: "x" }] };
  assert.equal(buildZonePayload(empty), null);
});

test("Vercel sans adresse attendue : signale, et aucune ecriture d'apex", () => {
  const plan = planDnsChanges(DOMAIN, parseZone(ZONE_JSON, DOMAIN)!, expected({ ipv4: [] }));
  assert.ok(plan.conflicts.some((c) => c.type === "A"));
  assert.equal(plan.changes.some((c) => c.type === "A"), false);
});

test("preuve de propriete : la valeur demandee s'AJOUTE aux valeurs deja presentes, sans jamais les effacer", () => {
  // Cas reel : le client a deja une preuve de propriete a ce nom (autre projet, autre service).
  const zone = parseZone([
    { name: "@", type: "A", ttl: 300, records: [{ content: "216.198.79.1" }] },
    { name: "_vercel", type: "TXT", ttl: 60, records: [{ content: "vc-domain-verify=boutique.exemple.fr,9f2aaa" }] },
    { name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }] },
  ], "exemple.fr")!;
  const expected = {
    ipv4: ["216.198.79.1"], cname: null, misconfigured: true, configuredBy: null,
    challenge: { name: "_vercel.exemple.fr", value: "vc-domain-verify=exemple.fr,abc123" },
  };
  const plan = planDnsChanges("exemple.fr", zone, expected);
  const txt = plan.changes.find((c) => c.type === "TXT")!;
  assert.deepEqual(txt.values, ["vc-domain-verify=boutique.exemple.fr,9f2aaa", "vc-domain-verify=exemple.fr,abc123"],
    "la preuve existante doit survivre a l'ecriture");
  assert.deepEqual(txt.previous, ["vc-domain-verify=boutique.exemple.fr,9f2aaa"]);

  // Deja presente : plus rien a ecrire du tout.
  const dejaLa = parseZone([
    { name: "@", type: "A", ttl: 300, records: [{ content: "216.198.79.1" }] },
    { name: "_vercel", type: "TXT", ttl: 60, records: [{ content: "vc-domain-verify=exemple.fr,abc123" }] },
  ], "exemple.fr")!;
  assert.equal(planDnsChanges("exemple.fr", dejaLa, expected).changes.filter((c) => c.type === "TXT").length, 0);
});
