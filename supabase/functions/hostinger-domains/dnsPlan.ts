// Plan de raccordement DNS (module PUR : aucun reseau, aucun secret, testable avec node --test).
//
// Regle de securite du module : on ne touche QUE ce qui sert a faire pointer le site.
// Tout le reste de la zone (MX, SPF, DKIM, DMARC, NS, SOA, CAA, SRV, et tout TXT qui n'est pas
// le defi Vercel) est explicitement preserve et jamais present dans le plan d'ecriture.

/* Enregistrement tel que renvoye par GET /api/dns/v1/zones/{domain}. */
export interface ZoneRecord {
  name: string;
  type: string;
  ttl: number | null;
  contents: string[];
}

/* Configuration reellement attendue par le projet Vercel (GET /v6/domains/{domain}/config). */
export interface VercelExpectation {
  ipv4: string[];
  cname: string | null;
  misconfigured: boolean;
  configuredBy: string | null;
  /* Defi d'appartenance impose par Vercel quand le domaine est revendique ailleurs. */
  challenge: { name: string; value: string } | null;
}

export interface PlanChange {
  name: string;
  type: "A" | "CNAME" | "TXT";
  ttl: number;
  values: string[];
  /* Valeurs actuelles remplacees (vide = creation). */
  previous: string[];
  reason: string;
}

export interface PlanConflict {
  name: string;
  type: string;
  detail: string;
}

export interface DnsPlan {
  domain: string;
  changes: PlanChange[];
  /* Enregistrements de la zone volontairement laisses intacts (messagerie et autres). */
  preserved: Array<{ name: string; type: string; count: number; protected: boolean }>;
  conflicts: PlanConflict[];
  alreadyCorrect: boolean;
  /* Zone telle qu'elle est aujourd'hui : sert au rapport avant decision. */
  current: ZoneRecord[];
}

/* TTL court pendant la bascule : un retour arriere se propage vite. */
export const CONNECT_TTL = 300;
export const VERCEL_CHALLENGE_NAME = "_vercel";
/* Les seuls couples (nom, type) que Talvex s'autorise a ecrire. */
const WRITABLE = new Set(["@|A", "www|CNAME", `${VERCEL_CHALLENGE_NAME}|TXT`]);
/* Types qui portent la messagerie ou la delegation : jamais ecrits, jamais remplaces. */
const PROTECTED_TYPES = new Set(["MX", "TXT", "NS", "SOA", "CAA", "SRV", "AAAA", "ALIAS"]);

const normalizeName = (raw: string, domain: string): string => {
  const value = raw.trim().toLowerCase().replace(/\.$/, "");
  if (value === "" || value === "@" || value === domain) return "@";
  return value.endsWith(`.${domain}`) ? value.slice(0, -(domain.length + 1)) : value;
};

const sameValues = (a: string[], b: string[]): boolean => {
  const norm = (list: string[]) => [...new Set(list.map((v) => v.trim().toLowerCase().replace(/\.$/, "")))].sort();
  const left = norm(a);
  const right = norm(b);
  return left.length === right.length && left.every((v, i) => v === right[i]);
};

export function parseZone(data: unknown, domain: string): ZoneRecord[] | null {
  if (!Array.isArray(data)) return null;
  const rows: ZoneRecord[] = [];
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as { name?: unknown; type?: unknown; ttl?: unknown; records?: unknown };
    if (typeof row.name !== "string" || typeof row.type !== "string") continue;
    const contents = Array.isArray(row.records)
      ? row.records.map((r) => (typeof r === "object" && r !== null ? (r as { content?: unknown }).content : null))
        .filter((c): c is string => typeof c === "string")
      : [];
    rows.push({
      name: normalizeName(row.name, domain),
      type: row.type.toUpperCase(),
      ttl: typeof row.ttl === "number" && Number.isSafeInteger(row.ttl) ? row.ttl : null,
      contents,
    });
  }
  return rows;
}

const find = (zone: ZoneRecord[], name: string, type: string) => zone.find((r) => r.name === name && r.type === type) ?? null;

/*
 * Plan minimal : l'apex vers l'IP attendue par Vercel, www vers le CNAME du projet, et le TXT de defi
 * seulement si Vercel le demande. Aucune valeur n'est ecrite en dur : tout vient de `expected`.
 */
export function planDnsChanges(domain: string, zone: ZoneRecord[], expected: VercelExpectation): DnsPlan {
  const changes: PlanChange[] = [];
  const conflicts: PlanConflict[] = [];

  const apexA = find(zone, "@", "A");
  if (expected.ipv4.length > 0 && !sameValues(apexA?.contents ?? [], expected.ipv4)) {
    changes.push({
      name: "@", type: "A", ttl: CONNECT_TTL, values: expected.ipv4, previous: apexA?.contents ?? [],
      reason: apexA ? "adresse du site mise a jour" : "adresse du site ajoutee",
    });
  }
  if (expected.ipv4.length === 0) {
    conflicts.push({ name: "@", type: "A", detail: "Vercel n'a pas fourni d'adresse attendue pour ce domaine." });
  }

  const wwwCname = find(zone, "www", "CNAME");
  if (expected.cname && !sameValues(wwwCname?.contents ?? [], [expected.cname])) {
    changes.push({
      name: "www", type: "CNAME", ttl: CONNECT_TTL, values: [expected.cname], previous: wwwCname?.contents ?? [],
      reason: wwwCname ? "adresse www mise a jour" : "adresse www ajoutee",
    });
  }

  if (expected.challenge) {
    const name = normalizeName(expected.challenge.name, domain);
    const existing = find(zone, name, "TXT");
    const already = (existing?.contents ?? []).some((c) => c.replace(/^"|"$/g, "") === expected.challenge!.value);
    if (!already) {
      /*
       * Un TXT porte PLUSIEURS valeurs (preuves d'autres services, verifications tierces) et l'ecriture
       * remplace tout le couple (nom, type) : on ajoute donc la preuve demandee AUX valeurs existantes,
       * jamais a leur place. Sans cela, raccorder un domaine detruirait la preuve d'un autre service.
       */
      const kept = (existing?.contents ?? []).map((c) => c.replace(/^"|"$/g, "")).filter((c) => c !== "");
      changes.push({
        name, type: "TXT", ttl: CONNECT_TTL,
        values: [...new Set([...kept, expected.challenge.value])],
        previous: existing?.contents ?? [],
        reason: kept.length > 0 ? "preuve de propriete ajoutee aux valeurs existantes" : "preuve de propriete demandee par Vercel",
      });
    }
  }

  // Conflits connus, signales mais JAMAIS corriges automatiquement.
  const apexCname = find(zone, "@", "CNAME");
  if (apexCname) conflicts.push({ name: "@", type: "CNAME", detail: "Un CNAME a la racine empeche les autres enregistrements (RFC 1034)." });
  for (const name of ["@", "www"]) {
    if (find(zone, name, "AAAA")) conflicts.push({ name, type: "AAAA", detail: "Vercel ne prend pas en charge l'IPv6 : cet enregistrement doit etre retire a la main." });
  }
  const wwwA = find(zone, "www", "A");
  if (wwwA && expected.cname) conflicts.push({ name: "www", type: "A", detail: "Un A sur www coexisterait avec le CNAME : a retirer a la main." });
  const caa = find(zone, "@", "CAA");
  if (caa && !caa.contents.some((c) => c.toLowerCase().includes("letsencrypt.org"))) {
    conflicts.push({ name: "@", type: "CAA", detail: "Les CAA existants n'autorisent pas Let's Encrypt : le certificat sera refuse." });
  }
  const stale = zone.find((r) => r.type === "TXT" && r.name.startsWith("_acme-challenge"));
  if (stale) conflicts.push({ name: stale.name, type: "TXT", detail: "Ancien defi de certificat laisse par un autre hebergeur : a retirer a la main." });

  /*
   * Preserve = TOUT ce qui n'est pas dans le plan d'ecriture. L'ecriture ne remplace que les couples
   * (nom, type) envoyes : tout le reste de la zone, messagerie comprise (MX, SPF, DKIM, DMARC,
   * autodiscover, autoconfig), reste tel quel. On l'enumere entierement, sans filtre par type.
   */
  const written = new Set(changes.map((c) => `${c.name}|${c.type}`));
  const preserved = zone
    .filter((r) => !written.has(`${r.name}|${r.type}`))
    .map((r) => ({ name: r.name, type: r.type, count: r.contents.length, protected: PROTECTED_TYPES.has(r.type) }));

  return { domain, changes, preserved, conflicts, alreadyCorrect: changes.length === 0, current: zone };
}

/*
 * Corps de la requete d'ecriture. Garde-fou final AVANT tout appel reseau : si une entree sort de la
 * liste blanche, on n'ecrit rien du tout (aucune ecriture partielle, aucun risque pour la messagerie).
 */
export function buildZonePayload(plan: DnsPlan): { overwrite: boolean; zone: Array<{ name: string; type: string; ttl: number; records: Array<{ content: string }> }> } | null {
  if (plan.changes.length === 0) return null;
  for (const change of plan.changes) {
    if (!WRITABLE.has(`${change.name}|${change.type}`)) return null;
    if (change.values.length === 0) return null;
  }
  return {
    // overwrite ne remplace QUE les enregistrements de meme nom ET meme type que ceux envoyes ici.
    overwrite: true,
    zone: plan.changes.map((change) => ({
      name: change.name,
      type: change.type,
      ttl: change.ttl,
      records: change.values.map((content) => ({ content })),
    })),
  };
}
