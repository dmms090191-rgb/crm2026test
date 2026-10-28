
/**
 * L'ECHEANCIER D'UN BAIL — la seule source de calcul.
 *
 * ---------- UNE SEULE, ET C'EST LE POINT ----------
 *
 * Trois endroits ont besoin de savoir quels loyers existent, combien ils sont, et ou
 * l'on en est : l'onglet Echeancier, l'apercu du formulaire, et la numerotation des
 * notifications (<< 4e loyer sur 12 >>). S'ils calculaient chacun de leur cote, ils
 * finiraient par donner trois reponses — et la plus probable des divergences n'est pas
 * une erreur de code, c'est un mois court oublie quelque part.
 *
 * Ce fichier est donc le seul a produire des echeances. Il ne stocke rien : un bail de
 * trois ans ne pose aucune ligne en base, il se recalcule a la demande.
 *
 * ---------- IL NE REFAIT PAS LE RABATTEMENT ----------
 *
 * `jourRabattu` existe depuis l'origine du module et gere les mois courts, les annees
 * bissextiles et la regle des siecles. On l'appelle, on ne la reecrit pas : deux
 * implementations du 31 fevrier, c'est la garantie qu'un jour elles differeront.
 */

/* ---------------------------------------------------------------------------
   LES PRIMITIVES DE DATE
   ---------------------------------------------------------------------------

   Elles vivaient dans crmImmoAlertes jusqu'au 22 octobre 2026. Elles ont demenage ici
   parce que l'echeancier en a besoin, et que les alertes ont besoin de l'echeancier
   pour numeroter leurs loyers : les laisser la-bas creait un cycle d'imports.

   crmImmoAlertes les RE-EXPORTE, donc rien de ce qui les utilisait ne change. Il
   n'existe toujours qu'une seule implementation du 31 fevrier. */

/** Nombre de jours du mois. mois est 1-12, pas 0-11. */
export function dernierJourDuMois(annee: number, mois: number): number {
  /* Le jour 0 du mois suivant EST le dernier jour du mois courant, et Date.UTC
     gere les annees bissextiles — y compris la regle des siecles : 2000 est
     bissextile, 2100 ne l'est pas. */
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/** Le jour d'encaissement, rabattu sur le dernier jour du mois s'il le depasse. */
export function jourRabattu(jour: number, annee: number, mois: number): number {
  const dernier = dernierJourDuMois(annee, mois);
  return Math.min(Math.max(1, Math.trunc(jour)), dernier);
}

/** Decoupe une date 'AAAA-MM-JJ'. Rend null sur toute forme inattendue. */
export function lireJour(iso: string | null | undefined): { annee: number; mois: number; jour: number } | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const annee = Number(m[1]); const mois = Number(m[2]); const jour = Number(m[3]);
  if (mois < 1 || mois > 12) return null;
  if (jour < 1 || jour > dernierJourDuMois(annee, mois)) return null;
  return { annee, mois, jour };
}

/** Une echeance, avec sa place dans le contrat. */
export interface EcheanceLoyer {
  /** 1 pour le premier loyer du contrat. */
  numero: number;
  /** Le nombre TOTAL d'echeances du contrat — identique sur toutes les lignes. */
  total: number;
  /** 'AAAA-MM-JJ', la date reellement due (deja rabattue sur les mois courts). */
  date: string;
}

/** Une periode de bail, telle que la portent le dossier et crm_immo_contrats. */
export interface PeriodeContrat {
  debut: string | null | undefined;
  fin: string | null | undefined;
  jour: number | null | undefined;
}

/*
 * Un bail ne depasse pas cinquante ans. La borne n'est pas une regle metier, c'est un
 * garde-fou : une date abimee en base ne doit pas faire tourner une boucle a l'infini
 * dans le navigateur de quelqu'un.
 */
const PLAFOND_ECHEANCES = 600;

/** Le mois suivant. Decembre passe a janvier de l'annee d'apres. */
function moisSuivant(annee: number, mois: number): { annee: number; mois: number } {
  return mois === 12 ? { annee: annee + 1, mois: 1 } : { annee, mois: mois + 1 };
}

function deuxChiffres(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * TOUTES les echeances d'un bail, numerotees.
 *
 * Le nombre total n'est JAMAIS saisi : il tombe de la periode. Un bail du 06/10 au
 * 20/10 avec un loyer au 20 produit UN loyer ; un bail d'un an en produit douze ; un
 * bail de dix-huit mois, dix-huit. Et le total est le nombre REEL d'echeances comprises
 * entre les deux dates, pas un nombre de mois theorique — un bail du 25/01 au 05/02
 * avec un loyer au 20 n'en contient aucune, et le dit.
 *
 * Pure : aucune horloge. Deux appels sur la meme periode rendent la meme chose, ce qui
 * permet de prouver la numerotation sans navigateur.
 */
export function construireEcheancier(p: PeriodeContrat): EcheanceLoyer[] {
  const debut = lireJour(p.debut ?? null);
  const fin = lireJour(p.fin ?? null);
  if (!debut || !fin) return [];

  const jour = p.jour;
  if (typeof jour !== 'number' || !Number.isFinite(jour)) return [];
  const j = Math.trunc(jour);
  if (j < 1 || j > 31) return [];

  const debutIso = `${debut.annee}-${deuxChiffres(debut.mois)}-${deuxChiffres(debut.jour)}`;
  const finIso = `${fin.annee}-${deuxChiffres(fin.mois)}-${deuxChiffres(fin.jour)}`;
  if (finIso < debutIso) return [];

  /*
   * On part du mois du DEBUT et on avance mois par mois. Le rabattement s'applique a
   * chaque mois separement — c'est ce qui fait qu'un loyer au 31 donne le 28 en fevrier
   * et le 30 en avril, sans jamais deborder sur le mois suivant.
   */
  const dates: string[] = [];
  let { annee, mois } = debut;
  for (let i = 0; i < PLAFOND_ECHEANCES; i++) {
    const date = `${annee}-${deuxChiffres(mois)}-${deuxChiffres(jourRabattu(j, annee, mois))}`;
    if (date > finIso) break;
    if (date >= debutIso) dates.push(date);
    ({ annee, mois } = moisSuivant(annee, mois));
  }

  const total = dates.length;
  return dates.map((date, i) => ({ numero: i + 1, total, date }));
}

/** Le nombre de loyers d'un bail. Jamais saisi, toujours calcule. */
export function compterLoyers(p: PeriodeContrat): number {
  return construireEcheancier(p).length;
}

/* ---------------------------------------------------------------------------
   LES QUATRE STATUTS
   --------------------------------------------------------------------------- */

export type StatutLoyer = 'encaisse' | 'a-venir' | 'a-encaisser' | 'en-retard';

export const LIBELLE_STATUT: Record<StatutLoyer, string> = {
  encaisse: 'Encaissé',
  'a-venir': 'À venir',
  'a-encaisser': 'À encaisser',
  'en-retard': 'En retard',
};

/**
 * L'etat d'une echeance.
 *
 * ---------- LA REGLE EST AU JOUR, DEPUIS LE 28/10/2026 ----------
 *
 * David : « si l'echeance est aujourd'hui et non payee -> A encaisser aujourd'hui ; des
 * que aujourd'hui > date d'echeance et que ce n'est pas paye -> En retard ».
 *
 * Elle etait au MOIS jusque-la, et c'etait assume : « un loyer du mois en cours est a
 * encaisser, un loyer d'un mois passe est en retard ». Ce n'etait donc pas un oubli, mais
 * une regle differente — une echeance du 12 octobre impayee restait « A encaisser » du 13
 * au 31 octobre, et ne basculait que le 1er novembre. Le changement est volontaire, et ce
 * commentaire est reecrit pour qu'on ne retablisse pas l'ancienne par megarde.
 *
 * ---------- TOUJOURS PAS DE DELAI DE GRACE ----------
 *
 * La tentation serait de dire << en retard apres cinq jours >>. Ce serait inventer un
 * nombre que personne n'a pose, et qu'il faudrait ensuite defendre. La regle au jour n'en
 * demande aucun.
 *
 * ---------- POURQUOI DES CHAINES, ET PAS DES DATES ----------
 *
 * La comparaison est LEXICOGRAPHIQUE sur 'AAAA-MM-JJ', et c'est ce qui la rend sure :
 * construire un objet Date sur une date d'echeance rouvrirait le piege du fuseau —
 * `new Date('2026-10-27')` est interprete en UTC, `new Date(2026, 9, 27)` en local, et un
 * jour d'ecart en sort selon le poste. `aujourdhui` arrive deja calcule en Asia/Jerusalem
 * (FUSEAU_ALERTES), pour que « en retard » veuille dire la meme chose pour tout le monde.
 *
 * `encaisse` passe avant tout le reste : un loyer paye n'est ni en retard, ni a venir.
 */
export function statutDe(date: string, encaisse: boolean, aujourdhui: string): StatutLoyer {
  if (encaisse) return 'encaisse';
  if (date > aujourdhui) return 'a-venir';
  /* Ici la date est forcement <= aujourd'hui. Reste a separer AUJOURD'HUI du PASSE. */
  return date < aujourdhui ? 'en-retard' : 'a-encaisser';
}

/**
 * LE LOYER ACTUEL — celui du mois en cours, et rien d'autre.
 *
 * ---------- IL PEUT NE PAS EXISTER, ET C'EST UNE REPONSE ----------
 *
 * Contrat pas encore commence, contrat termine, ou mois sans echeance : il n'y a alors
 * AUCUN loyer actuel, et l'ecran ne doit rien surligner. Surligner << la prochaine >> ou
 * << la derniere >> par defaut fabriquerait un loyer actuel qui n'en est pas un — c'est
 * precisement le faux etat que David a demande d'eviter.
 *
 * A ne pas confondre avec le STATUT : le surlignage dit QUEL loyer, le statut dit OU IL
 * EN EST. Le loyer du mois en cours peut tres bien etre surligne ET << A venir >> — nous
 * sommes le 5, il tombe le 20. Les deux informations sont justes, et differentes.
 */
export function loyerActuel<T extends EcheanceLoyer>(echeancier: T[], aujourdhui: string): T | null {
  const moisCourant = aujourdhui.slice(0, 7);
  return echeancier.find(e => e.date.slice(0, 7) === moisCourant) ?? null;
}

/**
 * LE LOYER QUI DOIT ALERTER — le plus ancien impaye et deja du.
 *
 * ---------- POURQUOI PAS SIMPLEMENT CELUI DU MOIS ----------
 *
 * Jusqu'ici la cloche annoncait toujours le loyer du mois en cours. Un loyer impaye de
 * janvier disparaissait donc en fevrier, remplace par celui de fevrier : le plus urgent
 * etait le premier a sortir de l'ecran.
 *
 * On annonce donc le plus ANCIEN impaye deja echu. S'il n'y en a aucun — tout est paye,
 * ou rien n'est encore du — on retombe sur celui du mois en cours, qui peut etre a
 * venir. Il n'y a jamais plus d'une alerte de loyer par dossier : le volume de la cloche
 * ne change pas.
 */
/*
 * GENERIQUE, et pas par cosmetique : l'appelant passe des EcheanceDossier, qui portent
 * le contrat_id d'ou l'echeance sort. Un retour type EcheanceLoyer aurait efface cette
 * information en chemin, et il aurait fallu la RETROUVER par une recherche — c'est-a-dire
 * la deviner. La forme de l'appel ne change pas.
 */
export function loyerAAlerter<T extends EcheanceLoyer>(
  echeancier: T[],
  estEncaisse: (date: string) => boolean,
  aujourdhui: string,
): T | null {
  const impayeDu = echeancier.find(e => e.date <= aujourdhui && !estEncaisse(e.date));
  if (impayeDu) return impayeDu;
  const actuel = loyerActuel(echeancier, aujourdhui);
  return actuel && !estEncaisse(actuel.date) ? actuel : null;
}

/**
 * << 4e loyer sur 12 >>.
 *
 * L'ordinal francais s'ecrit 1er puis 2e, 3e, 4e. Ecrit a la main plutot que tire d'une
 * bibliotheque : il n'y a qu'une irregularite, et une dependance de plus coute plus
 * qu'elle ne rapporte.
 */
export function rangDuLoyer(e: { numero: number; total: number }): string {
  return `${e.numero}${e.numero === 1 ? 'er' : 'e'} loyer sur ${e.total}`;
}

/* ---------------------------------------------------------------------------
   LES COMPTEURS DU TABLEAU DE BORD
   --------------------------------------------------------------------------- */

/**
 * Une periode de bail, telle que la porte crm_immo_contrats — CLOTUREE OU NON.
 *
 * On charge les deux, et c'est une regle posee par David le 22 octobre 2026 :
 * << Le renouvellement ne doit jamais faire disparaitre une dette reelle. >> Une
 * echeance impayee d'un ancien contrat reste due ; seules les CATEGORIES DE CONTRAT
 * (expire / a venir / a renouveler / en cours) ne regardent que la periode en cours.
 */
export interface PeriodeDossier {
  /**
   * L'identifiant de la ligne crm_immo_contrats, quand l'appelant le connait.
   *
   * Il sert a RATTACHER une alerte a son contrat, depuis le 23 octobre 2026 : l'identite
   * d'un etat lu/traite est (company_id, dossier_id, contrat_id, genre, periode).
   *
   * Optionnel a dessein : les releves construisent des periodes a la main, sans id, et
   * tout ce qui ne concerne pas l'identite continue de fonctionner sans lui. Absent, il
   * vaut null — jamais une valeur devinee.
   */
  id?: string;
  dossier_id: string;
  debut: string;
  fin: string;
  jour_encaissement: number;
  /** Vrai si la periode a ete remplacee par un renouvellement. */
  cloturee: boolean;
}

/** Une echeance situee dans l'historique complet d'un dossier. */
export interface EcheanceDossier extends EcheanceLoyer {
  /** Vrai si elle vient d'une periode deja remplacee. */
  ancienne: boolean;
  /**
   * Le contrat d'ou cette echeance SORT — pas un contrat deduit apres coup.
   *
   * echeancierDuDossier construit chaque echeance a partir d'UNE periode precise : le
   * rattachement est donc exact par construction, et non le resultat d'une recherche qui
   * pourrait se tromper. null quand l'appelant n'a pas fourni l'id de la periode.
   */
  contrat_id: string | null;
}

/**
 * L'ECHEANCIER COMPLET D'UN DOSSIER, toutes ses periodes reunies.
 *
 * ---------- POURQUOI ON NE PEUT PAS SE CONTENTER DE CONCATENER ----------
 *
 * Deux periodes successives se CHEVAUCHENT presque toujours. Un bail 2026-01-05 →
 * 2026-12-05 renouvele le 10 juillet par 2026-07-10 → 2027-07-09 : les echeances d'aout
 * a decembre existent dans les deux. Concatenees, elles compteraient deux fois — et si
 * le jour d'encaissement a change au passage (5 → 20), ce seraient meme deux DATES
 * differentes pour un seul loyer du.
 *
 * La regle appliquee : une periode ne fournit ses echeances que JUSQU'AU DEBUT de la
 * suivante. L'ancien contrat etait en vigueur jusqu'a ce que le nouveau prenne le
 * relais, ni avant ni apres. C'est exact pour une chaine de renouvellements comme pour
 * un changement de jour d'encaissement.
 *
 * Le dedoublonnage par date qui suit n'est qu'une ceinture : il ne reste rien a
 * dedoublonner apres la coupure, sauf si deux periodes partagent le meme debut.
 *
 * ---------- LE NUMERO RESTE CELUI DE SA PERIODE ----------
 *
 * << 4e loyer sur 12 >> designe le 4e loyer DU CONTRAT, pas le 4e de l'histoire du
 * dossier : David a valide que la numerotation reparte a 1 apres un renouvellement.
 * Chaque echeance garde donc le numero et le total que construireEcheancier lui a
 * donnes DANS SA PERIODE.
 *
 * Consequence assumee : un bail de 12 loyers interrompu au 7e laisse des echeances
 * numerotees << 7 sur 12 >>. Le contrat prevoyait bien douze loyers ; il a ete
 * remplace avant. Dire << 7 sur 7 >> inventerait un contrat qui n'a jamais existe.
 */
export function echeancierDuDossier(
  periodes: PeriodeDossier[],
  estEncaisse: (date: string) => boolean = () => false,
): EcheanceDossier[] {
  /* Par debut croissant : c'est l'ordre dans lequel les contrats se sont succede. */
  const tri = [...periodes]
    .filter(p => lireJour(p.debut) !== null && lireJour(p.fin) !== null)
    .sort((a, b) => a.debut.localeCompare(b.debut) || a.fin.localeCompare(b.fin));

  const vues = new Set<string>();
  const sortie: EcheanceDossier[] = [];

  for (let i = 0; i < tri.length; i++) {
    const p = tri[i];
    const releve = tri[i + 1]?.debut ?? null;
    for (const e of construireEcheancier({ debut: p.debut, fin: p.fin, jour: p.jour_encaissement })) {
      /*
       * LA COUPURE, ET SA SEULE EXCEPTION.
       *
       * Passe le debut de la periode suivante, les echeances de celle-ci appartiennent
       * au nouveau contrat — SAUF si elle a deja ete ENCAISSEE.
       *
       * Un encaissement est rattache au dossier et a une DATE, pas a un contrat :
       * l'index unique de crm_immo_loyers porte sur (company_id, dossier_id, echeance),
       * et la table n'a aucune colonne contrat_id. Une ligne payee le 5 juillet survit
       * donc au renouvellement. La supprimer de l'echeancier la rendrait ORPHELINE :
       * l'argent serait encaisse en base, et l'ecran reclamerait quand meme ce loyer.
       *
       * C'est un defaut que ce code a eu, et qui a ete mesure : avec un releve au
       * 20 aout, un paiement du 5 juillet donnait exactement les memes compteurs que
       * l'absence de paiement. Une echeance payee est un fait, pas une prevision — elle
       * ne se recoupe pas.
       *
       * `continue` et non `break` : un paiement peut se trouver APRES une echeance non
       * payee du meme ancien contrat. S'arreter a la premiere impayee rendrait les
       * suivantes orphelines a nouveau.
       */
      if (releve !== null && e.date >= releve && !estEncaisse(e.date)) continue;
      if (vues.has(e.date)) continue;
      vues.add(e.date);
      /* `p.id` et pas une recherche : l'echeance SORT de cette periode-la. */
      sortie.push({ ...e, ancienne: p.cloturee, contrat_id: p.id ?? null });
    }
  }

  return sortie.sort((a, b) => a.date.localeCompare(b.date));
}

/** Un encaissement NON ANNULE. */
export interface EncaissementActif {
  dossier_id: string;
  /** L'echeance reglee, 'AAAA-MM-JJ'. */
  echeance: string;
  /** Le JOUR ou l'argent est entre, 'AAAA-MM-JJ' dans le fuseau du poste. */
  encaisseLeJour: string;
}

export interface CompteursImmo {
  loyersEnRetard: number;
  loyersAEncaisser: number;
  encaissesCeMois: number;
  contratsARenouveler: number;
  bauxExpires: number;
  dossiersEnCours: number;
  bauxAVenir: number;
}

/**
 * LES SEPT CATEGORIES, ET LEUR SEUL VOCABULAIRE.
 *
 * Cette cle sert a TROIS endroits : la carte du tableau de bord, le filtre de la page
 * CRM Immo, et la classification ci-dessous. Un seul mot pour les trois, donc aucune
 * table de traduction ou un libelle pourrait se desaligner en silence.
 */
export type CategorieImmo =
  | 'loyers-en-retard'
  | 'loyers-a-encaisser'
  | 'encaisses-ce-mois'
  | 'contrats-a-renouveler'
  | 'baux-expires'
  | 'dossiers-en-cours'
  | 'baux-a-venir';

export const CATEGORIES_IMMO: readonly CategorieImmo[] = [
  'loyers-en-retard', 'loyers-a-encaisser', 'encaisses-ce-mois',
  'contrats-a-renouveler', 'baux-expires', 'dossiers-en-cours', 'baux-a-venir',
] as const;

/** Le compteur que chaque categorie alimente. Fige le lien carte <-> filtre. */
export const COMPTEUR_DE_CATEGORIE: Record<CategorieImmo, keyof CompteursImmo> = {
  'loyers-en-retard': 'loyersEnRetard',
  'loyers-a-encaisser': 'loyersAEncaisser',
  'encaisses-ce-mois': 'encaissesCeMois',
  'contrats-a-renouveler': 'contratsARenouveler',
  'baux-expires': 'bauxExpires',
  'dossiers-en-cours': 'dossiersEnCours',
  'baux-a-venir': 'bauxAVenir',
};

/** Les categories qui comptent des CONTRATS : une periode y entre une fois, et une seule. */
export const CATEGORIES_CONTRAT: readonly CategorieImmo[] = [
  'contrats-a-renouveler', 'baux-expires', 'dossiers-en-cours', 'baux-a-venir',
] as const;

export interface ClassementImmo {
  compteurs: CompteursImmo;
  /**
   * Les DOSSIERS concernes par chaque categorie.
   *
   * Issus du MEME parcours que les compteurs — c'est ce qui rend impossible qu'une
   * carte annonce un chiffre et que la liste filtree en montre un autre.
   *
   * Attention a l'unite : pour les quatre categories de contrat, un dossier porte une
   * periode et une seule, donc `dossiers[c].size === compteurs[...]`. Pour les trois
   * categories de loyer, l'unite du compteur est l'ECHEANCE : un dossier avec trois
   * loyers en retard compte 3 et n'apparait qu'une fois dans la liste. Les deux disent
   * vrai, ils ne disent pas la meme chose.
   */
  dossiers: Record<CategorieImmo, Set<string>>;
}

/** Combien de jours avant la fin d'un bail on propose de le renouveler. */
export const PREAVIS_RENOUVELLEMENT = 30;

/**
 * 'AAAA-MM-JJ' + n jours. Tout le trajet reste en UTC — Date.UTC pour entrer, setUTCDate
 * pour avancer, toISOString pour sortir. C'est l'UTC de bout en bout qui garantit le jour,
 * pas l'heure choisie : midi est une ceinture de securite, pas la serrure.
 */
export function ajouterJours(iso: string, n: number): string {
  const d = lireJour(iso);
  if (!d) return iso;
  const t = new Date(Date.UTC(d.annee, d.mois - 1, d.jour, 12));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/**
 * LE CLASSEMENT DU TABLEAU DE BORD D'UNE SOCIETE CRM IMMO.
 *
 * Rend DEUX choses issues du MEME parcours : les sept compteurs, et les dossiers de
 * chaque categorie. Une carte et la liste qu'elle ouvre ne peuvent donc pas etre
 * calculees differemment, ni a des instants differents.
 *
 * ---------- MAIS ELLES NE COMPTENT PAS LA MEME CHOSE, ET C'EST VOULU ----------
 *
 * Le compteur et la liste n'ont pas la meme UNITE, et aucun parcours commun ne peut
 * les rendre egaux :
 *
 *   - les quatre categories de CONTRAT comptent des periodes. Un index partiel unique
 *     (company_id, dossier_id) WHERE cloture_le IS NULL garantit une periode en cours
 *     au plus par dossier, donc la : compteur = nombre de dossiers listes, toujours.
 *   - les trois categories de LOYER comptent des ECHEANCES. Un dossier avec neuf
 *     loyers en retard ajoute 9 au compteur et UNE ligne a la liste.
 *
 * Les deux disent vrai. L'interface doit donc dire laquelle elle montre — le filtre
 * de la page affiche les deux nombres pour les trois categories de loyer, faute de
 * quoi l'utilisateur lit l'ecart comme une erreur.
 *
 * ---------- LES QUATRE CATEGORIES DE CONTRAT SONT UNE PARTITION ----------
 *
 * David, le 22 octobre 2026 : << Je veux une partition stricte. Un contrat ne doit
 * apparaitre que dans UNE seule de ces quatre categories. >>
 *
 *   Baux expires          fin < aujourd'hui
 *   Baux a venir          debut > aujourd'hui
 *   Contrats a renouveler debut <= aujourd'hui <= fin  ET  fin <= aujourd'hui + 30 j
 *   Dossiers en cours     debut <= aujourd'hui <= fin  ET  fin >  aujourd'hui + 30 j
 *
 * C'est une CHAINE `if / else if / else if / else`, et non quatre tests independants :
 * une periode entre dans une branche et sort. L'ordre est celui de la certitude — fini
 * d'abord, pas commence ensuite, fin proche, puis le reste par elimination.
 *
 * Deux consequences a ne pas perdre de vue :
 *   - un bail termine le 20 octobre est << expire >> et RIEN d'autre, meme si sa fin
 *     tombe dans les trente jours ;
 *   - << Dossiers en cours >> ne contient PLUS les baux qui se terminent bientot. Ils
 *     sont dans << Contrats a renouveler >>. Les deux chiffres s'additionnent
 *     desormais sans se compter deux fois, et c'est tout l'objet du changement.
 *
 * ---------- << ENCAISSES CE MOIS >> COMPTE L'ARGENT, PAS LES ECHEANCES ----------
 *
 * David a tranche : on se base sur la date d'encaissement, pas sur le mois de
 * l'echeance. Un loyer de janvier regle en octobre compte en octobre. C'est la vue de
 * caisse — ce qui est rentre ce mois-ci — et elle ne se deduit d'aucun des deux autres
 * compteurs de loyer.
 *
 * ---------- ET AUCUN SECOND CALCUL ----------
 *
 * Les loyers passent par construireEcheancier et statutDe, exactement comme l'onglet
 * Echeancier et les notifications. Le tableau de bord ne sait pas compter des mois.
 */
export function classerTableauDeBord(params: {
  periodes: PeriodeDossier[];
  encaissements: EncaissementActif[];
  aujourdhui: string;
  preavisJours?: number;
}): ClassementImmo {
  const { periodes, encaissements, aujourdhui, preavisJours = PREAVIS_RENOUVELLEMENT } = params;

  const c: CompteursImmo = {
    loyersEnRetard: 0, loyersAEncaisser: 0, encaissesCeMois: 0,
    contratsARenouveler: 0, bauxExpires: 0, dossiersEnCours: 0, bauxAVenir: 0,
  };
  const dossiers = Object.fromEntries(
    CATEGORIES_IMMO.map(k => [k, new Set<string>()]),
  ) as Record<CategorieImmo, Set<string>>;

  if (!lireJour(aujourdhui)) return { compteurs: c, dossiers };

  const limite = ajouterJours(aujourdhui, preavisJours);
  const moisCourant = aujourdhui.slice(0, 7);

  /* Les echeances deja reglees, par dossier. Les annulees ne sont pas ici : une
     annulation rend l'echeance due, c'est la regle du module. */
  const payes = new Map<string, Set<string>>();
  for (const e of encaissements) {
    const s = payes.get(e.dossier_id) ?? new Set<string>();
    s.add(e.echeance);
    payes.set(e.dossier_id, s);
    if (e.encaisseLeJour.slice(0, 7) === moisCourant) {
      c.encaissesCeMois++;
      dossiers['encaisses-ce-mois'].add(e.dossier_id);
    }
  }

  /*
   * --- LES QUATRE CATEGORIES DE CONTRAT : LA PERIODE EN COURS, ET ELLE SEULE ---
   *
   * Une periode cloturee a ete remplacee : elle ne decrit plus l'etat du bail. La
   * compter ferait apparaitre un dossier dans deux categories a la fois — expire par
   * son ancien contrat, en cours par le nouveau — et detruirait la partition.
   */
  for (const p of periodes) {
    if (p.cloturee) continue;

    /*
     * UNE PERIODE ILLISIBLE NE SE RANGE NULLE PART.
     *
     * Les dates arrivent de colonnes `date NOT NULL`, donc ce cas ne vient pas de la
     * base. Mais la comparaison ci-dessous est LEXICOGRAPHIQUE : une chaine vide ou un
     * texte quelconque serait `< aujourdhui` et atterrirait sans bruit dans
     * << Baux expires >>. Un chiffre faux et muet est pire qu'un chiffre manquant.
     */
    if (!lireJour(p.debut) || !lireJour(p.fin)) continue;

    /*
     * UNE PARTITION, PAS QUATRE TESTS.
     *
     * Lues comme quatre predicats independants, les regles de David se recouvriraient
     * sur une periode a l'envers (fin < debut) : elle serait a la fois << expiree >> et
     * << a venir >>. La chaine tranche pour << expiree >>, par l'ordre des branches.
     * Le CHECK crm_immo_contrats_ordre (fin >= debut) rend d'ailleurs ce cas
     * inatteignable depuis la base ; la decision est figee par un test, pas laissee au
     * hasard de l'ordre d'ecriture.
     */
    if (p.fin < aujourdhui) {
      c.bauxExpires++;
      dossiers['baux-expires'].add(p.dossier_id);
    } else if (p.debut > aujourdhui) {
      c.bauxAVenir++;
      dossiers['baux-a-venir'].add(p.dossier_id);
    } else if (p.fin <= limite) {
      c.contratsARenouveler++;
      dossiers['contrats-a-renouveler'].add(p.dossier_id);
    } else {
      c.dossiersEnCours++;
      dossiers['dossiers-en-cours'].add(p.dossier_id);
    }
  }

  /*
   * --- LES LOYERS : TOUT L'HISTORIQUE DU DOSSIER ---
   *
   * David, le 22 octobre 2026 : << Une echeance reelle comprise dans un ancien contrat
   * et toujours non encaissee doit continuer a apparaitre dans les loyers en retard /
   * a encaisser selon sa date, meme si la periode a ete cloturee ou renouvelee. Le
   * renouvellement ne doit jamais faire disparaitre une dette reelle. >>
   *
   * On parcourt donc DOSSIER par dossier, et non periode par periode :
   * echeancierDuDossier coupe chaque periode au debut de la suivante, ce qui empeche
   * qu'un meme loyer du soit compte deux fois — et qu'un changement de jour
   * d'encaissement en fabrique deux a des dates differentes.
   */
  const parDossier = new Map<string, PeriodeDossier[]>();
  for (const p of periodes) {
    const l = parDossier.get(p.dossier_id) ?? [];
    l.push(p);
    parDossier.set(p.dossier_id, l);
  }

  for (const [dossierId, sesPeriodes] of parDossier) {
    const regles = payes.get(dossierId) ?? new Set<string>();
    const estEncaisse = (date: string) => regles.has(date);
    for (const e of echeancierDuDossier(sesPeriodes, estEncaisse)) {
      const s = statutDe(e.date, estEncaisse(e.date), aujourdhui);
      if (s === 'en-retard') {
        c.loyersEnRetard++;
        dossiers['loyers-en-retard'].add(dossierId);
      } else if (s === 'a-encaisser') {
        c.loyersAEncaisser++;
        dossiers['loyers-a-encaisser'].add(dossierId);
      }
    }
  }

  return { compteurs: c, dossiers };
}

/**
 * Les sept compteurs seuls.
 *
 * Un enrobage d'une ligne autour de classerTableauDeBord : il n'existe qu'UN parcours,
 * donc les compteurs et les listes filtrees ne peuvent pas diverger.
 */
export function compterTableauDeBord(params: {
  periodes: PeriodeDossier[];
  encaissements: EncaissementActif[];
  aujourdhui: string;
  preavisJours?: number;
}): CompteursImmo {
  return classerTableauDeBord(params).compteurs;
}

/** Combien d'echeances dans chaque etat. Sert aux compteurs de l'onglet. */
export function compterParStatut(
  echeancier: EcheanceLoyer[],
  estEncaisse: (date: string) => boolean,
  aujourdhui: string,
): Record<StatutLoyer, number> {
  const c: Record<StatutLoyer, number> = { encaisse: 0, 'a-venir': 0, 'a-encaisser': 0, 'en-retard': 0 };
  for (const e of echeancier) c[statutDe(e.date, estEncaisse(e.date), aujourdhui)]++;
  return c;
}

