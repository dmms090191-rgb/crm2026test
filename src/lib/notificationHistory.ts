/**
 * L'HISTORIQUE DES NOTIFICATIONS — le coeur, sans React et sans base.
 *
 * Tout ce qui DECIDE est ici : ce qui identifie une notification, ce qui en fait un
 * doublon, ce que la page montre quand on filtre, cherche ou trie. Le hook ne fait que
 * parler au reseau, la page que dessiner. C'est ce qui rend cette logique verifiable
 * par `node --test`, sans navigateur.
 *
 * ---------- CE QUI IDENTIFIE UNE NOTIFICATION ----------
 *
 * La cle est (company_id, recipient_user_id, category, source_id, occurrence), et c'est
 * elle qui porte tout le comportement : l'anti-doublon, et la suppression durable. Son
 * sens change selon la categorie, et chaque choix a une raison :
 *
 *   categorie                      source_id              occurrence
 *   ----------------------------   --------------------   -----------------------------
 *   client / vendeur / super-admin l'INTERLOCUTEUR        le plus ancien message non lu
 *   agenda / equipe                le rendez-vous         'starting' ou 'untreated'
 *   propositions / rdv /
 *   decalages / demandes-decalage  la proposition         '' (la proposition suffit)
 *   crm-immo                       le dossier             'fin_contrat:JJ' / 'loyer:MM'
 *
 * Pour les trois chats, c'est la regle de l'EPISODE : une entree = une conversation
 * restee non lue, jamais un message. Jean ecrit trois fois, l'historique garde une
 * ligne — parce que le plus ancien message non lu ne bouge pas tant que l'episode dure.
 * L'admin lit, Jean reecrit : l'ancre change, un nouvel episode commence.
 *
 * Pour les deux Agenda, l'occurrence distingue les deux raisons d'alerter sur le MEME
 * rendez-vous : il commence, ou il est passe sans etre traite. Sans elle, la seconde
 * ecraserait la premiere.
 *
 * Pour les quatre categories de rendez-vous, l'occurrence est vide : la proposition est
 * deja unique, et `seen_by_admin` ne distingue de toute facon pas les quatre.
 */

/** Les dix categories du hub. A garder alignee sur NotifCategory — un test le verifie. */
export type CategorieHistorique =
  | 'client' | 'vendeur' | 'super-admin'
  | 'agenda' | 'equipe'
  | 'propositions' | 'rdv'
  | 'decalages' | 'demandes-decalage'
  | 'crm-immo';

export const CATEGORIES: CategorieHistorique[] = [
  'client', 'vendeur', 'super-admin',
  'agenda', 'equipe',
  'propositions', 'rdv',
  'decalages', 'demandes-decalage',
  'crm-immo',
];

/** Les libelles du hub, repris mot pour mot : la page ne doit pas renommer. */
export const LIBELLES: Record<CategorieHistorique, string> = {
  client: 'Chat Client',
  vendeur: 'Chat Commercial',
  'super-admin': 'Chat Direction',
  agenda: 'Agenda perso',
  equipe: 'Agenda equipe',
  propositions: 'Propositions RDV',
  rdv: 'RDV Confirmes',
  decalages: 'Reponses decalages',
  'demandes-decalage': 'Demandes de decalage',
  'crm-immo': 'CRM Immo',
};

/** Une ligne prete pour l'upsert. Exactement les colonnes que l'alimentation ecrit. */
export interface LigneHistorique {
  company_id: string;
  recipient_user_id: string;
  category: CategorieHistorique;
  source_type: string;
  source_id: string;
  occurrence: string;
  title: string;
  message: string | null;
  occurred_at: string;
  /**
   * L'ETAT PORTE PAR LA SOURCE — et seulement quand la source en a un.
   *
   * ---------- POURQUOI C'EST OPTIONNEL, ET POURQUOI CA COMPTE ----------
   *
   * Pour CRM Immo, « lu » et « traite » vivent en base, dans crm_immo_etats : c'est la
   * source de verite, et l'historique n'en est que le reflet. Une alerte deja traitee
   * doit donc entrer dans le journal AVEC son etat, sinon elle y apparaitrait comme
   * neuve alors qu'on s'en est occupe.
   *
   * Pour les autres categories il n'existe aucun etat de ce genre : un message lu
   * disparait de la source, il n'y a rien a reporter. Leur `read_at` appartient donc a
   * l'historique SEUL, et l'alimentation ne doit surtout pas y toucher — c'est pourquoi
   * ces deux champs sont ABSENTS de leurs lignes, et non poses a null.
   *
   * L'alimentation s'appuie sur cette absence pour separer ses lots : voir
   * useNotificationHistory. Un upsert melangeant les deux formes remettrait a null le
   * marquage de toutes les autres categories.
   */
  read_at?: string | null;
  treated_at?: string | null;
}

/** Une ligne relue depuis la base : ce que la page affiche. */
export interface EntreeHistorique extends LigneHistorique {
  id: string;
  read_at: string | null;
  treated_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

/*
 * Les formes d'entree, declarees au minimum.
 *
 * Volontairement structurelles, et non importees des hooks : ce fichier ne doit rien
 * savoir de React. Le typage structurel de TypeScript fait que les vraies entrees les
 * satisfont sans adaptateur — et si un champ disparait la-bas, la compilation le dit.
 */
export interface EpisodeChat {
  /** L'interlocuteur. C'est lui le source_id, jamais le message. */
  interlocuteurId: string;
  nom: string;
  /** Ligne secondaire eventuelle, ex. « Groupe : Willness ». */
  sousTitre?: string;
  /** Messages non lus dans cet episode. Sert au message, pas a la cle. */
  count: number;
  /** L'ancre de l'episode : le plus ancien message non lu. */
  oldestAt: string;
  preview: string;
}

export interface EntreeAgenda {
  rdvId: string;
  leadName: string;
  /** Present pour l'Agenda equipe seulement. */
  vendorName?: string;
  appointmentUtc: string;
  type?: 'starting' | 'untreated';
}

export interface EntreeProposition {
  id: string;
  lead_name: string;
  created_at: string;
}

export interface AlerteImmo {
  dossier_id: string;
  genre: 'fin_contrat' | 'loyer';
  /** 'AAAA-MM' pour un loyer, 'AAAA-MM-JJ' pour une fin de contrat. */
  periode: string;
  echeance: string;
  locataire: string;
  proprietaire: string;
  /**
   * Quand l'alerte a ete lue et traitee, tels que crm_immo_etats les porte.
   *
   * Optionnels pour que les releves qui fabriquent une alerte a la main n'aient pas a
   * les declarer ; absents, ils valent null — jamais une date inventee.
   */
  lue_le?: string | null;
  traitee_le?: string | null;
}

/** Tout ce que le hub tient a un instant donne, categorie par categorie. */
export interface SourcesNotifications {
  client?: EpisodeChat[];
  vendeur?: EpisodeChat[];
  'super-admin'?: EpisodeChat[];
  agenda?: EntreeAgenda[];
  equipe?: EntreeAgenda[];
  propositions?: EntreeProposition[];
  rdv?: EntreeProposition[];
  decalages?: EntreeProposition[];
  'demandes-decalage'?: EntreeProposition[];
  'crm-immo'?: AlerteImmo[];
}

export interface Destinataire {
  companyId: string;
  userId: string;
}

/** La table d'origine de chaque categorie. Informatif : aucune cle etrangere dessus. */
const SOURCE_TYPE: Record<CategorieHistorique, string> = {
  client: 'client_messages',
  vendeur: 'vendor_admin_messages',
  'super-admin': 'super_admin_messages',
  agenda: 'rdv_proposals',
  equipe: 'rdv_proposals',
  propositions: 'rdv_proposals',
  rdv: 'rdv_proposals',
  decalages: 'rdv_proposals',
  'demandes-decalage': 'rdv_proposals',
  'crm-immo': 'crm_immo_dossiers',
};

/** Borne de la colonne `title` en base. Tronquer ici evite un 23514 a l'ecriture. */
const TITRE_MAX = 200;
/** Borne de la colonne `message`. Meme raison. */
const MESSAGE_MAX = 2000;

function borner(v: string, max: number): string {
  return v.length <= max ? v : v.slice(0, max - 1) + '…';
}

/** Un titre toujours non vide : la base refuse le blanc, et « sans nom » est honnete. */
function nomOuDefaut(v: string, defaut: string): string {
  const n = v.trim();
  return n === '' ? defaut : n;
}

function ligneChat(
  categorie: 'client' | 'vendeur' | 'super-admin',
  e: EpisodeChat,
  d: Destinataire,
): LigneHistorique {
  const qui = nomOuDefaut(e.nom, 'Interlocuteur sans nom');
  const pluriel = e.count > 1 ? `${e.count} messages non lus` : '1 message non lu';
  return {
    company_id: d.companyId,
    recipient_user_id: d.userId,
    category: categorie,
    source_type: SOURCE_TYPE[categorie],
    source_id: e.interlocuteurId,
    /* L'ancre de l'episode. C'est ce qui fait qu'un flot de messages = une entree. */
    occurrence: e.oldestAt,
    title: borner(`${LIBELLES[categorie]} — ${qui}`, TITRE_MAX),
    message: borner(e.sousTitre ? `${e.sousTitre} · ${pluriel} · ${e.preview}` : `${pluriel} · ${e.preview}`, MESSAGE_MAX),
    /* L'evenement, c'est le debut de l'episode — pas l'instant du releve. */
    occurred_at: e.oldestAt,
  };
}

function ligneAgenda(
  categorie: 'agenda' | 'equipe',
  e: EntreeAgenda,
  d: Destinataire,
): LigneHistorique {
  const qui = nomOuDefaut(e.leadName, 'Rendez-vous sans nom');
  /*
   * Les deux hooks Agenda renseignent toujours `type`. Le repli existe uniquement
   * parce que le champ est optionnel dans leur interface ; s'il servait un jour,
   * 'untreated' est le libelle qui ne revendique pas une urgence qu'on ne peut prouver.
   */
  const genre = e.type ?? 'untreated';
  const quoi = genre === 'starting' ? 'Rendez-vous imminent' : 'Rendez-vous passe non traite';
  return {
    company_id: d.companyId,
    recipient_user_id: d.userId,
    category: categorie,
    source_type: SOURCE_TYPE[categorie],
    source_id: e.rdvId,
    /* Le MEME rendez-vous peut alerter deux fois, pour deux raisons differentes. */
    occurrence: genre,
    title: borner(`${LIBELLES[categorie]} — ${qui}`, TITRE_MAX),
    message: borner(e.vendorName ? `${quoi} · ${e.vendorName}` : quoi, MESSAGE_MAX),
    occurred_at: e.appointmentUtc,
  };
}

function ligneProposition(
  categorie: 'propositions' | 'rdv' | 'decalages' | 'demandes-decalage',
  e: EntreeProposition,
  d: Destinataire,
): LigneHistorique {
  const qui = nomOuDefaut(e.lead_name, 'Lead sans nom');
  return {
    company_id: d.companyId,
    recipient_user_id: d.userId,
    category: categorie,
    source_type: SOURCE_TYPE[categorie],
    source_id: e.id,
    /* La proposition est deja unique : rien a ajouter pour la distinguer. */
    occurrence: '',
    title: borner(`${LIBELLES[categorie]} — ${qui}`, TITRE_MAX),
    message: null,
    occurred_at: e.created_at,
  };
}

function ligneImmo(a: AlerteImmo, d: Destinataire): LigneHistorique {
  const quoi = a.genre === 'fin_contrat' ? 'Fin de contrat' : 'Loyer a encaisser';
  const qui = nomOuDefaut(a.locataire, 'Locataire sans nom');
  return {
    company_id: d.companyId,
    recipient_user_id: d.userId,
    category: 'crm-immo',
    source_type: SOURCE_TYPE['crm-immo'],
    source_id: a.dossier_id,
    /*
     * Le couple (genre, periode) de crm_immo_etats, mis en une chaine. La base en
     * verifie le format : un CHECK impose fin_contrat:AAAA-MM-JJ ou loyer:AAAA-MM.
     * C'est ce qui garantit qu'une meme echeance produit TOUJOURS la meme occurrence,
     * et donc que l'anti-doublon et la pierre tombale tiennent dans le temps.
     */
    occurrence: `${a.genre}:${a.periode}`,
    title: borner(`${quoi} — ${qui}`, TITRE_MAX),
    message: borner(`Echeance ${a.echeance} · Proprietaire ${nomOuDefaut(a.proprietaire, 'non renseigne')}`, MESSAGE_MAX),
    /*
     * L'echeance, et non l'instant du releve : une alerte doit se ranger dans la page a
     * la date qui la concerne. 'AAAA-MM-JJ' devient midi UTC — un jour calendaire n'a
     * pas d'heure, et midi est le seul choix qui ne bascule de jour sous aucun fuseau
     * reellement utilise.
     */
    occurred_at: `${a.echeance}T12:00:00.000Z`,
    /*
     * L'etat vient de crm_immo_etats, et l'historique le REFLETE.
     *
     * Sans ces deux dates, une alerte deja traitee entrerait dans le journal comme si
     * personne ne s'en etait occupe. C'est pour cela que le journal recoit desormais
     * TOUTES les alertes derivees et non les seules actives : une alerte traitee reste
     * un evenement qui a eu lieu.
     *
     * Elles sont REECRITES a chaque alimentation, et c'est voulu : pour cette categorie
     * la verite est en base, pas dans l'historique. Traiter dans la cloche se voit donc
     * aussitot dans le journal.
     */
    read_at: a.lue_le ?? null,
    treated_at: a.traitee_le ?? null,
  };
}

/**
 * Les lignes a ecrire pour l'etat courant du hub.
 *
 * Pure et deterministe : aucune horloge, aucun hasard. Deux appels sur les memes
 * sources rendent les memes lignes — c'est ce qui rend l'upsert inoffensif a repeter,
 * et ce qui permet de prouver l'anti-doublon sans base.
 */
export function construireLignes(s: SourcesNotifications, d: Destinataire): LigneHistorique[] {
  if (!d.companyId || !d.userId) return [];

  const lignes: LigneHistorique[] = [];
  for (const e of s.client ?? []) lignes.push(ligneChat('client', e, d));
  for (const e of s.vendeur ?? []) lignes.push(ligneChat('vendeur', e, d));
  for (const e of s['super-admin'] ?? []) lignes.push(ligneChat('super-admin', e, d));
  for (const e of s.agenda ?? []) lignes.push(ligneAgenda('agenda', e, d));
  for (const e of s.equipe ?? []) lignes.push(ligneAgenda('equipe', e, d));
  for (const e of s.propositions ?? []) lignes.push(ligneProposition('propositions', e, d));
  for (const e of s.rdv ?? []) lignes.push(ligneProposition('rdv', e, d));
  for (const e of s.decalages ?? []) lignes.push(ligneProposition('decalages', e, d));
  for (const e of s['demandes-decalage'] ?? []) lignes.push(ligneProposition('demandes-decalage', e, d));
  for (const a of s['crm-immo'] ?? []) lignes.push(ligneImmo(a, d));

  /*
   * Un lot ne doit jamais contenir deux fois la meme cle.
   *
   * Postgres refuse un ON CONFLICT dont le lot se contredit : « ON CONFLICT DO UPDATE
   * command cannot affect row a second time ». Ce n'est pas theorique — deux alertes du
   * meme dossier sur la meme periode, ou un interlocuteur present deux fois apres une
   * course entre deux chargements, suffisent. On garde la PREMIERE, l'ordre ci-dessus
   * etant stable.
   */
  const vues = new Set<string>();
  return lignes.filter(l => {
    const cle = `${l.category}|${l.source_id}|${l.occurrence}`;
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}

/** La cle d'unicite d'une ligne, telle que la base la comprend. */
export function cleDeLigne(l: LigneHistorique): string {
  return `${l.company_id}|${l.recipient_user_id}|${l.category}|${l.source_id}|${l.occurrence}`;
}

/* ---------------------------------------------------------------------------
   CE QUE LA PAGE MONTRE
   --------------------------------------------------------------------------- */

export type FiltreEtat = 'tous' | 'non-lues' | 'lues' | 'archivees';
export type SensTri = 'recentes' | 'anciennes';

export interface Criteres {
  etat: FiltreEtat;
  categories: CategorieHistorique[];
  terme: string;
  tri: SensTri;
}

export const CRITERES_PAR_DEFAUT: Criteres = {
  etat: 'tous',
  categories: [],
  terme: '',
  tri: 'recentes',
};

/**
 * Une notification supprimee ne s'affiche JAMAIS.
 *
 * Sa ligne survit en base pour empecher l'alimentation de la recreer ; elle n'a rien a
 * faire a l'ecran. C'est le seul filtre qui ne se desactive pas : il n'existe pas de
 * « voir les supprimees », parce que leur contenu a ete purge et qu'il ne reste rien a
 * voir. La base pourrait les cacher d'elle-meme, mais la page doit tenir seule : un
 * SELECT mal ecrit ailleurs ne doit pas faire reapparaitre une ligne purgee.
 */
function estVisible(e: EntreeHistorique): boolean {
  return e.deleted_at === null;
}

/** Non lue au sens de la cloche : ni lue, ni archivee, ni supprimee. */
export function estNouvelle(e: EntreeHistorique): boolean {
  return estVisible(e) && e.read_at === null && e.archived_at === null;
}

function correspondEtat(e: EntreeHistorique, etat: FiltreEtat): boolean {
  switch (etat) {
    case 'tous':      return e.archived_at === null;
    case 'non-lues':  return e.read_at === null && e.archived_at === null;
    case 'lues':      return e.read_at !== null && e.archived_at === null;
    case 'archivees': return e.archived_at !== null;
  }
}

/** Recherche insensible a la casse et aux accents, sur le titre et le message. */
export function normaliser(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function correspondTerme(e: EntreeHistorique, terme: string): boolean {
  const t = normaliser(terme);
  if (t === '') return true;
  return normaliser(e.title).includes(t) || normaliser(e.message ?? '').includes(t);
}

/**
 * La liste affichee, dans l'ordre affiche.
 *
 * Un seul passage, pour que la page n'ait aucune decision a prendre : ce qu'elle recoit
 * est exactement ce qu'elle dessine.
 */
export function appliquerCriteres(entrees: EntreeHistorique[], c: Criteres): EntreeHistorique[] {
  const retenues = entrees.filter(e =>
    estVisible(e)
    && correspondEtat(e, c.etat)
    && (c.categories.length === 0 || c.categories.includes(e.category))
    && correspondTerme(e, c.terme),
  );

  /*
   * Tri sur occurred_at — l'EVENEMENT — et non created_at, l'instant de la ligne. Une
   * alerte CRM Immo pour une echeance de novembre doit se ranger en novembre, meme si
   * sa ligne est nee aujourd'hui. `id` departage les ex aequo : sans lui, deux entrees
   * de meme horodatage changeraient de place d'un rendu a l'autre.
   */
  return retenues.sort((a, b) => {
    const d = a.occurred_at === b.occurred_at ? 0 : (a.occurred_at < b.occurred_at ? -1 : 1);
    if (d !== 0) return c.tri === 'recentes' ? -d : d;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface Compteurs {
  total: number;
  nouvelles: number;
  lues: number;
  archivees: number;
  parCategorie: Record<string, number>;
}

/**
 * Les compteurs de l'en-tete.
 *
 * Comptes sur la liste VISIBLE entiere, jamais sur la liste filtree : un compteur qui
 * baisse parce qu'on a tape dans la recherche ne compte plus rien.
 */
export function compter(entrees: EntreeHistorique[]): Compteurs {
  const visibles = entrees.filter(estVisible);
  const parCategorie: Record<string, number> = {};
  for (const e of visibles) parCategorie[e.category] = (parCategorie[e.category] ?? 0) + 1;
  return {
    total: visibles.length,
    nouvelles: visibles.filter(estNouvelle).length,
    lues: visibles.filter(e => e.read_at !== null && e.archived_at === null).length,
    archivees: visibles.filter(e => e.archived_at !== null).length,
    parCategorie,
  };
}
