/**
 * Identite affichee dans une ligne de notification — REGLE UNIQUE.
 *
 * Deux niveaux :
 *   ligne 1 (`name`)     -> le responsable
 *   ligne 2 (`subtitle`) -> l'entite (Societe ou Groupe), plus discrete
 *
 * Sans responsable, l'entite devient la ligne principale et il n'y a pas de
 * secondaire : jamais de ligne vide.
 *
 * Un identifiant technique — user id, admin_id, super_admin_id, company_id,
 * UUID — n'est JAMAIS un libelle. Cette fonction ne lit que des champs humains
 * et, en dernier recours, retourne le mot fourni par l'appelant.
 *
 * Utilisee par le panel Groupe (Societe -> Groupe) et par le panel Talvex
 * (Societe/Groupe -> Talvex) : une seule regle, un seul rendu.
 */

/** Fiche d'annuaire. Champs humains uniquement — aucun id n'est accepte ici. */
export interface IdentitySource {
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
}

export interface DisplayIdentity {
  name: string;
  subtitle: string;
}

export function conversationIdentity(
  /** Fiche d'annuaire, quand elle est chargee. */
  directory: IdentitySource | undefined,
  /** Depannage tant que l'annuaire n'est pas la. Meme provenance, meme personne. */
  fallback: IdentitySource,
  /**
   * Nature de l'interlocuteur : « Groupe » ou « Société ».
   * Sert a prefixer la ligne secondaire — « Groupe : Willness » — et de mot
   * lisible de dernier recours quand plus rien n'est connu.
   */
  entityLabel: string,
): DisplayIdentity {
  // Une source gagne EN ENTIER : jamais le prenom de l'une avec le nom de
  // l'autre. L'annuaire prime, le depannage ne sert que s'il est muet.
  const responsable =
    [directory?.first_name, directory?.last_name].filter(Boolean).join(' ') ||
    [fallback.first_name, fallback.last_name].filter(Boolean).join(' ');

  const entite = directory?.company || fallback.company || '';

  // Le prefixe n'existe que s'il y a un nom a prefixer : jamais « Groupe : »
  // tout seul. Et il ne s'applique qu'a la ligne SECONDAIRE : quand l'entite
  // remonte en ligne principale, elle reste nue.
  if (responsable) return { name: responsable, subtitle: entite ? `${entityLabel} : ${entite}` : '' };
  if (entite) return { name: entite, subtitle: '' };
  return { name: directory?.email || fallback.email || entityLabel, subtitle: '' };
}
