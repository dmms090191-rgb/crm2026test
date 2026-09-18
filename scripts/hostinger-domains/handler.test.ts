// Tests du gestionnaire serveur hostinger-domains (dependances simulees, aucun reseau reel).
//   node --test scripts/hostinger-domains/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { callerFromUser, handleRequest, LIMITS, type Caller, type HandlerDeps } from "../../supabase/functions/hostinger-domains/handler.ts";
import { createHostingerClient } from "../../supabase/functions/hostinger-domains/hostingerClient.ts";
import type { SiteDomainState } from "../../supabase/functions/hostinger-domains/connect.ts";

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
  attachCalls: Array<Record<string, unknown>>;
  connectCalls: string[];
  hostingerCalls: Array<{ url: string; method: string; body: string | null }>;
  writes: string[];
  logs: string[];
  cache: Map<string, unknown>;
  quotaCalls: Array<{ userId: string; companyId: string | null; isTalvex: boolean }>;
}

function harness(opts: {
  token?: string | null;
  respond?: (url: string, method: string, body: string | null) => Response | Promise<Response>;
  quotaAllowed?: boolean;
  quotaRefusal?: string;
  quotaThrowsAt?: number;
  timeoutMs?: number;
  /* Etat Talvex du domaine demande (RPC domain_attachment_state, simulee). */
  attachment?: "free" | "mine" | "other" | "unknown";
  connectEnabled?: boolean;
  attachResult?: "attached" | "taken" | "failed";
  /* Domaine deja associe a l'entreprise (RPC get_site_domain_for_connect, simulee). */
  siteDomain?: SiteDomainState | null;
  /* Domaine principal actuel (RPC get_primary_site_domain_for_connect, simulee). */
  primaryDomain?: SiteDomainState | null;
} = {}): Harness {
  const quotaCalls: Harness["quotaCalls"] = [];
  const attachCalls: Harness["attachCalls"] = [];
  const connectCalls: Harness["connectCalls"] = [];
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
    return respond(String(url), String(init?.method), init?.body ? String(init.body) : null);
  }) as typeof fetch;
  const token = opts.token === undefined ? FAKE_TOKEN : opts.token;

  const deps: HandlerDeps = {
    async getCaller(authHeader) {
      const who = authHeader?.replace("Bearer ", "") ?? "";
      return CALLERS[who] ?? null;
    },
    // Raccordement : par defaut aucun domaine associe et aucun client configure (tests dedies dans connect.test.ts).
    // La doublure RESPECTE ses arguments : sans cela, supprimer le cloisonnement par entreprise
    // ne ferait echouer aucun test.
    async getSiteDomain(companyId, domain) {
      connectCalls.push("getSiteDomain");
      const row = opts.siteDomain ?? null;
      return row && row.companyId === companyId && row.domain === domain ? row : null;
    },
    async setConnection() {
      connectCalls.push("setConnection");
      return true;
    },
    async getPrimarySiteDomain(companyId) {
      connectCalls.push("getPrimarySiteDomain");
      const row = opts.primaryDomain ?? null;
      return row && row.companyId === companyId ? row : null;
    },
    async releaseSiteDomain() {
      connectCalls.push("releaseSiteDomain");
      return true;
    },
    async promoteSiteDomain() {
      connectCalls.push("promoteSiteDomain");
      return true;
    },
    dns: null,
    vercel: null,
    vercelByName: null,
    connectEnabled: opts.connectEnabled === true,
    async probeHttps() {
      connectCalls.push("probeHttps");
      return false;
    },

    async domainAttachment() {
      return opts.attachment ?? "free";
    },
    async attachDomain(input) {
      attachCalls.push({ ...input });
      writes.push("attach");
      return opts.attachResult ?? "attached";
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
  return { deps, hostingerCalls, writes, logs, cache, quotaCalls, attachCalls, connectCalls };
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

/* ---------- Recherche multi-extensions ---------- */

const price1y = (tld: string, p: number, first: number) => ({ id: `hostingerfr-domain-${tld.replace(/\./g, "")}-eur-1y`, name: "x", currency: "EUR", price: p, first_period_price: first, period: 1, period_unit: "year" });
const catalogItem = (tld: string, p = 1699, first = 999) => ({ id: `hostingerfr-domain-${tld.replace(/\./g, "")}`, name: `.${tld.toUpperCase()} Domain`, category: "DOMAIN", prices: [price1y(tld, p, first)] });
/* Catalogue reel simplifie : 6 principales + 22 autres ; les transferts et .co.il ne sont pas vendus a l'achat. */
const OTHER_TLDS = ["co", "info", "shop", "store", "online", "site", "app", "dev", "tech", "pro", "biz", "me", "xyz", "be", "ch", "de", "es", "it", "nl", "pt", "agency", "zone"];
const FULL_CATALOG = [
  ...["com", "fr", "net", "org", "eu", "io"].map((tld) => catalogItem(tld)),
  ...OTHER_TLDS.map((tld) => catalogItem(tld, 2999, 199)),
  { id: "hostingerfr-domaintransfer-computer", name: ".COMPUTER Domain Transfer", category: "DOMAIN", prices: [{ id: "t", currency: "EUR", price: 2899, first_period_price: 0, period: 0, period_unit: "" }] },
];
const TAKEN = new Set(["dior.com", "dior.fr", "dior.net", "dior.org"]);

/* Faux Hostinger : catalogue complet ; disponibilite groupee repondant pour CHAQUE extension demandee. */
function hostingerFake(opts: { failWhen?: (tlds: string[]) => boolean } = {}) {
  return (url: string, _method: string, body: string | null) => {
    if (url.includes("/catalog")) return Response.json(FULL_CATALOG);
    const request = JSON.parse(body ?? "{}") as { domain: string; tlds: string[] };
    if (opts.failWhen?.(request.tlds)) return Response.json({ message: "Error" }, { status: 500 });
    return Response.json(request.tlds.map((tld) => {
      const domain = `${request.domain}.${tld}`;
      return { domain, is_available: !TAKEN.has(domain), is_alternative: false, restriction: tld === "eu" || tld === "fr" ? "requires_eu_residence" : null };
    }));
  };
}

const searchReq = (company: string, query: unknown, offset?: number) => ({ action: "search_domains", company_id: company, query, ...(offset === undefined ? {} : { offset }) });
const availabilityCalls = (h: Harness) => h.hostingerCalls.filter((c) => c.url.endsWith("/api/domains/v1/availability"));

test("recherche : droits identiques a la verification (Commercial, Client, desactive, Societe etrangere, anonyme)", async () => {
  const h = harness({ respond: hostingerFake() });
  assert.equal((await call(h, null, searchReq(SOC_A, "dior"))).status, 401);
  for (const who of ["commercialA", "clientA", "desactive"]) assert.equal((await call(h, who, searchReq(SOC_A, "dior"))).status, 403, who);
  assert.equal((await call(h, "societeA", searchReq(SOC_B, "dior"))).status, 403);
  assert.equal((await call(h, "groupeA", searchReq(SOC_B, "dior"))).status, 403);
  assert.equal(h.hostingerCalls.length, 0);
});

test("recherche : « dior.com » -> nom « dior », 1re page = 6 principales en UNE requete, sans alternatives", async () => {
  const h = harness({ respond: hostingerFake() });
  const r = await call(h, "societeA", searchReq(SOC_A, " HTTPS://www.Dior.com/accueil "));
  assert.equal(r.status, 200);
  const x = r.body.result;
  assert.equal(x.status, "ok");
  assert.equal(x.name, "dior");
  assert.equal(x.requested_tld, "com");
  assert.equal(x.requested_tld_offered, true);
  assert.equal(x.total_tlds, 28);
  assert.deepEqual(x.results.map((i: { domain: string; status: string }) => `${i.domain}:${i.status}`),
    ["dior.com:unavailable", "dior.fr:unavailable", "dior.net:unavailable", "dior.org:unavailable", "dior.eu:available", "dior.io:available"]);
  assert.equal(x.next_offset, 6);
  const calls = availabilityCalls(h);
  assert.equal(calls.length, 1, "une seule requete de disponibilite");
  assert.deepEqual(JSON.parse(String(calls[0].body)), { domain: "dior", tlds: ["com", "fr", "net", "org", "eu", "io"], with_alternatives: false });
});

test("recherche Groupe/Societe : jamais de cout Hostinger ni de code de restriction", async () => {
  const h = harness({ respond: hostingerFake() });
  const r = await call(h, "groupeA", searchReq(SOC_A, "dior"));
  for (const row of r.body.result.results) {
    assert.ok(!("provider_price" in row), row.domain);
    assert.ok(!("restriction_note" in row), row.domain);
    assert.equal(row.client_price, null);
  }
  assert.ok(!JSON.stringify(r.body).includes("999"), "aucun montant du catalogue");
});

test("recherche Talvex : cout 1re annee / renouvellement / devise pour les seuls domaines disponibles", async () => {
  const h = harness({ respond: hostingerFake() });
  const r = await call(h, "talvex", searchReq(SOC_A, "dior"));
  const byTld = Object.fromEntries(r.body.result.results.map((i: { tld: string }) => [i.tld, i]));
  assert.equal(byTld.com.provider_price, null, "indisponible : pas de prix");
  assert.deepEqual(byTld.io.provider_price, { currency: "EUR", first_year_cents: 999, renewal_cents: 1699 });
  assert.equal(byTld.eu.restriction_note, "requires_eu_residence");
});

test("recherche : extension saisie non vendue (.co.il) -> ligne « non proposee » puis les extensions vendues", async () => {
  const h = harness({ respond: hostingerFake() });
  const r = await call(h, "societeA", searchReq(SOC_A, "talvexpro.co.il"));
  assert.equal(r.body.result.requested_tld_offered, false);
  assert.deepEqual(r.body.result.results.map((i: { domain: string; status: string }) => `${i.domain}:${i.status}`),
    ["talvexpro.co.il:not_offered", "talvexpro.com:available", "talvexpro.fr:available", "talvexpro.net:available", "talvexpro.org:available", "talvexpro.eu:available", "talvexpro.io:available"]);
  assert.ok(!r.body.result.results.some((i: { tld: string; status: string }) => i.tld === "co.il" && i.status === "unavailable"), "jamais un faux indisponible");
  assert.ok(!JSON.parse(String(availabilityCalls(h)[0].body)).tlds.includes("co.il"), "aucune verification Hostinger pour une extension non vendue");
  assert.equal(r.body.result.next_offset, 6);
  const more = await call(h, "societeA", searchReq(SOC_A, "talvexpro.co.il", 6));
  assert.ok(!more.body.result.results.some((i: { status: string }) => i.status === "not_offered"), "ligne non proposee uniquement en 1re page");
});

test("recherche : l'extension saisie passe EN PREMIER sans restreindre la recherche (.fr, .com, nom seul)", async () => {
  const h = harness({ respond: hostingerFake() });
  const tlds = async (query: string) => (await call(h, "societeA", searchReq(SOC_A, query))).body.result.results.map((i: { tld: string }) => i.tld);
  assert.deepEqual(await tlds("talvexpro.fr"), ["fr", "com", "net", "org", "eu", "io"]);
  assert.deepEqual(await tlds("talvexpro.com"), ["com", "fr", "net", "org", "eu", "io"]);
  assert.deepEqual(await tlds("talvexpro"), ["com", "fr", "net", "org", "eu", "io"]);
  assert.deepEqual(JSON.parse(String(availabilityCalls(h)[0].body)).tlds, ["fr", "com", "net", "org", "eu", "io"]);
});

test("recherche : extension saisie vendue mais non principale -> en tete de la 1re page", async () => {
  const h = harness({ respond: hostingerFake() });
  const r = await call(h, "societeA", searchReq(SOC_A, "dior.shop"));
  assert.deepEqual(r.body.result.results.map((i: { tld: string }) => i.tld), ["shop", "com", "fr", "net", "org", "eu", "io"]);
  assert.equal(r.body.result.next_offset, 7);
});

test("recherche : « Voir plus » par pages de 10, catalogue lu une seule fois (cache)", async () => {
  const h = harness({ respond: hostingerFake() });
  const first = await call(h, "societeA", searchReq(SOC_A, "dior"));
  const second = await call(h, "societeA", searchReq(SOC_A, "dior", first.body.result.next_offset));
  assert.deepEqual(second.body.result.results.map((i: { tld: string }) => i.tld), OTHER_TLDS.slice(0, 10));
  assert.equal(second.body.result.next_offset, 16);
  const third = await call(h, "societeA", searchReq(SOC_A, "dior", 16));
  assert.equal(third.body.result.results.length, 10);
  const last = await call(h, "societeA", searchReq(SOC_A, "dior", 26));
  assert.equal(last.body.result.results.length, 2);
  assert.equal(last.body.result.next_offset, null);
  assert.equal(h.hostingerCalls.filter((c) => c.url.includes("/catalog")).length, 1, "catalogue en cache");
  assert.equal(availabilityCalls(h).length, 4, "une requete par page");
  for (const c of availabilityCalls(h)) assert.ok(JSON.parse(String(c.body)).tlds.length <= LIMITS.searchPageSize);
});

test("recherche : erreur 500 d'un lot -> 2 moities (3 appels max), extensions encore en echec « inconnues »", async () => {
  // Constat reel : .be fait echouer tout le lot pour un nom libre.
  const h = harness({ respond: hostingerFake({ failWhen: (tlds) => tlds.includes("be") }) });
  const r = await call(h, "societeA", searchReq(SOC_A, "orvane", 16));
  assert.equal(r.status, 200);
  assert.equal(r.body.result.status, "ok");
  const statuses = Object.fromEntries(r.body.result.results.map((i: { tld: string; status: string }) => [i.tld, i.status]));
  assert.equal(statuses.be, "unknown");
  assert.equal(statuses.biz, "unknown", "meme moitie que .be");
  assert.equal(statuses.de, "available", "autre moitie verifiee");
  assert.equal(availabilityCalls(h).length, 3);
  assert.equal(r.body.result.next_offset, 26, "la recherche peut continuer");
});

test("recherche : refus de quota -> rien d'affirme, meme page a reessayer, aucun appel Hostinger", async () => {
  const h = harness({ respond: hostingerFake(), quotaAllowed: false, quotaRefusal: "user_limit" });
  const r = await call(h, "societeA", searchReq(SOC_A, "dior", 6));
  assert.equal(r.body.result.status, "unknown");
  assert.equal(r.body.result.reason, "rate_limited");
  assert.equal(r.body.result.next_offset, 6);
  assert.deepEqual(r.body.result.results, []);
  assert.equal(h.hostingerCalls.length, 0);
});

test("recherche : catalogue indisponible -> seules les principales, sans prix ni « voir plus »", async () => {
  const fake = hostingerFake();
  const h = harness({ respond: (url, method, body) => (url.includes("/catalog") ? Response.json({ message: "Error" }, { status: 500 }) : fake(url, method, body)) });
  const r = await call(h, "talvex", searchReq(SOC_A, "dior"));
  assert.equal(r.body.result.catalog_status, "unavailable");
  assert.equal(r.body.result.results.length, 6);
  assert.equal(r.body.result.next_offset, null);
  assert.ok(r.body.result.results.every((i: { provider_price: unknown }) => i.provider_price === null));

  const more = await call(h, "talvex", searchReq(SOC_A, "dior", 6));
  assert.equal(more.body.result.status, "unknown", "page « Voir plus » sans catalogue : rien d'affirme");
  assert.equal(more.body.result.next_offset, 6, "meme page a reessayer");
});

test("recherche : saisie invalide, accents, offset hors bornes, jeton absent", async () => {
  const h = harness({ respond: hostingerFake() });
  const cases: Array<[unknown, string]> = [["", "invalid_domain"], ["-dior", "invalid_domain"], ["dior.123", "invalid_domain"], ["société", "unsupported_characters"], [42, "invalid_domain"]];
  for (const [query, reason] of cases) {
    const r = await call(h, "societeA", searchReq(SOC_A, query));
    assert.equal(r.body.result.status, "invalid", String(query));
    assert.equal(r.body.result.reason, reason, String(query));
  }
  for (const offset of [-1, 1.5, 999999, "6"]) {
    assert.equal((await call(h, "societeA", { action: "search_domains", company_id: SOC_A, query: "dior", offset })).status, 400, String(offset));
  }
  assert.equal(h.hostingerCalls.length, 0);
  const none = harness({ token: null });
  const r = await call(none, "societeA", searchReq(SOC_A, "dior"));
  assert.equal(r.body.result.status, "unknown");
  assert.equal(r.body.result.reason, "provider_not_configured");
  assert.equal(none.hostingerCalls.length, 0);
});

test("diagnostic de disponibilite groupee : Talvex seul, 25 extensions max", async () => {
  const h = harness({ respond: hostingerFake() });
  assert.equal((await call(h, "societeA", { action: "availability_probe", name: "dior", tlds: ["com"] })).status, 403);
  assert.equal((await call(h, "talvex", { action: "availability_probe", name: "dior", tlds: Array.from({ length: 26 }, () => "com") })).status, 400);
  const r = await call(h, "talvex", { action: "availability_probe", name: "dior", tlds: ["com", "io"] });
  assert.deepEqual(r.body.result.results, [{ tld: "com", status: "unavailable" }, { tld: "io", status: "available" }]);
});

/* ---------- Filtre par extension ---------- */

const extensionsReq = (company: string) => ({ action: "search_extensions", company_id: company });
const selectedReq = (company: string, query: unknown, tlds: unknown, offset?: number) =>
  ({ action: "search_domains", company_id: company, query, tlds, ...(offset === undefined ? {} : { offset }) });
const catalogCalls = (h: Harness) => h.hostingerCalls.filter((c) => c.url.includes("/catalog"));

test("filtre : liste des extensions = catalogue vendu (noms seuls, ordre de recherche), memes droits que la recherche", async () => {
  const h = harness({ respond: hostingerFake() });
  assert.equal((await call(h, null, extensionsReq(SOC_A))).status, 401);
  for (const who of ["commercialA", "clientA", "desactive"]) assert.equal((await call(h, who, extensionsReq(SOC_A))).status, 403, who);
  assert.equal((await call(h, "societeA", extensionsReq(SOC_B))).status, 403);
  assert.equal((await call(h, "societeA", { action: "search_extensions", company_id: "pas-un-uuid" })).status, 400);
  assert.equal(h.hostingerCalls.length, 0);

  for (const who of ["groupeA", "societeA", "talvex"]) {
    const r = await call(h, who, extensionsReq(SOC_A));
    assert.equal(r.status, 200, who);
    assert.equal(r.body.result.status, "ok");
    assert.deepEqual(r.body.result.tlds.slice(0, 9), ["com", "fr", "net", "org", "eu", "io", "co", "info", "shop"]);
    assert.equal(r.body.result.total_tlds, 28);
    assert.equal(r.body.result.tlds.length, 28);
    assert.ok(!r.body.result.tlds.includes("computer"), "les transferts ne sont pas des extensions vendues");
    assert.ok(!r.body.result.tlds.includes("co.il"), "extension non vendue absente");
    assert.doesNotMatch(JSON.stringify(r.body), /999|1699|2999|EUR|price|cents/, `${who} : aucun prix ni devise`);
  }
  assert.equal(catalogCalls(h).length, 1, "catalogue lu une seule fois puis servi depuis le cache");
  assert.equal(availabilityCalls(h).length, 0, "ouvrir le menu ne verifie aucune disponibilite");
  assert.equal(h.quotaCalls.length, 1, "seule la lecture initiale du catalogue consomme du quota");
});

test("filtre : catalogue indisponible ou refus de quota -> liste vide, rien d'affirme", async () => {
  const down = harness({ respond: (url) => Response.json({ message: "Error" }, { status: url.includes("/catalog") ? 500 : 200 }) });
  const r = await call(down, "societeA", extensionsReq(SOC_A));
  assert.equal(r.body.result.status, "unknown");
  assert.deepEqual(r.body.result.tlds, []);
  const refused = harness({ respond: hostingerFake(), quotaAllowed: false, quotaRefusal: "user_limit" });
  const q = await call(refused, "societeA", extensionsReq(SOC_A));
  assert.equal(q.body.result.reason, "rate_limited");
  assert.equal(q.body.result.retry_after_seconds, 37);
  assert.equal(refused.hostingerCalls.length, 0);
});

test("filtre : extensions choisies verifiees en UNE requete groupee, sans toucher a la pagination", async () => {
  const h = harness({ respond: hostingerFake() });
  await call(h, "societeA", extensionsReq(SOC_A));
  const r = await call(h, "societeA", selectedReq(SOC_A, "dior", ["zone", "co", "io"]));
  assert.equal(r.status, 200);
  const x = r.body.result;
  assert.equal(x.status, "ok");
  assert.equal(x.mode, "selected");
  assert.equal(x.name, "dior");
  assert.equal(x.next_offset, null, "la verification ciblee ne deplace pas « Voir plus »");
  assert.deepEqual(x.results.map((i: { domain: string; status: string }) => `${i.domain}:${i.status}`), ["dior.zone:available", "dior.co:available", "dior.io:available"]);
  const calls = availabilityCalls(h);
  assert.equal(calls.length, 1, "une seule requete Hostinger");
  assert.deepEqual(JSON.parse(String(calls[0].body)), { domain: "dior", tlds: ["zone", "co", "io"], with_alternatives: false });
  assert.equal(catalogCalls(h).length, 1, "catalogue reutilise (cache)");
});

test("filtre : extension absente du catalogue -> « non proposee » sans appel ; saisie conservee (.co.il)", async () => {
  const h = harness({ respond: hostingerFake() });
  const only = await call(h, "societeA", selectedReq(SOC_A, "talvexpro.co.il", ["co.il"]));
  assert.deepEqual(only.body.result.results.map((i: { domain: string; status: string }) => `${i.domain}:${i.status}`), ["talvexpro.co.il:not_offered"]);
  assert.equal(only.body.result.requested_tld, "co.il");
  assert.equal(availabilityCalls(h).length, 0);
  const mixed = await call(h, "societeA", selectedReq(SOC_A, "talvexpro.co.il", ["co.il", "shop"]));
  assert.deepEqual(mixed.body.result.results.map((i: { tld: string; status: string }) => `${i.tld}:${i.status}`), ["co.il:not_offered", "shop:available"]);
  assert.deepEqual(JSON.parse(String(availabilityCalls(h)[0].body)).tlds, ["shop"], "seule l'extension vendue est verifiee");
});

test("filtre : cout Hostinger pour Talvex seulement ; Groupe/Societe jamais", async () => {
  const h = harness({ respond: hostingerFake() });
  const groupe = await call(h, "groupeA", selectedReq(SOC_A, "dior", ["co", "com"]));
  for (const row of groupe.body.result.results) {
    assert.ok(!("provider_price" in row) && !("restriction_note" in row), row.domain);
  }
  assert.doesNotMatch(JSON.stringify(groupe.body), /2999|199|1699|999|EUR/);
  const talvex = await call(h, "talvex", selectedReq(SOC_A, "dior", ["co", "com"]));
  const byTld = Object.fromEntries(talvex.body.result.results.map((i: { tld: string }) => [i.tld, i]));
  assert.deepEqual(byTld.co.provider_price, { currency: "EUR", first_year_cents: 199, renewal_cents: 2999 });
  assert.equal(byTld.com.provider_price, null, "indisponible : pas de prix");
});

test("filtre : liste invalide, trop longue ou combinee a une pagination -> 400 sans appel", async () => {
  const h = harness({ respond: hostingerFake() });
  const bad: unknown[] = [[], "co", ["c!o"], ["co", 3], Array.from({ length: LIMITS.searchPageSize + 1 }, (_, i) => `t${i}x`)];
  for (const tlds of bad) assert.equal((await call(h, "societeA", selectedReq(SOC_A, "dior", tlds))).status, 400, JSON.stringify(tlds));
  assert.equal((await call(h, "societeA", selectedReq(SOC_A, "dior", ["co"], 6))).status, 400);
  assert.equal((await call(h, "commercialA", selectedReq(SOC_A, "dior", ["co"]))).status, 403);
  assert.equal((await call(h, "societeA", selectedReq(SOC_B, "dior", ["co"]))).status, 403);
  assert.equal(h.hostingerCalls.length, 0);
  const dup = await call(h, "societeA", selectedReq(SOC_A, "dior", ["co", ".CO", "co"]));
  assert.deepEqual(dup.body.result.results.map((i: { tld: string }) => i.tld), ["co"], "doublons retires");
});

test("filtre : refus de quota -> rien d'affirme ; erreur 500 -> moities comme les pages", async () => {
  const refused = harness({ respond: hostingerFake(), quotaAllowed: false, quotaRefusal: "branch_limit" });
  const r = await call(refused, "societeA", selectedReq(SOC_A, "dior", ["co"]));
  assert.equal(r.body.result.status, "unknown");
  assert.deepEqual(r.body.result.results, []);
  assert.equal(refused.hostingerCalls.length, 0);
  const flaky = harness({ respond: hostingerFake({ failWhen: (tlds) => tlds.includes("be") }) });
  const s = await call(flaky, "societeA", selectedReq(SOC_A, "orvane", ["be", "biz", "de", "es"]));
  const statuses = Object.fromEntries(s.body.result.results.map((i: { tld: string; status: string }) => [i.tld, i.status]));
  assert.deepEqual(statuses, { be: "unknown", biz: "unknown", de: "available", es: "available" });
  assert.equal(availabilityCalls(flaky).length, 3);
});

/* ---------- Connecter un domaine deja achete (parcours Site) ---------- */

const portfolioDetail = (over: Record<string, unknown> = {}) =>
  ({ id: 12345, domain: "johanna.com", status: "active", registered_at: "2026-09-17T00:00:00Z", expires_at: "2027-09-17T00:00:00Z",
    domain_contacts: { owner_id: 614698 }, ...over });
/* La presence au portefeuille est lue sur la LISTE (la route de detail est inutilisable sur ce compte). */
const portfolioRow = (over: Record<string, unknown> = {}) =>
  ({ id: 12345, domain: "johanna.com", type: "domain", status: "active", created_at: "2026-09-17T00:00:00Z", expires_at: "2027-09-17T00:00:00Z", ...over });
const portfolioFake = (row: Record<string, unknown> | null, status = 200) =>
  (url: string) => {
    if (url.endsWith("/api/domains/v1/portfolio")) {
      return status === 200 ? Response.json(row ? [row] : []) : Response.json({ message: "Erreur" }, { status });
    }
    if (url.includes("/portfolio/")) return Response.json({ message: "Not found" }, { status: 404 });
    return Response.json([]);
  };
const portfolioCalls = (h: Harness) => h.hostingerCalls.filter((c) => c.url.endsWith("/api/domains/v1/portfolio"));
const lookupReq = (company: string, domain: unknown) => ({ action: "lookup_domain", company_id: company, domain });
const attachReq = (company: string, domain: unknown) => ({ action: "attach_domain", company_id: company, domain });

test("connexion : memes droits que la recherche (Commercial, Client, desactive, Societe etrangere, anonyme)", async () => {
  const h = harness({ respond: portfolioFake(portfolioRow()) });
  for (const body of [lookupReq(SOC_A, "johanna.com"), attachReq(SOC_A, "johanna.com")]) {
    assert.equal((await call(h, null, body)).status, 401);
    for (const who of ["commercialA", "clientA", "desactive"]) assert.equal((await call(h, who, body)).status, 403, who);
    assert.equal((await call(h, "societeA", { ...body, company_id: SOC_B })).status, 403);
    assert.equal((await call(h, "societeA", { ...body, company_id: "pas-un-uuid" })).status, 400);
  }
  assert.equal(h.hostingerCalls.length, 0);
  assert.deepEqual(h.attachCalls, []);
});

test("connexion : domaine du portefeuille et libre -> « trouve », une seule lecture, aucun contact WHOIS", async () => {
  const h = harness({ respond: portfolioFake(portfolioRow()) });
  const r = await call(h, "groupeA", lookupReq(SOC_A, " HTTPS://WWW.Johanna.com/ "));
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.result.status, r.body.result.domain, r.body.result.expires_at], ["available", "johanna.com", "2027-09-17T00:00:00Z"]);
  assert.equal(portfolioCalls(h).length, 1, "une seule lecture du portefeuille");
  assert.equal(portfolioCalls(h)[0].method, "GET");
  assert.ok(!JSON.stringify(r.body).includes("614698"), "aucun contact WHOIS renvoye");
  assert.doesNotMatch(JSON.stringify(r.body), /meroni|autre.com/i, "jamais la liste des autres domaines");
});

test("connexion : domaine pris ailleurs -> « deja utilise », sans dire par qui, et sans appel Hostinger", async () => {
  const h = harness({ respond: portfolioFake(portfolioRow()), attachment: "other" });
  const r = await call(h, "societeA", lookupReq(SOC_A, "johanna.com"));
  assert.equal(r.body.result.status, "taken");
  assert.equal(h.hostingerCalls.length, 0, "inutile d'interroger Hostinger : Talvex sait deja");
  assert.doesNotMatch(JSON.stringify(r.body), /company|societe|groupe|owner|1111|2222|3333/i);
  const blocked = await call(h, "societeA", attachReq(SOC_A, "johanna.com"));
  assert.equal(blocked.body.result.status, "taken");
  assert.deepEqual(h.attachCalls, [], "aucune ecriture");
});

test("connexion : absent du portefeuille, ou domaine inutilisable -> « introuvable », jamais associable", async () => {
  const missing = harness({ respond: portfolioFake(null) });
  assert.equal((await call(missing, "societeA", lookupReq(SOC_A, "johanna.com"))).body.result.status, "not_found");
  assert.deepEqual(missing.attachCalls, []);
  for (const status of ["expired", "deleted", "suspended"]) {
    const h = harness({ respond: portfolioFake(portfolioRow({ status })) });
    assert.equal((await call(h, "societeA", lookupReq(SOC_A, "johanna.com"))).body.result.status, "not_found", status);
    assert.equal((await call(h, "societeA", attachReq(SOC_A, "johanna.com"))).body.result.status, "not_found", status);
    assert.deepEqual(h.attachCalls, [], status);
  }
  const other = harness({ respond: portfolioFake(portfolioRow({ domain: "autre.com" })) });
  assert.equal((await call(other, "societeA", lookupReq(SOC_A, "johanna.com"))).body.result.status, "not_found");
});

test("connexion : saisie invalide -> refus immediat, aucun appel, aucune ecriture", async () => {
  const h = harness({ respond: portfolioFake(portfolioRow()) });
  for (const domain of ["", "johanna", "-johanna.com", "société.com", 42, null]) {
    const r = await call(h, "societeA", lookupReq(SOC_A, domain));
    assert.equal(r.body.result.status, "invalid", String(domain));
    assert.equal((await call(h, "societeA", attachReq(SOC_A, domain))).body.result.status, "invalid", String(domain));
  }
  assert.equal(h.hostingerCalls.length, 0);
  assert.deepEqual(h.attachCalls, []);
});

test("association : ecriture serveur avec les vraies donnees du fournisseur, et rien d'autre", async () => {
  const h = harness({ respond: portfolioFake(portfolioRow()) });
  const r = await call(h, "groupeA", attachReq(SOC_A, "johanna.com"));
  assert.deepEqual([r.body.result.status, r.body.result.domain], ["attached", "johanna.com"]);
  assert.equal(h.attachCalls.length, 1);
  assert.deepEqual(h.attachCalls[0], {
    companyId: SOC_A, domain: "johanna.com", providerDomainId: 12345,
    expiresAt: "2027-09-17T00:00:00Z", registeredAt: "2026-09-17T00:00:00Z",
    actorId: CALLERS.groupeA.id, actorRole: "company_super_admin",
  });
  assert.equal(portfolioCalls(h).length, 1, "une seule lecture du portefeuille pour associer");
  // Deja associe a cette entreprise : idempotent, aucune nouvelle ecriture ni appel.
  const again = harness({ respond: portfolioFake(portfolioRow()), attachment: "mine" });
  assert.equal((await call(again, "groupeA", attachReq(SOC_A, "johanna.com"))).body.result.status, "attached");
  assert.deepEqual(again.attachCalls, []);
  assert.equal(again.hostingerCalls.length, 0);
  assert.equal((await call(again, "groupeA", lookupReq(SOC_A, "johanna.com"))).body.result.status, "already_yours");
});

test("association : refus de quota ou echec d'ecriture -> rien d'affirme, aucune ligne creee", async () => {
  const refused = harness({ respond: portfolioFake(portfolioRow()), quotaAllowed: false, quotaRefusal: "user_limit" });
  const q = await call(refused, "societeA", attachReq(SOC_A, "johanna.com"));
  assert.deepEqual([q.body.result.status, q.body.result.reason, q.body.result.retry_after_seconds], ["unavailable", "rate_limited", 37]);
  assert.equal(refused.hostingerCalls.length, 0);
  assert.deepEqual(refused.attachCalls, []);
  const failed = harness({ respond: portfolioFake(portfolioRow()), attachResult: "failed" });
  assert.equal((await call(failed, "societeA", attachReq(SOC_A, "johanna.com"))).body.result.status, "unavailable");
  const raced = harness({ respond: portfolioFake(portfolioRow()), attachResult: "taken" });
  assert.equal((await call(raced, "societeA", attachReq(SOC_A, "johanna.com"))).body.result.status, "taken");
});

test("plan de raccordement : Talvex seul peut regarder avant association ; jamais d'ecriture", async () => {
  const h = harness({ respond: portfolioFake(portfolioRow()) });
  // Groupe/Societe : le domaine doit d'abord etre associe.
  const groupe = await call(h, "groupeA", { action: "connect_plan", company_id: SOC_A, domain: "johanna.com" });
  assert.deepEqual([groupe.body.result.status, groupe.body.result.reason], ["unavailable", "not_attached"]);
  // Talvex : plan autorise, mais sans client DNS configure dans ce harnais -> reponse honnete.
  const talvex = await call(h, "talvex", { action: "connect_plan", company_id: SOC_A, domain: "johanna.com" });
  assert.equal(talvex.body.result.status, "unavailable");
  assert.equal(talvex.body.result.reason, "provider_not_configured");
  // Domaine appartenant a une autre entite : refus net, sans detail.
  const taken = harness({ respond: portfolioFake(portfolioRow()), attachment: "other" });
  const blocked = await call(taken, "talvex", { action: "connect_plan", company_id: SOC_A, domain: "johanna.com" });
  assert.deepEqual([blocked.body.result.status, blocked.body.result.reason], ["blocked", "taken"]);
  assert.doesNotMatch(JSON.stringify(blocked.body), /company|societe|groupe/i);
  // L'application reste interdite tant que le verrou serveur n'est pas pose.
  const applyAttempt = await call(h, "talvex", { action: "connect_apply", company_id: SOC_A, domain: "johanna.com" });
  assert.equal(applyAttempt.body.result.reason, "not_attached");
  assert.deepEqual(h.connectCalls.filter((c) => c === "setConnection"), [], "aucune ecriture d'etat");
});

test("verrou d'ecriture DNS : connect_apply refuse tant que le serveur ne l'autorise pas", async () => {
  const locked = harness({ respond: portfolioFake(portfolioRow()) });
  locked.deps.getSiteDomain = async () => ({
    id: "33333333-3333-4333-8333-333333333333", companyId: SOC_A, domain: "johanna.com", connectionStatus: "not_started",
    dnsConfiguredAt: null, vercelAttachedAt: null, verifiedAt: null, activatedAt: null, technicalDetails: {},
  });
  const r = await call(locked, "societeA", { action: "connect_apply", company_id: SOC_A, domain: "johanna.com" });
  assert.deepEqual([r.body.result.status, r.body.result.reason], ["blocked", "connect_disabled"]);
  assert.equal(locked.hostingerCalls.length, 0, "aucun appel fournisseur");
});

/* ---------- Changer de domaine et deconnecter : droits et isolation ---------- */

const ATTACHED: SiteDomainState = {
  id: "dddddddd-0000-4000-8000-000000000001",
  companyId: SOC_A,
  domain: "mon-entreprise.com",
  connectionStatus: "active",
  dnsConfiguredAt: "2026-09-18T00:00:00Z", vercelAttachedAt: "2026-09-18T00:00:10Z",
  verifiedAt: "2026-09-18T00:00:12Z", activatedAt: "2026-09-18T00:00:14Z",
  technicalDetails: {},
};

test("deconnexion et changement : Commercial, Client et compte desactive refuses (403)", async () => {
  const h = harness({ connectEnabled: true, siteDomain: ATTACHED });
  for (const who of ["commercialA", "clientA", "desactive"]) {
    for (const action of ["disconnect_plan", "disconnect_apply", "switch_domain"]) {
      const r = await call(h, who, { action, company_id: SOC_A, domain: "mon-entreprise.com" });
      assert.equal(r.status, 403, `${who} ne doit pas pouvoir ${action}`);
    }
  }
  assert.equal(h.hostingerCalls.length, 0);
  assert.deepEqual(h.writes, []);
});

test("isolation : une Societe ne peut pas deconnecter le domaine d'une autre (403)", async () => {
  const h = harness({ connectEnabled: true, siteDomain: ATTACHED });
  const r = await call(h, "societeB", { action: "disconnect_apply", company_id: SOC_A, domain: "mon-entreprise.com" });
  assert.equal(r.status, 403);
  assert.ok(!h.connectCalls.includes("releaseSiteDomain"));
});

test("deconnexion d'un domaine qui n'est pas le sien : meme reponse neutre, aucune fuite", async () => {
  // Domaine inconnu de l'entreprise, et domaine detenu par une AUTRE entite : reponse identique.
  const libre = harness({ connectEnabled: true, siteDomain: null, attachment: "free" });
  const ailleurs = harness({ connectEnabled: true, siteDomain: null, attachment: "other" });
  const a = await call(libre, "societeA", { action: "disconnect_apply", company_id: SOC_A, domain: "autre-entreprise.com" });
  const b = await call(ailleurs, "societeA", { action: "disconnect_apply", company_id: SOC_A, domain: "autre-entreprise.com" });
  assert.deepEqual(a.body.result, b.body.result, "la reponse ne doit pas dependre de l'existence ailleurs");
  assert.equal(a.body.result.reason, "not_attached");
  // Ni « deja pris », ni le moindre identifiant d'entreprise : rien ne doit trahir l'autre entite.
  assert.doesNotMatch(JSON.stringify(b.body), /taken|deja utilise|company_id|[0-9a-f]{8}-[0-9a-f]{4}-/i);
  assert.ok(!libre.connectCalls.includes("releaseSiteDomain"));
  assert.ok(!ailleurs.connectCalls.includes("releaseSiteDomain"));
});

test("verrou d'ecriture : sans DOMAIN_CONNECT_ENABLED, la deconnexion reelle est bloquee mais le plan reste lisible", async () => {
  const h = harness({ connectEnabled: false, siteDomain: ATTACHED });
  const apply = await call(h, "societeA", { action: "disconnect_apply", company_id: SOC_A, domain: "mon-entreprise.com" });
  assert.deepEqual([apply.body.result.status, apply.body.result.reason], ["blocked", "connect_disabled"]);
  assert.ok(!h.connectCalls.includes("releaseSiteDomain"));

  const plan = await call(h, "societeA", { action: "disconnect_plan", company_id: SOC_A, domain: "mon-entreprise.com" });
  assert.notEqual(plan.body.result.reason, "connect_disabled", "un plan en lecture seule n'est jamais bloque par le verrou");
});

test("changer de domaine : un domaine deja utilise ailleurs est refuse sans dire par qui", async () => {
  const h = harness({ connectEnabled: true, attachment: "other" });
  const r = await call(h, "societeA", { action: "switch_domain", company_id: SOC_A, domain: "pris.com" });
  assert.deepEqual([r.body.result.status, r.body.result.reason], ["blocked", "taken"]);
  assert.equal(r.body.result.message, "Ce domaine est deja utilise.");
  assert.equal(h.attachCalls.length, 0, "aucune association tentee");
  assert.equal(h.hostingerCalls.length, 0, "aucun appel Hostinger pour un domaine pris");
});

test("changer de domaine : l'ancien domaine vient du serveur, jamais du navigateur", async () => {
  const h = harness({ connectEnabled: true, attachment: "mine", siteDomain: ATTACHED, primaryDomain: ATTACHED });
  // Le corps essaie d'imposer un autre domaine a detacher : il doit etre ignore.
  await call(h, "societeA", {
    action: "switch_domain", company_id: SOC_A, domain: "mon-entreprise.com",
    previous_domain: "domaine-d-une-autre-societe.fr", site_domain_id: "00000000-0000-4000-8000-000000000000",
  });
  assert.ok(h.connectCalls.includes("getPrimarySiteDomain"), "le serveur relit lui-meme le domaine principal");
  assert.equal(JSON.stringify(h.connectCalls).includes("domaine-d-une-autre-societe"), false);
});

test("changer pour le domaine deja en place : rien n'est refait, rien n'est detache", async () => {
  const h = harness({ connectEnabled: true, primaryDomain: ATTACHED, attachment: "mine" });
  const r = await call(h, "societeA", { action: "switch_domain", company_id: SOC_A, domain: "mon-entreprise.com" });
  assert.deepEqual([r.body.result.status, r.body.result.step], ["ok", "done"]);
  assert.ok(!h.connectCalls.includes("releaseSiteDomain"));
  assert.ok(!h.connectCalls.includes("promoteSiteDomain"));
  assert.equal(h.hostingerCalls.length, 0);
});

test("verrou d'ecriture : changer de domaine est bloque tant que le raccordement automatique est desactive", async () => {
  const h = harness({ connectEnabled: false, attachment: "free" });
  const r = await call(h, "societeA", { action: "switch_domain", company_id: SOC_A, domain: "nouvelle.com" });
  assert.deepEqual([r.body.result.status, r.body.result.reason], ["blocked", "connect_disabled"]);
  assert.equal(h.attachCalls.length, 0);
  assert.equal(h.hostingerCalls.length, 0);
});

test("isolation : avec SON PROPRE company_id, une Societe ne peut pas deconnecter le domaine d'une autre", async () => {
  // Societe B est parfaitement autorisee sur SOC_B ; elle vise le domaine de SOC_A.
  const h = harness({ connectEnabled: true, siteDomain: ATTACHED });
  const r = await call(h, "societeB", { action: "disconnect_apply", company_id: SOC_B, domain: ATTACHED.domain });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.result.status, r.body.result.reason], ["unavailable", "not_attached"]);
  assert.ok(!h.connectCalls.includes("releaseSiteDomain"), "aucun detachement du domaine d'autrui");
  // Rien dans la reponse ne revele que ce domaine existe chez quelqu'un d'autre.
  assert.doesNotMatch(JSON.stringify(r.body), /taken|deja utilise|[0-9a-f]{8}-[0-9a-f]{4}-/i);
});

test("changement : un detachement reste a terminer -> l'action reprend au lieu de dire « deja fait »", async () => {
  const enCours: SiteDomainState = { ...ATTACHED, technicalDetails: { switch_release_domain: "ancienne-adresse.fr" } };
  const h = harness({ connectEnabled: true, attachment: "mine", siteDomain: enCours, primaryDomain: enCours });
  const r = await call(h, "societeA", { action: "switch_domain", company_id: SOC_A, domain: ATTACHED.domain });
  assert.equal(r.status, 200);
  // Le court-circuit « c'est deja l'adresse de votre site » ne doit PAS avoir eu lieu.
  assert.notEqual(r.body.result.message, "C'est deja l'adresse de votre site.");
});

test("budget partage : une action lourde reserve d'avance ce qu'elle va reellement consommer", async () => {
  // Raccordement / changement / deconnexion declenchent plusieurs appels fournisseur : le budget doit
  // en tenir compte, sinon une seule branche peut mettre tous les autres locataires en pause.
  const lourdes = [
    { action: "disconnect_apply", siteDomain: ATTACHED },
    { action: "switch_domain", siteDomain: null },
  ];
  for (const cas of lourdes) {
    const h = harness({ connectEnabled: true, siteDomain: cas.siteDomain, attachment: "free" });
    await call(h, "societeA", { action: cas.action, company_id: SOC_A, domain: ATTACHED.domain });
    assert.ok(h.quotaCalls.length >= 4, `${cas.action} doit reserver plusieurs unites (recu ${h.quotaCalls.length})`);
  }

  // Un simple plan (lecture seule) ne coute qu'une unite.
  const plan = harness({ connectEnabled: true, siteDomain: ATTACHED });
  await call(plan, "societeA", { action: "disconnect_plan", company_id: SOC_A, domain: ATTACHED.domain });
  assert.equal(plan.quotaCalls.length, 1);
});

test("budget epuise : l'action lourde s'arrete des la premiere unite refusee", async () => {
  const h = harness({ connectEnabled: true, siteDomain: ATTACHED, quotaAllowed: false, quotaRefusal: "user_limit" });
  const r = await call(h, "societeA", { action: "disconnect_apply", company_id: SOC_A, domain: ATTACHED.domain });
  assert.deepEqual([r.body.result.status, r.body.result.reason], ["unavailable", "rate_limited"]);
  assert.equal(h.quotaCalls.length, 1, "inutile de consommer le reste du budget");
  assert.ok(!h.connectCalls.includes("releaseSiteDomain"));
});
