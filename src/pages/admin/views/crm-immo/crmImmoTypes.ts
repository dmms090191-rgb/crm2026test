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
  { cle: 'nom', libelle: 'Nom locataire', type: 'texte', masquable: false },
  { cle: 'prenom', libelle: 'Prénom locataire', type: 'texte', masquable: true },
  { cle: 'email', libelle: 'Email', type: 'texte', masquable: true },
  { cle: 'telephone', libelle: 'Téléphone', type: 'texte', masquable: true },
  { cle: 'date_entree', libelle: "Date d'entrée", type: 'date', masquable: true },
  { cle: 'date_fin_contrat', libelle: 'Fin de contrat', type: 'date', masquable: true },
  /*
   * ---------- QUATRE CHAMPS, DEUX PERSONNES ----------
   *
   * Le module suit un bail : il y a un LOCATAIRE et un PROPRIETAIRE, et chacun a un nom
   * et un prenom. Les quatre libelles le disent desormais sans abreviation :
   *
   *     nom          -> Nom locataire
   *     prenom       -> Prénom locataire
   *     locataire    -> Nom propriétaire
   *     proprietaire -> Prénom propriétaire
   *
   * ATTENTION, et c'est deliberé : les deux dernieres CLES ne disent plus ce que leur
   * libelle affiche. La colonne SQL `locataire` porte le nom du PROPRIETAIRE, et
   * `proprietaire` son prenom.
   *
   * C'est le choix de David, et il est le bon : renommer ces colonnes exigerait une
   * migration, casserait les sauvegardes deja prises et les restaurations qui les
   * relisent, et ne changerait rien a ce que l'utilisateur lit. Un libelle se corrige
   * sans risque ; une colonne, non.
   *
   * Ce libelle sert a QUATRE endroits a la fois — l'en-tete du tableau, les cartes
   * mobiles, le formulaire du dossier et l'organisateur de colonnes — parce que tous
   * lisent `d.libelle` via toutesLesColonnes(). Les changer ici les change partout,
   * ensemble. C'est ce qui garantit qu'aucun ecran ne garde l'ancien vocabulaire.
   */
  { cle: 'locataire', libelle: 'Nom propriétaire', type: 'texte', masquable: true },
  { cle: 'proprietaire', libelle: 'Prénom propriétaire', type: 'texte', masquable: true },
  { cle: 'jour_encaissement', libelle: 'Encaissement loyer', type: 'nombre', masquable: true },
  { cle: 'commentaire', libelle: 'Commentaire', type: 'texte', masquable: true },
];

/**
 * Ligne de `crm_immo_commentaires`. Miroir exact du schema.
 *
 * Un commentaire ne se MODIFIE pas : on en ajoute, on en supprime. C'est ce qui en fait
 * un historique plutot qu'une note. Il n'y a donc ni `updated_at` ni formulaire d'edition.
 */
export interface CommentaireImmo {
  id: string;
  company_id: string;
  dossier_id: string;
  contenu: string;
  created_at: string;
  created_by: string | null;
}

/** La borne du CHECK `crm_immo_commentaires_contenu_borne`, pour l'annoncer AVANT le refus. */
export const COMMENTAIRE_MAX = 5000;

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

/**
 * Les memes regles que les CHECK de la base, dans le meme ordre.
 *
 * Valider deux fois n'est pas une redondance : la base refuse de toute facon — on ne peut
 * donc pas contourner la regle — mais son refus revient sous la forme d'un message
 * Postgres que personne ne comprend. Valider ici offre une phrase SANS perdre la garantie.
 *
 * Partagee par les DEUX modales qui montrent un dossier. Une seconde copie finirait par
 * diverger des contraintes qu'elle est censee annoncer.
 */
export function problemeDeSaisie(s: SaisieDossier): string {
  if (s.nom.trim() === '') return 'Le nom du client est obligatoire.';
  const j = s.jour_encaissement.trim();
  if (j !== '') {
    const n = Number(j);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      return "Le jour d'encaissement doit être un entier entre 1 et 31.";
    }
  }
  if (s.date_entree && s.date_fin_contrat && s.date_fin_contrat < s.date_entree) {
    return "La fin de contrat ne peut pas précéder la date d'entrée.";
  }
  return '';
}

/** Un instant ISO en « 03/03/2026 à 14:32 », sans dependre de la locale du poste. */
export function dateEtHeure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const DEUX = (n: number) => String(n).padStart(2, '0');
  return `${DEUX(d.getDate())}/${DEUX(d.getMonth() + 1)}/${d.getFullYear()} à ${DEUX(d.getHours())}:${DEUX(d.getMinutes())}`;
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
