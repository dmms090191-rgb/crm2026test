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
  /**
   * Le telephone du PROPRIETAIRE — a ne pas confondre avec `telephone`, qui est celui du
   * LOCATAIRE. Cette cle-ci dit ce qu'elle porte, contrairement aux deux du dessus.
   */
  telephone_proprietaire: string | null;
  /**
   * LES DEUX COLONNES CANONIQUES DE NOM COMPLET — la source de verite du nom affiche.
   *
   * Elles portent la chaine TELLE QUE SAISIE dans le champ unique << Nom prenom
   * locataire >> / << Nom prenom proprietaire >>. Aucune regle ne les decoupe, jamais :
   * voir crmImmoIdentite.ts pour la mesure qui l'interdit.
   *
   * ---------- POURQUOI `?` ET POURQUOI ELLES SONT NULLES PARTOUT ----------
   *
   * David a choisi la garde de modification plutot qu'un backfill : AUCUNE donnee n'a
   * ete ecrite a la migration. Tout dossier non renomme depuis porte donc null ici, et
   * s'affiche par la COMPOSITION des quatre anciennes colonnes — c'est-a-dire
   * exactement comme avant. La precedence est dans nomCanonique, et nulle part ailleurs.
   *
   * Le `?` n'est pas une coquetterie : il rend le code correct AVANT comme APRES la
   * migration. Tant que la colonne n'existe pas, `select('*')` ne la rend pas, la valeur
   * est `undefined`, et la composition reprend la main sans qu'une seule ligne change.
   *
   * ---------- LES QUATRE ANCIENNES COLONNES NE SONT PAS MORTES ----------
   *
   * `nom` reste NOT NULL avec un CHECK de non-vacuite : a la CREATION, la canonique y
   * est recopiee VERBATIM (et dans `locataire` pour le proprietaire), les deux moities
   * de prenom restant nulles. C'est la seule facon de respecter a la fois
   * << aucun decoupage >> et la contrainte de la base. A l'UPDATE, en revanche, elles ne
   * sont plus touchees.
   */
  nom_complet_locataire?: string | null;
  nom_complet_proprietaire?: string | null;
  /** Jour du mois, 1 a 31. V1 : mensuel. */
  jour_encaissement: number | null;
  commentaire: string | null;
  /**
   * `cheque` | `especes` | `virement`, ou null si non renseigne.
   *
   * Le type reste `string | null` et non `ModePaiement | null` : ce qui arrive de la base
   * n'est pas verifie par TypeScript, et se declarer une garantie qu'on n'a pas fait
   * tomber l'interface sur une valeur inattendue au lieu de l'afficher vide. La
   * contrainte SQL, elle, est reelle.
   */
  mode_paiement: string | null;
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
  /* Les deux canoniques de nom complet, arrivees le 28/10/2026. Les quatre cles
     ci-dessus RESTENT : elles existent en base, versSaisie les lit et versLigne les
     recopie telles quelles. Elles ont seulement quitte le formulaire visible. */
  | 'nom_complet_locataire' | 'nom_complet_proprietaire'
  | 'date_entree' | 'date_fin_contrat'
  | 'locataire' | 'proprietaire' | 'telephone_proprietaire'
  | 'jour_encaissement' | 'commentaire'
  | 'mode_paiement';

/**
 * LE MODE DE PAIEMENT — trois valeurs, et deux ecritures qu'il ne faut pas confondre.
 *
 * La valeur TECHNIQUE est sans accent : c'est elle qui va en base, c'est elle que la
 * contrainte SQL crm_immo_dossiers_mode_paiement_connu accepte, et c'est elle qu'on
 * compare. Mettre l'accent en base rendrait toute comparaison dependante de la
 * normalisation Unicode — « Chèque » peut s'ecrire de deux facons en UTF-8, et les deux
 * ne sont pas egales octet pour octet.
 *
 * Le LIBELLE porte l'accent, et ne sert qu'a l'affichage.
 *
 * NULL n'est pas une quatrieme valeur : c'est l'absence de renseignement, et les anciens
 * dossiers ont le droit d'y rester.
 */
export type ModePaiement = 'cheque' | 'especes' | 'virement';

export const MODES_PAIEMENT: { valeur: ModePaiement; libelle: string }[] = [
  { valeur: 'cheque', libelle: 'Chèque' },
  { valeur: 'especes', libelle: 'Espèces' },
  { valeur: 'virement', libelle: 'Virement' },
];

/**
 * Ce qu'une definition porte, qu'elle decrive un champ du formulaire ou une colonne du
 * tableau. Rien de plus : ce qui distingue les deux, c'est la CLE.
 */
interface DefinitionCommune {
  libelle: string;
  type: TypeColonne;
  /**
   * `nom` est NOT NULL en base : le masquer laisserait des lignes sans rien pour les
   * identifier. C'est le seul champ non masquable.
   */
  masquable: boolean;
  /**
   * La liste fermee des valeurs, quand la colonne en a une.
   *
   * Sa presence est ce qui rend une colonne MODIFIABLE PAR MENU dans le tableau : ni un
   * nom, ni une cle en dur quelque part dans l'interface. Ajouter demain une seconde
   * colonne a choix ne demandera donc aucune ligne dans le tableau ni dans les cartes.
   */
  choix?: readonly { valeur: string; libelle: string }[];
}

/**
 * UN CHAMP DU FORMULAIRE. Sa cle est forcement une vraie colonne de crm_immo_dossiers :
 * on ne peut pas SAISIR une colonne composee, qui n'existe nulle part en SQL. Le type le
 * rend impossible, plutot que de compter sur la vigilance a l'ecriture.
 */
/**
 * Les trois groupes du formulaire, demandes par David le 28/10/2026 : « je veux une
 * presentation logique et compacte, pas des champs disperses ».
 *
 * Le groupe ne touche A AUCUNE CLE SQL. C'est un fait d'affichage, pose AU-DESSUS des
 * cles — y compris des deux qui mentent sur leur contenu (`locataire` = nom du
 * proprietaire, `proprietaire` = son prenom). Les renommer exigerait une migration et
 * casserait les sauvegardes deja prises ; les RANGER ne coute rien.
 */
export type GroupeChamp = 'locataire' | 'proprietaire' | 'contrat';

export const GROUPES_FORMULAIRE: { cle: GroupeChamp; titre: string }[] = [
  { cle: 'locataire', titre: 'Locataire' },
  { cle: 'proprietaire', titre: 'Propriétaire' },
  { cle: 'contrat', titre: 'Contrat et loyer' },
];

export interface DefinitionChamp extends DefinitionCommune {
  cle: ChampSysteme;
  /**
   * OBLIGATOIRE, et c'est tout l'interet.
   *
   * Un champ ajoute demain sans groupe ne compile pas. Rendu optionnel, il atterrirait en
   * silence hors de toute section — ou pire, dans la premiere — et personne ne le verrait
   * avant une capture d'ecran. Le compilateur fait ici le travail d'un releve, en amont.
   */
  groupe: GroupeChamp;
}

/** UNE COLONNE DU TABLEAU. Sa cle peut etre composee, et donc absente de la base. */
export interface DefinitionSysteme extends DefinitionCommune {
  cle: ChampSysteme | ColonneComposee;
  /**
   * Les deux champs reels qu'une colonne COMPOSEE reunit a l'affichage.
   *
   * La base garde ses colonnes separees : la fusion est un fait d'affichage, et rien
   * d'autre. Le formulaire continue donc de saisir un nom et un prenom distincts, et
   * aucune migration n'a ete necessaire pour cette partie-la.
   */
  composeDe?: readonly [ChampSysteme, ChampSysteme];
  /**
   * La colonne SQL de nom complet qui PRIME sur la composition, quand elle est remplie.
   *
   * Une colonne composee en a une depuis le 28 octobre 2026 ; les autres n'en ont pas.
   * La precedence est appliquee par valeurAffichee, et par elle seule : voir
   * crmImmoRecherche.ts pour la raison exacte de ne PAS remplacer `composeDe`.
   */
  canonique?: ChampSysteme;
}

/** Les colonnes du tableau qui n'existent pas en base : elles en reunissent deux. */
export type ColonneComposee = 'np_locataire' | 'np_proprietaire';

/**
 * ---------- QUATRE CHAMPS, DEUX PERSONNES, ET DES CLES QUI MENTENT ----------
 *
 * Le module suit un bail : il y a un LOCATAIRE et un PROPRIETAIRE, chacun avec un nom et
 * un prenom. Les quatre colonnes SQL sont :
 *
 *     nom                    -> le nom      du LOCATAIRE
 *     prenom                 -> le prenom   du LOCATAIRE
 *     telephone              -> le TELEPHONE du LOCATAIRE
 *     locataire              -> le nom      du PROPRIETAIRE   <-- la cle ne dit pas son contenu
 *     proprietaire           -> le prenom   du PROPRIETAIRE   <-- idem
 *     telephone_proprietaire -> le TELEPHONE du PROPRIETAIRE
 *
 * Les deux cles marquees ne disent PAS ce qu'elles portent, et c'est assume : les
 * renommer exigerait une migration, casserait les sauvegardes deja prises et les
 * restaurations qui les relisent, et ne changerait rien a ce que l'utilisateur lit.
 * Un libelle se corrige sans risque ; une colonne, non.
 *
 * `telephone_proprietaire`, ajoute le 27/10/2026, ne reprend PAS ce travers : sa cle dit
 * son contenu. Reproduire l'ambiguite par souci de symetrie aurait ete le pire choix.
 *
 * CONSEQUENCE SUR LES LIBELLES : tant qu'il n'y avait qu'un telephone, « Telephone » se
 * suffisait. Des qu'il y en a deux, le libelle nu devient ambigu — et c'est l'ajout qui
 * cree l'ambiguite, donc c'est a lui de la lever. Les deux portent desormais la personne,
 * comme « N/P locataire » et « N/P proprietaire » le faisaient deja.
 */

/**
 * LES CHAMPS DU FORMULAIRE — ce qu'on SAISIT.
 *
 * ---------- POURQUOI DEUX LISTES, ET PAS UNE ----------
 *
 * Jusqu'au 23 octobre 2026 cette liste etait AUSSI celle des colonnes du tableau. C'etait
 * tenable tant que les deux disaient la meme chose. Elles ne le disent plus : David veut
 * voir UNE colonne « N/P locataire », et continuer a saisir un nom et un prenom separes.
 *
 * Confondre les deux obligerait a choisir entre un tableau trop large et un formulaire qui
 * perd la distinction nom/prenom. Les separer coute une liste de plus et rend chacune
 * lisible : ici ce qu'on ecrit, plus bas ce qu'on lit.
 */
export const CHAMPS_DOSSIER: DefinitionChamp[] = [
  /* ---- Locataire ----
     UN SEUL CHAMP DE NOM, depuis le 28/10/2026. Les cles `nom` et `prenom` existent
     toujours en base et ne sont PAS supprimees : elles ont quitte le formulaire, pas le
     schema. Le champ unique ecrit `nom_complet_locataire` ; a la creation, sa valeur est
     recopiee VERBATIM dans `nom` parce que cette colonne est NOT NULL avec un CHECK de
     non-vacuite. Rien n'est jamais decoupe : voir crmImmoIdentite.ts. */
  { cle: 'nom_complet_locataire', libelle: 'Nom prénom locataire', type: 'texte', masquable: false, groupe: 'locataire' },
  { cle: 'email', libelle: 'Email', type: 'texte', masquable: true, groupe: 'locataire' },
  { cle: 'telephone', libelle: 'Téléphone locataire', type: 'texte', masquable: true, groupe: 'locataire' },

  /* ---- Proprietaire ----
     Meme principe. Les cles `locataire` et `proprietaire` — qui portent le NOM et le
     PRENOM du proprietaire, et qu'on ne renomme JAMAIS — restent en base et ne sont plus
     affichees. */
  { cle: 'nom_complet_proprietaire', libelle: 'Nom prénom propriétaire', type: 'texte', masquable: true, groupe: 'proprietaire' },
  { cle: 'telephone_proprietaire', libelle: 'Téléphone propriétaire', type: 'texte', masquable: true, groupe: 'proprietaire' },

  /* ---- Contrat et loyer ----
     LES DEUX DATES SONT CE QUI DISPERSAIT LA FICHE. Elles s'intercalaient entre le bloc
     locataire et le bloc proprietaire : on lisait un nom, un prenom, puis deux dates de
     bail, puis un autre nom. Les regrouper ici est ce qui regle reellement la plainte —
     les titres ne font que le rendre visible.

     `jour_encaissement` n'etait pas dans la liste de David du 28/10. Je le garde ici : le
     retirer du formulaire supprimerait un champ existant, et il appartient manifestement a
     ce groupe. A lui de dire s'il le voulait ailleurs.

     `commentaire` reste DERNIER : seul textarea, donc seul champ en `sm:col-span-2`. Une
     case pleine largeur au milieu d'un groupe casserait l'appariement des suivants. */
  { cle: 'date_entree', libelle: "Date d'entrée", type: 'date', masquable: true, groupe: 'contrat' },
  { cle: 'date_fin_contrat', libelle: 'Fin de contrat', type: 'date', masquable: true, groupe: 'contrat' },
  { cle: 'jour_encaissement', libelle: 'Encaissement loyer', type: 'nombre', masquable: true, groupe: 'contrat' },
  { cle: 'mode_paiement', libelle: 'Mode de paiement', type: 'texte', masquable: true, choix: MODES_PAIEMENT, groupe: 'contrat' },
  { cle: 'commentaire', libelle: 'Commentaire', type: 'texte', masquable: true, groupe: 'contrat' },
];

/**
 * LES COLONNES DU TABLEAU — ce qu'on LIT, dans l'ordre demande par David.
 *
 * Elles ne sont PAS des lignes de crm_immo_colonnes : ce sont de vraies colonnes de
 * crm_immo_dossiers, ou la reunion de deux d'entre elles. Elles sont donc
 * STRUCTURELLEMENT hors d'atteinte du bouton Supprimer — pas protegees par un drapeau
 * qu'un bug pourrait contourner.
 *
 * DEUX COLONNES SONT COMPOSEES, et la base n'en sait rien : `np_locataire` et
 * `np_proprietaire` n'existent nulle part en SQL. Elles reunissent a l'affichage deux
 * champs restes separes. Aucune migration n'a ete faite pour cette fusion, et c'est
 * voulu — elle est reversible d'une ligne, ce qu'une migration ne serait pas.
 *
 * `mode_paiement`, lui, EXISTE en base depuis la migration 20261023000021. Il portait
 * auparavant une colonne PERSONNALISEE de type texte libre, incapable d'imposer trois
 * valeurs ; sa valeur a ete reprise et la colonne personnalisee retiree, pour qu'il n'y
 * ait qu'UNE source de verite.
 */
export const COLONNES_SYSTEME: DefinitionSysteme[] = [
  {
    cle: 'np_locataire', libelle: 'N/P locataire', type: 'texte', masquable: false,
    composeDe: ['nom', 'prenom'], canonique: 'nom_complet_locataire',
  },
  { cle: 'email', libelle: 'Email', type: 'texte', masquable: true },
  { cle: 'telephone', libelle: 'Téléphone locataire', type: 'texte', masquable: true },
  { cle: 'date_entree', libelle: "Date d'entrée", type: 'date', masquable: true },
  { cle: 'date_fin_contrat', libelle: 'Fin de contrat', type: 'date', masquable: true },
  {
    /* Rappel du bloc ci-dessus : ce sont bien `locataire` et `proprietaire` qui portent
       le nom et le prenom du PROPRIETAIRE. L'ordre est nom puis prenom, comme « N/P ». */
    cle: 'np_proprietaire', libelle: 'N/P propriétaire', type: 'texte', masquable: true,
    composeDe: ['locataire', 'proprietaire'], canonique: 'nom_complet_proprietaire',
  },
  /*
   * Juste apres le N/P du proprietaire, pour la meme raison que dans le formulaire : on
   * lit une personne, pas une liste de champs.
   *
   * Libelle ECRIT EN ENTIER, ici comme dans le formulaire. J'avais d'abord abrege les
   * en-tetes en « Tel. » pour gagner des pixels ; David a demande « telephone locataire »
   * en toutes lettres. Un en-tete se lit en diagonale : l'abreviation economisait de la
   * largeur dans un tableau qui defile deja horizontalement, donc elle ne reglait rien et
   * coutait en lisibilite.
   */
  { cle: 'telephone_proprietaire', libelle: 'Téléphone propriétaire', type: 'texte', masquable: true },
  { cle: 'jour_encaissement', libelle: 'Encaissement loyer', type: 'nombre', masquable: true },
  { cle: 'commentaire', libelle: 'Commentaire', type: 'texte', masquable: true },
  { cle: 'mode_paiement', libelle: 'Mode de paiement', type: 'texte', masquable: true, choix: MODES_PAIEMENT },
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
  telephone_proprietaire: string;
  /**
   * LES DEUX CHAMPS UNIQUES, seuls noms que l'utilisateur voit et remplit.
   *
   * Les quatre champs ci-dessus restent dans ce type, et c'est VOULU : versSaisie les
   * lit depuis la base et versLigne les recopie, donc un dossier ouvert puis enregistre
   * les rend inchanges. Les retirer d'ici les ferait disparaitre de l'aller-retour, et
   * l'UPDATE les aurait mis a null — exactement la perte qu'on refuse.
   */
  nom_complet_locataire: string;
  nom_complet_proprietaire: string;
  /** Chaine, parce qu'un champ de formulaire vide doit rester distinct de 0. */
  jour_encaissement: string;
  commentaire: string;
  /** Chaine vide = « non renseigne », qui deviendra NULL en base. */
  mode_paiement: string;
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
  /*
   * C'EST LA CANONIQUE QU'ON VALIDE, plus `nom`.
   *
   * `nom` n'est plus saisi : a la creation il recoit la canonique, a la modification il
   * n'est pas touche. Continuer a valider `nom` aurait grise le bouton Enregistrer EN
   * PERMANENCE sur un dossier dont la canonique est remplie mais dont `nom` arriverait
   * vide — et rien a l'ecran n'aurait explique pourquoi, les deux modales partageant
   * cette seule validation.
   */
  if (s.nom_complet_locataire.trim() === '') return 'Le nom du locataire est obligatoire.';
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
  locataire: '', proprietaire: '', telephone_proprietaire: '',
  nom_complet_locataire: '', nom_complet_proprietaire: '',
  jour_encaissement: '', commentaire: '',
  mode_paiement: '',
  valeurs: {},
};

/** Une date 'AAAA-MM-JJ' en jj/mm/aaaa, sans dependre de la locale du poste. */
export function formatDateImmo(iso: string | null): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '—';
  return `${m[3]}/${m[2]}/${m[1]}`;
}
