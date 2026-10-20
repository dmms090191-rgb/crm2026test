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

export type GenreAlerte = 'fin_contrat' | 'loyer';

/** Les seuls champs d'un dossier dont la derivation a besoin. */
export interface DossierPourAlertes {
  id: string;
  nom: string;
  prenom?: string | null;
  locataire?: string | null;
  proprietaire?: string | null;
  /** 'AAAA-MM-JJ' ou null. */
  date_fin_contrat?: string | null;
  /** Jour du mois, 1 a 31, ou null. */
  jour_encaissement?: number | null;
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

/** Le fuseau du poste, pour l'appel courant. Isole afin de rester injectable. */
export function fuseauLocal(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

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

/** 'AAAA-MM' — la periode d'un loyer. Elle revient chaque mois, d'ou l'alerte recurrente. */
export function periodeLoyer(annee: number, mois: number): string {
  return `${annee}-${DEUX(mois)}`;
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
export function deriverAlertes(params: {
  dossiers: DossierPourAlertes[];
  etats: EtatConnu[];
  aujourdhui: string;
}): Alerte[] {
  const { dossiers, etats, aujourdhui } = params;
  const jour = lireJour(aujourdhui);
  if (!jour) return [];

  /* Index des etats connus, par la meme cle que la contrainte d'unicite. */
  const cle = (dossierId: string, genre: GenreAlerte, periode: string) => `${dossierId}|${genre}|${periode}`;
  const connus = new Map<string, EtatConnu>();
  for (const e of etats) connus.set(cle(e.dossier_id, e.genre, e.periode), e);

  const alertes: Alerte[] = [];

  for (const d of dossiers) {
    const locataire = (d.locataire || '').trim() || nom(d);
    const proprietaire = (d.proprietaire || '').trim() || '—';

    /* ---- FIN DE CONTRAT ---- */
    const fin = lireJour(d.date_fin_contrat);
    if (fin) {
      const restants = joursEntre(aujourdhui, d.date_fin_contrat!);
      if (restants !== null && restants <= PREAVIS_FIN_CONTRAT) {
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

    /* ---- LOYER DU MOIS ---- */
    const brut = d.jour_encaissement;
    if (typeof brut === 'number' && Number.isFinite(brut) && brut >= 1 && brut <= 31) {
      const j = jourRabattu(brut, jour.annee, jour.mois);
      const echeance = `${jour.annee}-${DEUX(jour.mois)}-${DEUX(j)}`;
      const periode = periodeLoyer(jour.annee, jour.mois);
      const etat = connus.get(cle(d.id, 'loyer', periode));
      alertes.push({
        dossier_id: d.id, genre: 'loyer', periode, echeance,
        joursRestants: joursEntre(aujourdhui, echeance) ?? 0,
        locataire, proprietaire,
        lue: !!etat?.lue_le, traitee: !!etat?.traitee_le,
      });
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
  return a.genre === 'fin_contrat' ? 'Contrat bientôt terminé' : 'Loyer à encaisser';
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
