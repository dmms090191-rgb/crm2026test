/**
 * LA SEQUENCE DE SUPPRESSION D UN DOSSIER CLIENT — logique pure, sans Supabase.
 *
 * ---------- POURQUOI ELLE VIT ICI ET NON DANS LE HOOK ----------
 *
 * Elle a quatre chemins d echec, et chacun doit laisser un etat precis. On ne peut pas
 * casser Storage ou la base a volonte contre un vrai projet : les quatre operations sont
 * donc passees de l exterieur, et un test peut forcer n importe lequel des echecs.
 *
 * Dans le dossier du hook, ce fichier aurait tire src/lib/supabase, qui lit
 * import.meta.env — indisponible hors Vite, donc intestable. Meme raison que pour
 * lectureIntegrale : la logique ne connait pas son transport.
 */
/**
 * Les quatre operations dont la suppression a besoin, passees de l'exterieur.
 *
 * ---------- POURQUOI ELLES SONT INJECTEES ----------
 *
 * La sequence ci-dessous a quatre chemins d'echec, et chacun doit laisser un etat
 * precis. On ne peut pas provoquer ces echecs contre une vraie base : il faudrait casser
 * Storage ou la base a volonte. En les passant de l'exterieur, un test peut forcer
 * n'importe lequel et MESURER l'etat resultant — notamment celui que David a nomme :
 * << suppression Storage reussit, puis suppression DB du dossier echoue >>.
 */
export interface OperationsSuppressionDossier {
  lister: (dossierIds: string[]) => Promise<{ chemins: string[]; error: string | null }>;
  marquer: (dossierIds: string[]) => Promise<{ error: string | null }>;
  demarquer: (dossierIds: string[]) => Promise<{ error: string | null }>;
  retirerDuStockage: (chemins: string[]) => Promise<{ error: string | null }>;
  supprimerDossiers: (dossierIds: string[]) => Promise<{ supprimees: number; error: string | null }>;
}

export interface ResultatSuppressionDossier {
  error: string | null;
  supprimees: number;
  /**
   * Vrai quand des fichiers ont ete detruits mais que les fiches restent. L'etat est
   * alors VISIBLE — les documents s'affichent << Suppression incomplete >> — et une
   * nouvelle tentative aboutit, `remove` etant idempotent sur un objet deja absent.
   */
  reprisePossible: boolean;
}

/**
 * SUPPRIME DES DOSSIERS CLIENTS ET LEURS DOCUMENTS, de facon convergente.
 *
 * ---------- LE PROBLEME ----------
 *
 * Toutes les cles etrangeres du module sont ON DELETE CASCADE, et aucune fonction de la
 * base ne reference storage.objects. Supprimer un dossier efface donc les LIGNES et
 * abandonne les OCTETS : des fichiers invisibles, factures, et hors de portee de toute
 * suppression ulterieure.
 *
 * Nettoyer Storage d'abord ferme ce trou mais en ouvre un second, symetrique : si la
 * suppression du dossier echoue ENSUITE, les fiches restent en pointant des fichiers
 * detruits. C'est exactement l'incoherence silencieuse qu'on refuse.
 *
 * ---------- LA SEQUENCE, ET CE QUE CHAQUE ECHEC LAISSE ----------
 *
 *   1. LISTER         echec -> rien n'a bouge, refus net
 *   2. MARQUER        echec -> rien n'a bouge, refus net
 *   3. RETIRER        echec -> on DEMARQUE, rien n'a ete detruit, refus net
 *   4. SUPPRIMER      echec -> les fichiers sont partis, les fiches restent MARQUEES
 *                              `suppression` : visible dans l'onglet, et une reprise
 *                              aboutit. C'est le seul etat residuel possible, et il
 *                              est recuperable.
 *
 * L'etape 2 n'est pas decorative : sans elle, l'echec de l'etape 4 laisserait des fiches
 * en statut `pret` pointant des fichiers detruits — indiscernables de fiches saines.
 * C'est le marquage qui rend l'etat visible, et donc reprenable.
 */
export async function supprimerDossiersEtLeursDocuments(
  dossierIds: string[],
  ops: OperationsSuppressionDossier,
): Promise<ResultatSuppressionDossier> {
  if (dossierIds.length === 0) return { error: null, supprimees: 0, reprisePossible: false };

  const liste = await ops.lister(dossierIds);
  if (liste.error !== null) {
    return {
      error: `Impossible de vérifier les documents de ce dossier : ${liste.error}. La suppression est annulée.`,
      supprimees: 0, reprisePossible: false,
    };
  }

  /* Aucun document : rien a nettoyer, et surtout rien a marquer. */
  if (liste.chemins.length === 0) {
    const sec = await ops.supprimerDossiers(dossierIds);
    if (sec.error !== null) return { error: sec.error, supprimees: sec.supprimees, reprisePossible: false };
    return { error: null, supprimees: sec.supprimees, reprisePossible: false };
  }

  const marque = await ops.marquer(dossierIds);
  if (marque.error !== null) {
    return {
      error: `La suppression n’a pas pu être préparée : ${marque.error}. Rien n’a été modifié.`,
      supprimees: 0, reprisePossible: false,
    };
  }

  const retrait = await ops.retirerDuStockage(liste.chemins);
  if (retrait.error !== null) {
    /* Rien n'a ete detruit : on remet les fiches comme elles etaient. */
    const retour = await ops.demarquer(dossierIds);
    const suffixe = retour.error === null
      ? ' Aucun fichier n’a été supprimé.'
      : ` Aucun fichier n’a été supprimé, mais les documents sont restés marqués « suppression en cours » : réessayez pour remettre les choses en ordre.`;
    return {
      error: `Les ${liste.chemins.length} document(s) de ce dossier n’ont pas pu être retirés du stockage : ${retrait.error}. La suppression est annulée pour ne pas abandonner de fichiers.${suffixe}`,
      supprimees: 0, reprisePossible: retour.error !== null,
    };
  }

  const fin = await ops.supprimerDossiers(dossierIds);
  if (fin.error !== null || fin.supprimees < dossierIds.length) {
    /*
     * LE CAS QUE DAVID A NOMME. Les fichiers sont detruits, les fiches sont la, et elles
     * portent `suppression` : l'onglet Documents les montre << Suppression incomplete >>
     * au lieu de les presenter comme des documents valides dont le fichier a disparu.
     *
     * Une nouvelle tentative aboutit : l'etape 3 ne trouve plus rien a retirer, ce qui
     * n'est pas une erreur pour `remove`, et l'etape 4 repasse.
     */
    const reste = dossierIds.length - fin.supprimees;
    return {
      error: `Les fichiers ont bien été retirés du stockage, mais ${reste} dossier(s) n’ont pas pu être supprimés${fin.error !== null ? ` : ${fin.error}` : ' : droits insuffisants.'} Leurs documents sont marqués « suppression incomplète » et restent visibles. Relancez la suppression : elle reprendra où elle s’est arrêtée.`,
      supprimees: fin.supprimees, reprisePossible: true,
    };
  }

  return { error: null, supprimees: fin.supprimees, reprisePossible: false };
}

/**
 * Les quatre operations, branchees sur Supabase.
 *
 * Separees de la sequence pour que celle-ci soit mesurable. Ici il n'y a aucune decision :
 * uniquement des appels, et la lecture honnete de leurs resultats.
 */
