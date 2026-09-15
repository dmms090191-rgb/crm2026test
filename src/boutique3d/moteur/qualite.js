// Niveaux de qualite : definitions, detection de l'appareil, persistance, sonde et gouverneur.
// Tout ce qui decide est ecrit en fonctions pures (testables sans navigateur) ; seules les
// fonctions marquees "navigateur" touchent window / document / navigator.

export const NIVEAUX = ['ultra', 'equilibre', 'faible']          // du plus beau au plus leger
export const MODES = ['auto', 'ultra', 'equilibre', 'faible']
export const LIBELLES = { auto: 'Auto', ultra: 'Ultra', equilibre: 'Équilibre', faible: 'Faible' }

// Reglages de rendu par niveau. "dpr" est un plafond (borne par le DPR natif de l'ecran).
export const REGLAGES = {
  ultra:     { dpr: 2,   antialias: true,  anisotropie: 8, env: 0.05, reflet: true,  paquet: 'ultra' },
  equilibre: { dpr: 1.5, antialias: true,  anisotropie: 4, env: 0.03, reflet: false, paquet: 'equilibre' },
  faible:    { dpr: 1,   antialias: false, anisotropie: 1, env: 0,    reflet: false, paquet: 'faible' },
}

export const CLE_STOCKAGE = 'johanna.qualite'      // version 1 du format
export const DUREE_DECISION_MS = 30 * 24 * 3600 * 1000

// Seuils de la sonde (moyenne des intervalles rAF avec 2 rendus supplementaires par image).
// Les seuils sont places ENTRE deux pas de quantification vsync (multiples de 8,33 ms a 120 Hz,
// de 16,67 ms a 60 Hz) : un appareil cale exactement sur 3 ou 6 vsync ne tire pas a pile ou face.
export const SONDE = { chauffe: 10, mesure: 40, rendusSupplementaires: 2, seuilUltra: 29, seuilEquilibre: 54, ignorerAuDela: 250 }

// Regles du gouverneur (mode Auto, etape boutique). seuilLent = 37 ms (entre 33,3 et 41,7 ms a
// 120 Hz) : un 30 FPS parfaitement stable (intervalles de 33,3 ms plus la gigue du callback) n'est
// PAS compte comme lent ; seuilTresLent = 54 ms (entre 50 et 58,3 ms). Une image au-dela de
// `plafond` est comptee bornee (appareil effondre), au-dela de `ignorerAuDela` elle est ignoree
// (onglet masque, pause).
export const GOUVERNEUR = {
  fenetre: 60, seuilLent: 37, partLent: 0.40, fenetresConsecutives: 3,
  seuilTresLent: 54, partTresLent: 0.50, plafond: 250, ignorerAuDela: 1000,
  repos: 2000, intervalleMin: 15000, descentesMax: 2,
}

const DIACRITIQUES = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g')

export const niveauInferieur = (n) => NIVEAUX[NIVEAUX.indexOf(n) + 1] ?? null
export const estNiveau = (n) => NIVEAUX.includes(n)

// ---------------------------------------------------------------- lecture des choix

/** ?qualite=ultra|equilibre|faible|auto -> le mode, sinon null. */
export function lireParametreUrl(search) {
  const v = new URLSearchParams(search || '').get('qualite')
  if (!v) return null
  // "Équilibre" -> "equilibre" : on retire les accents (diacritiques combinants U+0300..U+036F)
  const k = v.toLowerCase().normalize('NFD').replace(DIACRITIQUES, '')
  return MODES.includes(k) ? k : null
}

export function lireStockage(storage) {
  try {
    const brut = storage?.getItem(CLE_STOCKAGE)
    if (!brut) return null
    const o = JSON.parse(brut)
    return o && o.v === 1 ? o : null
  } catch { return null }
}

export function ecrireStockage(storage, valeur) {
  try { storage?.setItem(CLE_STOCKAGE, JSON.stringify({ v: 1, ...valeur })) } catch { /* stockage indisponible */ }
}

/** Une decision memorisee vaut 30 jours, pour le meme GPU et la meme taille d'ecran. */
export function decisionValide(decision, gpu, ecran, maintenant) {
  if (!decision || !estNiveau(decision.niveau)) return false
  if (decision.gpu !== gpu || decision.ecran !== ecran) return false
  return typeof decision.date === 'number' && maintenant - decision.date < DUREE_DECISION_MS
}

// ---------------------------------------------------------------- classification

export const estRenduLogiciel = (gpu) => /swiftshader|llvmpipe|softpipe|basic render driver|software rasterizer|mesa offscreen/i.test(gpu || '')

export const estGpuAncien = (gpu) =>
  /Mali-4\d\d\b|Mali-T[678]\d\d\b|Adreno(?: \(TM\))? ?[345]\d\d\b|PowerVR[^,)]*\bGE\d?/i.test(gpu || '')

/**
 * Grille statique : ce que l'on sait de l'appareil avant de rendre quoi que ce soit.
 * Retourne le niveau de depart, la raison et s'il faut sonder (mobile sans certitude).
 */
export function classerStatique({ gpu = '', maxTexture = 0, memoire = null, mobile = false } = {}) {
  if (estRenduLogiciel(gpu)) return { niveau: 'faible', raison: 'rendu logiciel', sonder: false }
  if (typeof memoire === 'number' && memoire <= 2) return { niveau: 'faible', raison: 'memoire limitee', sonder: false }
  if (maxTexture > 0 && maxTexture < 4096) return { niveau: 'faible', raison: 'textures limitees', sonder: false }
  if (estGpuAncien(gpu)) return { niveau: 'faible', raison: 'GPU ancien', sonder: false }
  if (!mobile) return { niveau: 'ultra', raison: 'bureau', sonder: false }
  return { niveau: 'equilibre', raison: 'mobile (provisoire)', sonder: true }
}

/** Verdict de la sonde : m3 = moyenne des intervalles rAF (ms) avec 3 rendus par image. */
export function niveauSonde(m3) {
  if (m3 <= SONDE.seuilUltra) return 'ultra'
  if (m3 <= SONDE.seuilEquilibre) return 'equilibre'
  return 'faible'
}

/**
 * Decision de depart, synchrone, a prendre AVANT le montage du Canvas (l'antialias en depend).
 * search : window.location.search ; storage : localStorage ; gpuInfos : { gpu, maxTexture }.
 */
export function determinerInitial({ search = '', storage = null, gpuInfos = {}, mobile = false, memoire = null, ecran = '', maintenant = Date.now() } = {}) {
  const url = lireParametreUrl(search)
  const stock = lireStockage(storage)
  const mode = url ?? (MODES.includes(stock?.mode) ? stock.mode : 'auto')
  const statique = classerStatique({ gpu: gpuInfos.gpu, maxTexture: gpuInfos.maxTexture, memoire, mobile })
  const decision = stock?.decision
  const memorisee = decisionValide(decision, gpuInfos.gpu, ecran, maintenant)

  // niveau que choisirait le mode Auto, meme si l'utilisateur a force un niveau
  const auto = memorisee
    ? { niveau: decision.niveau, raison: `${decision.raison} (mémorisé)`, sonder: false }
    : statique

  if (mode !== 'auto') {
    return { mode, niveau: mode, raison: url ? 'URL' : 'manuel', sonder: false, niveauAuto: auto.niveau, raisonAuto: auto.raison, sonderAuto: auto.sonder }
  }
  return { mode, niveau: auto.niveau, raison: auto.raison, sonder: auto.sonder, niveauAuto: auto.niveau, raisonAuto: auto.raison, sonderAuto: auto.sonder }
}

// ---------------------------------------------------------------- sonde et gouverneur

/**
 * Sonde de performance : 10 images de chauffe puis 40 images mesurees, chacune rendue
 * 3 fois (2 rendus supplementaires). image(dtMs) retourne le nombre de rendus supplementaires
 * a faire sur cette image ; resultat() donne m3 (ms) une fois la mesure terminee, sinon null.
 */
export function creerSonde(cfg = SONDE) {
  let n = 0, somme = 0, comptees = 0, fini = false, m3 = null
  return {
    image(dtMs) {
      if (fini) return 0
      n += 1
      if (n > cfg.chauffe && dtMs > 0 && dtMs <= cfg.ignorerAuDela) { somme += dtMs; comptees += 1 }
      if (n >= cfg.chauffe + cfg.mesure) {
        fini = true
        m3 = comptees > 0 ? somme / comptees : cfg.ignorerAuDela
        return 0
      }
      return cfg.rendusSupplementaires
    },
    resultat: () => m3,
    get finie() { return fini },
  }
}

/** Analyse d'une fenetre d'images : parts d'images lentes et tres lentes. */
export function analyserFenetre(durees, cfg = GOUVERNEUR) {
  let lentes = 0, tresLentes = 0
  for (const d of durees) { if (d >= cfg.seuilLent) lentes++; if (d >= cfg.seuilTresLent) tresLentes++ }
  const n = durees.length || 1
  return { partLent: lentes / n, partTresLent: tresLentes / n }
}

/**
 * Regle pure du gouverneur. etat = { consecutives, dernierChangement, descentes }.
 * Retourne { descendre, etat }.
 */
export function decisionGouverneur(etat, fenetre, maintenant, cfg = GOUVERNEUR) {
  const a = analyserFenetre(fenetre, cfg)
  const consecutives = a.partLent > cfg.partLent ? etat.consecutives + 1 : 0
  const suivant = { ...etat, consecutives }
  const alarme = consecutives >= cfg.fenetresConsecutives || a.partTresLent > cfg.partTresLent
  if (!alarme) return { descendre: false, etat: suivant }
  if (etat.descentes >= cfg.descentesMax) return { descendre: false, etat: suivant }
  if (maintenant - etat.dernierChangement < cfg.intervalleMin) return { descendre: false, etat: suivant }
  return { descendre: true, etat: { consecutives: 0, dernierChangement: maintenant, descentes: etat.descentes + 1 } }
}

/**
 * Gouverneur avec etat : image(dtMs, maintenant) retourne true quand il faut descendre d'un niveau.
 * marquerChangement(maintenant) : tout changement de niveau (les 2 s suivantes sont ignorees).
 */
export function creerGouverneur(maintenant = 0, cfg = GOUVERNEUR) {
  let etat = { consecutives: 0, dernierChangement: maintenant, descentes: 0 }
  let fenetre = []
  return {
    image(dtMs, t) {
      if (t - etat.dernierChangement < cfg.repos) { fenetre = []; return false }
      if (dtMs <= 0 || dtMs > cfg.ignorerAuDela) return false   // pause (onglet masque)
      fenetre.push(Math.min(dtMs, cfg.plafond))                  // lenteur extreme : comptee, bornee
      if (fenetre.length < cfg.fenetre) return false
      const r = decisionGouverneur(etat, fenetre, t, cfg)
      etat = r.etat; fenetre = []
      return r.descendre
    },
    marquerChangement(t) { etat = { ...etat, dernierChangement: t }; fenetre = [] },
    get etat() { return etat },
  }
}

// ---------------------------------------------------------------- navigateur

/** Nom du GPU et taille max de texture, via un contexte WebGL2 jetable (perdu aussitot). */
export function sonderGpu() {
  if (typeof document === 'undefined') return { gpu: '', maxTexture: 0 }
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return { gpu: 'WebGL indisponible', maxTexture: 0 }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { gpu, maxTexture }
  } catch { return { gpu: '', maxTexture: 0 } }
}

export function estMobile() {
  if (typeof navigator === 'undefined') return false
  if (navigator.userAgentData?.mobile === true) return true
  if (/Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent)) return true
  const tactile = (navigator.maxTouchPoints || 0) > 1
  const grossier = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  return tactile && grossier
}

/**
 * Cle de taille d'ecran, independante de l'orientation : sur Android, screen.width et
 * screen.height s'echangent entre portrait et paysage, la decision memorisee doit rester valide.
 */
export const cleEcran = (largeur, hauteur, dpr) =>
  `${Math.min(largeur, hauteur)}x${Math.max(largeur, hauteur)}@${dpr}`

export const tailleEcran = () => cleEcran(
  typeof screen !== 'undefined' ? screen.width : 0,
  typeof screen !== 'undefined' ? screen.height : 0,
  typeof window !== 'undefined' ? window.devicePixelRatio : 1,
)

/**
 * localStorage, ou null quand le navigateur refuse le stockage (cookies bloques, iframe
 * cross-site en navigation privee) : la simple LECTURE de window.localStorage leve alors
 * une SecurityError, qui ferait planter le rendu de App. lireStockage / ecrireStockage
 * acceptent null.
 */
export function stockage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null } catch { return null }
}

/** "ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 (0x00002B85) Direct3D11 vs_5_0 ps_5_0, D3D11)" -> "NVIDIA GeForce RTX 5090". */
export function raccourcirGpu(chaine) {
  let s = String(chaine || '').trim()
  const m = s.match(/^ANGLE \((.*)\)$/)
  if (m) {
    const parts = m[1].split(', ')
    s = parts.length >= 2 ? parts[1] : parts[0]
  }
  s = s.replace(/\(0x[0-9A-Fa-f]+\)/g, '').replace(/Direct3D\d+\s+vs_\d_\d\s+ps_\d_\d/i, '')
       .replace(/\s+\)/g, ')').replace(/\s+/g, ' ').trim()
  return s.length > 48 ? s.slice(0, 47) + '…' : s
}

/** Detection complete, synchrone, a appeler une seule fois avant le Canvas (navigateur). */
export function detecterAuDemarrage() {
  const gpuInfos = sonderGpu()
  const storage = stockage()
  const r = determinerInitial({
    search: window.location.search,
    storage,
    gpuInfos,
    mobile: estMobile(),
    memoire: typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null,
    ecran: tailleEcran(),
    maintenant: Date.now(),
  })
  if (lireParametreUrl(window.location.search)) {
    // le parametre d'URL est un choix explicite : il est persiste comme le selecteur
    ecrireStockage(storage, { ...(lireStockage(storage) || {}), mode: r.mode })
  }
  return { ...r, gpu: gpuInfos.gpu, gpuCourt: raccourcirGpu(gpuInfos.gpu), maxTexture: gpuInfos.maxTexture, mobile: estMobile(), ecran: tailleEcran() }
}

/** Memorise une decision Auto (sonde ou gouverneur) pour 30 jours. */
export function memoriserDecision(storage, { niveau, raison, gpu, ecran, date = Date.now() }) {
  const stock = lireStockage(storage) || {}
  ecrireStockage(storage, { ...stock, decision: { niveau, raison, gpu, ecran, date } })
}

/** Persiste le mode choisi par l'utilisateur (auto ou niveau force). */
export function memoriserMode(storage, mode) {
  const stock = lireStockage(storage) || {}
  ecrireStockage(storage, { ...stock, mode })
}
