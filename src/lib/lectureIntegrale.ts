import type { PostgrestError } from '@supabase/supabase-js';

/**
 * LIRE TOUTES LES LIGNES, SANS SE FIER AU PLAFOND DE POSTGREST.
 *
 * ---------- LE PROBLEME ----------
 *
 * PostgREST tronque les reponses au-dela de `db-max-rows`, et il le fait EN SILENCE :
 * la requete reussit, `error` vaut null, il manque simplement des lignes. Une lecture
 * sans borne n'est donc pas << sans limite >>, c'est une lecture dont la limite est
 * invisible et ne se verra que le jour ou la table l'aura depassee.
 *
 * Pour CRM Immo, c'est une echeance : `crm_immo_loyers` gagne une ligne par mois et par
 * dossier. Cent dossiers, et la table passe le millier en moins d'un an. Les compteurs
 * se mettraient alors a oublier les plus anciens loyers, sans un mot.
 *
 * ---------- CE QUE FAIT CETTE FONCTION ----------
 *
 * Elle demande des PAGES, et s'arrete quand une page revient incomplete — ce qui ne
 * peut arriver qu'a la derniere. Elle ne depend d'aucune valeur de configuration : si
 * le plafond du serveur est plus bas que la taille demandee, la premiere page revient
 * plus courte et la boucle s'arrete... en ayant perdu des lignes.
 *
 * C'est pourquoi elle demande AUSSI le compte exact (`count: 'exact'`) et le compare a
 * ce qu'elle a recu. Un ecart devient une ERREUR explicite, jamais un silence. Mieux
 * vaut un message que des chiffres faux.
 *
 * ---------- L'ORDRE N'EST PAS UN DETAIL ----------
 *
 * Paginer sans ordre TOTAL fait sauter et repeter des lignes : deux pages successives
 * peuvent trier differemment deux lignes ex aequo. Chaque appelant doit donc poser un
 * `.order()` sur une colonne unique — `id` convient partout dans ce projet.
 */

/** Ce que PostgREST rend pour une page, avec son compte total. */
interface Page<T> {
  data: T[] | null;
  error: PostgrestError | null;
  count: number | null;
}

export const TAILLE_PAGE = 1000;

/**
 * Garde-fou : au-dela, on arrete et on le dit.
 *
 * Deux cents pages valent 200 000 lignes — bien plus que ce qu'une Societe immobiliere
 * produira jamais. Si on y arrive, c'est que la pagination tourne en rond (un ordre non
 * deterministe, par exemple), et une boucle infinie dans un navigateur ne se diagnostique
 * pas : elle gele l'onglet.
 */
const PAGES_MAX = 200;

/**
 * @param page Construit et execute la requete pour l'intervalle [de, a] INCLUS.
 *             Elle doit porter un `.order()` sur une colonne unique et
 *             `{ count: 'exact' }` dans son `.select()`.
 */
export async function lireToutesLesLignes<T>(
  page: (de: number, a: number) => PromiseLike<Page<T>>,
  taille: number = TAILLE_PAGE,
): Promise<{ data: T[] | null; error: PostgrestError | null }> {
  const tout: T[] = [];
  let total: number | null = null;

  for (let i = 0; i < PAGES_MAX; i++) {
    const de = i * taille;
    const { data, error, count } = await page(de, de + taille - 1);
    if (error) return { data: null, error };

    const lignes = data ?? [];
    tout.push(...lignes);
    if (count !== null) total = count;

    /* Une page incomplete ne peut etre que la derniere. */
    if (lignes.length < taille) break;
  }

  /*
   * LE CONTROLE QUI REND LA TRONCATURE IMPOSSIBLE A MANQUER.
   *
   * `count` est le nombre de lignes que la requete AURAIT rendues sans bornes, vu a
   * travers la RLS. S'il ne correspond pas a ce qu'on a ramene, c'est que le serveur a
   * coupe plus court que notre taille de page, ou que la pagination a derape. Dans les
   * deux cas, continuer avec des chiffres incomplets serait pire que s'arreter.
   */
  if (total !== null && tout.length !== total) {
    return {
      data: null,
      error: {
        name: 'PostgrestError',
        message: `Lecture incomplète : ${tout.length} lignes reçues sur ${total} annoncées.`
          + ' Le plafond du serveur est plus bas que la taille de page demandée.',
        details: `pages de ${taille} lignes`,
        hint: 'Réduire TAILLE_PAGE dans lectureIntegrale.ts',
        code: 'PGRST_TRONQUE',
      } as PostgrestError,
    };
  }

  return { data: tout, error: null };
}
