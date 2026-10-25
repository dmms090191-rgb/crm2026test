/**
 * LA VUE D'ARRIVEE DU PANNEAU ADMIN, decidee AVANT le premier rendu.
 *
 * Demande de David du 25/10/2026 : la Societe « Bellisimmo » arrive sur CRM Immo. Une
 * premiere version basculait dans un useEffect, et elle fonctionnait — mais David a vu le
 * Dashboard apparaitre une fraction de seconde avant la bascule. Il a raison : une vue
 * d'arrivee qui clignote n'est pas une vue d'arrivee.
 *
 * POURQUOI PAS companyId. C'est la source naturelle, et elle arrive TROP TARD :
 * CompanyIdContext part de `useState<string | null>(null)` et ne remplit sa valeur que
 * dans un useEffect, apres un aller-retour d'authentification. Au premier rendu du panneau
 * elle vaut donc null, et decider avec elle redonnerait exactement le clignotement.
 *
 * POURQUOI localStorage CONVIENT ICI, alors qu'on s'en mefie ailleurs. App.tsx ecrit
 * `crm_company_id` dans applySession, au moment ou il fixe le role — donc AVANT que le
 * routeur ne monte ce panneau, puisqu'il faut connaitre le role pour le choisir. La valeur
 * est donc deja la, et lisible de facon SYNCHRONE au premier rendu. C'est la seule source
 * qui remplisse cette condition.
 *
 * CE QUE CETTE FONCTION NE DECIDE PAS : le droit d'ouvrir le module. Partir sur 'crm-immo'
 * ne le monte pas pour autant — CrmImmoGate recoit l'etat du droit et n'evalue son lazy()
 * que sur 'accorde'. Tant que le droit est 'inconnu' la Porte affiche un spinner, et sur
 * 'refuse' elle explique. Le module ne peut donc pas s'ouvrir sans droit, quelle que soit
 * la vue de depart : c'est garanti par la structure de la Porte, pas par cette fonction.
 */

/** La Societe « Bellisimmo ». Verifie le 25/10/2026 : crm_immo_acces.active = true. */
export const VUE_ARRIVEE_CRM_IMMO_COMPANY_ID = '87875350-40c8-4ee5-be3b-9398fa4106bf';

/** La cle que App.tsx ecrit dans applySession, avant de monter le panneau. */
export const CLE_COMPANY_ID = 'crm_company_id';

/**
 * La decision, PURE et sans dependance : les releves l'interrogent directement, sans avoir
 * a simuler un navigateur. `societe` est la valeur lue, `enVisu` dit si quelqu'un regarde
 * le panneau d'un autre.
 *
 * En Visu, deux choses concourent au meme refus : ce drapeau, et le fait que la cle
 * contienne la Societe du compte CONNECTE, pas celle qui est visitee. On ne deplace donc
 * ni le Super Admin ni le Groupe, conformement a ce que David a demande.
 */
export function vueArriveeAdmin(
  societe: string | null,
  enVisu: boolean,
): 'crm-immo' | 'vue-ensemble' {
  if (enVisu) return 'vue-ensemble';
  if (societe !== VUE_ARRIVEE_CRM_IMMO_COMPANY_ID) return 'vue-ensemble';
  return 'crm-immo';
}

/**
 * Lecture defensive : un stockage indisponible (navigation privee, quota, magasin
 * verrouille) ne doit pas empecher le panneau de s'afficher. On retombe alors sur la vue
 * d'ensemble, et l'effet de rattrapage d'AdminDashboard basculera un peu plus tard —
 * avec le clignotement, mais sans rien casser.
 */
export function societeMemorisee(): string | null {
  try {
    return localStorage.getItem(CLE_COMPANY_ID);
  } catch {
    return null;
  }
}
