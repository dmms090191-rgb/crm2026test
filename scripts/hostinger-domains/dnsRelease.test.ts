// Tests du plan de LIBERATION DNS (module pur : aucun reseau).
//   node --test scripts/hostinger-domains/dnsRelease.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseZone } from "../../supabase/functions/hostinger-domains/dnsPlan.ts";
import {
  buildDeletePayload, buildRestorePayload, missingAfterRelease, planDnsRelease,
  readBackupZone, readWrittenRecords,
} from "../../supabase/functions/hostinger-domains/dnsRelease.ts";

const DOMAIN = "johanna.com";
const APEX_TALVEX = ["216.198.79.1", "64.29.17.1"];
const WWW_TALVEX = "d10cf098dc750d59.vercel-dns-017.com";

/* Zone d'origine : page parquee + messagerie complete (le cas reel d'un domaine Hostinger). */
const ORIGIN_RAW = [
  { name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] },
  { name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }, { content: "mx2.hostinger.com." }] },
  { name: "@", type: "TXT", ttl: 14400, records: [{ content: "v=spf1 include:_spf.mail.hostinger.com ~all" }] },
  { name: "_dmarc", type: "TXT", ttl: 14400, records: [{ content: "v=DMARC1; p=none" }] },
  { name: "hostingermail-a._domainkey", type: "CNAME", ttl: 14400, records: [{ content: "hostingermail-a.dkim.mail.hostinger.com." }] },
];
const ORIGIN = parseZone(ORIGIN_RAW, DOMAIN)!;

/* Ce que Talvex a ecrit au raccordement, tel que memorise dans technical_details.dns_applied. */
const DETAILS = {
  dns_backup: { taken_at: "2026-09-18T00:00:00.000Z", zone: ORIGIN_RAW },
  dns_applied: [
    { name: "@", type: "A", ttl: 300, values: APEX_TALVEX, previous: ["84.32.84.32"], reason: "adresse du site mise a jour" },
    { name: "www", type: "CNAME", ttl: 300, values: [WWW_TALVEX], previous: [], reason: "adresse www ajoutee" },
  ],
};

/* Zone telle qu'elle est apres le raccordement. */
const CONNECTED = parseZone([
  { name: "@", type: "A", ttl: 300, records: APEX_TALVEX.map((content) => ({ content })) },
  { name: "www", type: "CNAME", ttl: 300, records: [{ content: `${WWW_TALVEX}.` }] },
  ...ORIGIN_RAW.slice(1),
], DOMAIN)!;

const written = () => readWrittenRecords(DETAILS)!;
const backup = () => readBackupZone(DETAILS, DOMAIN);

test("lecture de la memoire : ce que Talvex a ecrit et la zone d'avant", () => {
  assert.deepEqual(written().map((r) => `${r.name}|${r.type}`), ["@|A", "www|CNAME"]);
  assert.deepEqual(written()[0].previous, ["84.32.84.32"]);
  assert.equal(backup()?.length, ORIGIN.length);
  // Sans memoire fiable : null, jamais une liste vide qui laisserait croire qu'il n'y a rien a defaire.
  assert.equal(readWrittenRecords({}), null);
  assert.equal(readWrittenRecords({ dns_applied: [{ name: "@", type: "A" }] }), null);
  assert.equal(readWrittenRecords(null), null);
  assert.equal(readBackupZone({}, DOMAIN), null);
});

test("plan : remet l'adresse d'origine, retire ce que Talvex a cree, ne touche a rien d'autre", () => {
  const plan = planDnsRelease(DOMAIN, CONNECTED, written(), backup());
  assert.equal(plan.conflicts.length, 0);
  assert.deepEqual(plan.restore.map((r) => `${r.name}|${r.type}`), ["@|A"]);
  assert.deepEqual(plan.restore[0].values, ["84.32.84.32"]);
  assert.equal(plan.restore[0].ttl, 14400, "le TTL d'origine est repris de la sauvegarde");
  assert.deepEqual(plan.remove.map((r) => `${r.name}|${r.type}`), ["www|CNAME"]);
  // La messagerie n'est jamais ni restauree ni retiree : elle est seulement « preservee ».
  const touched = [...plan.restore, ...plan.remove].map((r) => r.type);
  assert.ok(!touched.includes("MX") && !touched.includes("TXT"));
  assert.ok(plan.keep.some((k) => k.type === "MX"));
  assert.ok(plan.keep.some((k) => k.name === "_dmarc"));
  assert.ok(plan.keep.some((k) => k.name === "hostingermail-a._domainkey"));
  assert.equal(plan.historyMissing, false);
});

test("corps envoyes : remise en etat ciblee, retrait cible, jamais de liste vide", () => {
  const plan = planDnsRelease(DOMAIN, CONNECTED, written(), backup());
  const restore = buildRestorePayload(plan)!;
  assert.equal(restore.overwrite, true);
  assert.deepEqual(restore.zone.map((z) => `${z.name}|${z.type}`), ["@|A"]);
  assert.deepEqual(restore.zone[0].records, [{ content: "84.32.84.32" }]);
  assert.doesNotMatch(JSON.stringify(restore), /MX|spf|dmarc|dkim/i, "jamais de messagerie dans une ecriture");

  const del = buildDeletePayload(plan)!;
  assert.deepEqual(del.filters, [{ name: "www", type: "CNAME" }]);
  assert.ok(del.filters.length > 0, "une liste de filtres vide effacerait toute la zone");

  // Rien a faire : aucun corps, donc aucun appel reseau.
  const clean = planDnsRelease(DOMAIN, ORIGIN, written(), backup());
  assert.equal(clean.nothingToDo, true);
  assert.equal(buildRestorePayload(clean), null);
  assert.equal(buildDeletePayload(clean), null);
});

test("valeur modifiee a la main depuis le raccordement : CONFLIT, et plus aucune ecriture possible", () => {
  const edited = parseZone([
    { name: "@", type: "A", ttl: 300, records: [{ content: "203.0.113.9" }] },
    { name: "www", type: "CNAME", ttl: 300, records: [{ content: `${WWW_TALVEX}.` }] },
    ...ORIGIN_RAW.slice(1),
  ], DOMAIN)!;
  const plan = planDnsRelease(DOMAIN, edited, written(), backup());
  assert.deepEqual(plan.conflicts.map((c) => `${c.name}|${c.type}`), ["@|A"]);
  assert.match(plan.conflicts[0].detail, /modifie a la main/i);
  // Garde-fou : tant qu'un conflit existe, aucun corps n'est construit, meme pour les autres records.
  assert.equal(buildRestorePayload(plan), null);
  assert.equal(buildDeletePayload(plan), null);
});

test("deja remis en etat, ou deja retire : rien a faire, aucun conflit", () => {
  const partial = parseZone([
    { name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] },
    ...ORIGIN_RAW.slice(1),
  ], DOMAIN)!;
  const plan = planDnsRelease(DOMAIN, partial, written(), backup());
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.nothingToDo, true);
  assert.deepEqual(plan.alreadyClean.map((r) => `${r.name}|${r.type}`), ["@|A", "www|CNAME"]);
});

test("aucune memoire de ce que Talvex a ecrit : aucune action DNS", () => {
  const plan = planDnsRelease(DOMAIN, CONNECTED, null, null);
  assert.equal(plan.historyMissing, true);
  assert.equal(plan.nothingToDo, true);
  assert.deepEqual(plan.restore, []);
  assert.deepEqual(plan.remove, []);
  assert.equal(plan.keep.length, CONNECTED.length, "toute la zone est laissee telle quelle");
});

test("enregistrement hors perimetre dans la memoire : bloque tout par prudence", () => {
  const rogue = [{ name: "@", type: "MX", values: ["mx1.hostinger.com."], previous: [] }];
  const plan = planDnsRelease(DOMAIN, CONNECTED, rogue, backup());
  assert.deepEqual(plan.conflicts.map((c) => c.type), ["MX"]);
  assert.equal(buildRestorePayload(plan), null);
  assert.equal(buildDeletePayload(plan), null);
});

test("verification d'apres coup : un enregistrement preserve qui disparait est signale", () => {
  const plan = planDnsRelease(DOMAIN, CONNECTED, written(), backup());
  const after = parseZone([{ name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] }, ...ORIGIN_RAW.slice(2)], DOMAIN)!;
  const missing = missingAfterRelease(plan, after);
  assert.deepEqual(missing, [{ name: "@", type: "MX" }], "la disparition de la messagerie doit se voir");

  const complete = parseZone([{ name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] }, ...ORIGIN_RAW.slice(1)], DOMAIN)!;
  assert.deepEqual(missingAfterRelease(plan, complete), []);
});

test("verification d'apres coup : une perte PARTIELLE de valeurs est vue (mx2 disparu sur deux)", () => {
  const plan = planDnsRelease(DOMAIN, CONNECTED, written(), backup());
  // Meme couple (@, MX) mais une seule adresse au lieu de deux : c'est une perte, elle doit se voir.
  const ampute = parseZone([
    { name: "@", type: "A", ttl: 14400, records: [{ content: "84.32.84.32" }] },
    { name: "@", type: "MX", ttl: 14400, records: [{ content: "mx1.hostinger.com." }] },
    ...ORIGIN_RAW.slice(2),
  ], DOMAIN)!;
  assert.deepEqual(missingAfterRelease(plan, ampute), [{ name: "@", type: "MX" }]);
});
