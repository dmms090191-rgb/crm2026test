/*
 * UNE SAUVEGARDE PEUT ETRE PLUS ANCIENNE QUE LE SCHEMA — ET LA RESTAURATION MENTIRAIT.
 *
 * Module PUR : aucune base, aucun navigateur. Il repond a une seule question, et elle
 * n'a pas de reponse evidente a l'ecran.
 *
 * ---------- LE MECANISME, VERIFIE EN LISANT LE SQL ----------
 *
 * `crm_immo_restaurer_lot` ne travaille pas sur une liste de colonnes figee : elle les
 * DERIVE des cles de la PREMIERE LIGNE du lot — `jsonb_object_keys(p_lignes -> 0)` —
 * croisees avec le catalogue reel de la table. C'est ce qui rend une restauration
 * tolerante aux colonnes ajoutees apres coup, et c'est voulu.
 *
 * Mais la consequence est perverse. Une colonne absente du lot n'entre NI dans la liste
 * d'INSERT NI dans le `ON CONFLICT (id) DO UPDATE SET`. Sur une ligne qui existe deja,
 * elle n'est donc ni ecrasee ni remise a NULL : elle GARDE sa valeur actuelle.
 *
 * Pour les colonnes canoniques de nom, cela donne exactement ceci : les quatre anciennes
 * colonnes reviennent a leur valeur d'avant, la canonique garde le nom NEUF, et comme
 * c'est la canonique qui PRIME a l'affichage, l'ecran continue de montrer le neuf. Le
 * bilan de restauration, lui, annonce une reussite. Rien ne detrompe l'utilisateur, qui
 * croit avoir remis le dossier dans son etat anterieur.
 *
 * ---------- POURQUOI ON NE COMPARE PAS version_schema ----------
 *
 * Le fichier porte bien une `version_schema`, ecrite a l'export et affichee a l'import.
 * La comparer serait indirect : elle dit d'ou vient le fichier, pas ce qu'il CONTIENT. Un
 * export partiel, un fichier retouche a la main, une table absente du lot — autant de cas
 * ou la version serait rassurante et le contenu incomplet quand meme.
 *
 * On lit donc la premiere ligne, exactement comme la fonction SQL le fera.
 */

/** Ce qu'une table du lot ne porte pas, alors que la base l'attend. */
export interface ManqueDansLeLot {
  table: string;
  colonnes: string[];
}

/**
 * Les colonnes que la base porte et que le lot ne contient pas.
 *
 * On n'inspecte QUE la premiere ligne, et ce n'est pas un raccourci : c'est precisement ce
 * que fait `crm_immo_restaurer_lot`. Inspecter toutes les lignes donnerait une reponse
 * plus genereuse que la realite, et donc un avertissement qui ne correspondrait pas a ce
 * qui va se passer.
 *
 * Une table absente du lot, ou vide, ne rend RIEN : il n'y a alors aucune ligne a
 * restaurer, donc aucune divergence possible. Dire le contraire inquieterait pour rien.
 */
export function colonnesAbsentesDuLot(
  donnees: Record<string, unknown[]>,
  attendues: Record<string, string[]>,
): ManqueDansLeLot[] {
  const manques: ManqueDansLeLot[] = [];
  for (const [table, colonnes] of Object.entries(attendues)) {
    const lignes = donnees[table];
    if (!Array.isArray(lignes) || lignes.length === 0) continue;
    const premiere = lignes[0];
    /* Une premiere ligne qui n'est pas un objet ne permet aucune conclusion : la fonction
       SQL echouerait de toute facon, et ce n'est pas a cet avertissement de le dire. */
    if (premiere === null || typeof premiere !== 'object' || Array.isArray(premiere)) continue;
    const cles = new Set(Object.keys(premiere as Record<string, unknown>));
    const absentes = colonnes.filter(c => !cles.has(c));
    if (absentes.length > 0) manques.push({ table, colonnes: absentes });
  }
  return manques;
}

/**
 * Les colonnes dont l'absence CHANGE CE QU'ON VOIT, par table.
 *
 * Volontairement COURTE. Toute colonne ajoutee apres un export est dans ce cas sur le
 * plan technique, mais la plupart ne trompent personne : un telephone absent du lot reste
 * simplement celui d'aujourd'hui, et cela se voit.
 *
 * Les deux colonnes canoniques de nom, elles, sont le cas limite : elles PRIMENT sur les
 * colonnes que la restauration vient de remettre en place. L'ecran affiche donc le
 * contraire de ce que la restauration a fait. C'est ce renversement-la qu'on signale, et
 * rien d'autre.
 */
export const COLONNES_QUI_MASQUENT_UNE_RESTAURATION: Record<string, string[]> = {
  crm_immo_dossiers: ['nom_complet_locataire', 'nom_complet_proprietaire'],
};
