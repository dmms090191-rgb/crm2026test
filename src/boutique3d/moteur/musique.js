// Reglages de musique : liste des ambiances, memorisation, courbe de volume.
// Module pur, sans DOM ni audio : il se teste sans navigateur. Toute la partie sonore vit
// dans lecteur.js.

// Les trois ambiances de prototype, fabriquees par pipeline/generer_musiques.js. C'est ici
// que viendra se brancher la playlist choisie par le vendeur : meme forme, autres URL.
export const PISTES = [
  { cle: 'velours', titre: 'Velours', description: 'Chaude et lente', url: '/musiques/velours.mp3' },
  { cle: 'neon', titre: 'Néon', description: 'Claire, qui respire', url: '/musiques/neon.mp3' },
  { cle: 'aube', titre: 'Aube', description: 'Aérienne et douce', url: '/musiques/aube.mp3' },
]

export const CLE_STOCKAGE = 'johanna.musique'      // version 1 du format
export const VOLUME_DEFAUT = 0.45

// Deux facons de diffuser la meme musique.
//   normal  : le morceau sort tel quel, identique partout dans la boutique.
//   spatial : chaque canal est confie a une colonne acoustique, a sa vraie place dans la
//             piece ; l'equilibre gauche/droite et la distance suivent alors la camera.
// `normal` reste le mode par defaut, comme demande.
export const MODES_AUDIO = ['normal', 'spatial']
export const LIBELLES_AUDIO = { normal: 'Son normal', spatial: 'Son 3D' }
// Pour une video YouTube, le mot « 3D » serait un mensonge : le flux appartient a un autre
// domaine, il ne traverse pas Web Audio, et l'API n'expose qu'un volume. On peut donc faire
// varier le niveau avec la distance aux colonnes, jamais produire un equilibre gauche/droite.
// Le libelle dit exactement ce que le reglage fait.
export const LIBELLES_AUDIO_YT = { normal: 'Son normal', spatial: 'Volume selon la distance' }
export const libellesAudio = (origine) => (origine === 'youtube' ? LIBELLES_AUDIO_YT : LIBELLES_AUDIO)
export const MODE_AUDIO_DEFAUT = 'normal'

// Ou passe une video YouTube.
//   audio : seul le son sort ; la grande tele du fond garde son contenu boutique.
//   tele  : la video s'affiche sur la grande tele du fond, qui reprend son contenu des qu'on
//           revient a `audio` ou qu'on arrete YouTube.
// Une seule tele sait diffuser pour l'instant : celle du fond. Les autres n'ont pas la place
// a l'ecran pour qu'une video y reste lisible, et le cadrage n'y serait pas exact.
export const MODES_DIFFUSION = ['audio', 'tele']
export const LIBELLES_DIFFUSION = {
  audio: 'Audio uniquement',
  tele: 'Diffuser sur la grande télé',
}
export const DIFFUSION_DEFAUT = 'audio'

// A l'entree dans la boutique, faut-il lancer l'ambiance sans rien demander ? Non par defaut :
// un son qui part tout seul est la chose la plus desagreable qu'une page puisse faire. Le
// choix du visiteur, lui, est memorise et repris a la visite suivante.
export const DEMARRER_A_L_ENTREE = false

export const pisteParCle = (cle) => PISTES.find((p) => p.cle === cle) || null

/**
 * Volume percu : l'oreille suit une loi proche du carre, pas la position du curseur.
 * Sans cette courbe, la moitie du curseur donne un son deja presque a fond.
 */
export const gainDepuisCurseur = (c) => {
  const v = Number.isFinite(c) ? Math.max(0, Math.min(1, c)) : VOLUME_DEFAUT
  return +(v * v).toFixed(4)
}

const REGLAGES_PAR_DEFAUT = () => ({
  actif: DEMARRER_A_L_ENTREE, piste: PISTES[0].cle, volume: VOLUME_DEFAUT,
  mode: MODE_AUDIO_DEFAUT, diffusion: DIFFUSION_DEFAUT,
})

/**
 * Validateur pur, applique aussi bien au cache local qu'a ce que renvoie la base : les deux
 * sources sont egalement suspectes.
 */
export function lire(o) {
  const d = REGLAGES_PAR_DEFAUT()
  if (!o || typeof o !== 'object') return d
  return {
    actif: typeof o.actif === 'boolean' ? o.actif : d.actif,
    piste: pisteParCle(o.piste) ? o.piste : d.piste,
    volume: Number.isFinite(o.volume) ? Math.max(0, Math.min(1, o.volume)) : d.volume,
    mode: MODES_AUDIO.includes(o.mode) ? o.mode : d.mode,
    diffusion: MODES_DIFFUSION.includes(o.diffusion) ? o.diffusion : d.diffusion,
  }
}

/**
 * Cle de stockage des reglages audio.
 *
 * Elle porte desormais la boutique, comme celles de la playlist, de la lumiere et des
 * televisions. Elle etait la SEULE a ne pas la porter, et cet ecart avait une consequence
 * precise : la garde d'adoption distante interrogeait `johanna.musique.<boutique>`, une cle que
 * personne n'ecrivait jamais. Elle repondait donc toujours « vierge », et une ligne venue de la
 * base aurait ecrase les reglages audio du visiteur a CHAQUE chargement — l'inverse exact de ce
 * que l'adoption prudente promet. Sur Talvex, ou toutes les boutiques partagent une origine,
 * l'ecart aurait de plus donne a la societe B le volume et la piste de la societe A.
 */
const cleDe = (boutique) => (boutique ? `${CLE_STOCKAGE}.${boutique}` : CLE_STOCKAGE)

/** Ce navigateur a-t-il deja des reglages audio pour cette boutique ? L'ANCIENNE cle compte :
 *  sans cela, un visiteur de longue date passerait pour neuf au premier chargement. */
export function aDesReglages(storage, boutique) {
  if (!storage) return false
  try { return !!(storage.getItem(cleDe(boutique)) || storage.getItem(CLE_STOCKAGE)) }
  catch { return false }
}

/** Relit le choix du visiteur. Toute valeur douteuse retombe sur le defaut, sans jeter. */
export function lireReglages(storage, boutique) {
  const d = REGLAGES_PAR_DEFAUT()
  if (!storage) return d
  let brut = null
  // Reprise de l'ancienne cle sans suffixe : personne ne perd ses reglages au passage. Meme
  // motif que `reprendreAncien` dans preferences.js pour la vitesse de marche.
  try { brut = storage.getItem(cleDe(boutique)) || storage.getItem(CLE_STOCKAGE) } catch { return d }
  if (!brut) return d
  let o = null
  try { o = JSON.parse(brut) } catch { return d }
  if (!o || o.v !== 1) return d
  return {
    actif: typeof o.actif === 'boolean' ? o.actif : d.actif,
    piste: pisteParCle(o.piste) ? o.piste : d.piste,
    volume: Number.isFinite(o.volume) ? Math.max(0, Math.min(1, o.volume)) : d.volume,
    mode: MODES_AUDIO.includes(o.mode) ? o.mode : d.mode,
    diffusion: MODES_DIFFUSION.includes(o.diffusion) ? o.diffusion : d.diffusion,
  }
}

export function ecrireReglages(storage, r, boutique) {
  if (!storage) return
  try {
    storage.setItem(cleDe(boutique), JSON.stringify({
      v: 1, actif: !!r.actif, piste: r.piste, volume: r.volume, mode: r.mode,
      diffusion: r.diffusion,
    }))
  } catch { /* navigation privee ou stockage plein : le reglage vaut pour la session */ }
}
