/*
 * Les alertes CRM Immo : fins de contrat a J-30 et loyers mensuels.
 * Module PUR — aucune base, aucun navigateur, aucune horloge implicite.
 * Testable avec node --test (voir scripts/crm-immo/alertes.test.ts).
 *
 * ---------- LES ALERTES NE SONT PAS STOCKEES ----------
 *
 * Elles sont DERIVEES des dates des dossiers. crm_immo_etats ne garde que ce que
 * le calcul ne peut pas deviner : ce qu'un humain a fait (lu, traite). Une ligne
 * n'y nait QUE si quelqu'un agit. C'est ce qui evite une table qui enflerait
 * d'une ligne par dossier et par jour, et ce qui fait qu'une alerte ne peut pas
 * << manquer >> faute d'un traitement nocturne qui n'aurait pas tourne.
 *
 * ---------- LE PIEGE DU 31 FEVRIER ----------
 *
 * jour_encaissement accepte 1 a 31, parce qu'un bail reel peut dire 31. Fevrier
 * n'a pas de 31. L'ecriture naturelle en JavaScript —
 * `new Date(2026, 1, 31)` — rend le 3 MARS, sans la moindre erreur : l'alerte de
 * fevrier ne se declencherait jamais, et personne ne verrait pourquoi. On rabat
 * donc explicitement sur le dernier jour du mois.
 *
 * ---------- LE PIEGE DU FUSEAU ----------
 *
 * `new Date().toISOString().slice(0, 10)` est le motif le plus repandu pour
 * obtenir << aujourd'hui >>, et il est FAUX : il rend le jour en UTC. A Paris en
 * ete, entre minuit et 2 h du matin, il rend la veille. Une alerte a J-30
 * basculerait donc un jour trop tard pour quiconque regarde sa cloche en soiree
 * d'ete. On passe par Intl.DateTimeFormat avec un fuseau explicite, et on
 * assemble les parties a la main plutot que de dependre du format d'une locale.
 *
 * ---------- CE QUE LA BASE VERIFIE, ET CE QU'ELLE NE VERIFIE PAS ----------
 *
 * La contrainte crm_immo_etats_periode_valide impose le format de `periode` :
 * 'AAAA-MM' pour un loyer, 'AAAA-MM-JJ' pour une fin de contrat. Une erreur de
 * format est donc un REFUS d'insertion, pas un silence. En revanche, la base ne
 * sait rien du rabattement ni de J-30 : c'est ici, et c'est pour ca que ce
 * module a ses propres tests.
 */

import {
  jourRabattu, lireJour, dernierJourDuMois, ajouterJours,
  echeancierDuDossier, loyerAAlerter, statutDe, rangDuLoyer,
  type StatutLoyer, type PeriodeDossier,
} from './crmImmoEcheancier';

/*
 * LES PRIMITIVES DE DATE VIVENT DESORMAIS DANS crmImmoEcheancier.
 *
 * Pourquoi ce deplacement : l'echeancier a besoin de `jourRabattu`, et les alertes ont
 * besoin de l'echeancier pour numeroter leurs loyers (<< 4e loyer sur 12 >>). Laisser
 * les primitives ici creait un CYCLE d'imports entre les deux fichiers.
 *
 * Elles sont re-exportees telles quelles : tout ce qui les importait depuis ce module
 * continue de marcher, et il n'existe toujours qu'UNE implementation du 31 fevrier.
 */
export { jourRabattu, lireJour, dernierJourDuMois };

export type GenreAlerte = 'fin_contrat' | 'loyer';

/** Les seuls champs d'un dossier dont la derivation a besoin. */
export interface DossierPourAlertes {
  id: string;
  nom: string;
  prenom?: string | null;
  locataire?: string | null;
  proprietaire?: string | null;
  /**
   * Le DEBUT du contrat, 'AAAA-MM-JJ' ou null.
   *
   * Il borne les alertes de loyer par le bas depuis le 22 octobre 2026. Sans lui, un
   * contrat qui commence l'annee prochaine reclamait deja son loyer aujourd'hui.
   */
  date_entree?: string | null;
  /** 'AAAA-MM-JJ' ou null. */
  date_fin_contrat?: string | null;
  /** Jour du mois, 1 a 31, ou null. */
  jour_encaissement?: number | null;
}

/**
 * Un encaissement ACTIF, tel que le porte crm_immo_loyers.
 *
 * Seuls les non annules sont passes ici : une ligne annulee ne compte plus comme
 * encaissee, et son echeance redevient due.
 */
export interface EncaissementConnu {
  dossier_id: string;
  /** 'AAAA-MM-JJ'. */
  echeance: string;
}

/** Une ligne de crm_immo_etats : ce qu'un humain a fait d'une alerte. */
export interface EtatConnu {
  dossier_id: string;
  genre: GenreAlerte;
  periode: string;
  lue_le?: string | null;
  traitee_le?: string | null;
}

export interface Alerte {
  dossier_id: string;
  genre: GenreAlerte;
  /** La cle anti-doublon, avec dossier_id et genre : 'AAAA-MM' ou 'AAAA-MM-JJ'. */
  periode: string;
  /** La date a afficher, toujours 'AAAA-MM-JJ' — rabattue pour un loyer. */
  echeance: string;
  /** Jours restants avant l'echeance ; negatif si elle est passee. */
  joursRestants: number;
  locataire: string;
  proprietaire: string;
  lue: boolean;
  traitee: boolean;
  /**
   * Pour un LOYER : sa place dans le contrat, et son etat.
   *
   * Les deux sont CALCULES par construireEcheancier, jamais stockes : le numero et le
   * total tombent de la periode. Une notification et l'onglet Echeancier donnent donc
   * forcement le meme << 4e loyer sur 12 >>, puisqu'ils appellent la meme fonction.
   *
   * Absents pour une fin de contrat, qui ne se numerote pas.
   */
  rang?: { numero: number; total: number };
  statut?: StatutLoyer;
}

/** Combien de jours avant l'echeance une fin de contrat s'annonce. */
export const PREAVIS_FIN_CONTRAT = 30;

const DEUX = (n: number) => String(n).padStart(2, '0');

/**
 * Le jour calendaire d'un instant, dans un fuseau donne, en 'AAAA-MM-JJ'.
 *
 * On assemble les parties une a une : se fier au format d'une locale ('fr-CA'
 * rend bien AAAA-MM-JJ, mais c'est un detail d'implementation d'ICU, pas un
 * contrat).
 */
export function journeeDeReference(instant: Date, fuseau: string): string {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseau, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const lire = (type: string) => parties.find(p => p.type === type)?.value ?? '';
  return `${lire('year')}-${lire('month')}-${lire('day')}`;
}

/**
 * Le fuseau du poste, pour l'appel courant. Isole afin de rester injectable.
 *
 * ---------- IL NE SERT PLUS DANS LE MODULE CRM IMMO ----------
 *
 * Conserve parce qu'il reste juste et qu'il peut servir ailleurs, mais le module CRM
 * Immo ne doit PLUS l'appeler : son activite est en Israel, et le fuseau du poste
 * donnait un << aujourd'hui >> different selon l'endroit d'ou l'on consulte. Un releve
 * fait depuis Paris a 00 h 30 basculait la journee avant Jerusalem.
 *
 * C'est FUSEAU_ALERTES qui fait foi, partout dans le module — notifications, statut
 * << en retard >>, cartes du tableau de bord, apercu du formulaire. Un test interdit son
 * retour dans le module (voir scripts/crm-immo/declenchement.test.ts).
 */
export function fuseauLocal(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/* ---------------------------------------------------------------------------
 * LE DECLENCHEMENT A 08:00, HEURE D'ISRAEL
 * ------------------------------------------------------------------------- */

/**
 * LE fuseau du module. Une seule notion de << aujourd'hui >> dans tout le CRM.
 *
 * Regle posee par David : << Je ne veux pas deux notions differentes de aujourd'hui dans
 * le meme CRM. >> Les dossiers, les baux et les encaissements sont israeliens ; la
 * journee de reference l'est donc aussi, quel que soit le poste qui consulte.
 */
export const FUSEAU_ALERTES = 'Asia/Jerusalem';

/** 08:00, en minutes depuis minuit. Les notifications ne sortent pas avant. */
export const HEURE_DECLENCHEMENT = 8 * 60;

/**
 * L'instant courant, lu en heure d'Israel : un JOUR et une HEURE.
 *
 * Jusqu'ici le module n'avait que le jour : une alerte basculait donc a MINUIT. Pour
 * dire << a partir de 08:00 >>, il faut l'heure, et il faut la lire dans le bon fuseau —
 * 08:00 a Jerusalem, c'est 06:00 UTC en hiver et 05:00 UTC en ete.
 */
export interface MomentIsrael {
  /** 'AAAA-MM-JJ' en heure d'Israel. */
  jour: string;
  /** Minutes depuis minuit, 0 a 1439, en heure d'Israel. */
  minutes: number;
}

/**
 * Un instant converti en jour + minutes dans un fuseau donne.
 *
 * ---------- LE PIEGE DE MINUIT ----------
 *
 * `hour: '2-digit'` sans `hourCycle` peut rendre << 24 >> a minuit selon la version
 * d'ICU : minuit vaudrait alors 1440 minutes, donc superieur a 08:00, et l'alerte
 * sortirait UN JOUR TROP TOT. On impose `hourCycle: 'h23'`, qui numerote les heures de
 * 00 a 23, et un test fige le cas de minuit.
 */
export function momentDe(instant: Date, fuseau: string = FUSEAU_ALERTES): MomentIsrael {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseau, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(instant);
  const lire = (type: string) => parties.find(p => p.type === type)?.value ?? '';
  return {
    jour: `${lire('year')}-${lire('month')}-${lire('day')}`,
    minutes: Number(lire('hour')) * 60 + Number(lire('minute')),
  };
}

/** Le mois precedent, le jour rabattu s'il n'existe pas. 31 mars → 28 ou 29 fevrier. */
function moinsUnMois(iso: string): string | null {
  const d = lireJour(iso);
  if (!d) return null;
  const annee = d.mois === 1 ? d.annee - 1 : d.annee;
  const mois = d.mois === 1 ? 12 : d.mois - 1;
  return `${annee}-${DEUX(mois)}-${DEUX(jourRabattu(d.jour, annee, mois))}`;
}

/**
 * LE JOUR OU LA NOTIFICATION DE LOYER COMMENCE : la VEILLE de l'echeance.
 *
 * Echeance le 10 novembre → la notification sort le 9 novembre a 08:00. Elle ne sort pas
 * avant — c'est un retrecissement assume par rapport a l'ancienne regle, qui l'affichait
 * tout le mois.
 */
export function jourDeclenchementLoyer(echeance: string): string | null {
  return lireJour(echeance) ? ajouterJours(echeance, -1) : null;
}

/**
 * LE JOUR OU LA NOTIFICATION DE FIN DE CONTRAT COMMENCE.
 *
 * ---------- POURQUOI DEUX CALCULS, ET LE PLUS TOT DES DEUX ----------
 *
 * << Un mois moins un jour >> seul n'est PAS toujours plus tot que l'ancien J-30 : les
 * mois n'ont pas la meme longueur. Pour une fin le 15 mars, un mois en arriere tombe le
 * 15 fevrier, moins un jour le 14 — alors que J-30 tombe le 13. La regle de calendrier
 * seule aurait donc prevenu UN JOUR PLUS TARD qu'avant, precisement sur les mois courts.
 *
 * David a tranche : << Je ne veux pas accepter le cas ou une fin de contrat en mars
 * serait signalee plus tard qu'avec l'ancienne regle J-30. >> On calcule les deux et on
 * garde le plus TOT. La notification ne peut donc jamais reculer par rapport a J-30 ;
 * elle peut seulement avancer, de un a deux jours selon le mois.
 *
 * La comparaison de chaines 'AAAA-MM-JJ' est chronologique : meme largeur, champs du
 * plus significatif au moins significatif.
 */
export function jourDeclenchementFinContrat(fin: string): string | null {
  if (!lireJour(fin)) return null;
  const parMois = moinsUnMois(fin);
  const parPreavis = ajouterJours(fin, -PREAVIS_FIN_CONTRAT);
  if (!parMois) return parPreavis;
  const parCalendrier = ajouterJours(parMois, -1);
  return parCalendrier < parPreavis ? parCalendrier : parPreavis;
}

/**
 * LA NOTIFICATION DOIT-ELLE ETRE VISIBLE MAINTENANT ?
 *
 * ---------- IL N'Y A AUCUNE FENETRE A RATER ----------
 *
 * Le test est `>=`, jamais `==`. Le jour du declenchement, elle sort a partir de 08:00 —
 * a 08:00, a 08:03, a 14 h — et tous les jours suivants sans condition d'heure. Rien ne
 * s'execute a heure fixe dans ce systeme : les alertes sont DERIVEES a chaque affichage,
 * donc personne n'a besoin d'etre la a 08:00 et il n'y a rien a rattraper. C'est la
 * reponse a << et si le travail tourne quelques minutes apres 08:00 >> : la question ne
 * se pose pas, parce qu'aucun travail ne tourne.
 */
export function estDeclenchee(jourDeclenchement: string | null, moment: MomentIsrael): boolean {
  if (!jourDeclenchement) return false;
  if (moment.jour > jourDeclenchement) return true;
  if (moment.jour < jourDeclenchement) return false;
  return moment.minutes >= HEURE_DECLENCHEMENT;
}

/** 'AAAA-MM' — la periode d'un loyer. Elle revient chaque mois, d'ou l'alerte recurrente. */
export function periodeLoyer(annee: number, mois: number): string {
  return `${annee}-${DEUX(mois)}`;
}

/** Le mois suivant. Decembre passe a janvier de l'annee d'apres. */
function moisSuivant(annee: number, mois: number): { annee: number; mois: number } {
  return mois === 12 ? { annee: annee + 1, mois: 1 } : { annee, mois: mois + 1 };
}

/**
 * LES PROCHAINES ECHEANCES D'UN LOYER.
 *
 * Sert l'apercu du formulaire : on montre ce que le jour choisi donnera VRAIMENT, mois
 * par mois, au lieu de demander a l'utilisateur de le deviner.
 *
 * ---------- POURQUOI CET APERCU EXISTE ----------
 *
 * Un loyer n'a pas une date, il a un JOUR DU MOIS qui revient. Et ce jour ne tombe pas
 * toujours : il n'y a pas de 31 fevrier, ni de 31 avril. `jourRabattu` le ramene alors
 * au dernier jour du mois — c'est la regle du module depuis l'origine, et elle est
 * juste. Mais elle est INVISIBLE a la saisie : on tape « 31 » sans savoir ce qui se
 * passera en fevrier. L'apercu rend cette regle visible, sans la changer.
 *
 * ---------- LE MOIS EN COURS COMPTE-T-IL ? ----------
 *
 * Oui, tant que son echeance n'est pas passee. Le 10 du mois, un loyer au 20 montre
 * d'abord le 20 de ce mois-ci ; le 25, il montre deja le mois suivant. C'est ce qu'on
 * attend d'un « prochain » encaissement.
 *
 * La comparaison porte sur le jour RABATTU. Non pas parce que le jour brut donnerait un
 * resultat different — il ne le donne jamais, et c'est demontrable : `rabattu` vaut
 * min(brut, dernierJour) et `aujourd'hui` ne depasse jamais `dernierJour`, donc si brut
 * tient dans le mois les deux formes sont identiques, et sinon les deux sont fausses.
 * Mais parce qu'elle dit ce qu'on compare : l'echeance REELLE de ce mois-ci, celle qui
 * figurera dans la liste, et non un jour theorique qui peut ne pas exister.
 *
 * Pure : `aujourdhui` est passe en 'AAAA-MM-JJ'. Aucune horloge implicite, donc testable
 * sur n'importe quelle date, bissextiles comprises.
 */
export function prochainsEncaissements(
  jour: number,
  aujourdhui: string,
  combien = 3,
): string[] {
  const depart = lireJour(aujourdhui);
  if (!depart) return [];
  if (!Number.isFinite(jour)) return [];
  const j = Math.trunc(jour);
  if (j < 1 || j > 31) return [];
  if (combien <= 0) return [];

  let { annee, mois } = depart;
  /* L'echeance de CE mois-ci est-elle encore devant nous ? */
  if (jourRabattu(j, annee, mois) < depart.jour) ({ annee, mois } = moisSuivant(annee, mois));

  const dates: string[] = [];
  for (let i = 0; i < combien; i++) {
    dates.push(`${annee}-${DEUX(mois)}-${DEUX(jourRabattu(j, annee, mois))}`);
    ({ annee, mois } = moisSuivant(annee, mois));
  }
  return dates;
}

/*
 * Les mois en abrege, ecrits a la main plutot que tires d'`Intl`.
 *
 * Deux raisons. D'abord `Intl` oblige a fabriquer une Date, donc a choisir un fuseau,
 * et une date calendaire n'en a pas : c'est exactement le piege que `formatDateImmo`
 * evite en decoupant la chaine. Ensuite les abreviations d'`Intl` dependent de la
 * version d'ICU du navigateur — un test qui les comparerait passerait ici et
 * echouerait ailleurs.
 */
const MOIS_COURT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

/** '2026-02-28' → '28 févr.'. Rend '' sur toute forme inattendue. */
export function formatJourMoisCourt(iso: string): string {
  const d = lireJour(iso);
  return d ? `${d.jour} ${MOIS_COURT[d.mois - 1]}` : '';
}

/**
 * Jours entre deux jours calendaires, de a vers b.
 *
 * On compte en UTC a midi : une difference calculee a minuit peut perdre ou
 * gagner une heure au passage a l'heure d'ete et rendre 29,96 jours, qui
 * s'arrondit mal.
 */
export function joursEntre(a: string, b: string): number | null {
  const x = lireJour(a); const y = lireJour(b);
  if (!x || !y) return null;
  const ms = Date.UTC(y.annee, y.mois - 1, y.jour, 12) - Date.UTC(x.annee, x.mois - 1, x.jour, 12);
  return Math.round(ms / 86_400_000);
}

const nom = (d: DossierPourAlertes) => [d.prenom, d.nom].filter(Boolean).join(' ').trim() || d.nom;

/**
 * Les alertes a afficher aujourd'hui, pour un lot de dossiers.
 *
 * `aujourdhui` est passe en 'AAAA-MM-JJ' : ce module n'a AUCUNE horloge propre,
 * c'est ce qui le rend testable sans figer le temps.
 *
 * Deux regles, chacune assumee :
 *
 *   FIN DE CONTRAT — active a partir de J-30, et elle NE DISPARAIT PAS quand la
 *   date est passee. Une echeance depassee reste un travail a faire ; c'est le
 *   bouton << traite >> qui la retire, pas le calendrier. Sans cela, une agence
 *   qui ne regarde pas sa cloche pendant un mois perdrait l'information.
 *
 *   LOYER — une alerte par mois civil, active tout le mois, portant la date
 *   d'echeance calculee (rabattue). Traiter le loyer de novembre le retire de
 *   novembre ; decembre est une periode NEUVE, donc une alerte neuve. C'est
 *   exactement ce que la contrainte UNIQUE (company_id, dossier_id, genre,
 *   periode) rend possible.
 */
const VIDE: ReadonlySet<string> = new Set<string>();

export function deriverAlertes(params: {
  dossiers: DossierPourAlertes[];
  etats: EtatConnu[];
  /**
   * L'instant courant en heure d'Israel — jour ET heure.
   *
   * C'etait un simple jour jusqu'au 23 octobre 2026. Une alerte basculait donc a MINUIT,
   * et << a partir de 08:00 >> etait inexprimable. Le module reste PUR : il ne lit
   * aucune horloge, il recoit le moment.
   */
  moment: MomentIsrael;
  /** Les encaissements ACTIFS. Absents = aucun loyer n'a ete encaisse. */
  encaissements?: EncaissementConnu[];
  /**
   * TOUTES les periodes de contrat, cloturees comprises, de tous les dossiers.
   *
   * Depuis le 22 octobre 2026, l'alerte de loyer ne se construit plus sur les trois
   * colonnes du dossier. Elles ne refletent que la periode EN COURS : un impaye d'un
   * contrat renouvele en sortait, et la dette disparaissait de la cloche. Regle de
   * David : << Le renouvellement ne doit jamais faire disparaitre une dette reelle. >>
   *
   * Absentes = aucune alerte de loyer. On ne retombe PAS sur les colonnes du dossier :
   * ce serait une seconde source, et c'est precisement celle qui mentait.
   */
  periodes?: PeriodeDossier[];
}): Alerte[] {
  const { dossiers, etats, moment, encaissements = [], periodes = [] } = params;
  const aujourdhui = moment.jour;
  const jour = lireJour(aujourdhui);
  if (!jour) return [];

  /* Les periodes, regroupees par dossier. echeancierDuDossier se charge de les
     recoller sans compter deux fois un loyer couvert par deux contrats. */
  const periodesParDossier = new Map<string, PeriodeDossier[]>();
  for (const p of periodes) {
    const l = periodesParDossier.get(p.dossier_id) ?? [];
    l.push(p);
    periodesParDossier.set(p.dossier_id, l);
  }

  /* Index des etats connus, par la meme cle que la contrainte d'unicite. */
  const cle = (dossierId: string, genre: GenreAlerte, periode: string) => `${dossierId}|${genre}|${periode}`;
  const connus = new Map<string, EtatConnu>();
  for (const e of etats) connus.set(cle(e.dossier_id, e.genre, e.periode), e);

  /* Les echeances deja encaissees, par dossier. */
  const payes = new Map<string, Set<string>>();
  for (const e of encaissements) {
    const s = payes.get(e.dossier_id) ?? new Set<string>();
    s.add(e.echeance);
    payes.set(e.dossier_id, s);
  }

  const alertes: Alerte[] = [];

  for (const d of dossiers) {
    const locataire = (d.locataire || '').trim() || nom(d);
    const proprietaire = (d.proprietaire || '').trim() || '—';

    /* ---- FIN DE CONTRAT ---- */
    const fin = lireJour(d.date_fin_contrat);
    if (fin) {
      const restants = joursEntre(aujourdhui, d.date_fin_contrat!);
      /*
       * Le seuil n'est plus un nombre de jours mais une DATE DE DECLENCHEMENT, calculee
       * en arithmetique de calendrier. Et une fois ce jour passe, l'alerte reste : une
       * echeance depassee est encore un travail a faire, c'est le bouton << traite >>
       * qui la retire, pas le calendrier. estDeclenchee rend vrai pour tout jour
       * posterieur, donc cette regle-la est preservee sans etre reecrite.
       */
      if (restants !== null && estDeclenchee(jourDeclenchementFinContrat(d.date_fin_contrat!), moment)) {
        const periode = d.date_fin_contrat!;
        const etat = connus.get(cle(d.id, 'fin_contrat', periode));
        alertes.push({
          dossier_id: d.id, genre: 'fin_contrat', periode,
          echeance: periode, joursRestants: restants,
          locataire, proprietaire,
          lue: !!etat?.lue_le, traitee: !!etat?.traitee_le,
        });
      }
    }

    /* ---- LE LOYER ---- */
    /*
     * UNE SEULE SOURCE DE CALCUL.
     *
     * L'echeancier est construit par construireEcheancier — exactement la fonction que
     * lit l'onglet Echeancier loyers et l'apercu du formulaire. Trois consequences, et
     * aucune n'est ecrite ici :
     *
     *   - les BORNES du contrat sont deja appliquees : un bail termine ou pas encore
     *     commence ne produit aucune echeance, donc aucune alerte ;
     *   - un contrat INCOMPLET produit un echeancier vide, donc aucune alerte ;
     *   - le NUMERO et le TOTAL (<< 4e loyer sur 12 >>) tombent du meme calcul, donc la
     *     notification et l'onglet ne peuvent pas donner deux chiffres differents.
     *
     * Et comme chaque echeance garde le numero et le total DE SA PERIODE, un
     * renouvellement recommence naturellement la numerotation a 1.
     *
     * ---------- TOUTES LES PERIODES, PAS SEULEMENT LA PERIODE EN COURS ----------
     *
     * Jusqu'au 22 octobre 2026, l'echeancier etait construit sur les trois colonnes du
     * dossier, qui ne refletent que le contrat EN COURS. Un loyer impaye d'un contrat
     * renouvele sortait donc de la cloche le jour du renouvellement : la dette restait,
     * l'alerte disparaissait.
     *
     * echeancierDuDossier recolle toutes les periodes du dossier en coupant chacune au
     * debut de la suivante — ni double comptage, ni dette oubliee.
     */
    const encaissesDuDossier = payes.get(d.id) ?? VIDE;
    const estEncaisse = (date: string) => encaissesDuDossier.has(date);
    const echeancier = echeancierDuDossier(periodesParDossier.get(d.id) ?? [], estEncaisse);

    if (echeancier.length > 0) {
      /*
       * Le plus ancien impaye deja echu, a defaut celui du mois en cours.
       *
       * Un loyer ENCAISSE ne reste donc pas reclame — c'est la regle posee par David —
       * et un impaye de janvier ne disparait plus en fevrier derriere celui de fevrier.
       */
      const cible = loyerAAlerter(echeancier, estEncaisse, aujourdhui);

      /*
       * LA VEILLE A 08:00 — ET LE VERROU EST POSE ICI, PAS DANS L'ECHEANCIER.
       *
       * loyerAAlerter et loyerActuel ne bougent pas : ils servent aussi l'onglet
       * Echeancier, qui doit continuer de surligner le loyer du mois AVANT son
       * echeance. Les y toucher aurait retire ce surlignage pour une regle qui ne
       * concerne que la cloche.
       *
       * ---------- LA DETTE SORT, ET C'EST STRUCTUREL ----------
       *
       * << Une dette reelle ne disparait jamais >> est la regle de David, et elle tient
       * ICI SANS CAS PARTICULIER : le jour de declenchement d'une echeance est sa
       * VEILLE, donc pour une echeance deja echue cette veille est, elle aussi, passee,
       * et estDeclenchee rend vrai a toute heure.
       *
       * Un `cible.date <= aujourdhui ||` avait d'abord ete ecrit en tete. Une mutation
       * l'a retire sans faire echouer le moindre releve : il ne protegeait rien, il
       * donnait seulement l'air de proteger. Retire plutot que garde.
       */
      const sortMaintenant = cible !== null
        && estDeclenchee(jourDeclenchementLoyer(cible.date), moment);

      if (cible && sortMaintenant) {
        const periode = cible.date.slice(0, 7);
        const etat = connus.get(cle(d.id, 'loyer', periode));
        alertes.push({
          dossier_id: d.id, genre: 'loyer', periode, echeance: cible.date,
          joursRestants: joursEntre(aujourdhui, cible.date) ?? 0,
          locataire, proprietaire,
          lue: !!etat?.lue_le, traitee: !!etat?.traitee_le,
          rang: { numero: cible.numero, total: cible.total },
          statut: statutDe(cible.date, false, aujourdhui),
        });
      }
    }
  }

  /* Le plus urgent d'abord, puis par locataire pour que l'ordre soit stable. */
  alertes.sort((a, b) => a.joursRestants - b.joursRestants
    || a.locataire.localeCompare(b.locataire, 'fr')
    || a.genre.localeCompare(b.genre));
  return alertes;
}

/* ---------------------------------------------------------------------------
 * LES TROIS FILTRES ET LE BADGE — predicats figes, documentes en base dans le
 * COMMENT ON TABLE de crm_immo_etats. Les changer ici sans changer la base
 * ferait diverger l'interface et sa documentation.
 * ------------------------------------------------------------------------- */

/** 'AAAA-MM-JJ' en jj/mm/aaaa. Sans toLocaleDateString : la locale du poste varie. */
export function enDateFrancaise(iso: string): string {
  const j = lireJour(iso);
  return j ? DEUX(j.jour) + '/' + DEUX(j.mois) + '/' + j.annee : '—';
}

/**
 * La phrase d une alerte — LA MEME partout.
 *
 * Le hub Notifications general et la cloche locale du module affichent le meme texte,
 * parce qu ils parlent de la meme chose. Deux formulations pour un meme evenement, et
 * l utilisateur se demanderait s il s agit de deux alertes.
 *
 * Elle porte TOUJOURS les quatre informations que David exige : le type d alerte, le
 * locataire, le proprietaire et la date.
 */
export function libelleAlerte(a: Alerte): string {
  return titreAlerte(a) + ' — ' + detailAlerte(a);
}

/**
 * Le TITRE de l alerte : son premier segment, celui qui dit de quoi il s agit.
 */
export function titreAlerte(a: Alerte): string {
  if (a.genre === 'fin_contrat') return 'Contrat bientôt terminé';

  /*
   * << Loyer a encaisser — 4e loyer sur 12 >>.
   *
   * Le rang vient de l'echeancier, donc il est toujours d'accord avec l'onglet. Il peut
   * manquer — une alerte fabriquee a la main dans un test, par exemple — et la phrase
   * reste alors celle d'avant plutot que d'afficher un rang invente.
   *
   * << Loyer en retard >> quand l'echeance appartient a un mois PASSE. C'est la meme
   * distinction que dans l'echeancier, et elle ne demande aucun delai de grace a
   * arbitrer : un loyer du mois en cours est a encaisser, un loyer d'un mois passe est
   * en retard.
   */
  const base = a.statut === 'en-retard' ? 'Loyer en retard' : 'Loyer à encaisser';
  return a.rang ? `${base} — ${rangDuLoyer(a.rang)}` : base;
}

/**
 * Le RESTE de la phrase, sans son titre.
 *
 * Pourquoi cette troisieme fonction. Une ligne du hub general affiche un titre en gras
 * puis un detail en dessous — comme les neuf autres categories. En y mettant la phrase
 * ENTIERE, le titre apparaissait deux fois :
 *
 *   Contrat bientôt terminé
 *   Contrat bientôt terminé — Jean Dupont — propriétaire Sarah Cohen — échéance le 15/12/2026
 *
 * Mesure faite a 375 px sur le composant reel : la repetition poussait la ligne a deux
 * lignes de texte et volait la largeur dont un nom long a besoin.
 *
 * On ne change PAS la phrase pour autant. libelleAlerte est desormais DEFINIE comme
 * titre + detail : la cloche du module affiche toujours la phrase exacte que David a
 * specifiee, et le hub en typographie les deux moities. Un seul texte, impossible a
 * faire diverger — il n existe plus deux endroits ou l ecrire.
 */
export function detailAlerte(a: Alerte): string {
  const quand = enDateFrancaise(a.echeance);
  return a.genre === 'fin_contrat'
    ? `${a.locataire} — propriétaire ${a.proprietaire} — échéance le ${quand}`
    : `${a.locataire} — pour ${a.proprietaire} — échéance le ${quand}`;
}

export type FiltreAlertes = 'actives' | 'traitees' | 'toutes';

/** Traitee = retiree des actives, mais conservee. */
export const estActive = (a: Alerte) => !a.traitee;
export const estTraitee = (a: Alerte) => a.traitee;

export function filtrer(alertes: Alerte[], filtre: FiltreAlertes): Alerte[] {
  if (filtre === 'actives') return alertes.filter(estActive);
  if (filtre === 'traitees') return alertes.filter(estTraitee);
  return alertes;
}

/**
 * Le chiffre de la pastille : les NON LUES et NON TRAITEES.
 *
 * Marquer traite sans avoir lu retire bien l'alerte du badge — c'est l'arbitrage
 * de David : << elle ne doit plus compter dans le badge >>.
 */
export function compteBadge(alertes: Alerte[]): number {
  return alertes.filter(a => !a.lue && !a.traitee).length;
}
