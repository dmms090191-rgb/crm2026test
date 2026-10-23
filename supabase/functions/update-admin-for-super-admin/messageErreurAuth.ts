/**
 * CE QUE DIT UNE ERREUR DE L'API ADMIN, EN FRANCAIS ET AVEC LE BON STATUT.
 * Test :  node --test supabase/functions/update-company-super-admin/messageErreurAuth.test.ts
 *
 * ---------- POURQUOI CE MODULE EXISTE ----------
 *
 * Le 23 octobre 2026, modifier l'email d'un Groupe deja pris par un autre compte
 * affichait « Error updating user » dans une interface francaise. Ce texte n'existe
 * nulle part dans le depot : c'est le message interne de GoTrue, relaye verbatim par
 * sept Edge Functions a treize endroits. Le journal Auth, lui, disait la verite :
 *
 *     ERROR: duplicate key value violates unique constraint
 *     "users_email_partial_key" (SQLSTATE 23505)
 *
 * Un conflit d'unicite n'est pas une panne : c'est une saisie a corriger. Il doit donc
 * rendre une PHRASE UTILISABLE et un statut 409, pas un 500 opaque.
 *
 * ---------- POURQUOI UN MODULE PUR, ET NON UN `if` DANS CHAQUE FONCTION ----------
 *
 * Deux Edge Functions ecrivent un email (un Groupe, une Societe). La meme situation doit
 * y rendre le MEME mot : deux `if` ecrits separement finissent par diverger, et
 * l'utilisateur apprend alors deux vocabulaires pour un seul defaut. Ici, la decision
 * est une fonction, et elle se teste sans Supabase ni reseau.
 *
 * ---------- CE FICHIER EST EN MIROIR ----------
 *
 * Les Edge Functions tournent en Deno et ne peuvent pas importer depuis `src/`. Ce
 * module existe donc a l'identique dans les deux dossiers de fonction, et un test
 * compare les deux copies par empreinte : une divergence rend le test ROUGE.
 */

/** Ce qu'il faut repondre au navigateur. */
export interface ReponseErreur {
  /** La phrase montree a l'utilisateur. Francaise, et actionnable. */
  message: string;
  /** Le statut HTTP qui correspond VRAIMENT a la situation. */
  statut: number;
  /**
   * Vrai quand la cause est une saisie a corriger, et non une panne.
   *
   * L'appelant s'en sert pour decider s'il faut conserver ce qui a deja ete
   * enregistre : un conflit d'email ne doit pas annuler un changement de telephone.
   */
  saisieACorriger: boolean;
}

/**
 * Les signatures d'un email deja pris, telles que GoTrue et Postgres les ecrivent.
 *
 * Quatre formes, parce que la reponse change selon la version de GoTrue et selon que
 * l'erreur remonte de Postgres ou du code Go :
 *   - l'index unique partiel de auth.users ;
 *   - le SQLSTATE de la violation d'unicite ;
 *   - le code d'erreur moderne de GoTrue ;
 *   - les phrases anglaises historiques.
 */
const SIGNATURES_EMAIL_PRIS = [
  /users_email_partial_key/i,
  /23505/,
  /email_exists/i,
  /email address already/i,
  /already been registered/i,
  /already registered/i,
  /duplicate key value/i,
];

/** Un email deja pris se dit d'UNE seule facon dans toute l'application. */
export const EMAIL_DEJA_PRIS = 'Cet email est déjà utilisé par un autre compte.';

export function reponseErreurAuth(brut: string | null | undefined): ReponseErreur {
  const texte = (brut ?? '').trim();

  if (texte === '') {
    return {
      message: "L'enregistrement a échoué, sans message de la part du serveur.",
      statut: 500,
      saisieACorriger: false,
    };
  }

  if (SIGNATURES_EMAIL_PRIS.some(s => s.test(texte))) {
    return { message: EMAIL_DEJA_PRIS, statut: 409, saisieACorriger: true };
  }

  /*
   * Un email refuse pour sa FORME est aussi une saisie a corriger. Le format est deja
   * valide en amont, mais GoTrue applique ses propres regles (domaines interdits,
   * adresses jetables selon la configuration) : son refus doit rester lisible.
   */
  if (/invalid.*email|email.*invalid|validation_failed/i.test(texte)) {
    return {
      message: `Cet email est refusé par le serveur d’authentification : ${texte}`,
      statut: 400,
      saisieACorriger: true,
    };
  }

  /*
   * Tout le reste est une panne. On garde le message d'origine : le masquer rendrait
   * tout diagnostic impossible, et c'est precisement ce qui a coute une journee ici.
   * Mais on l'encadre, pour qu'une phrase anglaise brute ne soit plus jamais le seul
   * texte que l'utilisateur ait sous les yeux.
   */
  return {
    message: `L’enregistrement a échoué : ${texte}`,
    statut: 500,
    saisieACorriger: false,
  };
}
