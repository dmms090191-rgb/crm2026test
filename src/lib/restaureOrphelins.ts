import type { FkRule } from '../pages/admin/views/sauvegarde/restoreConstants';

/**
 * ECARTER LES LIGNES DONT LE PARENT N'EXISTE PAS, AVANT DE LES ENVOYER.
 *
 * ---------- CE QUI SE PASSAIT AVANT ----------
 *
 * FK_RULES existait deja, mais il ne servait qu'a PREVENIR : validateFkCoherence
 * fabriquait des `fkWarnings` affiches dans le rapport, et la boucle d'insertion envoyait
 * ensuite les lignes telles quelles. Une ligne orpheline partait donc quand meme, et
 * Postgres la refusait en 23503.
 *
 * Et le degat ne s'arretait pas a cette ligne : l'envoi se fait par LOTS. Une seule
 * orpheline fait echouer tout son lot — jusqu'a cent lignes parfaitement valides perdues
 * avec elle, et un message Postgres brut dans le rapport.
 *
 * ---------- POURQUOI UNE FONCTION PURE ----------
 *
 * Elle vit hors du hook, sans React, sans Supabase, sans navigateur. C'est ce qui la rend
 * EPROUVABLE : les cas qui comptent — dossier present, dossier absent, valeur nulle,
 * restauration partielle — se verifient en memoire, en millisecondes, dans l'integration
 * continue. Enfermee dans le hook, elle n'aurait pu se prouver qu'a la main.
 *
 * ---------- CE QU'ELLE NE FAIT PAS ----------
 *
 * Elle n'ecarte que sur les regles OBLIGATOIRES. Pour une regle `optional`, la colonne
 * accepte NULL : la bonne reparation serait de VIDER la colonne, pas de jeter la ligne —
 * et vider une colonne est une modification de donnee que personne n'a demandee. Ces
 * regles gardent donc leur comportement d'avertissement.
 */

export interface TriOrphelins<T> {
  /** Les lignes dont tous les parents obligatoires existent. */
  gardees: T[];
  /** Les lignes ecartees, pour que le rapport puisse les nommer. */
  ignorees: T[];
  /** Les identifiants parents introuvables, sans doublon : de quoi expliquer l'ecart. */
  parentsManquants: string[];
}

/**
 * @param lignes            Les lignes de la sauvegarde pour UNE table.
 * @param regles            Les regles FK de cette table.
 * @param parentsPresents   Par table referencee, l'ensemble des identifiants qui existent
 *                          REELLEMENT a destination. Pas ceux de la sauvegarde : une
 *                          restauration partielle pose des etats sur des dossiers deja en
 *                          place, et les juger sur le fichier les declarerait orphelins a
 *                          tort.
 */
export function ecarterOrphelins<T extends Record<string, unknown>>(
  lignes: T[],
  regles: FkRule[],
  parentsPresents: Record<string, Set<string>>,
): TriOrphelins<T> {
  const obligatoires = regles.filter(r => !r.optional);
  if (obligatoires.length === 0) {
    return { gardees: lignes, ignorees: [], parentsManquants: [] };
  }

  const gardees: T[] = [];
  const ignorees: T[] = [];
  const manquants = new Set<string>();

  for (const ligne of lignes) {
    let orpheline = false;

    for (const regle of obligatoires) {
      const valeur = ligne[regle.column];

      /* Une valeur nulle sur une colonne obligatoire n'est pas une orpheline : c'est une
         ligne que la base refusera pour une AUTRE raison (NOT NULL), et la masquer ici
         cacherait le vrai probleme. On la laisse passer et echouer bruyamment. */
      if (valeur === null || valeur === undefined) continue;

      const connus = parentsPresents[regle.referencedTable];
      /* Table parente jamais interrogee : on ne sait pas, donc on ne jette pas. Juger
         sans savoir ecarterait des lignes valides, ce qui est pire qu'un 23503 visible. */
      if (!connus) continue;

      if (!connus.has(String(valeur))) {
        orpheline = true;
        manquants.add(String(valeur));
      }
    }

    if (orpheline) ignorees.push(ligne);
    else gardees.push(ligne);
  }

  return { gardees, ignorees, parentsManquants: [...manquants] };
}

/**
 * Les valeurs de cle etrangere qu'il faudra verifier a destination, sans doublon.
 *
 * Separee pour que l'appelant n'ait pas a la reecrire : c'est elle qui decide ce qu'on
 * demande a la base, et une liste trop large couterait un aller-retour pour rien.
 */
export function valeursAVerifier<T extends Record<string, unknown>>(
  lignes: T[],
  regles: FkRule[],
): Record<string, string[]> {
  const par: Record<string, Set<string>> = {};
  for (const regle of regles.filter(r => !r.optional)) {
    const set = par[regle.referencedTable] ?? new Set<string>();
    for (const l of lignes) {
      const v = l[regle.column];
      if (v !== null && v !== undefined) set.add(String(v));
    }
    par[regle.referencedTable] = set;
  }
  const out: Record<string, string[]> = {};
  for (const [table, set] of Object.entries(par)) out[table] = [...set];
  return out;
}
