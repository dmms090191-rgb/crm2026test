/**
 * CE QUE DIT UNE ECRITURE DE MODE DE PAIEMENT — garder, ou revenir en arriere.
 *
 * ---------- POURQUOI CETTE DECISION VIT ICI, ET PAS DANS LE HOOK ----------
 *
 * Elle tient en quatre cas, et chacun a deja coute un defaut dans ce module :
 *
 *   1. une erreur Postgres brute, illisible pour une gestionnaire immobiliere ;
 *   2. la contrainte CHECK, qui se reconnait a son nom et merite une phrase claire ;
 *   3. ZERO ligne rendue sans erreur — un UPDATE refuse par la RLS ressemble a un
 *      succes, et c'est le piege le plus cher du depot ;
 *   4. une ligne rendue : c'est enregistre.
 *
 * Dans le hook, ces quatre cas seraient melanges a du setState, a un useCallback et a
 * supabase — donc intestables sans faux client. Ici, c'est une fonction qui prend une
 * reponse et rend une decision : les quatre cas se verifient pour de vrai.
 *
 * Elle ne connait ni React, ni supabase, ni le nom de la table. Elle ne DECIDE pas non
 * plus de remettre l'ancienne valeur : elle dit s'il faut le faire. C'est l'appelant qui
 * touche a l'etat.
 */

/** Le nom de la contrainte CHECK posee par la migration 20261023000021. */
const CONTRAINTE = /mode_paiement_connu/;

export interface ReponseEcriture {
  /** Le message d'erreur rendu par Supabase, ou null s'il n'y en a pas eu. */
  message: string | null;
  /**
   * Le NOMBRE de lignes rendues par le `.select()` qui termine l'UPDATE.
   *
   * Zero n'est pas un detail : c'est la forme que prend un refus de la RLS, qui ne leve
   * aucune erreur. Omettre le `.select()` reviendrait a ne jamais pouvoir distinguer un
   * enregistrement d'un refus.
   */
  lignes: number;
}

export interface DecisionEcriture {
  /** Vrai quand l'affichage optimiste doit retrouver sa valeur d'avant. */
  revenirEnArriere: boolean;
  /** La phrase a montrer, ou null quand c'est enregistre. */
  erreur: string | null;
}

export function decisionEcriture(r: ReponseEcriture): DecisionEcriture {
  if (r.message !== null) {
    return {
      revenirEnArriere: true,
      erreur: CONTRAINTE.test(r.message)
        ? 'Ce mode de paiement n’est pas accepté. Choisissez Chèque, Espèces ou Virement.'
        : `Le mode de paiement n’a pas pu être enregistré : ${r.message}`,
    };
  }
  if (r.lignes === 0) {
    return {
      revenirEnArriere: true,
      erreur: 'Modification refusée : droits insuffisants ou dossier introuvable.',
    };
  }
  return { revenirEnArriere: false, erreur: null };
}
