/**
 * LE MODELE DE L'APERCU PLEIN ECRAN — zoom et deplacement, sans une ligne de React.
 *
 * ---------- POURQUOI CE FICHIER EXISTE ----------
 *
 * Un pincement a deux doigts est de l'arithmetique : une distance, un rapport, un point
 * d'ancrage, des bornes. Ecrite dans le composant, cette arithmetique ne se teste qu'en
 * fabriquant des evenements de pointeur ; ecrite ici, elle se teste par ses nombres.
 *
 * C'est le patron du module, deja employe pour l'echeancier et la conversion : la
 * DECISION est pure et vit dans src/lib, le CABLAGE vit dans le composant. Et il y a une
 * raison technique a la separation : importer un composant entraine src/lib/supabase, qui
 * lit import.meta.env et ne se charge pas hors navigateur.
 *
 * ---------- CE QUE CE MODELE GARANTIT ----------
 *
 * 1. L'image n'est JAMAIS deformee : on ne calcule qu'une echelle unique, jamais deux.
 * 2. A l'echelle 1 elle n'est jamais coupee : la taille ajustee est un `contain`, et les
 *    bornes de deplacement y valent zero — on ne peut pas la faire sortir du cadre.
 * 3. Au-dela de 1, on ne peut pas tirer l'image hors de l'ecran : le deplacement est
 *    borne par le debordement reel, donc il reste toujours de l'image sous le doigt.
 * 4. Le point pince reste SOUS LES DOIGTS pendant le geste.
 */

/** En deca, zoomer n'a pas de sens : l'image est deja ajustee au cadre. */
export const ECHELLE_MIN = 1;

/**
 * Au-dela de 4, une photo de bail devient une bouillie de pixels : l'image affichee est
 * deja reduite a 2560 px sur son grand cote par la conversion a l'envoi.
 */
export const ECHELLE_MAX = 4;

/** Ce que le double-tape donne quand on part de l'echelle 1. */
export const ECHELLE_DOUBLE_TAPE = 2;

export interface Point { x: number; y: number }
export interface Taille { largeur: number; hauteur: number }

/** L'etat complet de l'apercu : une echelle, un deplacement en pixels d'ecran. */
export interface EtatApercu {
  echelle: number;
  x: number;
  y: number;
}

export const ETAT_INITIAL: EtatApercu = { echelle: ECHELLE_MIN, x: 0, y: 0 };

/** La distance entre deux doigts. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Le milieu de deux doigts — le point que le geste doit garder immobile. */
export function milieu(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Une echelle ramenee entre ses bornes. */
export function echelleBornee(v: number): number {
  if (!Number.isFinite(v)) return ECHELLE_MIN;
  return Math.min(ECHELLE_MAX, Math.max(ECHELLE_MIN, v));
}

/**
 * La taille de l'image une fois AJUSTEE au cadre, sans deformation ni coupe — le
 * `contain` de CSS, calcule ici parce que les bornes de deplacement en dependent.
 *
 * Une taille naturelle inconnue (l'image n'est pas encore decodee) rend un cadre vide
 * plutot qu'un NaN : les bornes valent alors zero, donc rien ne bouge, ce qui est
 * exactement ce qu'on veut tant qu'il n'y a rien a montrer.
 */
export function tailleAjustee(naturelle: Taille, cadre: Taille): Taille {
  const { largeur: iw, hauteur: ih } = naturelle;
  const { largeur: cw, hauteur: ch } = cadre;
  if (iw <= 0 || ih <= 0 || cw <= 0 || ch <= 0) return { largeur: 0, hauteur: 0 };
  const rapport = Math.min(cw / iw, ch / ih);
  return { largeur: iw * rapport, hauteur: ih * rapport };
}

/**
 * Le deplacement ramene dans ce que le debordement autorise.
 *
 * A l'echelle 1, l'image ajustee tient dans le cadre : le debordement est nul, la borne
 * vaut zero, et le deplacement est ecrase a zero. L'image est donc CENTREE et ne peut pas
 * etre tiree hors du cadre — sans aucune regle supplementaire a ecrire.
 */
export function decalageBorne(x: number, y: number, echelle: number, ajustee: Taille, cadre: Taille): Point {
  const maxX = Math.max(0, (ajustee.largeur * echelle - cadre.largeur) / 2);
  const maxY = Math.max(0, (ajustee.hauteur * echelle - cadre.hauteur) / 2);
  const borne = (v: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(-max, v)) : 0);
  return { x: borne(x, maxX), y: borne(y, maxY) };
}

/**
 * CHANGER D'ECHELLE EN GARDANT UN POINT IMMOBILE.
 *
 * `ancre` est en coordonnees du cadre (0,0 en haut a gauche). Le transform applique est
 * `translate(x, y) scale(e)` avec l'origine au CENTRE : un point de l'image situe sous
 * l'ancre s'y trouve encore apres le changement d'echelle.
 *
 * L'algebre, pour que personne n'ait a la redecouvrir : si `c` est le centre du cadre,
 * un point `p` de l'ecran correspond au point `(p - c - t) / e` de l'image. Imposer que
 * ce point reste sous `p` apres passage a `e'` donne `t' = p - c - ((p - c - t) / e) * e'`.
 */
export function versEchelle(
  etat: EtatApercu,
  echelleVoulue: number,
  ancre: Point,
  ajustee: Taille,
  cadre: Taille,
): EtatApercu {
  const e2 = echelleBornee(echelleVoulue);
  const cx = cadre.largeur / 2;
  const cy = cadre.hauteur / 2;
  const ix = (ancre.x - cx - etat.x) / etat.echelle;
  const iy = (ancre.y - cy - etat.y) / etat.echelle;
  const brut = { x: ancre.x - cx - ix * e2, y: ancre.y - cy - iy * e2 };
  const { x, y } = decalageBorne(brut.x, brut.y, e2, ajustee, cadre);
  return { echelle: e2, x, y };
}

/** Un deplacement au doigt, borne. */
export function versDecalage(
  etat: EtatApercu,
  dx: number,
  dy: number,
  ajustee: Taille,
  cadre: Taille,
): EtatApercu {
  const { x, y } = decalageBorne(etat.x + dx, etat.y + dy, etat.echelle, ajustee, cadre);
  return { echelle: etat.echelle, x, y };
}

/**
 * Le double-tape : on agrandit si on est au repos, on revient au repos sinon.
 *
 * Revenir au repos remet aussi le deplacement a zero — passer par versEchelle le ferait
 * de toute facon, puisque les bornes valent zero a l'echelle 1, mais le dire ici evite
 * d'avoir a le deduire.
 */
export function apresDoubleTape(etat: EtatApercu, ancre: Point, ajustee: Taille, cadre: Taille): EtatApercu {
  if (etat.echelle > ECHELLE_MIN) return { ...ETAT_INITIAL };
  return versEchelle(etat, ECHELLE_DOUBLE_TAPE, ancre, ajustee, cadre);
}

/**
 * Le pincement : le rapport des distances applique a l'echelle de DEPART du geste.
 *
 * On part de l'echelle du debut du geste et non de la precedente : multiplier a chaque
 * mouvement accumulerait les arrondis, et un aller-retour des doigts ne reviendrait pas
 * a l'echelle de depart.
 */
export function apresPincement(
  depart: { etat: EtatApercu; distance: number },
  distanceCourante: number,
  ancre: Point,
  ajustee: Taille,
  cadre: Taille,
): EtatApercu {
  if (depart.distance <= 0 || !Number.isFinite(distanceCourante)) return depart.etat;
  return versEchelle(depart.etat, depart.etat.echelle * (distanceCourante / depart.distance), ancre, ajustee, cadre);
}
