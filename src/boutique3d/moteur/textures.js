// Paquets de textures par niveau de qualite.
// Le GLB contient les textures du niveau Faible ; les niveaux Equilibre et Ultra sont decrits
// par /packs.json (voir le contrat : nom, url, format, srgb, cibles = { materiau, slot }).
// Ce module charge un niveau (KTX2Loader partage, 4 fichiers a la fois), l'applique sur les
// materiaux par nom + slot, restaure les textures du GLB pour Faible, et libere les textures
// des niveaux quittes (jamais celles du GLB).
import * as THREE from 'three'
import { asset } from './modele.js'

// slots three.js acceptes dans le manifeste ; aoMap est un alias de lightMap (Scene.jsx
// reaffecte l'occlusion glTF vers lightMap avant que ce module ne voie les materiaux)
const SLOTS = ['map', 'normalMap', 'emissiveMap', 'lightMap', 'roughnessMap', 'metalnessMap']
const ALIAS = { aoMap: 'lightMap', occlusionTexture: 'lightMap', baseColorTexture: 'map', normalTexture: 'normalMap', emissiveTexture: 'emissiveMap' }
const PARALLELE = 4

let manifestePromesse = null
let avertissementFait = false

/** Lit packs.json une seule fois. null (avec un avertissement unique) s'il est absent ou invalide. */
export function chargerManifeste() {
  if (!manifestePromesse) {
    manifestePromesse = fetch(asset('/packs.json'))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((m) => {
        if (!m || typeof m !== 'object' || !m.niveaux) {
          if (!avertissementFait) {
            avertissementFait = true
            console.warn('packs.json absent ou invalide : tous les niveaux utilisent les textures du GLB.')
          }
          return null
        }
        // Les chemins du manifeste sont ecrits a la racine du domaine (« /tex/… »). On les
        // prefixe ICI, une seule fois : tout l'aval — le cache, les cles, le menage — continue
        // de travailler sur une simple chaine, sans rien savoir de la base. Base vide : la
        // chaine ressort identique, au caractere pres.
        for (const niveau of Object.values(m.niveaux || {})) {
          for (const s of niveau?.textures || []) {
            if (s && typeof s.url === 'string') s.url = asset(s.url)
          }
        }
        return m
      })
  }
  return manifestePromesse
}

const cleVariante = (t) => (t
  ? [t.channel, t.wrapS, t.wrapT, t.repeat.x, t.repeat.y, t.offset.x, t.offset.y, t.rotation, t.center.x, t.center.y].join(',')
  : 'defaut')

/**
 * Cree le gestionnaire pour une scene GLB deja preparee (lightmaps reaffectees).
 * ktx2 : KTX2Loader partage, detectSupport deja fait.
 */
export function creerGestionnaire({ glb, ktx2 }) {
  const materiaux = new Map()
  glb.traverse((o) => {
    if (!o.isMesh) return
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m?.name && !materiaux.has(m.name)) materiaux.set(m.name, m)
    }
  })

  // textures d'origine du GLB (niveau Faible) : conservees, jamais liberees
  const base = new Map()
  const texturesBase = new Set()
  for (const [nom, m] of materiaux) {
    const b = {}
    for (const s of SLOTS) { b[s] = m[s] || null; if (m[s]) texturesBase.add(m[s]) }
    base.set(nom, b)
  }

  const cache = new Map()           // url -> { promesse, texture, echec, variantes: [{ cle, texture }] }
  const avertis = new Set()
  let manifeste = null
  let niveauCourant = 'faible'   // niveau dont les textures sont en place sur les materiaux
  let niveauCible = null         // dernier niveau demande a precharger
  let enCours = 0
  const file = []

  const avertir = (cle, msg) => { if (!avertis.has(cle)) { avertis.add(cle); console.warn(msg) } }
  const acquerir = () => new Promise((res) => { if (enCours < PARALLELE) { enCours++; res() } else file.push(res) })
  const liberer = () => { const s = file.shift(); if (s) s(); else enCours-- }

  function charger(url) {
    let e = cache.get(url)
    if (e) return e.promesse
    e = { promesse: null, texture: null, echec: false, variantes: [] }
    e.promesse = (async () => {
      await acquerir()
      try {
        e.texture = await ktx2.loadAsync(url)
        return e.texture
      } catch (err) {
        e.echec = true
        avertir(url, `texture introuvable ou illisible : ${url} (${err?.message || err})`)
        return null
      } finally {
        liberer()
        // arrivee apres un changement de cible : une texture qui ne sert ni au niveau vise ni
        // au niveau en place est liberee aussitot (un niveau abandonne pendant son
        // telechargement ne reste pas en memoire jusqu'a la prochaine application)
        if (niveauCible !== null) libererHors(niveauCible)
      }
    })()
    cache.set(url, e)
    return e.promesse
  }

  // textures d'un niveau a charger depuis /tex/ (une entree sans url est deja dans le GLB)
  const specs = (niveau) => (manifeste?.niveaux?.[niveau]?.textures ?? []).filter((s) => s.url)

  /** Telecharge et transcode toutes les textures d'un niveau, sans les appliquer. */
  async function precharger(niveau) {
    niveauCible = niveau
    if (manifeste === null) manifeste = await chargerManifeste()
    const t0 = performance.now()
    const liste = specs(niveau)
    await Promise.all(liste.map((s) => charger(s.url)))
    return { niveau, fichiers: liste.length, duree: performance.now() - t0 }
  }

  /** Vrai quand tout ce qu'il faut pour `niveau` est en memoire (ou definitivement en echec). */
  function pret(niveau) {
    if (manifeste === null) return false
    return specs(niveau).every((s) => { const e = cache.get(s.url); return e && (e.texture || e.echec) })
  }

  /** Texture configuree pour une cible : reprend les parametres de la texture remplacee. */
  function variante(entree, spec, ancienne, anisotropie) {
    const cle = cleVariante(ancienne)
    let v = entree.variantes.find((x) => x.cle === cle)
    if (!v) {
      const t = entree.variantes.length === 0 ? entree.texture : entree.texture.clone()
      if (ancienne) {
        t.channel = ancienne.channel
        t.wrapS = ancienne.wrapS; t.wrapT = ancienne.wrapT
        t.repeat.copy(ancienne.repeat); t.offset.copy(ancienne.offset)
        t.rotation = ancienne.rotation; t.center.copy(ancienne.center)
        t.matrixAutoUpdate = ancienne.matrixAutoUpdate
      } else {
        // slot vide dans le GLB : convention glTF (repetition)
        t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping
      }
      t.colorSpace = spec.srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
      t.flipY = false
      t.anisotropy = anisotropie
      t.name = spec.nom || t.name
      t.needsUpdate = true
      v = { cle, texture: t }
      entree.variantes.push(v)
    } else if (v.texture.anisotropy !== anisotropie) {
      v.texture.anisotropy = anisotropie
      v.texture.needsUpdate = true
    }
    return v.texture
  }

  /**
   * Applique un niveau (synchrone : tout doit etre precharge). Les slots non couverts par le
   * niveau retrouvent la texture du GLB. Retourne le nombre de slots modifies.
   */
  function appliquer(niveau, { anisotropie = 1 } = {}) {
    const cibles = new Map()
    for (const [nom] of materiaux) cibles.set(nom, { ...base.get(nom) })

    for (const spec of specs(niveau)) {
      const e = cache.get(spec.url)
      if (!e?.texture) continue
      for (const c of spec.cibles || []) {
        const slot = ALIAS[c.slot] || c.slot
        const m = materiaux.get(c.materiau)
        if (!m) { avertir(`m:${c.materiau}`, `packs.json : materiau inconnu "${c.materiau}"`); continue }
        if (!SLOTS.includes(slot)) { avertir(`s:${c.slot}`, `packs.json : slot inconnu "${c.slot}"`); continue }
        const ancienne = base.get(c.materiau)[slot] || m[slot] || null
        cibles.get(c.materiau)[slot] = variante(e, spec, ancienne, anisotropie)
      }
    }

    let modifies = 0
    for (const [nom, m] of materiaux) {
      const t = cibles.get(nom)
      for (const s of SLOTS) {
        if (m[s] === t[s]) continue
        const etaitVide = !m[s]
        m[s] = t[s]
        modifies++
        // le programme ne change que si un slot apparait ou disparait
        if (etaitVide || !t[s]) m.needsUpdate = true
      }
    }
    for (const t of texturesBase) {
      if (t.anisotropy !== anisotropie) { t.anisotropy = anisotropie; t.needsUpdate = true }
    }
    niveauCourant = niveau
    libererHors(niveau)
    return modifies
  }

  /**
   * Libere les textures en cache qui ne servent ni au niveau donne ni au niveau en place sur
   * les materiaux (le GLB n'est jamais touche).
   */
  function libererHors(niveau) {
    const garder = new Set([...specs(niveau), ...specs(niveauCourant)].map((s) => s.url))
    for (const [url, e] of cache) {
      if (garder.has(url) || !(e.texture || e.echec)) continue   // en cours de chargement : on attend
      for (const v of e.variantes) v.texture.dispose()
      e.texture?.dispose()
      cache.delete(url)
    }
  }

  const octets = (niveau) => manifeste?.niveaux?.[niveau]?.octets ?? 0

  function libererTout() {
    for (const e of cache.values()) { for (const v of e.variantes) v.texture.dispose(); e.texture?.dispose() }
    cache.clear()
  }

  return {
    precharger, pret, appliquer, octets, libererTout,
    get manifeste() { return manifeste },
    get niveauCourant() { return niveauCourant },
    get materiaux() { return materiaux },
  }
}
