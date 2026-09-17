// Tests du gestionnaire serveur hostinger-domains (dependances simulees, aucun reseau reel).
//   node --test scripts/hostinger-domains/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { callerFromUser, handleRequest, LIMITS, type Caller, type HandlerDeps } from "../../supabase/functions/hostinger-domains/handler.ts";
import { createHostingerClient } from "../../supabase/functions/hostinger-domains/hostingerClient.ts";

const FAKE_TOKEN = "tok_TEST_ne_pas_exposer_7f3a9c";
const SOC_A = "11111111-1111-4111-8111-111111111111";
const SOC_B = "22222222-2222-4222-8222-222222222222";
const GRP_A = "33333333-3333-4333-8333-333333333333";

const CALLERS: Record<string, Caller> = {
  talvex: { id: "aaaaaaaa-0000-4000-8000-000000000001", role: "super_admin" },
  groupeA: { id: "aaaaaaaa-0000-4000-8000-000000000002", role: "company_super_admin" },
  societeA: { id: "aaaaaaaa-0000-4000-8000-000000000003", role: "admin" },
  commercialA: { id: "aaaaaaaa-0000-4000-8000-000000000004", role: "vendor" },
  clientA: { id: "aaaaaaaa-0000-4000-8000-000000000005", role: "client" },
  desactive: { id: "aaaaaaaa-0000-4000-8000-000000000006", role: "disabled" },
  societeB: { id: "aaaaaaaa-0000-4000-8000-000000000007", role: "admin" },
};

/* Droits simules = resultats reels de can_search_domains (tests SQL). */
const ALLOWED: Record<string, string[]> = {
  talvex: [SOC_A, SOC_B, GRP_A],
  groupeA: [GRP_A, SOC_A],
  societeA: [SOC_A],
  commercialA: [],
  clientA: [],
  desactive: [SOC_A],
  societeB: [SOC_B],
};

const AVAILABLE = [
  { domain: "mon-entreprise.com", is_available: true, is_alternative: false, restriction: null },
  { domain: "mon-entreprise.net", is_available: true, is_alternative: true, restriction: null },
];
const CATALOG = [{ id: "hostingercom-domain-com", name: ".COM", category: "DOMAIN", prices: [
  { id: "hostingercom-domain-com-ils-1y", currency: "ILS", price: 5990, first_period_price: 3490, period: 1, period_unit: "year" },
] }];

interface Harness {
  deps: HandlerDeps;
  hostingerCalls: Array<{ url: string; method: string; body: string | null }>;
  writes: string[];
  logs: string[];
  cache: Map<string, unknown>;
  quotaCalls: Array<{ userId: string; companyId: string | null; isTalvex: boolean }>;
}

function harness(opts: {
  token?: string | null;
  respond?: (url: string, method: string) => Response | Promise<Response>;
  quotaAllowed?: boolean;
  quotaRefusal?: string;
  quotaThrowsAt?: number;
  timeoutMs?: number;
} = {}): Harness {
  const quotaCalls: Harness["quotaCalls"] = [];
  const hostingerCalls: Harness["hostingerCalls"] = [];
  const writes: string[] = [];
  const logs: string[] = [];
  const cache = new Map<string, unknown>();
  const respond = opts.respond ?? ((url: string) => {
    if (url.includes("/availability")) return Response.json(AVAILABLE);
    if (url.includes("/catalog")) return Response.json(CATALOG);
    return Response.json([]);
  });
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    hostingerCalls.push({ url: String(url), method: String(init?.method), body: init?.body ? String(init.body) : null });
    return respond(String(url), String(init?.method));
  }) as typeof fetch;
  const token = opts.token === undefined ? FAKE_TOKEN : opts.token;

  const deps: HandlerDeps = {
    async getCaller(authHeader) {
      const who = authHeader?.replace("Bearer ", "") ?? "";
      return CALLERS[who] ?? null;
    },
    async canSearchDomains(authHeader, companyId) {
      const who = authHeader.replace("Bearer ", "");
      return (ALLOWED[who] ?? []).includes(companyId);
    },
    async consumeQuota(userId, companyId, isTalvex) {
      quotaCalls.push({ userId, companyId, isTalvex });
      if (opts.quotaThrowsAt === quotaCalls.length) throw new Error("quota_check_failed");
      writes.push("quota");
      return opts.quotaAllowed === false
        ? { allowed: false, refusal: opts.quotaRefusal ?? "user_limit", retryAfterSeconds: 37 }
        : { allowed: true, refusal: null, retryAfterSeconds: 0 };
    },
    async setBackoff(seconds, reason) { writes.push(`backoff:${reason}:${seconds}`); },
    async cacheGet(key) { return cache.has(key) ? { payload: cache.get(key), fetchedAt: "2026-09-17T11:59:00.000Z" } : null; },
    async cachePut(key, kind, payload, ttl) { writes.push(`cache:${key}:${ttl}`); cache.set(key, payload); },
    async listTalvexDomains() { return []; },
    hostinger: token ? createHostingerClient({ token, fetchImpl, timeoutMs: opts.timeoutMs ?? 200 }) : null,
    now: () => new Date("2026-09-17T12:00:00.000Z"),
    log(event) { logs.push(JSON.stringify(event)); },
  };
  return { deps, hostingerCalls, writes, logs, cache, quotaCalls };
}

async function call(h: Harness, who: string | null, body: unknown, method = "POST") {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (who) headers.Authorization = `Bearer ${who}`;
  const res = await handleRequest(new Request("https://fn.test/hostinger-domains", {
    method, headers, body: method === "POST" ? JSON.stringify(body) : undefined,
  }), h.deps);
  const text = await res.text();
  assert.ok(!text.includes(FAKE_TOKEN), "le jeton ne doit jamais apparaitre dans une reponse");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const search = (company: string, domain: unknown) => ({ action: "check_availability", company_id: company, domain });

test("anonyme / jeton invalide : 401, aucun appel Hostinger", async () => {
  const h = harness();
  assert.equal((await call(h, null, search(SOC_A, "mon-entreprise.com"))).status, 401);
  assert.equal((await call(h, "inconnu", search(SOC_A, "mon-entreprise.com"))).status, 401);
  assert.equal(h.hostingerCalls.length, 0);
  assert.deepEqual(h.writes, []);
});

test("Commercial, Client et compte desactive refuses (403) meme pour leur propre Societe", async () => {
  const h = harness();
  for (const who of ["commercialA", "clientA", "desactive"]) {
    for (const body of [search(SOC_A, "mon-entreprise.com"), { action: "portfolio_list" }]) {
      const r = await call(h, who, body);
      assert.equal(r.status, 403, who);
      assert.equal(r.body.error, "forbidden");
    }
  }
  assert.equal(h.hostingerCalls.length, 0);
  assert.deepEqual(h.writes, []);
});

test("Societe etrangere refusee : Societe A -> B, Groupe A -> B", async () => {
  const h = harness();
  assert.equal((await call(h, "societeA", search(SOC_B, "mon-entreprise.com"))).status, 403);
  assert.equal((await call(h, "societeA", search(GRP_A, "mon-entreprise.com"))).status, 403);
  assert.equal((await call(h, "groupeA", search(SOC_B, "mon-entreprise.com"))).status, 403);
  assert.equal((await call(h, "societeA", search("pas-un-uuid", "mon-entreprise.com"))).status, 400);
  assert.equal(h.hostingerCalls.length, 0);
});

test("Societe et Groupe autorises dans leur contexte : disponible, SANS prix Hostinger", async () => {
  for (const [who, company] of [["societeA", SOC_A], ["groupeA", GRP_A], ["groupeA", SOC_A]]) {
    const h = harness();
    const r = await call(h, who, search(company, " HTTPS://WWW.Mon-Entreprise.COM/ "));
    assert.equal(r.status, 200);
    assert.equal(r.body.result.status, "available");
    assert.equal(r.body.result.domain, "mon-entreprise.com");
    assert.deepEqual(r.body.result.alternatives, ["mon-entreprise.net"]);
    assert.equal(r.body.result.client_price, null);
    assert.ok(!("provider_price" in r.body.result), "le cout Hostinger n'est jamais envoye a un Groupe/Societe");
    assert.ok(!("restriction_note" in r.body.result));
    assert.ok(!("provider_rows" in r.body.result), "diagnostic reserve a Talvex");
    assert.equal(h.hostingerCalls.length, 1, "une seule lecture : disponibilite, pas de catalogue");
    assert.equal(h.hostingerCalls[0].method, "POST");
    assert.ok(h.hostingerCalls[0].url.endsWith("/api/domains/v1/availability"));
  }
});

test("Talvex autorise : disponibilite + prix Hostinger reel separe du prix client", async () => {
  const h = harness();
  const r = await call(h, "talvex", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.status, 200);
  assert.equal(r.body.result.status, "available");
  assert.deepEqual(r.body.result.provider_price, { status: "found", prices: [{ currency: "ILS", first_year_cents: 3490, renewal_cents: 5990 }] });
  assert.equal(r.body.result.client_price, null);
  assert.deepEqual(r.body.result.provider_rows, { rows: 2, alternative_rows: 1, available_alternative_rows: 1 });
  assert.deepEqual(h.hostingerCalls.map((c) => c.method), ["POST", "GET"]);
});

test("indisponible : pas de prix demande", async () => {
  const h = harness({ respond: () => Response.json([{ domain: "google.com", is_available: false, is_alternative: false, restriction: null }]) });
  const r = await call(h, "talvex", search(SOC_A, "google.com"));
  assert.equal(r.body.result.status, "unavailable");
  assert.equal(r.body.result.provider_price.status, "not_requested");
  assert.equal(h.hostingerCalls.length, 1);
});

test("domaine invalide / accents : reponse propre, aucun appel, aucun quota consomme", async () => {
  const h = harness();
  for (const [domain, reason] of [["pas un domaine", "invalid_domain"], ["société.fr", "unsupported_characters"], [12, "invalid_domain"], ["", "invalid_domain"]]) {
    const r = await call(h, "societeA", search(SOC_A, domain));
    assert.equal(r.status, 200);
    assert.equal(r.body.result.status, "invalid");
    assert.equal(r.body.result.reason, reason);
    assert.equal(r.body.result.domain, null);
  }
  assert.equal(h.hostingerCalls.length, 0);
  assert.deepEqual(h.writes, []);
});

test("422 Hostinger : conclusion seulement si le champ en cause est designe", async () => {
  const cases: Array<[unknown, string, string]> = [
    [{ message: "The tlds.0 is invalid", errors: { "tlds.0": ["The tlds.0 is invalid."] } }, "invalid", "unsupported_extension"],
    [{ message: "The domain is invalid", errors: { domain: ["The domain format is invalid."] } }, "invalid", "invalid_domain"],
    [{ message: "Validation error" }, "unknown", "provider_unavailable"],
    [{ message: "x", errors: { with_alternatives: ["bad"] } }, "unknown", "provider_unavailable"],
  ];
  for (const [body, status, reason] of cases) {
    const h = harness({ respond: () => Response.json(body, { status: 422 }) });
    const r = await call(h, "societeA", search(SOC_A, "shop.exemple.com"));
    assert.equal(r.body.result.status, status, JSON.stringify(body));
    assert.equal(r.body.result.reason, reason, JSON.stringify(body));
    assert.ok(!JSON.stringify(r.body).includes("is invalid"), "jamais le message brut du fournisseur");
  }
});

test("token absent : « impossible de verifier », aucune valeur de remplacement, aucun appel", async () => {
  const h = harness({ token: null });
  const r = await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.body.result.status, "unknown");
  assert.equal(r.body.result.reason, "provider_not_configured");
  assert.equal(h.hostingerCalls.length, 0);
  assert.deepEqual(h.writes, []);
  const status = await call(h, "talvex", { action: "provider_status" });
  assert.deepEqual(status.body, { ok: true, result: { configured: false } });
});

test("erreur Hostinger 500 : inconnu, rien en cache", async () => {
  const h = harness({ respond: () => Response.json({ message: "Error" }, { status: 500 }) });
  const r = await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.body.result.status, "unknown");
  assert.equal(r.body.result.reason, "provider_unavailable");
  assert.equal(h.cache.size, 0);
});

test("timeout : inconnu (timeout)", async () => {
  const h = harness({
    timeoutMs: 20,
    respond: (_url) => new Promise<Response>(() => { /* ne repond jamais */ }),
  });
  // Le faux fetch ignore le signal : on emule l'abandon comme le runtime.
  h.deps.hostinger = createHostingerClient({
    token: FAKE_TOKEN,
    timeoutMs: 20,
    fetchImpl: ((_u: string, init?: RequestInit) => new Promise<Response>((_r, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as typeof fetch,
  });
  const r = await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.body.result.status, "unknown");
  assert.equal(r.body.result.reason, "timeout");
});

test("429 Hostinger : pause globale Retry-After enregistree, inconnu (service tres sollicite)", async () => {
  const h = harness({ respond: () => Response.json({ message: "Too Many Requests" }, { status: 429, headers: { "Retry-After": "42" } }) });
  const r = await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.body.result.status, "unknown");
  assert.equal(r.body.result.reason, "busy");
  assert.equal(r.body.result.retry_after_seconds, 42);
  assert.ok(h.writes.includes("backoff:rate_limited:42"));
});

test("quota Talvex : refus traduits sans accuser l'utilisateur a tort, aucun appel Hostinger", async () => {
  const expected: Record<string, [string, number | null]> = {
    user_limit: ["rate_limited", 37],
    branch_limit: ["rate_limited", 37],
    tenants_limit: ["busy", 37],
    global_limit: ["busy", 37],
    provider_backoff: ["provider_unavailable", 37],
  };
  for (const [refusal, [reason, wait]] of Object.entries(expected)) {
    const h = harness({ quotaAllowed: false, quotaRefusal: refusal });
    const r = await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
    assert.equal(r.body.result.status, "unknown", refusal);
    assert.equal(r.body.result.reason, reason, refusal);
    assert.equal(r.body.result.retry_after_seconds, wait, refusal);
    assert.equal(h.hostingerCalls.length, 0, refusal);
  }
});

test("quota : entreprise verifiee transmise pour la branche ; actions Talvex comptees cote Talvex", async () => {
  const h = harness();
  await call(h, "groupeA", search(SOC_A, "mon-entreprise.com"));
  await call(h, "talvex", { action: "portfolio_list" });
  assert.deepEqual(h.quotaCalls, [
    { userId: CALLERS.groupeA.id, companyId: SOC_A, isTalvex: false },
    { userId: CALLERS.talvex.id, companyId: null, isTalvex: true },
  ]);
});

test("echec du controle de quota : jamais d'appel Hostinger, jamais de 500 pour une recherche", async () => {
  const h = harness({ quotaThrowsAt: 1 });
  const r = await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.status, 200);
  assert.equal(r.body.result.status, "unknown");
  assert.equal(h.hostingerCalls.length, 0);

  // Talvex : disponibilite obtenue, puis echec du quota pour le catalogue -> disponible, prix indisponible.
  const t = harness({ quotaThrowsAt: 2 });
  const rt = await call(t, "talvex", search(SOC_A, "mon-entreprise.com"));
  assert.equal(rt.status, 200);
  assert.equal(rt.body.result.status, "available");
  assert.deepEqual(rt.body.result.provider_price, { status: "unavailable", prices: [] });
  assert.equal(t.hostingerCalls.length, 1);
});

test("catalogue hors specification (pas un tableau) : aucun prix et rien en cache", async () => {
  const h = harness({ respond: (url) => url.includes("/availability") ? Response.json(AVAILABLE) : Response.json({ data: CATALOG }) });
  const r = await call(h, "talvex", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.body.result.provider_price.status, "unavailable");
  assert.ok(!h.cache.has("catalog:com"));
});

test("quota Hostinger presque epuise (en-tete RateLimit) : pause preventive", async () => {
  const h = harness({ respond: () => Response.json(AVAILABLE, { headers: { RateLimit: '"api";r=1;t=33' } }) });
  await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
  assert.ok(h.writes.includes("backoff:rate_limited:33"));
});

test("jeton refuse par Hostinger (401) : pause courte, message generique", async () => {
  const h = harness({ respond: () => Response.json({ message: "Unauthenticated" }, { status: 401 }) });
  const r = await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.body.result.reason, "provider_unavailable");
  assert.ok(h.writes.includes(`backoff:unauthorized:${LIMITS.unauthorizedBackoffSeconds}`));
});

test("cache partage lu par Talvex seulement : rien ne revele la recherche d'une autre entreprise", async () => {
  const h = harness({ respond: () => Response.json([{ domain: "nouvelle-marque.fr", is_available: true, is_alternative: false, restriction: null }]) });
  await call(h, "societeA", search(SOC_A, "nouvelle-marque.fr"));
  assert.equal(h.quotaCalls.length, 1);

  // Societe B : meme nom juste apres -> quota consomme et vrai appel, comme pour un nom jamais cherche.
  const other = await call(h, "societeB", search(SOC_B, "NOUVELLE-MARQUE.fr"));
  assert.equal(h.hostingerCalls.length, 2, "aucune lecture du cache pour un Groupe/Societe");
  assert.equal(h.quotaCalls.length, 2, "quota consomme comme pour une recherche nouvelle");
  assert.equal(other.body.result.from_cache, false);
  assert.equal(other.body.result.checked_at, "2026-09-17T12:00:00.000Z");

  // Quota epuise : la reponse ne depend jamais du cache.
  const limited = harness({ quotaAllowed: false });
  limited.cache.set("availability:nouvelle-marque.fr", { status: "available", restricted: false, restrictionNote: null, alternatives: [] });
  const r = await call(limited, "societeB", search(SOC_B, "nouvelle-marque.fr"));
  assert.equal(r.body.result.status, "unknown");
  assert.equal(r.body.result.reason, "rate_limited");

  // Talvex lit le cache (ecrit par les recherches precedentes).
  const talvex = await call(h, "talvex", search(SOC_A, "nouvelle-marque.fr"));
  assert.equal(talvex.body.result.from_cache, true);
  assert.equal(talvex.body.result.checked_at, "2026-09-17T11:59:00.000Z");
});

test("403 Hostinger : refus limite, sans pause globale imposee a tout le monde", async () => {
  const h = harness({ respond: () => Response.json({ message: "Forbidden" }, { status: 403 }) });
  const r = await call(h, "societeA", search(SOC_A, "mon-entreprise.com"));
  assert.equal(r.body.result.reason, "provider_unavailable");
  assert.ok(!h.writes.some((w) => w.startsWith("backoff:")), "aucune pause globale sur un 403");
});

test("appelant : role lu dans app_metadata, compte desactive refuse (logique reelle de index.ts)", async () => {
  assert.equal(callerFromUser(null), null);
  assert.equal(callerFromUser({ id: "" }), null);
  assert.deepEqual(callerFromUser({ id: "u1", app_metadata: { role: "admin" } }), { id: "u1", role: "admin" });
  assert.deepEqual(callerFromUser({ id: "u1", app_metadata: { role: "admin", access_enabled: true } }), { id: "u1", role: "admin" });
  assert.deepEqual(callerFromUser({ id: "u1", app_metadata: {} }), { id: "u1", role: "" });
  assert.deepEqual(callerFromUser({ id: "u1", app_metadata: { role: 42 } }), { id: "u1", role: "" });
  for (const role of ["admin", "company_super_admin", "super_admin"]) {
    const caller = callerFromUser({ id: "u2", app_metadata: { role, access_enabled: false } });
    assert.deepEqual(caller, { id: "u2", role: "disabled" }, role);

    // Bout en bout : ce resultat, fourni par getCaller, donne 403 sans quota ni Hostinger.
    const h = harness();
    h.deps.getCaller = async () => caller;
    const r = await call(h, "ignore", search(SOC_A, "mon-entreprise.com"));
    assert.equal(r.status, 403, role);
    assert.equal(h.quotaCalls.length, 0);
    assert.equal(h.hostingerCalls.length, 0);
  }
});

test("recherche = aucune ecriture metier : seulement quota et cache technique", async () => {
  const h = harness();
  await call(h, "talvex", search(SOC_A, "mon-entreprise.com"));
  for (const w of h.writes) assert.match(w, /^(quota|cache:(availability|catalog):)/, w);
  for (const c of h.hostingerCalls) {
    assert.ok(
      (c.method === "POST" && c.url.endsWith("/api/domains/v1/availability")) || (c.method === "GET" && c.url.includes("/api/billing/v1/catalog?")),
      `appel inattendu ${c.method} ${c.url}`,
    );
  }
});

test("actions de portefeuille reservees a Talvex ; aucune action d'achat n'existe", async () => {
  const h = harness();
  for (const action of ["portfolio_list", "portfolio_domain", "catalog_price", "catalog_items", "provider_status"]) {
    assert.equal((await call(h, "societeA", { action, domain: "mon-entreprise.com", tld: "com" })).status, 403, action);
    assert.equal((await call(h, "groupeA", { action, domain: "mon-entreprise.com", tld: "com" })).status, 403, action);
  }
  for (const action of ["purchase", "buy", "setup", "update_nameservers", "enable_auto_renew", "update_whois", "renew", "claim"]) {
    assert.equal((await call(h, "talvex", { action, domain: "mon-entreprise.com" })).status, 400, action);
  }
  assert.equal(h.hostingerCalls.length, 0);
});

test("detail d'un domaine (Talvex) : reponse d'un autre domaine ou statut non documente -> inconnu", async () => {
  for (const body of [{ domain: "autre.com", status: "active" }, { domain: "mon-entreprise.com", status: "weird" }, {}]) {
    const h = harness({ respond: () => Response.json(body) });
    const r = await call(h, "talvex", { action: "portfolio_domain", domain: "mon-entreprise.com" });
    assert.equal(r.body.result.status, "unknown", JSON.stringify(body));
  }
  const ok = harness({ respond: () => Response.json({ domain: "mon-entreprise.com", status: "active", domain_contacts: { owner_id: 614698 } }) });
  const r = await call(ok, "talvex", { action: "portfolio_domain", domain: "mon-entreprise.com" });
  assert.equal(r.body.result.status, "in_portfolio");
  assert.ok(!JSON.stringify(r.body).includes("614698"));
});

test("diagnostic catalogue (Talvex) : articles nettoyes + correspondance, une seule lecture GET", async () => {
  const h = harness({ respond: () => Response.json([...CATALOG, { id: "hostingercom-domain-com-br", name: ".COM.BR", category: "DOMAIN", metadata: { secret: "x" }, prices: [] }]) });
  const r = await call(h, "talvex", { action: "catalog_items", tld: ".COM" });
  assert.equal(r.body.result.status, "ok");
  assert.equal(r.body.result.total, 2);
  assert.deepEqual(r.body.result.items.map((i: { name: string }) => i.name), [".COM", ".COM.BR"]);
  assert.ok(!JSON.stringify(r.body).includes("metadata"), "metadonnees non renvoyees");
  assert.deepEqual(r.body.result.match, { status: "found", item_id: "hostingercom-domain-com", prices: [{ price_id: "hostingercom-domain-com-ils-1y", currency: "ILS", first_year_cents: 3490, renewal_cents: 5990 }] });
  assert.deepEqual(h.hostingerCalls.map((c) => `${c.method} ${new URL(c.url).pathname}`), ["GET /api/billing/v1/catalog"]);
  assert.equal((await call(h, "talvex", { action: "catalog_items", tld: "../x" })).status, 400);
});

test("portefeuille (Talvex) : lecture seule + rapprochement sans attribution", async () => {
  const h = harness({ respond: () => Response.json([{ id: 1, domain: "inconnu-talvex.com", type: "domain", status: "active", created_at: null, expires_at: null }]) });
  const r = await call(h, "talvex", { action: "portfolio_list" });
  assert.equal(r.body.result.status, "ok");
  assert.deepEqual(r.body.result.reconciliation.unlinked.map((u: { domain: string }) => u.domain), ["inconnu-talvex.com"]);
  assert.equal(r.body.result.reconciliation.linked.length, 0);
  assert.deepEqual(h.hostingerCalls.map((c) => `${c.method} ${new URL(c.url).pathname}`), ["GET /api/domains/v1/portfolio"]);
});

test("methode, corps et CORS", async () => {
  const h = harness();
  const options = await handleRequest(new Request("https://fn.test/x", { method: "OPTIONS" }), h.deps);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assert.equal((await call(h, "societeA", null, "GET")).status, 405);
  const bad = await handleRequest(new Request("https://fn.test/x", { method: "POST", headers: { Authorization: "Bearer societeA" }, body: "{pas du json" }), h.deps);
  assert.equal(bad.status, 400);
  const huge = await handleRequest(new Request("https://fn.test/x", { method: "POST", headers: { Authorization: "Bearer societeA" }, body: JSON.stringify({ action: "check_availability", pad: "x".repeat(5000) }) }), h.deps);
  assert.equal(huge.status, 400);
});

test("journaux : jamais le jeton, jamais d'en-tete", async () => {
  const h = harness({ respond: () => Response.json({ message: `bad ${FAKE_TOKEN}` }, { status: 500 }) });
  await call(h, "talvex", search(SOC_A, "mon-entreprise.com"));
  await call(h, "talvex", { action: "portfolio_list" });
  for (const line of h.logs) {
    assert.ok(!line.includes(FAKE_TOKEN));
    assert.ok(!/authorization|bearer/i.test(line));
  }
});
