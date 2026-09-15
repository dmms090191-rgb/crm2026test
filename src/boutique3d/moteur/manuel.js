// Deplacement manuel a la premiere personne : vitesses, collisions, integration du mouvement.
// Tout est ecrit en fonctions pures (testables sans navigateur et sans three.js) : ce module ne
// connait ni React ni le moteur de rendu, il ne manipule que des nombres.
//
// Repere : celui du GLB (Y vertical). Le sol est le plan XZ, X est lateral, Z la profondeur
// (la porte est en z proche de 0, le fond du magasin en z tres negatif).
// Convention des manches : { x, y } dans [-1, 1], y NEGATIF vers le haut de l'ecran
// (meme convention que les coordonnees pointeur). Pousser le manche gauche vers le haut avance.

// Vitesse de marche, en metres par seconde. C'est un NOMBRE et non trois crans : le client
// regle a la molette sur ordinateur, ce qui n'aurait aucun sens avec trois valeurs. Les trois
// reperes ci-dessous ne servent plus qu'a nommer des points de la plage (dans le panneau
// Reglages, et pour reprendre un ancien reglage memorise sous forme de mot).
export const VITESSE_MIN = 0.5      // plus lent, on a l'impression d'etre englue
export const VITESSE_MAX = 3.5      // plus vite, on traverse la boutique sans rien voir
export const VITESSE_PAR_DEFAUT = 1.6
export const PAS_MOLETTE = 0.12     // par cran de molette : une trentaine de crans d'un bout a l'autre

export const REPERES = [
  { cle: 'lent',   libelle: 'Lent',   ms: 0.8 },
  { cle: 'normal', libelle: 'Normal', ms: 1.6 },
  { cle: 'rapide', libelle: 'Rapide', ms: 2.8 },
]
// ancien nom, garde pour les modules qui listent les reperes
export const VITESSES = REPERES

export const VITESSE_ROTATION = 1.9      // radians par seconde a fond de manche
export const PITCH_MAX = 1.35            // 77 degres : on ne bascule jamais sur le dos
export const HAUTEUR_OEIL = 1.62
export const RAYON_JOUEUR = 0.30
export const ZONE_MORTE = 0.06           // en dessous, le manche est considere au repos
// Plafond de l'intervalle pris en compte : un gel de rendu (onglet masque, transcodage de
// textures) ne doit pas teleporter le visiteur. Assez large pour qu'une machine lente
// avance quand meme a la bonne vitesse.
export const DT_MAX = 0.25
export const SOUS_PAS_MAX = 8            // decoupage du deplacement pour ne jamais traverser
export const CLE_VITESSE = 'johanna.vitesse'

// Deplacement vertical (touches E et Q sur bureau). Bornes : on ne passe jamais sous le sol
// ni au-dessus du plafond, qui est a 3,40 m. La marge haute laisse la tete sous les spots.
export const HAUTEUR_MIN = 0.90
export const HAUTEUR_MAX = 2.55
export const VITESSE_VERTICALE = 1.10     // m/s a vitesse Normal, mis a l'echelle comme le reste
// Rotation a la souris : radians par pixel glisse. Reglee pour qu'un glissement de la largeur
// d'un ecran de bureau fasse a peu pres un demi-tour.
export const SENSIBILITE_SOURIS = 0.0035

const EPS = 1e-4

/**
 * Boite de repli, utilisee tant que boutique.json ne contient pas de bloc "collisions".
 * Le magasin fait 6,6 m de large sur ~14 m de profondeur ; les bornes sont deja retrecies
 * du rayon du joueur, comme celles du contrat. Aucun meuble : on borne seulement les murs.
 */
export const REPLI = {
  rayon_joueur: RAYON_JOUEUR,
  hauteur_oeil: HAUTEUR_OEIL,
  y_bas: 0.10, y_haut: 1.80,
  limites: { x: [-3.0, 3.0], z: [-13.7, -0.4] },
  depart: { x: 0, z: -1.7, yaw: 0 },
  obstacles: [],
}

const borner = (v, min, max) => (v < min ? min : v > max ? max : v)
const nombre = (v, defaut) => (typeof v === 'number' && Number.isFinite(v) ? v : defaut)

/** [a, b] quelconque -> [min, max] valide, ou null si la paire est inexploitable. */
function intervalle(paire) {
  if (!Array.isArray(paire) || paire.length < 2) return null
  const a = nombre(paire[0], NaN), b = nombre(paire[1], NaN)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return a <= b ? [a, b] : [b, a]
}

export const msPour = (cle) => (REPERES.find((v) => v.cle === cle) || REPERES[1]).ms
export const estRepere = (cle) => REPERES.some((v) => v.cle === cle)

/** Ramene une vitesse dans la plage utile. Toute valeur douteuse retombe sur le defaut. */
export const serrerVitesse = (v) => (typeof v === 'number' && Number.isFinite(v)
  ? borner(v, VITESSE_MIN, VITESSE_MAX)
  : VITESSE_PAR_DEFAUT)

/** Position dans la plage, de 0 a 1 : ce que la barre affiche. */
export const fractionVitesse = (v) =>
  (serrerVitesse(v) - VITESSE_MIN) / (VITESSE_MAX - VITESSE_MIN)

/**
 * Barre de progression en caracteres pleins et vides. Elle sert a l'affichage ET au test :
 * comparer une chaine est plus sur que de mesurer une largeur en pixels.
 */
export function barreVitesse(v, cases = 10) {
  const k = Math.round(fractionVitesse(v) * cases)
  return '█'.repeat(k) + '░'.repeat(cases - k)
}

/** Un cran de molette. `sens` vaut +1 vers le haut (plus vite), -1 vers le bas. */
export const vitesseApresMolette = (v, sens) =>
  serrerVitesse(serrerVitesse(v) + Math.sign(sens) * PAS_MOLETTE)


let repliSignale = false

/**
 * Prepare le resolveur de collisions a partir du bloc "collisions" de boutique.json.
 * Le joueur est un disque de rayon "rayon_joueur" ; les obstacles sont des rectangles EN DUR
 * (sans marge), alignes sur les axes : c'est ici qu'on ajoute le rayon.
 * Retourne { resoudre, dansLaBoutique, nb, rayon, hauteurOeil, depart, limites }.
 */
export function creerCollisions(collisions) {
  const source = collisions && intervalle(collisions.limites?.x) && intervalle(collisions.limites?.z)
    ? collisions
    : null
  if (!source && !repliSignale) {
    repliSignale = true
    console.warn('collisions absentes de boutique.json : boite de repli (murs approximatifs, aucun meuble)')
  }
  const d = source || REPLI
  const rayon = Math.max(0, nombre(d.rayon_joueur, RAYON_JOUEUR))
  const limX = intervalle(d.limites?.x) || REPLI.limites.x
  const limZ = intervalle(d.limites?.z) || REPLI.limites.z

  // rectangles aplatis en nombres : la boucle par image ne lit que des champs simples
  const obstacles = []
  for (const o of Array.isArray(d.obstacles) ? d.obstacles : []) {
    const ix = intervalle(o?.x), iz = intervalle(o?.z)
    if (!ix || !iz) continue
    obstacles.push({ nom: o?.nom || '', x0: ix[0], x1: ix[1], z0: iz[0], z1: iz[1] })
  }

  const depart = {
    x: borner(nombre(d.depart?.x, REPLI.depart.x), limX[0], limX[1]),
    z: borner(nombre(d.depart?.z, REPLI.depart.z), limZ[0], limZ[1]),
    yaw: nombre(d.depart?.yaw, 0),
  }

  /** Le point est-il dans le rectangle dilate du rayon du joueur ? */
  const penetre = (o, x, z) => x > o.x0 - rayon && x < o.x1 + rayon && z > o.z0 - rayon && z < o.z1 + rayon

  const libre = (x, z) => {
    if (x < limX[0] || x > limX[1] || z < limZ[0] || z > limZ[1]) return false
    for (let i = 0; i < obstacles.length; i++) if (penetre(obstacles[i], x, z)) return false
    return true
  }

  /**
   * Sort le joueur de tout rectangle penetre. Une seule passe ne suffit pas : les rectangles
   * dilates se chevauchent (27 paires ici), et sortir du premier peut faire entrer dans le
   * suivant. On repousse donc en boucle, en traitant d'abord la penetration la plus profonde,
   * puis, si ca ne converge pas, on cherche le point libre le plus proche en spirale.
   * Sans cela, une vue guidee placee dans un meuble (cam_sacs, cam_jeans, cam_chaussures le
   * sont) projetait le visiteur a l'autre bout du magasin au premier appui de pouce.
   */
  const degager = (x, z) => {
    x = borner(x, limX[0], limX[1]); z = borner(z, limZ[0], limZ[1])
    for (let n = 0; n < 16; n++) {
      let pire = null, profondeur = 0
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i]
        if (!penetre(o, x, z)) continue
        const g = x - (o.x0 - rayon), d = (o.x1 + rayon) - x
        const av = z - (o.z0 - rayon), ar = (o.z1 + rayon) - z
        const m = Math.min(g, d, av, ar)
        if (m > profondeur) { profondeur = m; pire = { o, g, d, av, ar, m } }
      }
      if (!pire) return [x, z]
      const { o, g, d, av, ar, m } = pire
      if (m === g) x = o.x0 - rayon - EPS
      else if (m === d) x = o.x1 + rayon + EPS
      else if (m === av) z = o.z0 - rayon - EPS
      else z = o.z1 + rayon + EPS
      x = borner(x, limX[0], limX[1]); z = borner(z, limZ[0], limZ[1])
    }
    // repli : recherche en spirale du point libre le plus proche (appel rare, hors boucle de rendu)
    for (let r = 0.15; r <= 3.0; r += 0.15) {
      for (let a = 0; a < 16; a++) {
        const t = (a / 16) * Math.PI * 2
        const cx = borner(x + Math.cos(t) * r, limX[0], limX[1])
        const cz = borner(z + Math.sin(t) * r, limZ[0], limZ[1])
        if (libre(cx, cz)) return [cx, cz]
      }
    }
    return [depart.x, depart.z]
  }

  /**
   * Deplacement en deux temps : l'axe X d'abord, puis l'axe Z avec le X deja resolu.
   * C'est ce qui fait GLISSER le long d'un mur au lieu de s'y coller : la composante
   * qui ne rentre pas dans l'obstacle est conservee.
   */
  const resoudre = (x, z, dx, dz) => {
    let nx = x, nz = z
    if (dx) {
      nx = x + dx
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i]
        if (!(nz > o.z0 - rayon && nz < o.z1 + rayon)) continue
        // deja dans la bande de ce rectangle avant de bouger : on ne l'oppose pas, sinon le
        // visiteur serait renvoye sur la face d'en face. C'est degager() qui le fait sortir.
        if (x > o.x0 - rayon && x < o.x1 + rayon) continue
        if (nx > o.x0 - rayon && nx < o.x1 + rayon) {
          nx = dx > 0 ? o.x0 - rayon - EPS : o.x1 + rayon + EPS
        }
      }
      nx = borner(nx, limX[0], limX[1])
    }
    if (dz) {
      nz = z + dz
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i]
        if (!(nx > o.x0 - rayon && nx < o.x1 + rayon)) continue
        if (z > o.z0 - rayon && z < o.z1 + rayon) continue
        if (nz > o.z0 - rayon && nz < o.z1 + rayon) {
          nz = dz > 0 ? o.z0 - rayon - EPS : o.z1 + rayon + EPS
        }
      }
      nz = borner(nz, limZ[0], limZ[1])
    }
    return degager(nx, nz)
  }

  /**
   * Le point est-il un endroit ou l'on peut se tenir ? On teste les rectangles NUS (sans le
   * rayon) : etre simplement colle a un meuble ne doit pas renvoyer le visiteur au depart.
   */
  const dansLaBoutique = (x, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false
    if (x < limX[0] || x > limX[1] || z < limZ[0] || z > limZ[1]) return false
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i]
      if (x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) return false
    }
    return true
  }

  return {
    resoudre, dansLaBoutique, degager,
    nb: obstacles.length,
    rayon,
    hauteurOeil: nombre(d.hauteur_oeil, HAUTEUR_OEIL),
    depart,
    limites: { x: limX, z: limZ },
    repli: !source,
  }
}

// manches nettoyes : objets reutilises, aucune allocation par image
const G = { x: 0, y: 0 }
const D = { x: 0, y: 0 }

/** Borne le manche au disque unite et applique la zone morte. */
function manche(v, sortie) {
  let x = borner(nombre(v?.x, 0), -1, 1)
  let y = borner(nombre(v?.y, 0), -1, 1)
  const n = Math.hypot(x, y)
  if (n < ZONE_MORTE) { x = 0; y = 0 } else if (n > 1) { x /= n; y /= n }
  sortie.x = x; sortie.y = y
  return sortie
}

/**
 * Une image de deplacement. `vitesse` est une cle ('lent'|'normal'|'rapide') ou des m/s.
 * Le lacet n'est JAMAIS borne (tour complet dans les deux sens) ; le tangage l'est a PITCH_MAX.
 * L'avance suit la direction du regard projetee sur le plan horizontal.
 */
export function avancer(etat, gauche, droit, dt, vitesse, collisions) {
  const pas = borner(nombre(dt, 0), 0, DT_MAX)
  const g = manche(gauche, G), d = manche(droit, D)

  const yaw = nombre(etat?.yaw, 0) - d.x * VITESSE_ROTATION * pas
  const pitch = borner(nombre(etat?.pitch, 0) - d.y * VITESSE_ROTATION * pas, -PITCH_MAX, PITCH_MAX)

  const ms = typeof vitesse === 'number' ? vitesse : msPour(vitesse)
  let avant = -g.y, cote = g.x
  const n = Math.hypot(avant, cote)
  if (n > 1) { avant /= n; cote /= n }

  // regard projete au sol : (-sin yaw, -cos yaw) ; pas de cote : (cos yaw, -sin yaw)
  const sy = Math.sin(yaw), cy = Math.cos(yaw)
  const dx = (avant * -sy + cote * cy) * ms * pas
  const dz = (avant * -cy - cote * sy) * ms * pas

  const x0 = nombre(etat?.x, 0), z0 = nombre(etat?.z, 0)
  if (!collisions) return { x: x0 + dx, z: z0 + dz, yaw, pitch }

  // Sur une image longue, un seul grand pas pourrait sauter par-dessus un meuble mince
  // (le test de penetration est instantane, pas balaye) : on decoupe le deplacement en
  // sous-pas d'au plus un demi-rayon.
  const seuil = Math.max(0.05, collisions.rayon * 0.5)
  const sousPas = Math.max(1, Math.min(SOUS_PAS_MAX, Math.ceil(Math.hypot(dx, dz) / seuil)))
  let x = x0, z = z0
  for (let i = 0; i < sousPas; i++) {
    const p = collisions.resoudre(x, z, dx / sousPas, dz / sousPas)
    x = p[0]; z = p[1]
  }
  return { x, z, yaw, pitch }
}

/**
 * Monte ou descend le point de vue (touches E et Q). `monte` vaut -1, 0 ou +1.
 * Le resultat est borne au sol et au plafond : on ne sort jamais du volume de la boutique.
 */
export function monter(hauteur, monte, dt, vitesse) {
  const h = nombre(hauteur, HAUTEUR_OEIL)
  if (!monte) return borner(h, HAUTEUR_MIN, HAUTEUR_MAX)
  const pas = borner(nombre(dt, 0), 0, DT_MAX)
  const ms = typeof vitesse === 'number' ? vitesse : msPour(vitesse)
  const v = VITESSE_VERTICALE * (ms / msPour('normal'))
  return borner(h + borner(monte, -1, 1) * v * pas, HAUTEUR_MIN, HAUTEUR_MAX)
}

/**
 * Position de l'oeil et point vise, pour camera.position / camera.lookAt.
 * `sortie` (facultatif) permet de reutiliser le meme objet a chaque image.
 * `etat.portee` (facultatif) : distance du point vise, 1 m par defaut.
 */
export function regarder(etat, sortie) {
  const x = nombre(etat?.x, 0), z = nombre(etat?.z, 0)
  const oeil = nombre(etat?.oeil, HAUTEUR_OEIL)
  const yaw = nombre(etat?.yaw, 0), pitch = nombre(etat?.pitch, 0)
  const portee = nombre(etat?.portee, 1)
  const cp = Math.cos(pitch) * portee
  const s = sortie || { position: [0, 0, 0], cible: [0, 0, 0] }
  s.position[0] = x; s.position[1] = oeil; s.position[2] = z
  s.cible[0] = x - Math.sin(yaw) * cp
  s.cible[1] = oeil + Math.sin(pitch) * portee
  s.cible[2] = z - Math.cos(yaw) * cp
  return s
}

/** Lacet et tangage deduits d'une direction de vue (aucun saut a l'activation du mode manuel). */
export function depuisDirection(dx, dy, dz) {
  const plat = Math.hypot(dx, dz)
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: borner(Math.atan2(dy, plat || EPS), -PITCH_MAX, PITCH_MAX),
  }
}
