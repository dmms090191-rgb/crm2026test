import { supabase } from './supabase';

/**
 * LE LECTEUR UNIQUE DE LA LIGNE `user_preferences` D'UN COMPTE.
 *
 * ---------- LE DEFAUT QU'IL CORRIGE ----------
 *
 * Six crochets independants lisaient la MEME ligne de la MEME table, chacun avec sa propre
 * requete, et cinq d'entre eux demandaient litteralement la meme colonne :
 *
 *   useSidebarLayout ....... select sidebar_orders
 *   useSidebarOrder ........ select sidebar_orders
 *   useNotifCardOrder ...... select sidebar_orders
 *   actionPrefsStorage ..... select sidebar_orders   (useActionOrder ET useActionVisibility)
 *   crmImmoReglageDistant .. select sidebar_orders
 *   useSAHiddenTabs ........ select sa_hidden_tabs   (meme ligne, autre colonne)
 *
 * Aucun ne savait que les autres existaient, donc aucun ne pouvait attendre le voisin.
 * Releve du 13/11/2026 sur les journaux de production : 59 appels a `/rest/v1/user_preferences`
 * sur un seul parcours, dont 26 strictement identiques pour un meme compte, mediane 408 ms et
 * maximum 17 503 ms. Et releve au harnais : une simple modale d'actions, qui monte
 * `useActionOrder` et `useActionVisibility` cote a cote, envoyait DEUX requetes identiques
 * dans le meme instant.
 *
 * ---------- CE QUE CE MODULE EST, ET CE QU'IL N'EST PAS ----------
 *
 * C'est une MUTUALISATION DE TRANSPORT, pas un cache. La difference tient en une phrase :
 * rien n'est conserve apres la reponse. Deux lecteurs qui demandent au meme moment partagent
 * une requete ; un lecteur qui demande dix secondes plus tard en declenche une nouvelle et
 * voit l'etat courant de la base.
 *
 * La base reste donc seule autorite, et ce module n'a aucune connaissance du metier : il ne
 * sait pas ce qu'est un ordre d'onglets, il rend la ligne brute. Les reglages continuent
 * d'etre interpretes par les crochets qui les possedent, chacun avec ses propres gardes.
 *
 * ---------- POURQUOI LES ECRITURES NE PASSENT PAS PAR ICI ----------
 *
 * `sidebar_orders` est un jsonb partage par une dizaine de moteurs de reglages, et chaque
 * ecriture relit la ligne pour preserver les cles des autres. Cette relecture-la doit voir
 * l'etat REEL de la base a cet instant : la servir depuis une requete mutualisee, meme
 * recente, ferait repartir l'upsert avec des cles perimees et effacerait le reglage qu'un
 * autre onglet vient d'enregistrer. Les fonctions d'ecriture gardent donc leur propre
 * lecture, directe et non mutualisee. C'est voulu, et il ne faut pas « optimiser » cela.
 *
 * ---------- ISOLATION ----------
 *
 * La cle de regroupement est l'identifiant demande. Deux identifiants differents ne
 * partagent jamais une requete ni un resultat, et aucune regle RLS n'est contournee : c'est
 * la meme requete, sous le meme jeton, que celle que chaque crochet envoyait seul. Lire les
 * deux colonnes ensemble ne change aucun droit — le SELECT est accorde sur toute la table a
 * `authenticated`, et c'est la RLS qui filtre les LIGNES (verifie le 13/11/2026 sur
 * information_schema.column_privileges : aucun droit par colonne sur cette table).
 */

export interface LignePreferences {
  sidebar_orders: Record<string, unknown> | null;
  sa_hidden_tabs: unknown;
}

/* Les requetes EN COURS, par identifiant. Une entree y vit le temps d'un aller-retour, et
   pas une milliseconde de plus : le `finally` la retire des que la reponse arrive. */
const enVol = new Map<string, Promise<LignePreferences | null>>();

/**
 * La ligne de preferences d'un compte.
 *
 * Rend `null` quand la ligne n'existe pas, quand la requete echoue, ou quand la RLS la
 * refuse — les trois cas que les appelants traitaient deja de la meme facon : « pas de
 * reglage enregistre, on garde les valeurs par defaut ».
 */
export function lirePreferences(userId: string): Promise<LignePreferences | null> {
  if (!userId) return Promise.resolve(null);

  const dejaPartie = enVol.get(userId);
  if (dejaPartie) return dejaPartie;

  /* Le constructeur de requete de supabase-js rend un PromiseLike, qui n'offre que `then` :
     on repasse donc par une vraie promesse pour disposer de `catch` et de `finally`. Sans ce
     `catch`, une panne reseau rejetterait la promesse PARTAGEE, et toutes les lectures
     regroupees derriere elle echoueraient d'un coup au lieu de retomber sur leurs valeurs
     par defaut — le regroupement aurait alors propage une panne au lieu d'economiser un
     aller-retour. */
  const promesse = (async (): Promise<LignePreferences | null> => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('sidebar_orders, sa_hidden_tabs')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as LignePreferences;
  })()
    .catch(() => null)
    .finally(() => { enVol.delete(userId); });

  enVol.set(userId, promesse);
  return promesse;
}

/** Le jsonb `sidebar_orders`, ou null. Le decoupage par cle appartient a l'appelant. */
export async function lireSidebarOrders(userId: string): Promise<Record<string, unknown> | null> {
  const ligne = await lirePreferences(userId);
  return (ligne?.sidebar_orders ?? null) as Record<string, unknown> | null;
}

/** La colonne `sa_hidden_tabs`, brute : c'est l'appelant qui sait la valider. */
export async function lireSaHiddenTabs(userId: string): Promise<unknown> {
  const ligne = await lirePreferences(userId);
  return ligne?.sa_hidden_tabs ?? null;
}
