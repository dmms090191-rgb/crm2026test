
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
 * ---------- POURQUOI PAS DE DELAI DE GRACE ----------
 *
 * La tentation serait de dire << en retard apres cinq jours >>. Ce serait inventer une
 * regle que personne n'a posee, et qu'il faudrait ensuite defendre. La distinction
 * tranchee par David ne demande aucun reglage : un loyer du MOIS EN COURS est a
 * encaisser, un loyer d'un mois PASSE est en retard. C'est ainsi qu'un bailleur
 * raisonne, et c'est verifiable sans arbitrer un nombre de jours.
 *
 * `encaisse` passe avant tout le reste : un loyer paye n'est ni en retard, ni a venir.
 */
export function statutDe(date: string, encaisse: boolean, aujourdhui: string): StatutLoyer {
  if (encaisse) return 'encaisse';
  if (date > aujourdhui) return 'a-venir';
  /* Meme annee ET meme mois : les sept premiers caracteres de 'AAAA-MM-JJ'. */
  return date.slice(0, 7) === aujourdhui.slice(0, 7) ? 'a-encaisser' : 'en-retard';
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
export function loyerActuel(echeancier: EcheanceLoyer[], aujourdhui: string): EcheanceLoyer | null {
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
export function loyerAAlerter(
  echeancier: EcheanceLoyer[],
  estEncaisse: (date: string) => boolean,
  aujourdhui: string,
): EcheanceLoyer | null {
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

