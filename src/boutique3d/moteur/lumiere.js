// Lumiere de la boutique.
//
// Contrainte de depart, mesuree et non supposee : la scene ne contient AUCUNE lumiere temps
// reel. Tout l'eclairage direct et indirect est cuit dans 39 lightmaps, et 17 materiaux
// emissifs jouent les sources visibles. Deplacer une lampe demanderait de recuire, donc de
// re-exporter : impossible depuis le navigateur.
//
// Ce qui reste pilotable a cout nul, et c'est deja beaucoup :
//   - l'exposition du rendu, qui ouvre ou ferme le diaphragme sur toute la piece ;
//   - la teinte de la lumiere cuite, par une multiplication dans le shader (voir Scene.jsx) ;
//   - l'intensite de chaque famille de sources visibles.
// Rien de tout cela n'ajoute un seul appel de rendu ni une seule texture.

// L'identite de la boutique est la meme notion que pour la playlist : une seule constante,
// pour qu'un jour la bascule vers la base se fasse au meme endroit pour les deux.
import { BOUTIQUE_DEFAUT } from './playlist.js'

export const CLE_LUMIERE = 'johanna.lumiere'

// Les trois familles de sources visibles, relevees sur la scene reelle. Les motifs sont
// verifies au demarrage (voir `familleDe`) : un materiau renomme cote Blender se verrait
// tout de suite, plutot que de disparaitre en silence d'un reglage.
export const FAMILLES = {
  ecrans:  { libelle: 'Écrans', motif: /^mat_ecran_/ },
  accents: { libelle: 'Néons et LED', motif: /^mat_(led_|neon_|enceinte_lumiere)/ },
  lampes:  { libelle: 'Lampes et bougies', motif: /^mat_(abat_jour|flamme|lentille_spot)/ },
}

export const CLES_FAMILLES = Object.keys(FAMILLES)

/** Famille d'un materiau, ou null s'il n'est pas une source visible. */
export function familleDe(nom) {
  if (typeof nom !== 'string') return null
  for (const [cle, f] of Object.entries(FAMILLES)) if (f.motif.test(nom)) return cle
  return null
}

// Bornes. L'exposition ne descend pas sous 0,55 : plus bas, la boutique n'est plus sombre,
// elle est illisible, et le visiteur croit que la page a plante.
export const BORNES = {
  intensite: { min: 0.55, max: 1.60, pas: 0.01 },
  chaleur:   { min: -1,   max: 1,    pas: 0.01 },
  ecrans:    { min: 0,    max: 2,    pas: 0.01 },
  accents:   { min: 0,    max: 2,    pas: 0.01 },
  lampes:    { min: 0,    max: 2,    pas: 0.01 },
}

export const CLES_REGLAGES = Object.keys(BORNES)

export const serrer = (cle, v) => {
  const b = BORNES[cle]
  if (!b || typeof v !== 'number' || !Number.isFinite(v)) return null
  return Math.min(b.max, Math.max(b.min, v))
}

// Ambiances. `boutique` reproduit exactement ce qui est cuit : c'est le point de reference,
// et le bouton de retour a zero. Les autres partent de la et ne font que doser.
export const AMBIANCES = [
  { cle: 'boutique',    libelle: 'Boutique',    resume: "L'éclairage d'origine",
    reglages: { intensite: 1.00, chaleur: 0.00, ecrans: 1.00, accents: 1.00, lampes: 1.00 } },
  { cle: 'chaleureuse', libelle: 'Chaleureuse', resume: 'Plus dorée, plus douce',
    reglages: { intensite: 0.92, chaleur: 0.78, ecrans: 0.88, accents: 1.20, lampes: 1.45 } },
  { cle: 'vitrine',     libelle: 'Vitrine',     resume: 'Claire et nette',
    reglages: { intensite: 1.26, chaleur: -0.12, ecrans: 1.30, accents: 0.85, lampes: 0.85 } },
  { cle: 'soiree',      libelle: 'Soirée',      resume: 'Sombre, néons en avant',
    reglages: { intensite: 0.72, chaleur: -0.30, ecrans: 1.10, accents: 1.65, lampes: 1.15 } },
]

export const AMBIANCE_DEFAUT = 'boutique'
export const ambianceParCle = (cle) => AMBIANCES.find((a) => a.cle === cle) || null

export const etatDefaut = () => ({
  ambiance: AMBIANCE_DEFAUT,
  ...ambianceParCle(AMBIANCE_DEFAUT).reglages,
})

/** Applique une ambiance : elle remplace tous les reglages d'un coup. */
export function choisirAmbiance(etat, cle) {
  const a = ambianceParCle(cle)
  if (!a) return etat
  return { ambiance: a.cle, ...a.reglages }
}

/**
 * Change un reglage a la main. L'ambiance devient `perso` des que la valeur s'ecarte de
 * celle du preset : afficher encore « Soirée » alors que plus rien ne correspond serait un
 * mensonge d'interface. Si la retouche ramene pile sur un preset connu, on le renomme.
 */
export function regler(etat, cle, valeur) {
  const v = serrer(cle, valeur)
  if (v === null) return etat
  const suivant = { ...etat, [cle]: v }
  return { ...suivant, ambiance: ambianceCorrespondante(suivant) }
}

const PRES = 0.005
export function ambianceCorrespondante(etat) {
  for (const a of AMBIANCES) {
    if (CLES_REGLAGES.every((c) => Math.abs((etat[c] ?? 0) - a.reglages[c]) < PRES)) return a.cle
  }
  return 'perso'
}

// --- Teinte de la lumiere cuite -------------------------------------------------------
// Deux extremes, choisis sur les temperatures usuelles d'un magasin : ~2 700 K a chaud,
// ~5 600 K a froid. On interpole depuis le blanc, puis on RENORMALISE la luminance a 1.
// Sans cette derniere etape, refroidir assombrit la piece et le visiteur croit que le
// curseur de chaleur touche aussi a l'intensite. Les deux reglages doivent rester
// independants, sinon ils sont inutilisables ensemble.
const CHAUD = [1.00, 0.892, 0.740]
const FROID = [0.812, 0.902, 1.060]
const LUM = [0.2126, 0.7152, 0.0722]

export function teinte(chaleur) {
  const c = serrer('chaleur', chaleur) ?? 0
  const cible = c >= 0 ? CHAUD : FROID
  const k = Math.abs(c)
  const brut = [0, 1, 2].map((i) => 1 + (cible[i] - 1) * k)
  const l = LUM[0] * brut[0] + LUM[1] * brut[1] + LUM[2] * brut[2]
  return brut.map((v) => v / l)
}

// --- Persistance ----------------------------------------------------------------------
// Meme couture que la playlist : la boutique est deja la cle, il n'y aura qu'a remplacer ce
// depot par un depot en base pour que chaque vendeuse garde sa lumiere.

export function lire(objet) {
  const d = etatDefaut()
  if (!objet || typeof objet !== 'object') return d
  const out = { ...d }
  for (const c of CLES_REGLAGES) {
    const v = serrer(c, objet[c])
    if (v !== null) out[c] = v
  }
  out.ambiance = ambianceCorrespondante(out)
  return out
}

export const pourStockage = (etat) => {
  const o = {}
  for (const c of CLES_REGLAGES) o[c] = etat[c]
  return o
}

export function depotLocal(storage, boutique = BOUTIQUE_DEFAUT) {
  const cle = `${CLE_LUMIERE}.${boutique}`
  return {
    charger() {
      try { return lire(JSON.parse(storage.getItem(cle) || 'null')) } catch { return etatDefaut() }
    },
    enregistrer(etat) {
      try { storage.setItem(cle, JSON.stringify(pourStockage(etat))) } catch { /* stockage refuse */ }
    },
  }
}
