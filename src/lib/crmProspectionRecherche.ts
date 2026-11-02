/**
 * LA RECHERCHE, LES FILTRES ET LE TRI DU CRM DE PROSPECTION — EN FONCTIONS PURES.
 *
 * POURQUOI CE FICHIER EXISTE, HORS DE REACT. Ce sont les trois comportements que David a
 * decrits le plus precisement : recherche globale sur cinq champs, filtres combinables,
 * tri au clic. Ce sont donc les trois qu'il faut pouvoir EPROUVER — et un comportement
 * enferme dans un composant ne s'eprouve qu'en montant un navigateur.
 *
 * Ici, aucun import React, aucun appel reseau, aucune lecture d'environnement : les
 * relevés les interrogent directement sous `node --test`. C'est la methode deja employee
 * par src/lib/plateforme.ts et src/lib/runtime.ts, et pour la meme raison.
 *
 * CE QUI N'EST PAS ICI, A DESSEIN : l'isolation par Societe. Elle n'est PAS une affaire de
 * filtrage — elle est tenue par la RLS cote base et par le `.eq('company_id', …)` de la
 * requete. Filtrer une liste deja chargee ne protege rien : si une ligne d'une autre
 * Societe arrivait jusqu'ici, le mal serait deja fait.
 */

export interface LeadProspection {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  poste: string | null;
  /** L'entreprise du PROSPECT. Affichee « Societe » — voir le commentaire de la migration. */
  entreprise: string | null;
  lien: string | null;
  statut_id: string | null;
  commentaire: string | null;
}

/** Un statut du catalogue public.statuts, tel que la vue le charge. */
export interface StatutProspection {
  id: string;
  nom: string;
  couleur: string;
}

export interface FiltresProspection {
  /** La recherche globale. */
  recherche: string;
  /** Un id de statut, '' pour « tous », ou SANS_STATUT pour les lignes qui n'en ont pas. */
  statut: string;
  entreprise: string;
  poste: string;
}

/**
 * LA VALEUR QUI DESIGNE « AUCUN STATUT » DANS LE FILTRE.
 *
 * Elle ne peut pas etre la chaine vide : '' veut deja dire « tous les statuts », et les
 * deux sens dans une meme liste deroulante donneraient un filtre qui ne filtre rien quand
 * on lui demande justement les lignes sans statut.
 *
 * Elle ne peut pas etre `null` non plus : la valeur d'un <select> est toujours une chaine.
 * D'ou ce jeton, impossible a confondre avec un uuid.
 */
export const SANS_STATUT = '__sans_statut__';

export const FILTRES_VIDES: FiltresProspection = {
  recherche: '', statut: '', entreprise: '', poste: '',
};

/** Vrai si aucun filtre n'est pose : sert a l'etat du bouton « Reinitialiser ». */
export function filtresActifs(f: FiltresProspection): boolean {
  return f.recherche.trim() !== '' || f.statut !== '' || f.entreprise.trim() !== '' || f.poste.trim() !== '';
}

/**
 * NORMALISATION POUR LA COMPARAISON : minuscules ET sans accents.
 *
 * Ce n'est pas une commodite, c'est la difference entre un champ de recherche qui marche
 * et un qui ne marche pas. Sur une base de prospects francais, chercher « Lemetayer »
 * doit trouver « Lemétayer », et « remy » doit trouver « Rémy ». Sans cette ligne,
 * l'utilisateur conclut que le lead n'existe pas.
 *
 * NFD separe la lettre de son accent, et la classe \p{Diacritic} retire l'accent seul.
 */
export function normaliser(valeur: string | null | undefined): string {
  if (!valeur) return '';
  return valeur.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * LES CINQ CHAMPS DE LA RECHERCHE GLOBALE, nommes une seule fois.
 *
 * David les a enumeres : Nom, Prenom, Email, Societe, Poste. Les ecrire ici plutot que de
 * les repeter dans la fonction permet au relevé de verifier LA LISTE elle-meme : un champ
 * ajoute a la table mais oublie ici ne se decouvrirait autrement qu'a l'usage.
 *
 * `commentaire` et `lien` en sont volontairement ABSENTS. Un commentaire peut faire 5 000
 * caracteres : l'y inclure ferait remonter des lignes sur un mot enfoui, sans que
 * l'utilisateur voie pourquoi. David a d'ailleurs dit « au minimum » ces cinq-la ; on s'y
 * tient tant qu'il n'en demande pas plus.
 */
export const CHAMPS_RECHERCHE = ['nom', 'prenom', 'email', 'entreprise', 'poste'] as const;

/** Vrai si le lead repond au terme de recherche, sur l'un des cinq champs. */
export function correspondARecherche(lead: LeadProspection, terme: string): boolean {
  const t = normaliser(terme);
  if (t === '') return true;
  return CHAMPS_RECHERCHE.some((champ) => normaliser(lead[champ]).includes(t));
}

/**
 * LES FILTRES SE COMBINENT, et c'est un ET, jamais un OU.
 *
 * Exigence de David : « les filtres peuvent etre combines entre eux ». Un OU donnerait
 * l'inverse de ce qu'on attend — poser un second filtre ELARGIRAIT la liste.
 *
 * Entreprise et Poste comparent par INCLUSION, pas par egalite : ce sont des champs de
 * saisie libre, et exiger « Carrefour » au caractere pres pour trouver « Carrefour
 * Market » rendrait le filtre inutile.
 */
export function filtrer(leads: readonly LeadProspection[], f: FiltresProspection): LeadProspection[] {
  const entreprise = normaliser(f.entreprise);
  const poste = normaliser(f.poste);
  return leads.filter((l) => {
    if (!correspondARecherche(l, f.recherche)) return false;
    if (f.statut === SANS_STATUT) { if (l.statut_id !== null) return false; }
    else if (f.statut !== '' && l.statut_id !== f.statut) return false;
    if (entreprise !== '' && !normaliser(l.entreprise).includes(entreprise)) return false;
    if (poste !== '' && !normaliser(l.poste).includes(poste)) return false;
    return true;
  });
}

/* ------------------------------------------------------------------- LE TRI */

/** Les cinq colonnes triables, exactement celles que David a nommees. */
export type ColonneTri = 'nom' | 'prenom' | 'entreprise' | 'poste' | 'statut';
export type SensTri = 'asc' | 'desc';

export const COLONNES_TRIABLES: readonly ColonneTri[] = ['nom', 'prenom', 'entreprise', 'poste', 'statut'];

/**
 * LA VALEUR SUR LAQUELLE ON TRIE.
 *
 * Pour le statut, on trie sur son NOM, jamais sur son identifiant : un uuid produirait un
 * ordre aleatoire aux yeux de l'utilisateur, alors que l'en-tete lui promet un classement.
 */
function cleDeTri(lead: LeadProspection, colonne: ColonneTri, statutsParId: Map<string, StatutProspection>): string {
  if (colonne === 'statut') {
    if (lead.statut_id === null) return '';
    return statutsParId.get(lead.statut_id)?.nom ?? '';
  }
  return lead[colonne] ?? '';
}

/**
 * LE TRI, AVEC DEUX REGLES QUI NE SE DEVINENT PAS.
 *
 * 1. LES VIDES FINISSENT TOUJOURS DERNIERS, dans les DEUX sens. Un prenom absent ou un
 *    « Sans statut » n'est pas une valeur « petite » : c'est une absence. Les laisser
 *    remonter en tete du tri croissant mettrait le vide avant l'information, ce qui est
 *    exactement l'inverse de ce qu'on cherche en triant.
 *
 * 2. LA COMPARAISON EST FRANCAISE ET INSENSIBLE A LA CASSE ET AUX ACCENTS.
 *    localeCompare('fr') classe « Éric » entre « Erable » et « Ernest », la ou une
 *    comparaison brute le rejetterait apres « Zoe » — les lettres accentuees ont un code
 *    superieur a 'z'. Sur un fichier de prospects francais, cela se voit tout de suite.
 *
 * Le tri est STABLE : on recopie avant de trier (Array.prototype.sort trie en place, et
 * muter la liste rendue par l'etat React provoquerait des rendus incoherents).
 */
export function trier(
  leads: readonly LeadProspection[],
  colonne: ColonneTri,
  sens: SensTri,
  statuts: readonly StatutProspection[],
): LeadProspection[] {
  const parId = new Map(statuts.map((s) => [s.id, s]));
  const facteur = sens === 'asc' ? 1 : -1;
  return [...leads].sort((a, b) => {
    const va = cleDeTri(a, colonne, parId);
    const vb = cleDeTri(b, colonne, parId);
    if (va === '' && vb === '') return 0;
    if (va === '') return 1;   // les vides derniers, dans les deux sens
    if (vb === '') return -1;
    return facteur * va.localeCompare(vb, 'fr', { sensitivity: 'base', numeric: true });
  });
}

/**
 * LA LISTE QU'ON AFFICHE : filtree PUIS triee.
 *
 * L'ordre des deux operations compte pour le cout, pas pour le resultat : trier avant de
 * filtrer trierait des lignes qu'on s'apprete a jeter.
 *
 * SURTOUT, c'est CETTE liste que la case d'en-tete doit selectionner — voir
 * idsSelectionnables ci-dessous.
 */
export function leadsAffiches(
  leads: readonly LeadProspection[],
  filtres: FiltresProspection,
  colonne: ColonneTri,
  sens: SensTri,
  statuts: readonly StatutProspection[],
): LeadProspection[] {
  return trier(filtrer(leads, filtres), colonne, sens, statuts);
}

/**
 * LES IDENTIFIANTS QUE LA CASE D'EN-TETE A LE DROIT DE SELECTIONNER.
 *
 * EXIGENCE EXPLICITE DE DAVID : « une checkbox dans l'en-tete pour selectionner tous les
 * leads ACTUELLEMENT VISIBLES ». Le pluriel compte : pas tous les leads de la Societe,
 * ceux que les filtres laissent voir.
 *
 * LE DEFAUT QUE CECI EMPECHE EST MESURE AILLEURS DANS LE DEPOT : le toggleAll de
 * ListeVendeurs.tsx — par ailleurs le meilleur gabarit du panel — selectionne TOUS les
 * enregistrements, pas les lignes affichees. Avec des filtres, sa case d'en-tete coche
 * donc des lignes INVISIBLES, et un « Supprimer la selection » en detruirait plus que ce
 * que l'utilisateur voit a l'ecran. C'est exactement ce que David a interdit.
 *
 * Cette fonction prend donc la liste DEJA FILTREE. Lui passer la liste complete est la
 * seule facon de se tromper, et le relevé le verifie.
 */
export function idsSelectionnables(leadsAffiches: readonly LeadProspection[]): string[] {
  return leadsAffiches.map((l) => l.id);
}

/**
 * L'ETAT DE LA CASE D'EN-TETE : vide, pleine, ou INDETERMINEE.
 *
 * L'etat indetermine n'est pas une coquetterie : sans lui, une selection partielle
 * affiche une case vide, et l'utilisateur qui clique croit TOUT selectionner alors qu'il
 * vient d'abord de tout deselectionner.
 */
export function etatCaseEnTete(
  leadsAffiches: readonly LeadProspection[],
  selection: ReadonlySet<string>,
): 'vide' | 'partielle' | 'toute' {
  if (leadsAffiches.length === 0) return 'vide';
  let comptees = 0;
  for (const l of leadsAffiches) if (selection.has(l.id)) comptees++;
  if (comptees === 0) return 'vide';
  return comptees === leadsAffiches.length ? 'toute' : 'partielle';
}

/**
 * CE QUE LA SUPPRESSION GROUPEE A LE DROIT D'EFFACER.
 *
 * On ne supprime JAMAIS le contenu brut de la selection : un `Set` survit aux changements
 * de filtre, et peut donc contenir des identifiants que l'utilisateur ne voit plus — voire,
 * en Visu, des lignes d'une autre Societe chargees avant un changement de contexte.
 *
 * On intersecte donc la selection avec ce qui est REELLEMENT affiche. C'est la premiere
 * des trois protections ; les deux autres sont le `.eq('company_id', …)` de la requete et
 * la RLS. Aucune des trois ne rend les autres inutiles : pour Talvex, qui a une politique
 * `FOR ALL` sans condition de Societe, les deux premieres sont les seules qui bornent.
 */
export function idsASupprimer(
  leadsAffiches: readonly LeadProspection[],
  selection: ReadonlySet<string>,
): string[] {
  return leadsAffiches.filter((l) => selection.has(l.id)).map((l) => l.id);
}

/* --------------------------------------------------------------- LE LIEN */

/**
 * UN LIEN N'EST OUVRABLE QUE S'IL EST http OU https.
 *
 * La base porte deja ce refus (contrainte crm_prospection_leads_lien_http), et c'est elle
 * l'autorite. Mais une ligne peut arriver ici par un chemin que la contrainte n'a pas
 * encore vu — une restauration de sauvegarde, une ecriture directe, une ligne plus
 * ancienne que la contrainte. Rendre `javascript:` dans un href en ferait du code execute
 * au clic, dans la session de qui ouvre le tableau.
 *
 * Deux garde-fous pour une seule regle : c'est volontaire, et c'est la meme logique que
 * pour la suppression groupee.
 */
export function lienOuvrable(lien: string | null | undefined): boolean {
  if (!lien) return false;
  return /^https?:\/\//i.test(lien.trim());
}

/**
 * CE QU'ON AFFICHE A LA PLACE DE L'URL ENTIERE.
 *
 * Une URL de profil LinkedIn depasse facilement 60 caracteres et ferait exploser la
 * largeur de la colonne. On montre l'hote, qui dit l'essentiel — « linkedin.com »,
 * « instagram.com » — et le lien complet reste dans l'attribut title.
 */
export function hoteDuLien(lien: string): string {
  try {
    return new URL(lien).hostname.replace(/^www\./, '');
  } catch {
    /* Une adresse que le navigateur lui-meme ne sait pas lire : on rend le texte brut
       plutot que rien, pour que l'utilisateur voie ce qui est enregistre et le corrige. */
    return lien;
  }
}

/* --------------------------------------------------------- LE COMMENTAIRE */

/** Au-dela, la cellule devient illisible et la ligne grandit. Mesure de confort, pas de securite. */
export const COMMENTAIRE_APERCU = 60;

/** Vrai si le commentaire est trop long pour tenir dans une cellule. */
export function commentaireTronque(commentaire: string | null | undefined): boolean {
  return (commentaire ?? '').trim().length > COMMENTAIRE_APERCU;
}

/**
 * L'APERCU AFFICHE DANS LA CELLULE.
 *
 * Les retours a la ligne sont remplaces par des espaces : un commentaire sur trois lignes
 * ferait grandir la ligne du tableau de trois hauteurs, ce que David a explicitement
 * demande d'eviter. Le texte entier reste accessible d'un clic.
 */
export function apercuCommentaire(commentaire: string | null | undefined): string {
  const texte = (commentaire ?? '').replace(/\s+/g, ' ').trim();
  if (texte.length <= COMMENTAIRE_APERCU) return texte;
  return texte.slice(0, COMMENTAIRE_APERCU).trimEnd() + '…';
}
