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

/*
 * ============== TRANSPORT CONTRE SERVEUR, ET POURQUOI LA DISTINCTION EXISTE ==============
 *
 * MESURE DU 26/10/2026, journaux Supabase. Un porteur voyait « CRM Immo n'a pas pu etre
 * verifie » sur le site, dans un navigateur de telephone. L'enquete a montre que la requete
 * ARRIVE au serveur, qu'elle REUSSIT, et qu'elle rend meme `true` : HTTP 200, corps de
 * 4 octets. Elle met seulement 23 038 ms a le faire — jusqu'a 33 838 ms ailleurs — alors que
 * la fonction elle-meme s'execute en 101 ms. L'attente n'est pas dans le calcul : le tableau
 * de bord lance jusqu'a 21 requetes dans la meme seconde contre un lot de 5 connexions
 * PostgREST, et celle-ci fait la queue. Le navigateur du telephone, lui, renonce avant.
 *
 * CE QUE VOIT LE CODE QUAND LE NAVIGATEUR RENONCE. postgrest-js n'echoue pas par un rejet de
 * promesse : il attrape la panne de fetch et fabrique un objet error (PostgrestBuilder.js,
 * `res.catch((fetchError) => ...)`). Cet objet a la MEME FORME qu'un refus du serveur, et
 * lireReponseAcces, qui ne regarde que `if (error)`, rendait donc 'erreur' dans les deux cas.
 * Un reseau qui renonce etait traite comme un refus de la base.
 *
 * LE DISCRIMINANT, ET IL EST FIABLE. PostgREST et PostgreSQL nomment TOUJOURS leur erreur :
 * '42501' pour un droit refuse, 'PGRST301' pour un jeton rejete, '22P02' pour un uuid
 * invalide. postgrest-js, lui, pose `code: ${fetchError?.code ?? ''}` — et une TypeError de
 * fetch n'a pas de `.code`. Un code VIDE signifie donc : la reponse n'est jamais arrivee.
 *
 * CE QUE LA DISTINCTION AUTORISE. Un seul reessai, et seulement sur le transport. Reessayer
 * un refus serait absurde — la reponse ne changera pas — et reessayer en boucle aggraverait
 * precisement la file d'attente qui cause la panne. Un essai, un recul, puis on conclut.
 */

/** Ce que l'on sait de l'echec, quand il y en a un. Sert a l'ecran et a la decision. */
export interface DetailErreur {
  /** Le code PostgREST/PostgreSQL, ou null quand la reponse n'est jamais arrivee. */
  code: string | null;
  /** Le message tel quel, affiche a l'ecran : c'est lui qui rend un incident diagnosticable. */
  message: string;
  /** Vrai quand l'echec est un abandon du transport, et non une reponse du serveur. */
  transport: boolean;
}

/** La forme minimale qu'on lit d'une erreur, sans dependre des types de supabase-js. */
interface ErreurBrute {
  code?: unknown;
  message?: unknown;
}

/**
 * Vrai quand l'echec vient du TRANSPORT et non du serveur.
 *
 * On teste le code, jamais le message : « Failed to fetch » est formule differemment par
 * chaque navigateur et traduit dans la langue du systeme, alors que l'absence de code est
 * structurelle. Se brancher sur le texte serait se brancher sur la langue du telephone.
 */
export function estErreurDeTransport(error: unknown): boolean {
  if (!error) return false;
  const code = (error as ErreurBrute).code;
  return code === undefined || code === null || code === '';
}

/** Traduit une erreur brute en detail affichable. Ne rend rien quand il n'y a pas d'erreur. */
export function decrireErreur(error: unknown): DetailErreur | null {
  if (!error) return null;
  const brute = error as ErreurBrute;
  const code = typeof brute.code === 'string' && brute.code !== '' ? brute.code : null;
  const message = typeof brute.message === 'string' && brute.message !== ''
    ? brute.message
    : 'Erreur inconnue';
  return { code, message, transport: estErreurDeTransport(error) };
}

/** Le recul avant l'unique reessai. Assez long pour que la file se degage, assez court
 *  pour que l'ecran ne paraisse pas fige. */
export const RECUL_AVANT_REESSAI_MS = 2500;

/** Ce que rend une demande : l'etat, le detail de l'echec s'il y en a, et le nombre d'essais. */
export interface ResultatDemande {
  etat: EtatAcces;
  detail: DetailErreur | null;
  essais: number;
}

/** La reponse brute d'un appel, reduite a ce dont la decision a besoin. */
export interface ReponseBrute {
  data: unknown;
  error: unknown;
}

/**
 * DEMANDE LE DROIT, AVEC UN SEUL REESSAI RESERVE AU TRANSPORT.
 *
 * `appeler` et `attendre` sont injectes pour que les releves exercent la SEQUENCE ENTIERE —
 * premier echec, recul, second essai — sans reseau, sans React et sans attendre 2,5 secondes.
 * Un releve qui devrait patienter serait un releve qu'on finit par desactiver.
 *
 * La regle tient en une phrase : on ne reessaie QUE si la reponse n'est jamais arrivee, et
 * on ne le fait QU'UNE FOIS. Tout le reste — accorde, refuse, erreur nommee par le serveur —
 * se conclut au premier essai.
 */
export async function demanderAcces(
  appeler: () => Promise<ReponseBrute>,
  attendre: (ms: number) => Promise<void>,
  reculMs: number = RECUL_AVANT_REESSAI_MS,
): Promise<ResultatDemande> {
  let essais = 0;

  for (;;) {
    essais++;

    /*
     * UN REJET EST UNE PANNE DE TRANSPORT, ET DOIT ETRE TRAITE COMME TELLE.
     *
     * postgrest-js n'en produit pas aujourd'hui : il attrape la panne de fetch et rend un
     * objet error. Mais un appelant qui leve — un `fetch` remplace, un intercepteur, une
     * version future — ferait autrement rejeter cette fonction toute entiere. L'etat
     * resterait alors 'inconnu' et la Porte afficherait un rond qui tourne SANS FIN :
     * exactement la panne payee le 25/10/2026 sur le coffre Capacitor.
     *
     * On le convertit donc en erreur sans code, ce qui lui donne le bon traitement — un
     * reessai, puis une conclusion — au lieu d'un silence.
     */
    let reponse: ReponseBrute;
    try {
      reponse = await appeler();
    } catch (leve) {
      const message = leve instanceof Error ? `${leve.name}: ${leve.message}` : String(leve);
      reponse = { data: null, error: { code: '', message } };
    }
    const { data, error } = reponse;

    // Un seul reessai, et seulement si la reponse n'est jamais arrivee. `essais === 1`
    // borne la boucle : il n'existe aucun chemin qui repasse une troisieme fois.
    if (error && estErreurDeTransport(error) && essais === 1) {
      await attendre(reculMs);
      continue;
    }

    return { etat: lireReponseAcces(data, error), detail: decrireErreur(error), essais };
  }
}
