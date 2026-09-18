// Liste blanche des routes joignables par les clients d'ecriture (DNS Hostinger et projet Vercel).
// C'est le dernier rempart avant le reseau : tout ce qui n'est pas nomme ici est refuse.
//   node --test scripts/hostinger-domains/connectRoutes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDnsZoneClient, isAllowedConnectRoute } from "../../supabase/functions/hostinger-domains/connectClients.ts";
import { ProviderError } from "../../supabase/functions/hostinger-domains/hostingerClient.ts";

const D = "johanna.com";

test("DNS : seules la lecture, l'ecriture ciblee et le retrait cible de la zone sont joignables", () => {
  for (const [method, path] of [
    ["GET", `/api/dns/v1/zones/${D}`],
    ["PUT", `/api/dns/v1/zones/${D}`],
    ["DELETE", `/api/dns/v1/zones/${D}`],
    ["GET", `/api/dns/v1/snapshots/${D}`],
  ] as const) {
    assert.equal(isAllowedConnectRoute("dns", method, path), true, `${method} ${path} doit etre autorise`);
  }
});

test("DNS : le reset de zone est refuse par toutes les methodes", () => {
  for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH"]) {
    assert.equal(isAllowedConnectRoute("dns", method, `/api/dns/v1/zones/${D}/reset`), false);
  }
});

test("DNS : aucune route du cycle de vie du domaine n'est joignable (achat, transfert, suppression, renouvellement)", () => {
  const interdits = [
    ["DELETE", `/api/domains/v1/portfolio/${D}`],
    ["POST", "/api/domains/v1/portfolio"],
    ["POST", `/api/domains/v1/portfolio/${D}/setup`],
    ["GET", `/api/domains/v1/portfolio/${D}/auth-code`],
    ["PUT", `/api/domains/v1/portfolio/${D}/renew`],
    ["POST", "/api/domains/v1/portfolio/claim"],
    ["POST", "/api/billing/v1/orders"],
    ["GET", "/api/billing/v1/catalog"],
  ] as const;
  for (const [method, path] of interdits) {
    assert.equal(isAllowedConnectRoute("dns", method, path), false, `${method} ${path} ne doit JAMAIS etre joignable`);
  }
});

test("DNS : instantanes et autres chemins voisins ne sont pas modifiables", () => {
  assert.equal(isAllowedConnectRoute("dns", "DELETE", `/api/dns/v1/snapshots/${D}`), false);
  assert.equal(isAllowedConnectRoute("dns", "PUT", `/api/dns/v1/snapshots/${D}`), false);
  assert.equal(isAllowedConnectRoute("dns", "POST", `/api/dns/v1/zones/${D}`), false);
  assert.equal(isAllowedConnectRoute("dns", "PATCH", `/api/dns/v1/zones/${D}`), false);
  assert.equal(isAllowedConnectRoute("dns", "DELETE", "/api/dns/v1/zones"), false);
  assert.equal(isAllowedConnectRoute("dns", "DELETE", `/api/dns/v1/zones/${D}/records/5`), false);
});

test("Hebergement : lecture, rattachement, verification et retrait du domaine du projet seulement", () => {
  const permis = [
    ["GET", "/v9/projects/crm2026test"],
    ["GET", `/v9/projects/crm2026test/domains/${D}`],
    ["GET", `/v6/domains/${D}/config`],
    ["POST", "/v10/projects/crm2026test/domains"],
    ["POST", `/v9/projects/crm2026test/domains/${D}/verify`],
    ["DELETE", `/v9/projects/crm2026test/domains/${D}`],
  ] as const;
  for (const [method, path] of permis) {
    assert.equal(isAllowedConnectRoute("vercel", method, path), true, `${method} ${path} doit etre autorise`);
  }
});

test("Hebergement : jamais le projet lui-meme, ni un deploiement, ni un secret", () => {
  const interdits = [
    ["DELETE", "/v9/projects/crm2026test"],
    ["PATCH", "/v9/projects/crm2026test"],
    ["POST", "/v13/deployments"],
    ["DELETE", "/v13/deployments/dpl_1"],
    ["GET", "/v9/projects/crm2026test/env"],
    ["DELETE", "/v9/projects/crm2026test/domains"],
    ["DELETE", "/v10/projects/crm2026test/domains/johanna.com"],
  ] as const;
  for (const [method, path] of interdits) {
    assert.equal(isAllowedConnectRoute("vercel", method, path), false, `${method} ${path} ne doit JAMAIS etre joignable`);
  }
});

test("un retrait sans filtre effacerait toute la zone : le client le refuse avant tout reseau", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    calls.push(`${String(init?.method)} ${String(url)}`);
    return Response.json({});
  }) as typeof fetch;
  const dns = createDnsZoneClient({ token: "tok_TEST", fetchImpl });

  for (const payload of [{ filters: [] }, { filters: undefined as unknown as Array<{ name: string; type: string }> }]) {
    await assert.rejects(() => dns.deleteRecords(D, payload), (error: unknown) => {
      assert.ok(error instanceof ProviderError && error.code === "forbidden_call");
      return true;
    });
  }
  assert.deepEqual(calls, [], "aucun appel reseau n'a ete tente");

  // Avec un filtre explicite, la requete part bien vers la zone du domaine demande, et nulle part ailleurs.
  await dns.deleteRecords(D, { filters: [{ name: "www", type: "CNAME" }] });
  assert.equal(calls.length, 1);
  assert.match(calls[0], new RegExp(`^DELETE https://developers\\.hostinger\\.com/api/dns/v1/zones/${D}$`));
});
