import type { ColonneTri } from '../../../../lib/crmProspectionRecherche';

/**
 * LES COLONNES DU TABLEAU, DANS L'ORDRE DEMANDE PAR DAVID.
 *
 * POURQUOI CE FICHIER N'EST PAS UN .tsx. Il n'exporte que des DONNEES. Les poser dans
 * CrmProspectionTable.tsx, a cote de son composant, ferait lever
 * react-refresh/only-export-components — un avertissement de plus, pour une liste qui a
 * sa place ici. C'est la meme raison qui a sorti `importCrmImmo` de CrmImmoGate.
 *
 * ET SURTOUT : le relevé lit cette liste directement, sous `node --test`, pour verifier
 * l'ORDRE des colonnes sans monter de navigateur. Une liste enfermee dans un composant ne
 * se verifierait qu'a l'oeil.
 *
 * La case de selection et la colonne Actions n'y figurent pas : elles encadrent le
 * tableau, ne se trient pas, et leur rendu n'a rien de commun avec une colonne de donnee.
 */
export interface ColonneProspection {
  /** Le nom de la propriete du lead, ou 'statut' pour la pastille. */
  cle: string;
  /** Ce que lit l'utilisateur. */
  libelle: string;
  /** Present si l'en-tete est cliquable. Les cinq colonnes nommees par David. */
  tri?: ColonneTri;
}

export const COLONNES_PROSPECTION: readonly ColonneProspection[] = [
  { cle: 'nom', libelle: 'Nom', tri: 'nom' },
  { cle: 'prenom', libelle: 'Prénom', tri: 'prenom' },
  { cle: 'email', libelle: 'Email' },
  { cle: 'poste', libelle: 'Poste', tri: 'poste' },
  /*
   * « Societe » A L'ECRAN, `entreprise` EN BASE.
   *
   * Dans Talvex, « Societe » designe le locataire : la table companies, la colonne
   * company_id, le niveau de role. Ici le mot designe l'EMPLOYEUR DU PROSPECT. Le nom
   * technique differe a dessein, pour que personne ne confonde les deux dans six mois —
   * et la confusion porterait precisement sur la cle d'isolation.
   */
  { cle: 'entreprise', libelle: 'Société', tri: 'entreprise' },
  { cle: 'lien', libelle: 'Lien' },
  { cle: 'statut', libelle: 'Statut', tri: 'statut' },
  /*
   * Commentaire NE SE TRIE PAS. Sa cellule affiche un apercu tronque, parfois un bouton :
   * trier dessus reordonnerait les lignes selon un texte que personne ne lit en entier.
   * Un en-tete cliquable qui produit un ordre incomprehensible est pire qu'un en-tete
   * inerte. Meme raisonnement que pour la colonne Commentaire du CRM Immo.
   *
   * Email non plus : David a nomme cinq colonnes triables, et Email n'en fait pas partie.
   */
  { cle: 'commentaire', libelle: 'Commentaire' },
];
