import { supabase } from '../lib/supabase';
import { cleReglagePartage, reglageValide, type ReglageLocal } from '../lib/crmImmoColonnes';

/*
 * L'ORDRE ET LE MASQUAGE DES COLONNES CRM IMMO, PARTAGES PAR LA SOCIETE.
 *
 * ---------- LE DEFAUT QUE CE FICHIER FERME ----------
 *
 * Jusqu'au 28/10/2026, ce reglage ne vivait QUE dans le localStorage. David, le 27/10 :
 * « pour une meme societe, l'ordre et/ou la visibilite des colonnes ne s'affichent pas
 * pareil suivant l'ordinateur ». La cle nommait bien la Societe, mais le support etait le
 * navigateur : elle separait deux Societes dans un meme navigateur, et ne rapprochait
 * jamais deux navigateurs d'une meme Societe.
 *
 * ---------- AUCUNE MIGRATION, ET CE N'EST PAS UN RACCOURCI ----------
 *
 * Le support est `user_preferences.sidebar_orders`, un dictionnaire jsonb a cles LIBRES
 * deja porteur de neuf cles venues de trois moteurs (barre laterale V2, preferences
 * d'actions, cartes de notification). Y ajouter une dixieme n'est pas un changement de
 * schema. La RLS existante — auth.uid() = user_id — suffit, et la cle primaire user_id
 * rend le `onConflict` valide. C'est le patron de actionPrefsStorage.ts, avec un OBJET a
 * la place d'une liste d'ids.
 *
 * ---------- LA FUSION EST OBLIGATOIRE, PAS UNE PRECAUTION ----------
 *
 * `sidebar_orders` porte les reglages de TOUS les moteurs. Un upsert qui ecrirait
 * `{ [cle]: reglage }` sans relire effacerait la barre laterale de l'utilisateur et ses
 * preferences d'actions. Les trois patrons du depot relisent tous avant d'ecrire ; celui-ci
 * aussi.
 *
 * ---------- CE FICHIER N'AMORCE RIEN ----------
 *
 * Il n'y a volontairement AUCUNE fonction « promouvoir le cache local vers la base ».
 * David l'a tranche le 28/10 : « pas d'amorcage automatique depuis un ancien localStorage,
 * aucun premier ordinateur qui gagne ». La raison est mesuree : le jeu de cles systeme a
 * ete REMPLACE le 23/10 (nom, prenom, locataire, proprietaire ont disparu au profit de
 * np_locataire, np_proprietaire, mode_paiement). Sur un poste range avant cette date, les
 * cles mortes sont silencieusement jetees par ordonnerSysteme et np_locataire — LA COLONNE
 * QUI IDENTIFIE LA LIGNE — se retrouve en derniere position. Promouvoir un tel reglage
 * l'aurait propage a toute la Societe, et le reglage de l'autre poste aurait ete detruit
 * sans rattrapage possible. La base ne se remplit donc qu'au PREMIER GESTE EXPLICITE dans
 * la modale Colonnes.
 */

/** Rend le reglage partage, ou null si la base n'en porte pas — « ne touche a rien ». */
export async function lireReglageDistant(
  proprietaire: string,
  companyId: string,
): Promise<ReglageLocal | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', proprietaire)
    .maybeSingle();
  if (error || !data) return null;
  const tout = data.sidebar_orders as Record<string, unknown> | null;
  /*
   * `reglageValide` et non un cast : ce qui sort d'un jsonb n'est verifie par personne, et
   * une ligne abimee — ou ecrite a la main — ne doit pas vider le tableau de l'utilisateur.
   * C'est le meme garde-fou que pour le cache local, et c'est voulu : deux stockages, une
   * seule regle de lecture.
   */
  return reglageValide(tout?.[cleReglagePartage(companyId)] ?? null);
}

/**
 * Ecrit CETTE cle en preservant toutes les autres de `sidebar_orders`.
 *
 * Rend le message d'erreur, ou null. L'appelant n'a pas a l'afficher — le cache local a
 * deja peint, donc l'utilisateur voit son geste pris — mais il doit pouvoir le savoir
 * plutot que de croire l'ecriture reussie. Une ecriture refusee qui se fait passer pour une
 * reussite est le defaut que ce depot a deja paye sur `panel_hidden_tabs`.
 */
export async function ecrireReglageDistant(
  proprietaire: string,
  companyId: string,
  reglage: ReglageLocal,
): Promise<string | null> {
  const { data: existant, error: erreurLecture } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', proprietaire)
    .maybeSingle();
  /*
   * Une lecture qui ECHOUE n'est pas une ligne absente. Ecrire quand meme partirait avec un
   * `current` vide et effacerait les neuf cles des autres moteurs — exactement ce que la
   * fusion doit empecher. Une ligne absente, elle, rend data: null SANS erreur, et le
   * `?? {}` ci-dessous la traite comme un dictionnaire vide : c'est le cas normal d'un
   * premier enregistrement.
   */
  if (erreurLecture) return erreurLecture.message;

  const courant = (existant?.sidebar_orders as Record<string, unknown> | null) ?? {};
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: proprietaire,
      sidebar_orders: { ...courant, [cleReglagePartage(companyId)]: reglage },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return error ? error.message : null;
}
