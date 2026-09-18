// Plan de LIBERATION DNS (module PUR : aucun reseau, aucun secret, testable avec node --test).
//
// Defaire proprement ce que Talvex a pose, et RIEN d'autre :
// - on ne touche qu'aux couples (nom, type) que Talvex a reellement ecrits, memorises au raccordement ;
// - avant d'agir, on verifie que la valeur actuelle est encore EXACTEMENT celle posee par Talvex ;
//   si quelqu'un l'a changee a la main depuis, c'est un CONFLIT : on s'arrete, on ne l'ecrase pas ;
// - un enregistrement qui existait AVANT Talvex est remis a sa valeur d'origine ;
// - un enregistrement cree par Talvex (aucune valeur d'origine) est retire ;
// - sans memoire fiable de ce que Talvex a ecrit, on ne touche a AUCUN enregistrement.
//
// La messagerie (MX, SPF, DKIM, DMARC) et tout le reste de la zone ne figurent jamais dans un plan :
// ils ne sont pas dans la liste blanche, donc ils ne peuvent ni etre ecrits, ni etre retires.
import { parseZone, type ZoneRecord } from "./dnsPlan.ts";

/* Les SEULS couples (nom, type) que Talvex s'autorise a defaire : exactement ceux qu'il sait ecrire. */
const RELEASABLE = new Set(["@|A", "www|CNAME", "_vercel|TXT"]);
/* TTL de repli quand la zone d'origine n'a pas ete retrouvee (valeur courante par defaut chez Hostinger). */
const FALLBACK_TTL = 14400;

/* Un enregistrement pose par Talvex, tel que memorise dans technical_details.dns_applied. */
export interface WrittenRecord {
  name: string;
  type: string;
  /* Valeurs posees par Talvex. */
  values: string[];
  /* Valeurs presentes AVANT Talvex (vide = l'enregistrement n'existait pas). */
  previous: string[];
}

export interface ReleaseRestore {
  name: string;
  type: string;
  ttl: number;
  values: string[];
  /* Valeurs posees par Talvex, remplacees par la restauration. */
  removed: string[];
}

export interface ReleaseConflict {
  name: string;
  type: string;
  detail: string;
}

export interface ReleasePlan {
  domain: string;
  /* Remis a la valeur d'avant Talvex. */
  restore: ReleaseRestore[];
  /* Cree par Talvex, donc retire. */
  remove: Array<{ name: string; type: string; values: string[] }>;
  /* Deja disparu ou deja revenu a l'origine : rien a faire. */
  alreadyClean: Array<{ name: string; type: string }>;
  /* Tout le reste de la zone, laisse intact (messagerie comprise). */
  keep: Array<{ name: string; type: string; count: number }>;
  /* Modifie a la main depuis le raccordement : on ne l'ecrase jamais. */
  conflicts: ReleaseConflict[];
  /* Aucune memoire fiable de ce que Talvex a ecrit : aucune action DNS ne sera tentee. */
  historyMissing: boolean;
  nothingToDo: boolean;
}

const normalizeValue = (value: string): string => value.trim().toLowerCase().replace(/\.$/, "").replace(/^"|"$/g, "");

const sameValues = (a: string[], b: string[]): boolean => {
  const norm = (list: string[]) => [...new Set(list.map(normalizeValue))].sort();
  const left = norm(a);
  const right = norm(b);
  return left.length === right.length && left.every((v, i) => v === right[i]);
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

/*
 * Memoire de ce que Talvex a ecrit : technical_details.dns_applied (dernier plan reellement applique).
 * Toute forme inattendue renvoie null : sans memoire sure, on ne touche a rien.
 */
export function readWrittenRecords(details: unknown): WrittenRecord[] | null {
  if (typeof details !== "object" || details === null) return null;
  const applied = (details as { dns_applied?: unknown }).dns_applied;
  if (!Array.isArray(applied) || applied.length === 0) return null;
  const rows: WrittenRecord[] = [];
  for (const item of applied) {
    if (typeof item !== "object" || item === null) return null;
    const row = item as { name?: unknown; type?: unknown; values?: unknown; previous?: unknown };
    if (typeof row.name !== "string" || typeof row.type !== "string") return null;
    if (!isStringArray(row.values) || row.values.length === 0) return null;
    const previous = row.previous === undefined ? [] : row.previous;
    if (!isStringArray(previous)) return null;
    rows.push({ name: row.name, type: row.type.toUpperCase(), values: row.values, previous });
  }
  return rows;
}

/* Zone complete sauvegardee juste avant la premiere ecriture (technical_details.dns_backup.zone). */
export function readBackupZone(details: unknown, domain: string): ZoneRecord[] | null {
  if (typeof details !== "object" || details === null) return null;
  const backup = (details as { dns_backup?: unknown }).dns_backup;
  if (typeof backup !== "object" || backup === null) return null;
  return parseZone((backup as { zone?: unknown }).zone, domain);
}

const find = (zone: ZoneRecord[], name: string, type: string) =>
  zone.find((r) => r.name === name && r.type === type) ?? null;

/*
 * Plan de liberation. `written` vient de readWrittenRecords (null = aucune memoire), `backup` sert
 * uniquement a retrouver le TTL d'origine ; les valeurs d'origine viennent de `previous`, enregistre
 * au moment meme de l'ecriture.
 */
export function planDnsRelease(
  domain: string,
  currentZone: ZoneRecord[],
  written: WrittenRecord[] | null,
  backup: ZoneRecord[] | null,
): ReleasePlan {
  const plan: ReleasePlan = {
    domain, restore: [], remove: [], alreadyClean: [], keep: [], conflicts: [],
    historyMissing: written === null, nothingToDo: true,
  };

  if (written !== null) {
    for (const record of written) {
      const key = `${record.name}|${record.type}`;
      if (!RELEASABLE.has(key)) {
        // Ne devrait jamais arriver (l'ecriture applique la meme liste blanche) : on bloque par prudence.
        plan.conflicts.push({ name: record.name, type: record.type, detail: "Enregistrement hors du perimetre de Talvex." });
        continue;
      }
      const current = find(currentZone, record.name, record.type);
      if (!current) {
        plan.alreadyClean.push({ name: record.name, type: record.type });
        continue;
      }
      if (!sameValues(current.contents, record.values)) {
        // Valeur changee depuis le raccordement : c'est le choix de quelqu'un d'autre, on n'y touche pas.
        if (sameValues(current.contents, record.previous)) {
          plan.alreadyClean.push({ name: record.name, type: record.type });
        } else {
          plan.conflicts.push({
            name: record.name, type: record.type,
            detail: "Cet enregistrement a ete modifie a la main depuis le raccordement : Talvex ne l'ecrase pas.",
          });
        }
        continue;
      }
      if (record.previous.length > 0) {
        const origin = backup ? find(backup, record.name, record.type) : null;
        plan.restore.push({
          name: record.name, type: record.type,
          ttl: origin?.ttl ?? FALLBACK_TTL,
          values: record.previous, removed: record.values,
        });
      } else {
        plan.remove.push({ name: record.name, type: record.type, values: record.values });
      }
    }
  }

  const touched = new Set([
    ...plan.restore.map((r) => `${r.name}|${r.type}`),
    ...plan.remove.map((r) => `${r.name}|${r.type}`),
  ]);
  plan.keep = currentZone
    .filter((r) => !touched.has(`${r.name}|${r.type}`))
    .map((r) => ({ name: r.name, type: r.type, count: r.contents.length }));

  plan.nothingToDo = plan.restore.length === 0 && plan.remove.length === 0;
  return plan;
}

/*
 * Corps de la remise a l'etat d'origine (PUT cible). Garde-fou final AVANT tout appel reseau :
 * une seule entree hors liste blanche et on n'ecrit rien du tout.
 */
export function buildRestorePayload(plan: ReleasePlan): { overwrite: boolean; zone: Array<{ name: string; type: string; ttl: number; records: Array<{ content: string }> }> } | null {
  if (plan.conflicts.length > 0 || plan.restore.length === 0) return null;
  for (const item of plan.restore) {
    if (!RELEASABLE.has(`${item.name}|${item.type}`)) return null;
    if (item.values.length === 0) return null;
  }
  return {
    // overwrite ne remplace QUE les enregistrements de meme nom ET meme type que ceux envoyes ici.
    overwrite: true,
    zone: plan.restore.map((item) => ({
      name: item.name,
      type: item.type,
      ttl: item.ttl,
      records: item.values.map((content) => ({ content })),
    })),
  };
}

/*
 * Corps du retrait cible (suppression d'enregistrements DNS, JAMAIS du domaine).
 * Garde-fous : jamais de liste vide (qui viderait la zone), jamais un couple hors liste blanche,
 * jamais rien tant qu'un conflit existe.
 */
export function buildDeletePayload(plan: ReleasePlan): { filters: Array<{ name: string; type: string }> } | null {
  if (plan.conflicts.length > 0 || plan.remove.length === 0) return null;
  for (const item of plan.remove) {
    if (!RELEASABLE.has(`${item.name}|${item.type}`)) return null;
  }
  return { filters: plan.remove.map((item) => ({ name: item.name, type: item.type })) };
}

/*
 * Verification d'apres coup : tout ce qui devait etre preserve est-il toujours la, ENTIEREMENT ?
 * On compare la presence du couple (nom, type) ET le nombre de valeurs : perdre une seule adresse de
 * messagerie sur deux (mx2 par exemple) doit se voir autant que perdre l'enregistrement entier.
 * La liste renvoyee doit toujours etre vide.
 */
export function missingAfterRelease(plan: ReleasePlan, zoneAfter: ZoneRecord[]): Array<{ name: string; type: string }> {
  return plan.keep
    .filter((item) => {
      const after = find(zoneAfter, item.name, item.type);
      return !after || after.contents.length < item.count;
    })
    .map((item) => ({ name: item.name, type: item.type }));
}
