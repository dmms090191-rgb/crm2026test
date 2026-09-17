// Tests du client Hostinger en lecture seule (aucun reseau reel : fetch simule).
//   node --test scripts/hostinger-domains/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createHostingerClient, isReadOnlyRoute, parseRateInfo, ProviderError, READ_ONLY_ROUTES,
} from "../../supabase/functions/hostinger-domains/hostingerClient.ts";

const FAKE_TOKEN = "tok_TEST_ne_pas_exposer_7f3a9c";

interface Call { url: string; init: RequestInit }

function fakeFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const impl = (async (url: string | URL, init?: RequestInit) => {
    const call = { url: String(url), init: init ?? {} };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { impl, calls };
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    assert.ok(error instanceof ProviderError, "erreur typee attendue");
    const text = `${error.message} ${JSON.stringify(error)} ${String(error.stack)}`;
    assert.ok(!text.includes(FAKE_TOKEN), "le jeton ne doit jamais apparaitre dans une erreur");
    return error.code;
  }
}

test("liste blanche : seules 4 routes de lecture, aucune route d'achat/DNS/WHOIS/renouvellement", () => {
  assert.equal(READ_ONLY_ROUTES.length, 4);
  assert.equal(isReadOnlyRoute("POST", "/api/domains/v1/availability"), true);
  assert.equal(isReadOnlyRoute("GET", "/api/billing/v1/catalog"), true);
  assert.equal(isReadOnlyRoute("GET", "/api/domains/v1/portfolio"), true);
  assert.equal(isReadOnlyRoute("GET", "/api/domains/v1/portfolio/mon-entreprise.com"), true);

  const forbidden: Array<[string, string]> = [
    ["POST", "/api/domains/v1/portfolio"],                                   // achat
    ["POST", "/api/domains/v1/portfolio/mon-entreprise.com/setup"],          // enregistrement
    ["POST", "/api/domains/v1/portfolio/claim"],                             // domaine gratuit
    ["GET", "/api/domains/v1/portfolio/claim"],
    ["GET", "/api/domains/v1/portfolio/mon-entreprise.com/auth-code"],       // GET qui invalide l'ancien code
    ["PUT", "/api/domains/v1/portfolio/mon-entreprise.com/nameservers"],     // DNS
    ["PUT", "/api/domains/v1/portfolio/mon-entreprise.com/domain-lock"],
    ["DELETE", "/api/domains/v1/portfolio/mon-entreprise.com/privacy-protection"],
    ["PUT", "/api/dns/v1/zones/mon-entreprise.com"],
    ["POST", "/api/domains/v1/whois"],
    ["GET", "/api/billing/v1/subscriptions"],
    ["DELETE", "/api/billing/v1/subscriptions/1/auto-renewal/disable"],
    ["POST", "/api/billing/v1/orders"],
    ["POST", "/api/domains/v1/availability/alternatives-from-description"],
    ["GET", "/api/domains/v1/portfolio/../../billing/v1/orders"],
    ["GET", "/api/domains/v1/portfolio/Mon-Entreprise.com"],
    ["POST", "/api/billing/v1/catalog"],
    ["GET", "/api/domains/v1/availability"],
  ];
  for (const [method, path] of forbidden) assert.equal(isReadOnlyRoute(method, path), false, `${method} ${path}`);
});

test("disponibilite : requete exacte, jeton seulement dans l'en-tete, pas de redirection suivie", async () => {
  const { impl, calls } = fakeFetch(() => json(200, [{ domain: "mon-entreprise.com", is_available: true, is_alternative: false, restriction: null }]));
  const client = createHostingerClient({ token: FAKE_TOKEN, fetchImpl: impl });
  const res = await client.checkAvailability("mon-entreprise", "com", true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://developers.hostinger.com/api/domains/v1/availability");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "error");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { domain: "mon-entreprise", tlds: ["com"], with_alternatives: true });
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, `Bearer ${FAKE_TOKEN}`);
  assert.ok(!calls[0].url.includes(FAKE_TOKEN));
  assert.ok(!JSON.stringify(res).includes(FAKE_TOKEN));
});

test("catalogue : filtre officiel category=DOMAIN et name=.TLD*", async () => {
  const { impl, calls } = fakeFetch(() => json(200, []));
  await createHostingerClient({ token: FAKE_TOKEN, fetchImpl: impl }).listDomainCatalog("co.il");
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, "/api/billing/v1/catalog");
  assert.equal(url.searchParams.get("category"), "DOMAIN");
  assert.equal(url.searchParams.get("name"), ".CO.IL*");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
});

test("detail d'un domaine : un nom non conforme ne part jamais sur le reseau", async () => {
  const { impl, calls } = fakeFetch(() => json(200, {}));
  const client = createHostingerClient({ token: FAKE_TOKEN, fetchImpl: impl });
  assert.equal(await codeOf(client.getPortfolioDomain("../../billing/v1/orders")), "forbidden_call");
  assert.equal(await codeOf(client.getPortfolioDomain("x/auth-code")), "forbidden_call");
  assert.equal(await codeOf(client.getPortfolioDomain("claim")), "forbidden_call");
  assert.equal(calls.length, 0);
});

test("sans jeton : aucune requete", async () => {
  const { impl, calls } = fakeFetch(() => json(200, []));
  assert.equal(await codeOf(createHostingerClient({ token: "   ", fetchImpl: impl }).listPortfolio()), "not_configured");
  assert.equal(calls.length, 0);
});

test("erreurs Hostinger traduites, jamais de fuite du jeton ni du corps", async () => {
  const cases: Array<[Response, string]> = [
    [json(401, { message: `Unauthenticated ${FAKE_TOKEN}`, correlation_id: "abc-1" }), "unauthorized"],
    [json(403, { message: "Forbidden" }), "forbidden_by_provider"],
    [json(404, { message: "Not found" }), "not_found"],
    [json(422, { message: "The tlds.0 is invalid" }), "invalid_request"],
    [json(500, { message: "Error" }), "provider_error"],
    [json(503, { message: "Maintenance" }), "provider_error"],
    [new Response("<html>oops</html>", { status: 200 }), "bad_response"],
  ];
  for (const [response, expected] of cases) {
    const { impl } = fakeFetch(() => response);
    assert.equal(await codeOf(createHostingerClient({ token: FAKE_TOKEN, fetchImpl: impl }).listPortfolio()), expected);
  }
});

test("422 : seuls les NOMS des champs refuses sont conserves", async () => {
  const { impl } = fakeFetch(() => json(422, { message: "The tlds.0 is invalid", errors: { "tlds.0": ["The tlds.0 is invalid."], "<script>": ["x"] } }));
  try {
    await createHostingerClient({ token: FAKE_TOKEN, fetchImpl: impl }).checkAvailability("a", "zzz", true);
    assert.fail("422 attendu");
  } catch (error) {
    assert.ok(error instanceof ProviderError);
    assert.deepEqual(error.fields, ["tlds.0"]);
    assert.ok(!JSON.stringify(error).includes("is invalid"));
  }
});

test("429 : Retry-After aberrant plafonne a 1 h", async () => {
  const { impl } = fakeFetch(() => json(429, {}, { "Retry-After": "999999" }));
  try {
    await createHostingerClient({ token: FAKE_TOKEN, fetchImpl: impl }).listPortfolio();
    assert.fail("429 attendu");
  } catch (error) {
    assert.ok(error instanceof ProviderError);
    assert.equal(error.retryAfterSeconds, 3600);
  }
});

test("429 : delai Retry-After conserve", async () => {
  const { impl } = fakeFetch(() => json(429, { message: "Too Many Requests" }, { "Retry-After": "42" }));
  try {
    await createHostingerClient({ token: FAKE_TOKEN, fetchImpl: impl }).listPortfolio();
    assert.fail("429 attendu");
  } catch (error) {
    assert.ok(error instanceof ProviderError);
    assert.equal(error.code, "rate_limited");
    assert.equal(error.retryAfterSeconds, 42);
  }
});

test("delai depasse : abandon propre (timeout), erreur reseau distincte", async () => {
  const never = ((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  })) as typeof fetch;
  assert.equal(await codeOf(createHostingerClient({ token: FAKE_TOKEN, fetchImpl: never, timeoutMs: 30 }).listPortfolio()), "timeout");

  const broken = (async () => { throw new TypeError(`fetch failed ${FAKE_TOKEN}`); }) as typeof fetch;
  assert.equal(await codeOf(createHostingerClient({ token: FAKE_TOKEN, fetchImpl: broken }).listPortfolio()), "network");
});

test("en-tetes de quota documentes (RateLimit et X-RateLimit)", () => {
  assert.deepEqual(parseRateInfo(new Headers({ RateLimit: '"api";r=89;t=60' })), { remaining: 89, resetSeconds: 60 });
  assert.deepEqual(parseRateInfo(new Headers({ "X-RateLimit-Remaining": "3", "X-RateLimit-Reset": "12" })), { remaining: 3, resetSeconds: 12 });
  assert.deepEqual(parseRateInfo(new Headers()), { remaining: null, resetSeconds: null });
});
