/*
 * LE NOM D'UNE PERSONNE DANS LE CRM IMMO — UN SEUL ENDROIT, POUR TOUT LE MODULE.
 *
 * Module PUR : aucune base, aucun navigateur, aucun type d'ecran. C'est ce qui lui
 * permet d'etre appele aussi bien par valeurAffichee, qui recoit un DossierImmo
 * complet et un objet Colonne, que par crmImmoAlertes, qui travaille sur un
 * DossierPourAlertes de huit champs et se declare lui aussi module pur. Les deux ne
 * peuvent pas partager une fonction qui exigerait l'un ou l'autre : ils partagent
 * donc la REGLE, pas la signature.
 *
 * ---------- POURQUOI CE FICHIER EXISTE ----------
 *
 * Le 28 octobre 2026, le module composait un nom de personne a DIX endroits, dans
 * DEUX ordres : les deux colonnes composees du tableau joignaient nom puis prenom,
 * et sept compositions ecrites a la main joignaient prenom puis nom. Le meme dossier
 * se lisait donc << Dupont Marie >> dans le tableau et << Marie Dupont >> sur la
 * carte, dans la cloche, dans l'info-bulle de modification et jusque dans la
 * confirmation de SUPPRESSION DEFINITIVE.
 *
 * Aucun releve ne pouvait l'attraper : chaque site etait juste tout seul.
 *
 * L'ordre retenu est NOM puis PRENOM, tranche par David le 28/10. Ce n'est pas un
 * gout : c'est le seul ordre que les en-tetes du tableau PROMETTENT deja
 * (<< N/P locataire >>, N pour Nom), donc le seul qui ne cree pas un onzieme site
 * divergent.
 *
 * ---------- ON NE DECOUPE JAMAIS ----------
 *
 * Il n'y a dans ce fichier AUCUNE regle positionnelle : ni << premier mot = nom >>,
 * ni << dernier mot = prenom >>. La mesure du 28/10 dit pourquoi, et elle est sans
 * appel : sur les deux dossiers existants, un porte DEUX mots dans `locataire` ET
 * DEUX mots dans `proprietaire`. La frontiere reelle y est 2|2 ; toute regle au
 * premier espace rendrait 1|3, et toute regle au dernier espace rendrait 3|1.
 *
 * Et une recoupe fautive ne declencherait AUCUN signal : la chaine RECOMPOSEE reste
 * identique au caractere pres, donc ni le tableau, ni les cartes, ni la recherche,
 * ni le tri ne verraient la difference. La corruption serait invisible exactement la
 * ou on la chercherait. C'est l'argument pour ne jamais decouper, pas pour s'en
 * accommoder.
 */

/**
 * Joint un nom et un prenom en UNE valeur affichable, dans l'ordre NOM puis PRENOM.
 *
 * LES VIDES SONT ECARTES AVANT LA JOINTURE, et non joints puis nettoyes. Un dossier
 * sans prenom afficherait sinon << Dupont >> suivi d'une espace orpheline, que la
 * recherche verrait comme un mot de plus et que le tri classerait a part. C'est la
 * regle que crmImmoRecherche.ts applique deja aux colonnes composees ; elle est
 * reprise ici a l'identique pour que les deux chemins ne puissent pas diverger.
 *
 * Les deux moities sont rognees separement : une valeur dont il ne reste que des
 * espaces compte comme absente.
 */
export function composerNom(
  nom: string | null | undefined,
  prenom: string | null | undefined,
): string {
  return [nom, prenom]
    .map(v => (v ?? '').trim())
    .filter(v => v !== '')
    .join(' ');
}

/**
 * La valeur CANONIQUE d'une identite : la colonne de nom complet si elle porte
 * quelque chose, sinon la composition des deux anciennes colonnes.
 *
 * ---------- LA PRECEDENCE, ET POURQUOI ELLE EST DANS CE SENS ----------
 *
 * Les colonnes `nom_complet_locataire` et `nom_complet_proprietaire` sont arrivees
 * NULLES sur tout le stock existant : David a choisi la garde de modification
 * plutot qu'un backfill, donc aucune donnee n'a ete ecrite. Un dossier jamais
 * renomme depuis la migration a donc une canonique vide, et doit continuer a
 * s'afficher EXACTEMENT comme avant — c'est-a-dire par la composition.
 *
 * L'inverse serait un desastre silencieux : une precedence qui prefererait la
 * composition rendrait la canonique inerte, et un nom corrige par l'utilisateur
 * n'apparaitrait nulle part.
 *
 * UNE SOURCE GAGNE EN ENTIER. Jamais la canonique d'un cote avec une ancienne
 * colonne de l'autre : ce serait fabriquer une identite qui n'a jamais ete saisie.
 * C'est la meme regle que conversationIdentity (src/components/notifications/
 * notifIdentity.ts), ou elle est ecrite dans les memes termes.
 */
export function nomCanonique(
  canonique: string | null | undefined,
  nom: string | null | undefined,
  prenom: string | null | undefined,
): string {
  const c = (canonique ?? '').trim();
  if (c !== '') return c;
  return composerNom(nom, prenom);
}
