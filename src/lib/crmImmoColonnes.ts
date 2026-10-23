import type { ColonneImmo, DefinitionSysteme, TypeColonne } from '../pages/admin/views/crm-immo/crmImmoTypes';

/*
 * L'ordre et la visibilite des colonnes du tableau CRM Immo — module PUR.
 * Testable avec node --test (voir scripts/crm-immo/colonnes.test.ts).
 *
 * ---------- DEUX FAMILLES DANS UN SEUL TABLEAU ----------
 *
 * Les colonnes SYSTEME sont de vraies colonnes de crm_immo_dossiers : elles n'ont ni
 * id, ni position, ni drapeau `masquee` en base. Les colonnes PERSONNALISEES sont des
 * lignes de crm_immo_colonnes et portent les trois.
 *
 * Consequence directe, et c'est une PROTECTION et non une limite : une colonne systeme
 * ne peut pas etre supprimee, parce qu'il n'y a rien a supprimer. Aucun drapeau a
 * contourner, aucun bouton a desactiver par discipline.
 *
 * L'ordre et le masquage des colonnes SYSTEME vivent donc cote navigateur
 * (localStorage), comme le font deja les quatre autres CRM du depot. Celui des colonnes
 * PERSONNALISEES vit en base, ou il est partage par toute la Societe.
 *
 * ---------- POURQUOI position N'EST PAS UNIQUE EN BASE ----------
 *
 * Un glisser-deposer echange deux positions, et l'echange passe par un etat transitoire
 * en doublon. Avec une contrainte unique non differee, le premier deplacement
 * echouerait. La contrepartie est qu'il faut TOUJOURS lire
 * << ORDER BY position, created_at >> : avec `position` seul, deux colonnes de meme rang
 * s'echangeraient a chaque rechargement, et l'utilisateur verrait son tableau bouger
 * tout seul. Le COMMENT de la colonne le dit en base ; ce module l'applique.
 */

/** Une colonne telle que le tableau la manipule, les deux familles reunies. */
export type Colonne =
  | {
    famille: 'systeme'; cle: string; nom: string; type: TypeColonne;
    masquee: boolean; masquable: boolean;
    /** Les deux champs reels qu'une colonne composee reunit a l'affichage. */
    composeDe?: readonly [string, string];
    /** La liste fermee des valeurs, quand la colonne en a une. */
    choix?: readonly { valeur: string; libelle: string }[];
  }
  | { famille: 'perso'; id: string; nom: string; type: TypeColonne; masquee: boolean; masquable: true };

/** Ce que le navigateur retient : l'ordre des cles systeme et celles qui sont masquees. */
export interface ReglageLocal {
  ordreSysteme: string[];
  masqueesSysteme: string[];
}

export const REGLAGE_VIDE: ReglageLocal = { ordreSysteme: [], masqueesSysteme: [] };

/** La cle de rangement, par Societe : deux Societes ne partagent pas leur mise en page. */
export function cleReglage(companyId: string | null): string {
  return `talvex_crm_immo_colonnes_${companyId ?? 'none'}`;
}

/**
 * Trie les colonnes personnalisees : position PUIS created_at.
 *
 * Le second critere n'est pas cosmetique. `position` n'etant volontairement pas unique,
 * deux colonnes de meme rang auraient sinon un ordre decide par Postgres, donc
 * susceptible de changer d'une lecture a l'autre.
 */
export function trierPerso(perso: ColonneImmo[]): ColonneImmo[] {
  return [...perso].sort((a, b) => a.position - b.position
    || a.created_at.localeCompare(b.created_at)
    || a.id.localeCompare(b.id));
}

/**
 * Les colonnes systeme dans l'ordre memorise, suivies de celles que le reglage ne
 * connait pas encore.
 *
 * Une colonne systeme ajoutee plus tard au code apparait donc a la FIN, visible, chez
 * une Societe qui avait deja range son tableau — et non pas absente.
 */
export function ordonnerSysteme(systeme: DefinitionSysteme[], reglage: ReglageLocal): DefinitionSysteme[] {
  const parCle = new Map(systeme.map(d => [d.cle as string, d]));
  const vues = new Set<string>();
  const ordonnees: DefinitionSysteme[] = [];
  for (const cle of reglage.ordreSysteme) {
    const d = parCle.get(cle);
    if (d && !vues.has(cle)) { ordonnees.push(d); vues.add(cle); }
  }
  for (const d of systeme) if (!vues.has(d.cle as string)) ordonnees.push(d);
  return ordonnees;
}

/** La liste complete, systeme puis personnalisees, chacune avec son etat de masquage. */
export function toutesLesColonnes(params: {
  systeme: DefinitionSysteme[];
  perso: ColonneImmo[];
  reglage: ReglageLocal;
}): Colonne[] {
  const { systeme, perso, reglage } = params;
  const masquees = new Set(reglage.masqueesSysteme);
  const sys: Colonne[] = ordonnerSysteme(systeme, reglage).map(d => ({
    famille: 'systeme',
    cle: d.cle as string,
    nom: d.libelle,
    type: d.type,
    /* `nom` n'est jamais masquable : un reglage qui le pretendrait est ignore,
       pas obei. Sans ca, un localStorage bricole a la main viderait le tableau
       de ce qui identifie ses lignes. */
    masquee: d.masquable && masquees.has(d.cle as string),
    masquable: d.masquable,
    composeDe: d.composeDe,
    choix: d.choix,
  }));
  const pers: Colonne[] = trierPerso(perso).map(c => ({
    famille: 'perso', id: c.id, nom: c.nom, type: c.type, masquee: c.masquee, masquable: true,
  }));
  return [...sys, ...pers];
}

/** Celles qui s'affichent reellement. */
export function colonnesVisibles(colonnes: Colonne[]): Colonne[] {
  return colonnes.filter(c => !c.masquee);
}

/** L'identifiant stable d'une colonne, toutes familles confondues. */
export function cleColonne(c: Colonne): string {
  return c.famille === 'systeme' ? c.cle : c.id;
}

/** Une colonne systeme ne peut pas etre supprimee : il n'y a rien a supprimer. */
export function peutSupprimer(c: Colonne): boolean {
  return c.famille === 'perso';
}

/** `nom` excepte, tout peut etre masque. */
export function peutMasquer(c: Colonne): boolean {
  return c.masquable;
}

/** Deplace un element, en rendant un NOUVEAU tableau. */
export function deplacer<T>(liste: T[], de: number, vers: number): T[] {
  if (de === vers || de < 0 || vers < 0 || de >= liste.length || vers >= liste.length) return liste;
  const copie = [...liste];
  const [pris] = copie.splice(de, 1);
  copie.splice(vers, 0, pris);
  return copie;
}

/**
 * Les LIGNES ENTIERES a reecrire apres un reordonnancement des colonnes personnalisees.
 *
 * On rend des positions 0..n-1 sans trou : un upsert partiel laisserait des rangs
 * incoherents, et comme `position` n'est pas unique, la base ne s'en plaindrait pas.
 * On ne rend que ce qui a REELLEMENT change, pour ne pas reecrire tout le tableau a
 * chaque petit deplacement.
 */
export function positionsApres(perso: ColonneImmo[]): ColonneImmo[] {
  return perso
    .map((c, i) => (c.position === i ? null : { ...c, position: i }))
    .filter((c): c is ColonneImmo => c !== null);
}

/**
 * Un nom de colonne personnalisee est-il deja pris ?
 *
 * Meme regle que l'index unique de la base — (company_id, lower(btrim(nom))) — afin de
 * refuser AVANT l'aller-retour, avec un message clair, plutot que de laisser remonter un
 * 23505 incomprehensible.
 */
export function nomDejaPris(nom: string, perso: ColonneImmo[], saufId?: string): boolean {
  const n = nom.trim().toLowerCase();
  if (!n) return false;
  return perso.some(c => c.id !== saufId && c.nom.trim().toLowerCase() === n);
}

/**
 * Un nom de colonne personnalisee heurte-t-il un libelle systeme ?
 *
 * La base ne l'interdit pas — les colonnes systeme n'y sont pas des lignes — mais deux
 * en-tetes identiques dans le meme tableau sont un defaut d'interface.
 */
export function nomHeurteSysteme(nom: string, systeme: DefinitionSysteme[]): boolean {
  const n = nom.trim().toLowerCase();
  if (!n) return false;
  return systeme.some(d => d.libelle.trim().toLowerCase() === n);
}
