/**
 * Module CRM Immo — types miroir du schema, et la liste des colonnes SYSTEME.
 *
 * Quatre tables, toutes cloisonnees par company_id avec ON DELETE CASCADE, et douze
 * policies qui leur sont propres. Rien n'est partage avec le CRM classique, les leads
 * ou les clients : c'est la regle fondatrice du module.
 */

/** Les quatre types de colonne personnalisee que la base accepte (CHECK crm_immo_colonnes_type_connu). */
export type TypeColonne = 'texte' | 'nombre' | 'date' | 'oui_non';

export const TYPES_COLONNE: { valeur: TypeColonne; libelle: string }[] = [
  { valeur: 'texte', libelle: 'Texte' },
  { valeur: 'nombre', libelle: 'Nombre / montant' },
  { valeur: 'date', libelle: 'Date' },
  { valeur: 'oui_non', libelle: 'Oui / Non' },
];

/** Ligne de `crm_immo_dossiers`. Miroir exact du schema. */
export interface DossierImmo {
  id: string;
  company_id: string;
  /* Les 10 champs systeme, dans l'ordre du brief. */
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  date_entree: string | null;
  date_fin_contrat: string | null;
  locataire: string | null;
  proprietaire: string | null;
  /** Jour du mois, 1 a 31. V1 : mensuel. */
  jour_encaissement: number | null;
  commentaire: string | null;
  /**
   * Valeurs des colonnes personnalisees, indexees par l'ID de la colonne.
   *
   * La cle est l'id et non le nom : renommer une colonne ne reecrit donc AUCUN dossier.
   * Une cle orpheline — colonne supprimee — reste inerte : elle n'est jamais lue, et
   * supprimer une colonne ne declenche aucune reecriture de masse.
   */
  valeurs: Record<string, string | number | boolean | null>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Ligne de `crm_immo_colonnes` : une colonne personnalisee. */
export interface ColonneImmo {
  id: string;
  company_id: string;
  nom: string;
  type: TypeColonne;
  position: number;
  masquee: boolean;
  created_at: string;
}

/** Ligne de `crm_immo_etats` : ce qu'un humain a fait d'une alerte. */
export interface EtatImmo {
  id: string;
  company_id: string;
  dossier_id: string;
  genre: 'fin_contrat' | 'loyer';
  periode: string;
  lue_le: string | null;
  traitee_le: string | null;
  created_at: string;
}

/** Les champs systeme reellement modifiables par le formulaire. */
export type ChampSysteme =
  | 'nom' | 'prenom' | 'email' | 'telephone'
  | 'date_entree' | 'date_fin_contrat'
  | 'locataire' | 'proprietaire' | 'jour_encaissement' | 'commentaire';

export interface DefinitionSysteme {
  cle: ChampSysteme;
  libelle: string;
  type: TypeColonne;
  /**
   * `nom` est NOT NULL en base : le masquer laisserait des lignes sans rien pour les
   * identifier. C'est le seul champ non masquable.
   */
  masquable: boolean;
}

/**
 * LES 10 COLONNES SYSTEME, dans l'ordre du brief de David.
 *
 * Elles ne sont PAS des lignes de crm_immo_colonnes : ce sont de vraies colonnes de
 * crm_immo_dossiers. Elles sont donc STRUCTURELLEMENT hors d'atteinte du bouton
 * Supprimer — pas protegees par un drapeau qu'un bug pourrait contourner.
 */
export const COLONNES_SYSTEME: DefinitionSysteme[] = [
  { cle: 'nom', libelle: 'Nom du client', type: 'texte', masquable: false },
  { cle: 'prenom', libelle: 'Prénom', type: 'texte', masquable: true },
  { cle: 'email', libelle: 'Email', type: 'texte', masquable: true },
  { cle: 'telephone', libelle: 'Téléphone', type: 'texte', masquable: true },
  { cle: 'date_entree', libelle: "Date d'entrée", type: 'date', masquable: true },
  { cle: 'date_fin_contrat', libelle: 'Fin de contrat', type: 'date', masquable: true },
  { cle: 'locataire', libelle: 'Locataire', type: 'texte', masquable: true },
  { cle: 'proprietaire', libelle: 'Propriétaire', type: 'texte', masquable: true },
  { cle: 'jour_encaissement', libelle: 'Encaissement loyer', type: 'nombre', masquable: true },
  { cle: 'commentaire', libelle: 'Commentaire', type: 'texte', masquable: true },
];

/** Ce que le formulaire renvoie : les 10 champs systeme, plus les valeurs personnalisees. */
export interface SaisieDossier {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date_entree: string;
  date_fin_contrat: string;
  locataire: string;
  proprietaire: string;
  /** Chaine, parce qu'un champ de formulaire vide doit rester distinct de 0. */
  jour_encaissement: string;
  commentaire: string;
  valeurs: Record<string, string>;
}

export const SAISIE_VIDE: SaisieDossier = {
  nom: '', prenom: '', email: '', telephone: '',
  date_entree: '', date_fin_contrat: '',
  locataire: '', proprietaire: '', jour_encaissement: '', commentaire: '',
  valeurs: {},
};

/** Une date 'AAAA-MM-JJ' en jj/mm/aaaa, sans dependre de la locale du poste. */
export function formatDateImmo(iso: string | null): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '—';
  return `${m[3]}/${m[2]}/${m[1]}`;
}
