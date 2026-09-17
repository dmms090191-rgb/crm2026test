// Tests des entrees et de l'interpretation des reponses Hostinger (modules purs).
//   node --test scripts/hostinger-domains/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDomainName, parseDomainInput, parseSearchQuery, parseTld } from "../../supabase/functions/hostinger-domains/domainInput.ts";
import {
  interpretAvailability, interpretBatchAvailability, listSellableTlds, orderSearchTlds, parsePortfolio, pickDomainDetails, pickYearlyPrices,
  reconcilePortfolio, type TalvexDomainRow,
} from "../../supabase/functions/hostinger-domains/providerData.ts";

test("normalisation identique a la base (schema, www, casse, chemin, point final)", () => {
  assert.equal(normalizeDomainName(" HTTPS://WWW.Mon-Entreprise.COM./accueil?x=1 "), "mon-entreprise.com");
  assert.equal(normalizeDomainName("mon-entreprise.com:443"), "mon-entreprise.com");
  assert.equal(normalizeDomainName(""), null);
  assert.equal(normalizeDomainName(42), null);
  assert.equal(normalizeDomainName("a".repeat(301)), null);
});

test("domaine valide / invalide et decoupage attendu par Hostinger", () => {
  assert.deepEqual(parseDomainInput("MonEntreprise.com"), { ok: true, domain: "monentreprise.com", sld: "monentreprise", tld: "com" });
  assert.deepEqual(parseDomainInput("boulangerie.co.il"), { ok: true, domain: "boulangerie.co.il", sld: "boulangerie", tld: "co.il" });
  for (const bad of ["monentreprise", "mon entreprise.com", "-abc.com", "abc-.com", "a.b.c.d", "abc.123", "abc..com", "", "   ", null, "abc.c"]) {
    const r = parseDomainInput(bad);
    assert.equal(r.ok, false, String(bad));
    if (!r.ok) assert.equal(r.error, "invalid_domain", String(bad));
  }
  const accent = parseDomainInput("société.fr");
  assert.equal(accent.ok, false);
  if (!accent.ok) assert.equal(accent.error, "unsupported_characters");
  assert.equal(parseDomainInput("xn--socit-esab.fr").ok, true);
});

test("extension seule pour le catalogue", () => {
  assert.equal(parseTld(".COM"), "com");
  assert.equal(parseTld("co.il"), "co.il");
  assert.equal(parseTld("a.b.c"), null);
  assert.equal(parseTld("1com"), null);
  assert.equal(parseTld("com/../x"), null);
});

test("disponible / indisponible / inconnu (jamais invente)", () => {
  const available = interpretAvailability("mon-entreprise.com", [
    { domain: "mon-entreprise.com", is_available: true, is_alternative: false, restriction: null },
    { domain: "mon-entreprise.net", is_available: true, is_alternative: true, restriction: null },
    { domain: "mon-entreprise.org", is_available: false, is_alternative: true, restriction: null },
  ]);
  assert.deepEqual(available, { status: "available", restricted: false, restrictionNote: null, alternatives: ["mon-entreprise.net"] });

  const taken = interpretAvailability("google.com", [{ domain: "google.com", is_available: false, is_alternative: false, restriction: null }]);
  assert.equal(taken.status, "unavailable");

  const restricted = interpretAvailability("exemple.fr", [{ domain: "exemple.fr", is_available: true, is_alternative: false, restriction: "EU presence required" }]);
  assert.equal(restricted.restricted, true);

  for (const weird of [null, {}, [], [{ domain: "autre.com", is_available: true, is_alternative: false }], [{ domain: "mon-entreprise.com", is_available: "yes" }],
    [{ domain: "mon-entreprise.com", is_available: true, is_alternative: false }, { domain: "MON-ENTREPRISE.com", is_available: false, is_alternative: false }]]) {
    assert.equal(interpretAvailability("mon-entreprise.com", weird).status, "unknown", JSON.stringify(weird));
  }
});

test("prix catalogue : article exact, periode 1 an, sinon aucun prix", () => {
  const catalog = [
    { id: "hostingercom-domain-com", name: ".COM", category: "DOMAIN", prices: [
      { id: "p-1y", currency: "ILS", price: 5990, first_period_price: 3490, period: 1, period_unit: "year" },
      { id: "p-2y", currency: "ILS", price: 11980, first_period_price: 9480, period: 2, period_unit: "year" },
    ] },
    { id: "hostingercom-domain-com-br", name: ".COM.BR", category: "DOMAIN", prices: [{ id: "x", currency: "ILS", price: 1, period: 1, period_unit: "year" }] },
    { id: "hostingercom-domain-company", name: ".COMPANY", category: "DOMAIN", prices: [] },
  ];
  assert.deepEqual(pickYearlyPrices(catalog, "com"), {
    status: "found",
    prices: [{ currency: "ILS", firstYearCents: 3490, renewalCents: 5990, priceId: "p-1y", itemId: "hostingercom-domain-com" }],
  });
  assert.equal(pickYearlyPrices(catalog, "net").status, "not_found");
  assert.equal(pickYearlyPrices([{ id: "a", name: ".NET", category: "DOMAIN", prices: [{ id: "m", currency: "ILS", price: 100, period: 1, period_unit: "month" }] }], "net").status, "not_found");
  assert.equal(pickYearlyPrices([{ id: "a", name: ".NET", category: "DOMAIN", prices: [] }, { id: "b", name: ".net", category: "DOMAIN", prices: [] }], "net").status, "ambiguous");
  assert.equal(pickYearlyPrices([{ id: "a", name: ".IO", category: "VPS", prices: [{ id: "x", currency: "USD", price: 1, period: 1, period_unit: "year" }] }], "io").status, "not_found");
  assert.equal(pickYearlyPrices("n'importe quoi", "com").status, "not_found");
  const noFirst = pickYearlyPrices([{ id: "a", name: ".ORG", category: "DOMAIN", prices: [{ id: "y", currency: "USD", price: 1599, period: 1, period_unit: "year" }] }], "org");
  assert.equal(noFirst.status === "found" && noFirst.prices[0].firstYearCents, 1599);
});

test("prix catalogue : nommage REEL constate (compte Hostinger France, 17/09)", () => {
  const price = (id: string, period: number, unit: string, p: number, first: number) =>
    ({ id, name: "x", currency: "EUR", price: p, first_period_price: first, period, period_unit: unit });
  const real = [
    { id: "hostingerfr-domain-com", name: ".COM Domain", category: "DOMAIN", prices: [
      price("hostingerfr-domain-com-eur-3y", 3, "year", 5097, 3399),
      price("hostingerfr-domain-com-eur-1y", 1, "year", 1699, 999),
    ] },
    { id: "hostingerfr-domain-comco", name: ".COM.CO Domain", category: "DOMAIN", prices: [price("c", 1, "year", 2499, 1799)] },
    { id: "hostingerfr-domain-company", name: ".COMPANY Domain", category: "DOMAIN", prices: [price("d", 1, "year", 2299, 299)] },
    { id: "hostingerfr-domaintransfer-computer", name: ".COMPUTER Domain Transfer", category: "DOMAIN", prices: [price("e", 0, "", 2899, 0)] },
    { id: "hostingerfr-domaintransfer-com", name: ".COM Domain Transfer", category: "DOMAIN", prices: [price("f", 0, "", 999, 0)] },
  ];
  assert.deepEqual(pickYearlyPrices(real, "com"), {
    status: "found",
    prices: [{ currency: "EUR", firstYearCents: 999, renewalCents: 1699, priceId: "hostingerfr-domain-com-eur-1y", itemId: "hostingerfr-domain-com" }],
  });
  assert.equal(pickYearlyPrices([{ id: "n", name: ".NET.IN Domain", category: "DOMAIN", prices: [price("g", 1, "year", 1, 1)] }], "net").status, "not_found");
  assert.equal(pickYearlyPrices([], "co.il").status, "not_found", "extension non proposee : aucun prix");
});

test("portefeuille : lecture tolerante, domaines gratuits non reclames comptes a part", () => {
  const parsed = parsePortfolio([
    { id: 13632, domain: "Mon-Entreprise.com", type: "domain", status: "active", created_at: "2025-02-27T11:54:22Z", expires_at: "2026-02-27T11:54:22Z" },
    { id: 2, domain: null, type: "free_domain", status: "requested" },
    "bizarre",
  ]);
  assert.equal(parsed?.domains.length, 1);
  assert.equal(parsed?.domains[0].domain, "mon-entreprise.com");
  assert.equal(parsed?.unclaimedFreeDomains, 1);
  assert.equal(parsed?.ignoredRows, 1);
  assert.equal(parsePortfolio({ message: "oops" }), null);
  assert.equal(parsePortfolio({ data: [{ id: 1, domain: "a-b.com" }], meta: { total: 120 } }), null, "enveloppe paginee refusee : jamais un portefeuille partiel");
});

test("detail d'un domaine : jamais les contacts WHOIS", () => {
  assert.equal(pickDomainDetails({ domain: "autre.com", status: "active" }, "a-b.com"), null);
  assert.equal(pickDomainDetails({ domain: "a-b.com", status: "inconnu" }, "a-b.com"), null);
  const details = pickDomainDetails({ domain: "a-b.com", status: "active", domain_contacts: { owner_id: 614698 }, name_servers: { ns1: "ns1.dns-parking.com", ns2: "ns2.dns-parking.com" }, is_locked: true }, "a-b.com");
  assert.ok(details);
  assert.ok(!JSON.stringify(details).includes("614698"));
  assert.deepEqual(details?.nameServers, ["ns1.dns-parking.com", "ns2.dns-parking.com"]);
});

test("rapprochement : jamais d'attribution automatique par le nom", () => {
  const A = "11111111-1111-4111-8111-111111111111";
  const rows: TalvexDomainRow[] = [
    { id: "sd-1", companyId: A, domainName: "lie.com", provider: "hostinger", registrationStatus: "registered", connectionStatus: "active", expiresAt: "2026-02-27T00:00:00Z", providerDomainId: "13632" },
    { id: "sd-2", companyId: A, domainName: "externe.com", provider: "external", registrationStatus: "external", connectionStatus: "active", expiresAt: null, providerDomainId: null },
    { id: "sd-3", companyId: A, domainName: "absent.com", provider: "hostinger", registrationStatus: "registered", connectionStatus: "active", expiresAt: null, providerDomainId: null },
    { id: "sd-4", companyId: A, domainName: "libere.com", provider: "hostinger", registrationStatus: "released", connectionStatus: "disconnected", expiresAt: null, providerDomainId: null },
  ];
  const rec = reconcilePortfolio([
    { providerDomainId: 13632, domain: "lie.com", type: "domain", status: "active", createdAt: null, expiresAt: "2026-02-27 11:54:22" },
    { providerDomainId: 99, domain: "entreprise-inconnue.com", type: "domain", status: "active", createdAt: null, expiresAt: null },
    { providerDomainId: 5, domain: "externe.com", type: "domain", status: "active", createdAt: null, expiresAt: null },
    { providerDomainId: 6, domain: "libere.com", type: "domain", status: "active", createdAt: null, expiresAt: null },
  ], rows);

  assert.deepEqual(rec.linked.map((l) => [l.domain, l.differences]), [["lie.com", []]]);
  assert.deepEqual(rec.unlinked.map((u) => u.domain), ["entreprise-inconnue.com", "libere.com"]);
  for (const u of rec.unlinked) assert.ok(!("companyId" in u), "un domaine non rattache ne recoit aucune entreprise");
  assert.deepEqual(rec.conflicts.map((c) => c.domain), ["externe.com"]);
  assert.deepEqual(rec.missingAtProvider.map((m) => m.domain), ["absent.com"]);

  const drift = reconcilePortfolio([{ providerDomainId: 13632, domain: "lie.com", type: "domain", status: "expired", createdAt: null, expiresAt: "2027-01-01T00:00:00Z" }], rows);
  assert.deepEqual(drift.linked[0].differences, ["registration_status", "expires_at"]);

  const reRegistered = reconcilePortfolio([{ providerDomainId: 99, domain: "lie.com", type: "domain", status: "active", createdAt: null, expiresAt: null }], rows);
  assert.equal(reRegistered.linked.length, 0, "identifiant Hostinger different : jamais presente comme rattache");
  assert.deepEqual(reRegistered.conflicts.map((c) => c.reason), ["provider_id_mismatch"]);

  const unknownId = reconcilePortfolio([{ providerDomainId: 7, domain: "absent.com", type: "domain", status: "active", createdAt: null, expiresAt: null }], rows);
  assert.deepEqual(unknownId.linked[0].differences, ["provider_domain_id_unknown"]);

  // Meme nom en double au portefeuille : jamais lie ET en conflit a la fois.
  const dup = reconcilePortfolio([
    { providerDomainId: 9001, domain: "lie.com", type: "domain", status: "deleted", createdAt: null, expiresAt: null },
    { providerDomainId: 13632, domain: "lie.com", type: "domain", status: "active", createdAt: null, expiresAt: "2026-02-27T11:54:22Z" },
  ], rows);
  assert.deepEqual(dup.linked.map((l) => [l.domain, l.providerStatus, l.differences]), [["lie.com", "active", []]]);
  assert.equal(dup.conflicts.length, 0);

  const dupNoId = reconcilePortfolio([
    { providerDomainId: 1, domain: "absent.com", type: "domain", status: "deleted", createdAt: null, expiresAt: null },
    { providerDomainId: 2, domain: "absent.com", type: "domain", status: "active", createdAt: null, expiresAt: null },
    { providerDomainId: 3, domain: "double-inconnu.com", type: "domain", status: "deleted", createdAt: null, expiresAt: null },
    { providerDomainId: 4, domain: "double-inconnu.com", type: "domain", status: "active", createdAt: null, expiresAt: null },
  ], rows);
  assert.equal(dupNoId.linked.length, 0);
  assert.deepEqual(dupNoId.conflicts.map((c) => [c.domain, c.reason]), [["absent.com", "multiple_provider_rows"]]);
  assert.deepEqual(dupNoId.unlinked.map((u) => [u.domain, u.providerStatus]), [["double-inconnu.com", "active"]]);
});

test("recherche : extraction du nom principal", () => {
  assert.deepEqual(parseSearchQuery("dior"), { ok: true, name: "dior", requestedTld: null });
  assert.deepEqual(parseSearchQuery("DIOR.com"), { ok: true, name: "dior", requestedTld: "com" });
  assert.deepEqual(parseSearchQuery("https://www.dior.co.uk/fr"), { ok: true, name: "dior", requestedTld: "co.uk" });
  assert.deepEqual(parseSearchQuery("ma-boutique.fr."), { ok: true, name: "ma-boutique", requestedTld: "fr" });
  for (const bad of ["", "-dior", "dior-", "dior.123", "a.b.c.d", "di or", null]) assert.equal(parseSearchQuery(bad).ok, false, String(bad));
  const accent = parseSearchQuery("société");
  assert.equal(!accent.ok && accent.error, "unsupported_characters");
});

test("recherche : extensions vendues d'apres le catalogue REEL (achats seulement, prix 1 an)", () => {
  const p = (id: string, period: number, unit: string, price: number, first: number) => ({ id, name: "x", currency: "EUR", price, first_period_price: first, period, period_unit: unit });
  const sellable = listSellableTlds([
    { id: "hostingerfr-domain-com", name: ".COM Domain", category: "DOMAIN", prices: [p("a", 3, "year", 5097, 3399), p("b", 1, "year", 1699, 999)] },
    { id: "hostingerfr-domain-comco", name: ".COM.CO Domain", category: "DOMAIN", prices: [p("c", 1, "year", 2499, 1799)] },
    { id: "hostingerfr-domaintransfer-computer", name: ".COMPUTER Domain Transfer", category: "DOMAIN", prices: [p("d", 0, "", 2899, 0)] },
    { id: "hostingerfr-domain-shop", name: ".SHOP Domain", category: "DOMAIN", prices: [p("e", 1, "year", 3799, 99)] },
    { id: "hostingerfr-domain-sansprix", name: ".NOPRICE Domain", category: "DOMAIN", prices: [p("f", 2, "year", 100, 100)] },
    { id: "x", name: ".DUP Domain", category: "DOMAIN", prices: [p("g", 1, "year", 1, 1)] },
    { id: "y", name: ".DUP Domain", category: "DOMAIN", prices: [p("h", 1, "year", 2, 2)] },
    { id: "vps", name: "KVM 2", category: "VPS", prices: [p("i", 1, "year", 1, 1)] },
  ]);
  assert.deepEqual(sellable?.map((t) => `${t.tld}:${t.firstYearCents}/${t.renewalCents} ${t.currency}`), ["com:999/1699 EUR", "com.co:1799/2499 EUR", "shop:99/3799 EUR"]);
  assert.equal(listSellableTlds({ data: [] }), null);

  assert.deepEqual(orderSearchTlds(["zone", "io", "shop", "com", "agency", "fr", "co.uk"], "zone"), ["zone", "com", "fr", "io", "shop", "co.uk", "agency"]);
  assert.deepEqual(orderSearchTlds(["io", "com", "fr", "net"], "fr"), ["fr", "com", "net", "io"], "extension saisie en premier, principales ensuite");
  assert.deepEqual(orderSearchTlds(["io", "com", "fr", "net"], null), ["com", "fr", "net", "io"]);
  assert.deepEqual(orderSearchTlds(["com"], "co.il"), ["com"], "extension non vendue jamais ajoutee");

  const rows = interpretBatchAvailability("dior", ["com", "io", "be"], [
    { domain: "dior.com", is_available: false, is_alternative: false, restriction: null },
    { domain: "dior.io", is_available: true, is_alternative: false, restriction: null },
  ]);
  assert.deepEqual(rows.map((r) => `${r.tld}:${r.status}`), ["com:unavailable", "io:available", "be:unknown"]);
  assert.ok(interpretBatchAvailability("dior", ["com"], null).every((r) => r.status === "unknown"));
});
