import { decomposeTel, nettoyerTel, INDICATIF_FRANCE } from './phoneNormalizer';

/**
 * LE FORMAT D'AFFICHAGE ET D'APPEL DES NUMEROS — un seul helper pour les deux CRM.
 *
 * ---------- CE QUE CE FICHIER NE FAIT PAS ----------
 *
 * Il ne touche JAMAIS a la base. Changer de format ne declenche aucun `UPDATE` sur `leads`,
 * ne reecrit ni `leads.telephone` ni le JSONB du lead. Le numero enregistre reste celui que
 * l'import a pose ; ce fichier ne decide que de la facon de l'ECRIRE a l'ecran et dans le
 * lien d'appel. C'est pour cela qu'il n'importe pas `supabase` — l'absence de cet import est
 * la garantie, pas la promesse.
 *
 * ---------- POURQUOI UN SEUL FICHIER POUR QUATRE COMPOSANTS ----------
 *
 * Le CRM de la Societe et celui du Vendeur ne partagent AUCUN composant : deux lignes de
 * tableau, deux cartes mobiles, quatre fichiers distincts. Ecrite quatre fois, la regle
 * aurait divergé — et un numero mal prefixe ne se voit pas, il sonne dans le vide.
 */

/** Les trois notations proposees. L'ordre est celui des boutons. */
export const FORMATS_TEL = ['0', '+33', '0033'] as const;
export type FormatTel = typeof FORMATS_TEL[number];

/** La notation nationale par defaut : celle qu'un francais lit sans y penser. */
export const FORMAT_TEL_DEFAUT: FormatTel = '0';

export function estFormatTel(v: unknown): v is FormatTel {
  return typeof v === 'string' && (FORMATS_TEL as readonly string[]).includes(v);
}

/** Le libelle lu a voix haute par un lecteur d'ecran, ou « +33 » s'entendrait « plus trente-trois ». */
export const LIBELLE_FORMAT_TEL: Record<FormatTel, string> = {
  '0': 'Format national, commencant par zero',
  '+33': 'Format international, commencant par plus trente-trois',
  '0033': 'Format international, commencant par zero zero trente-trois',
};

/**
 * Reecrit un numero dans la notation demandee.
 *
 * JAMAIS DE PREFIXE DOUBLE : on ne colle pas un prefixe devant ce qui est deja la, on repart
 * toujours de la partie nationale decomposee. `+33664333952` en format `+33` ne peut donc pas
 * donner `+33+33664333952` — le `+33` du depart a ete retire avant d'etre remis.
 *
 * Un numero indecidable est rendu TEL QUEL : mieux vaut afficher ce qui est en base qu'un
 * numero inventé ou un tiret a la place — la personne qui lit l'ecran doit pouvoir constater
 * que la donnee est sale.
 */
export function formaterTel(raw: string | null | undefined, format: FormatTel): string {
  if (!raw) return '';
  const d = decomposeTel(raw);
  if (!d) {
    /* UN TEXTE SANS LE MOINDRE CHIFFRE N'EST PAS UN NUMERO MAL ECRIT, c'est une note : « a
       definir », « voir le mail ». Lui retirer ses espaces le rendrait illisible — releve du
       12/11/2026 : « a definir » s'affichait « adefinir ». On ne rogne alors que les bords. */
    if (!/\d/.test(raw)) return raw.trim();
    return nettoyerTel(raw);
  }

  if (d.pays === 'fr') {
    if (format === '0') return '0' + d.national;
    if (format === '+33') return '+' + INDICATIF_FRANCE + d.national;
    return '00' + INDICATIF_FRANCE + d.national;
  }

  /* UN NUMERO ETRANGER N'A PAS DE FORME « 0 ». Le zero de tete est une convention NATIONALE :
     devant un numero belge ou luxembourgeois il ne veut rien dire, et le composer depuis la
     France ne joint personne. On garde donc la forme internationale — ce n'est pas un oubli,
     c'est la seule ecriture qui marche. Seule la NOTATION de l'indicatif suit le reglage :
     `+49` et `0049` disent la meme chose. */
  if (format === '0033') return '00' + d.e164.slice(1);
  return d.e164;
}

/**
 * L'adresse du lien d'appel, ou `null` quand il n'y a rien a appeler.
 *
 * `null` et non une chaine vide : un `href` vide pointe sur la page courante, et toucher
 * l'icone rechargerait le CRM au lieu de passer un appel. L'appelant doit donc choisir quoi
 * faire de l'absence — ici, ne rien afficher.
 */
export function telHref(raw: string | null | undefined, format: FormatTel): string | null {
  const ecrit = formaterTel(raw, format);
  if (!ecrit) return null;
  /* Au moins sept chiffres, sinon ce n'est pas un numero mais un reste de saisie. Le seuil
     est celui que `normalizePhone` applique deja a l'import. */
  const chiffres = ecrit.replace(/\D/g, '');
  if (chiffres.length < 7) return null;
  return 'tel:' + ecrit;
}

/* ─────────────────────────────────────────────────────────────────────────────
   LA SOURCE DU NUMERO — en cascade, parce que la base en a plusieurs.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Les debuts de nom qui designent un telephone, une fois le nom ramene en minuscules et
 * debarrasse de ses separateurs et de ses accents : `Tel Portable`, `tel_fixe`, `Téléphone`
 * et `phoneMobile` sont ainsi tous reconnus, sans tenir une liste de toutes les combinaisons.
 */
const DEBUTS_DE_CHAMP_TEL = ['tel', 'phone', 'mobile', 'portable', 'gsm'];

/**
 * Les pieges que « commence par tel » ramasserait a tort : un numero de telecopieur n'est pas
 * un numero d'appel, et composer un fax met un prospect de mauvaise humeur.
 *
 * `numero` n'est volontairement PAS dans les debuts reconnus : un champ nomme simplement
 * « Numero » est tout aussi probablement un numero de dossier, de client ou de commande. On
 * prefere ne rien afficher qu'afficher un numero de facture avec un bouton d'appel a cote.
 */
const FAUX_AMIS_TEL = new Set(['telecopie', 'telecopieur', 'telefax', 'telex', 'telegramme']);

const nomNormalise = (k: string) =>
  k.toLowerCase().replace(/[\s_\-.]/g, '').replace(/[éèêë]/g, 'e');

const estChampTel = (k: string) => {
  const n = nomNormalise(k);
  if (FAUX_AMIS_TEL.has(n)) return false;
  return DEBUTS_DE_CHAMP_TEL.some(d => n.startsWith(d));
};

/** La forme minimale d'un lead dont on sait lire le numero — structurelle, pour servir les deux CRM. */
export interface PorteurDeNumero {
  telephone?: string | null;
  data?: Record<string, string> | null;
}

/**
 * LE NUMERO D'UN LEAD, quelle que soit la facon dont il a ete rangé.
 *
 * ---------- LE DEFAUT QUE CETTE CASCADE CORRIGE ----------
 *
 * Le JSONB des leads porte DEUX cles qui ne different que par une majuscule : `telephone` et
 * `Telephone`. Releve du 12/11/2026 sur les 33 leads en base, en role `postgres` donc hors
 * RLS : `Telephone` est renseigne pour 13 leads, `telephone` pour 20, les deux ensembles sont
 * DISJOINTS, et la colonne plate `leads.telephone` est remplie pour 30. Les deux CRM lisaient
 * `data['Telephone']` : ils affichaient donc un tiret pour 20 leads sur 33 — 61 % — alors que
 * le numero etait la, a cote.
 *
 * La colonne plate passe EN PREMIER parce que c'est elle que le pipeline d'import normalise ;
 * le JSONB garde la saisie d'origine. A numero egal, la colonne est la plus propre.
 *
 * Aucune donnee n'est modifiee pour autant : on lit mieux, on n'ecrit rien.
 */
export function telDuLead(lead: PorteurDeNumero | null | undefined): string {
  if (!lead) return '';

  const plate = (lead.telephone ?? '').trim();
  if (plate !== '') return plate;

  const data = lead.data;
  if (!data) return '';

  /* Les deux noms connus d'abord, dans cet ordre, pour que le resultat ne depende pas de
     l'ordre de parcours des cles d'un objet. */
  for (const cle of ['Telephone', 'telephone']) {
    const v = (data[cle] ?? '').trim();
    if (v !== '') return v;
  }

  /* Puis tout nom qui designe visiblement un telephone : une troisieme casse, un accent ou
     un `Tel Portable` venu d'un futur import ne doit pas rouvrir le meme defaut. */
  for (const [k, raw] of Object.entries(data)) {
    if (!estChampTel(k)) continue;
    const v = (raw ?? '').trim();
    if (v !== '') return v;
  }

  return '';
}

/**
 * LE FILTRE TELEPHONE — tolerant au format, et PUREMENT ADDITIF.
 *
 * ---------- LE PIEGE QU'IL EVITE ----------
 *
 * Des qu'un selecteur de format existe, on tape ce qu'on VOIT. Si l'ecran montre
 * `+33664333952` et que la base contient `06 64 33 39 52`, un `includes` sur la source ne
 * trouve rien : l'utilisateur recopie le numero affiche et la liste se vide. Le defaut n'a
 * pas d'existence avant ce chantier — il nait avec le selecteur.
 *
 * ---------- POURQUOI L'ANCIENNE REGLE EST GARDEE EN PREMIER ----------
 *
 * La correspondance litterale sur la source est testee AVANT. Tout ce qui etait trouve avant
 * continue de l'etre : la reconnaissance par chiffres n'ajoute que des resultats, elle n'en
 * retire aucun. Une recherche qui rend un sur-ensemble ne peut pas regresser.
 */
export function telCorrespond(raw: string | null | undefined, saisie: string): boolean {
  const q = saisie.trim();
  if (q === '') return true;

  const source = (raw ?? '').trim();
  if (source.toLowerCase().includes(q.toLowerCase())) return true;

  const qChiffres = q.replace(/\D/g, '');
  if (qChiffres === '') return false;

  const d = decomposeTel(source);
  if (!d) return source.replace(/\D/g, '').includes(qChiffres);

  /* Les trois ecritures possibles du meme numero, comparees sur leurs seuls chiffres : la
     saisie trouve son contact qu'on ait tape `0664`, `33664` ou `+33 6 64`. */
  const formes = FORMATS_TEL.map(f => formaterTel(source, f).replace(/\D/g, ''));
  return formes.some(f => f.includes(qChiffres));
}
