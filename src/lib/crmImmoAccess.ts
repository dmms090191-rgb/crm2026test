/*
 * Droit d'ouvrir le module CRM Immo : le modele PUR, sans reseau ni React.
 * Testable avec node --test (voir scripts/crm-immo/acces.test.ts).
 *
 * ---------- POURQUOI QUATRE ETATS ET NON UN BOOLEEN ----------
 *
 * Un booleen force a choisir une valeur de depart, et les deux sont fausses :
 *
 *   - partir de FALSE fait clignoter un refus chez un ayant droit, le temps de
 *     l'aller-retour reseau. Pire : la barre laterale afficherait l'onglet une
 *     fraction de seconde apres l'avoir cache, et une validation de l'ordre des
 *     onglets pendant cette fenetre enregistrerait une configuration SANS
 *     CRM Immo (voir sidebarLayout : un item absent du blob revient ensuite en
 *     FIN de liste, hors de son compartiment) ;
 *   - partir de TRUE monte le module avant de savoir, ce que David a exclu.
 *
 * D'ou 'inconnu', qui n'est NI accorde NI refuse. C'est le seul etat qui permet
 * a la barre laterale et a la Porte d'attendre, et il est distinct de 'refuse'
 * pour que l'interface ne dise jamais << vous n'avez pas acces >> alors qu'elle
 * n'en sait rien encore.
 *
 * ---------- POURQUOI UNE PANNE N'EST PAS UN REFUS ----------
 *
 * 'erreur' est separe de 'refuse' parce que les deux ne se racontent pas de la
 * meme facon : un refus est definitif et s'explique (<< ce module n'est pas
 * active pour votre societe >>), une panne est passagere et se reessaie. Les
 * deux ferment la porte — peutOuvrirCrmImmo ne repond oui que sur 'accorde' —
 * mais l'ecran doit pouvoir les distinguer.
 *
 * ---------- LA REGLE QUI COMPTE ----------
 *
 * SEUL data === true accorde. La RPC has_crm_immo_access rend un booleen, mais
 * un appel qui echoue cote PostgREST rend data = null avec une erreur, et un
 * appel sur une fonction absente rendrait data = undefined : aucun des deux ne
 * doit ouvrir. On ne teste donc jamais la verite au sens de JavaScript, on
 * compare a true.
 */

/** Ce que l'on sait du droit a un instant donne. 'inconnu' = pas encore demande ou en vol. */
export type EtatAcces = 'inconnu' | 'accorde' | 'refuse' | 'erreur';

/**
 * Traduit la reponse brute de la RPC en un etat.
 *
 * L'erreur est examinee AVANT la donnee : supabase-js rend data = null quand il
 * y a une erreur, et un null lu sans regarder l'erreur se lirait comme un refus.
 */
export function lireReponseAcces(data: unknown, error: unknown): EtatAcces {
  if (error) return 'erreur';
  return data === true ? 'accorde' : 'refuse';
}

/** Vrai uniquement sur 'accorde'. Une panne ne laisse pas entrer. */
export function peutOuvrirCrmImmo(etat: EtatAcces): boolean {
  return etat === 'accorde';
}

/**
 * Vrai des que la question a une reponse, quelle qu'elle soit.
 *
 * C'est ce que la barre laterale doit attendre avant d'enregistrer un ordre
 * d'onglets : tant que c'est faux, l'entree CRM Immo n'existe pas encore et une
 * validation ecrirait une configuration incomplete.
 */
export function accesResolu(etat: EtatAcces): boolean {
  return etat !== 'inconnu';
}

/** Vrai quand la fermeture est definitive et doit etre expliquee a l'ecran. */
export function accesRefuse(etat: EtatAcces): boolean {
  return etat === 'refuse';
}
