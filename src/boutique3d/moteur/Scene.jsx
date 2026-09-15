import React, { useRef, useMemo, useEffect, useLayoutEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { easeOutQuart, easeInOutCubic, smoothstep, DUREE_ALLER, DUREE_RETOUR, DUREE_RETOUR_MANUEL } from './vues.js'
import { asset } from './modele.js'
import { REGLAGES, creerSonde, creerGouverneur, niveauInferieur } from './qualite.js'
import { creerGestionnaire } from './textures.js'
import { creerCollisions, avancer, regarder, depuisDirection, monter,
         PITCH_MAX, SENSIBILITE_SOURIS } from './manuel.js'
import { poserPatch } from './patchs.js'
import { teinte, familleDe, etatDefaut as lumiereDefaut } from './lumiere.js'
import { cleDepuisMateriau, estAllumee, etatDefaut as telesDefaut, verifier as verifierTeles,
         GRANDE } from './televisions.js'
import { creerTrou, COUCHE_TROU } from './ecranVideo.js'
import { creerMateriauEteint, libererCarte } from './ecranEteint.js'
import Reflet from './Reflet.jsx'

const AVANT = new THREE.Vector3(0, 0, -1)
const MATERIAU_SOL = 'mat_sol_chene__shell'

// Champ vertical du mode manuel : large en portrait (on voit ou l'on met les pieds),
// plus sage en paysage et sur bureau. Il est fixe : se deplacer avec un champ qui change
// selon la vue donnerait le mal de mer.
const FOV_MANUEL_PORTRAIT = 68
const FOV_MANUEL_PAYSAGE = 55
// Au-dela de cette distance hors des limites, la camera n'est plus "presque dans la boutique" :
// on repart de la position de depart plutot que de coller le visiteur au mur le plus proche.
const MARGE_REPLI = 1.0
// Glissement d'entree en mode manuel quand la vue guidee etait posee dans un meuble.
const DUREE_ENTREE_MANUEL = 0.55

// Correctif commun a tous les niveaux : sur un materiau lightmappe, l'irradiance diffuse de
// l'environnement compte deux fois (la lightmap contient deja la lumiere indirecte). On retire
// cette ligne du chunk et on garde la reflexion speculaire.
const LIGNE_IBL_DIFFUS = 'iblIrradiance += getIBLIrradiance( geometryNormal );'
const CHUNK_SANS_IBL_DIFFUS = THREE.ShaderChunk.lights_fragment_maps.replace(LIGNE_IBL_DIFFUS, '')
if (CHUNK_SANS_IBL_DIFFUS === THREE.ShaderChunk.lights_fragment_maps) {
  console.warn('patch IBL diffus : ligne introuvable dans lights_fragment_maps (version de three changee ?)')
}
// Teinte de la lumiere cuite. Un SEUL objet uniform, partage par les 39 materiaux
// lightmappes : changer sa valeur les met tous a jour dans la meme image, sans recompiler un
// seul programme et sans passe de rendu supplementaire. C'est ce qui rend le reglage de
// chaleur gratuit en images par seconde.
const uTeinteLumiere = { value: new THREE.Vector3(1, 1, 1) }
export const poserTeinte = (rvb) => uTeinteLumiere.value.set(rvb[0], rvb[1], rvb[2])

const LIGNE_LIGHTMAP = 'vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;'
const CHUNK_LUMIERE = CHUNK_SANS_IBL_DIFFUS.replace(
  LIGNE_LIGHTMAP,
  'vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity * uTeinteLumiere;')
if (CHUNK_LUMIERE === CHUNK_SANS_IBL_DIFFUS) {
  console.warn('patch teinte : ligne lightmap introuvable (version de three changee ?)')
}

const patchIblDiffus = (shader) => {
  shader.uniforms.uTeinteLumiere = uTeinteLumiere
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <lights_fragment_maps>', CHUNK_LUMIERE)
    .replace('void main() {', 'uniform vec3 uTeinteLumiere;\nvoid main() {')
}

/**
 * Lit dans le GLB (deja en Y-up) tout ce dont la navigation a besoin :
 * cameras -> vues (position, cible, focale), points de passage wp_*, pivots de porte.
 */
function lireScene(scene, meta) {
  const vues = {}, wps = {}, portes = {}
  scene.updateMatrixWorld(true)
  scene.traverse((o) => {
    if (!o.name) return
    if (o.name.startsWith('cam_')) {
      const cle = o.name.slice(4)
      const info = meta.vues[cle]
      if (!info) return
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion()
      o.getWorldPosition(pos); o.getWorldQuaternion(quat)
      const cible = pos.clone().add(AVANT.clone().applyQuaternion(quat).multiplyScalar(info.distance))
      vues[cle] = { pos, cible, distance: info.distance, rayon: info.rayon_sujet, focale: info.focale_blender_mm }
    } else if (o.name.startsWith('wp_')) {
      const p = new THREE.Vector3(); o.getWorldPosition(p); wps[o.name] = p
    } else if (o.name === 'door_g_pivot' || o.name === 'door_d_pivot') {
      portes[o.name] = o
    }
  })
  return { vues, wps, portes }
}

/** Champ vertical (degres) pour une vue, selon le mode et le format d'ecran. */
function fovPour(v, mode, aspect, capteur) {
  let fovV
  if (mode === 'exact') {
    const fovH = 2 * Math.atan(capteur / (2 * v.focale))
    fovV = 2 * Math.atan(Math.tan(fovH / 2) / aspect)
  } else {
    const k = aspect < 1 ? Math.pow(1 / aspect, 0.55) : 1
    fovV = 2 * Math.atan((v.rayon / v.distance) * k)
  }
  return THREE.MathUtils.radToDeg(Math.min(fovV, THREE.MathUtils.degToRad(85)))
}

let ktx2Partage = null
// un gestionnaire de textures par GLB (drei met le GLB en cache : les textures de base ne
// doivent etre memorisees qu'une fois, avant toute application de niveau)
const gestionnaires = new WeakMap()

/**
 * qualite : { mode, niveau (cible), sonder, mobile } ; onSonde(m3) ; onDescente(niveauInferieur) ;
 * onNiveauApplique(niveau, { t }) quand les textures du niveau sont en place.
 */
export default function Scene({ etape, vueActive, mode, onPret, onMesure, onEntreeFinie,
                                qualite, onSonde, onDescente, onNiveauApplique,
                                manuel = false, vitesse = 'normal', entrees = null, onRetourFini = null,
                                surEcoute = null, lumiereRef = null,
                                televisionsRef = null, diffuserRef = null, ecranVideo = null,
                                manifeste = null }) {
  const { camera, gl, scene: sceneR3F, size } = useThree()
  // Le manifeste arrive en PROP et non par contexte : react-three-fiber monte ce sous-arbre
  // avec son propre reconciliateur, et un contexte React pose autour du <Canvas> ne le
  // traverse pas. Le repli sur window.__meta garde la sonde utile aux tests.
  const meta = useMemo(() => manifeste ?? (typeof window !== 'undefined' ? window.__meta : null),
                       [manifeste])

  // Le GLB est compresse (textures KTX2, maillages meshopt) : le chargeur doit connaitre
  // les deux decodeurs AVANT de lire le fichier. Le transcodeur Basis est servi depuis /basis/.
  const { scene: glb } = useGLTF(asset('/boutique.glb'), undefined, true, (loader) => {
    if (!ktx2Partage) ktx2Partage = new KTX2Loader().setTranscoderPath(asset('/basis/')).detectSupport(gl)
    loader.setKTX2Loader(ktx2Partage)
    loader.setMeshoptDecoder(MeshoptDecoder)
  })
  const lu = useMemo(() => lireScene(glb, meta), [glb, meta])
  const { vues, wps, portes } = lu

  const anim = useRef({ actif: false, t: 0, duree: 1, depart: null, arrivee: null })
  const posCour = useRef(new THREE.Vector3())
  const cibleCour = useRef(new THREE.Vector3())
  const ctrl = useRef(new THREE.Vector3())
  const entree = useRef({ debut: 0, chemin: null, fovA: 40, fovB: 40 })
  const materiauxFaits = useRef(false)

  // --- deplacement manuel : tout l'etat vit dans des refs, et les objets three.js utilises
  //     par image sont crees une seule fois (aucune allocation dans useFrame)
  const collisions = useMemo(() => creerCollisions(meta?.collisions), [meta])
  const man = useRef({
    actif: false, x: 0, z: 0, yaw: 0, pitch: 0,
    oeil: collisions.hauteurOeil,        // hauteur courante (converge vers oeilCible)
    oeilCible: collisions.hauteurOeil,
    fov: 55, portee: 1, bouge: false,
    retour: null,                        // animation de retour vers la navigation guidee
    avant: null,                         // etat guide memorise a l'activation
  })
  const gManche = useRef({ x: 0, y: 0 })
  const dManche = useRef({ x: 0, y: 0 })
  const vueManuelle = useRef({ position: [0, 0, 0], cible: [0, 0, 0] })
  const dirTmp = useRef(new THREE.Vector3())
  const posTmp = useRef(new THREE.Vector3())
  const cibleTmp = useRef(new THREE.Vector3())
  const cible2Tmp = useRef(new THREE.Vector3())
  const monteRef = useRef(0)
  // etat de la camera principale du hub, tenu a jour : c'est TOUJOURS la destination du retour
  const hubRef = useRef(null)

  // --- qualite : gestionnaire de textures, sonde, gouverneur (etat vivant dans des refs)
  const props = useRef({})
  props.current = { etape, qualite, onSonde, onDescente, onNiveauApplique, onRetourFini }
  const gestion = useRef(null)
  const cible = useRef(null)          // niveau demande
  const pretPour = useRef(null)       // niveau precharge, pret a etre applique
  const applique = useRef(null)       // niveau dont les textures sont en place
  const sonde = useRef(null)
  const sondeFaite = useRef(false)
  const gouverneur = useRef(creerGouverneur(performance.now()))
  const tPrec = useRef(0)
  const [niveauApplique, setNiveauApplique] = useState(qualite?.niveau ?? 'faible')
  const [sondeEnCours, setSondeEnCours] = useState(false)
  const [versionReflet, setVersionReflet] = useState(0)
  const [sol, setSol] = useState(null)
  const envRef = useRef(null)
  // Sources visibles reperees a la premiere passe : { materiau, intensite d'origine, famille }.
  // On garde l'intensite d'origine parce que le reglage est un FACTEUR : sans elle, un
  // aller-retour du curseur ecraserait definitivement les valeurs cuites dans Blender.
  const sources = useRef([])
  // Couche video de la grande tele : l'iframe YouTube posee dans l'espace, le materiau qui
  // perce le trou dans le rendu, et le materiau d'origine a rendre quand on arrete.
  const ecran = useRef(null)
  const grandeDalle = useRef(null)
  const trou = useRef(null)
  // Maillage et materiau d'origine de chaque tele, pour pouvoir eteindre la dalle sans jamais
  // toucher au materiau allume : le retour est alors instantane et exact.
  const ecrans = useRef(new Map())
  const matEteint = useRef(null)
  const diffusionPosee = useRef(false)

  // --- materiaux : lightmap cuite (exportee comme occlusion, reaffectee ici), verre simplifie,
  //     patch IBL diffus, puis gestionnaire de textures (qui memorise les textures du GLB)
  useLayoutEffect(() => {
    if (materiauxFaits.current) return
    // Cycles cuit la radiance diffuse sans albedo (E/pi) ; Three.js attend une irradiance (E) qu'il
    // divise lui-meme par pi. D'ou intensite = pi / K, calculee a l'export dans boutique.json.
    const K = meta.lightmap?.intensite_web ?? (Math.PI / 0.4)
    let avecLightmap = 0
    let solTrouve = null
    glb.traverse((o) => {
      if (!o.isMesh) return
      const m = o.material
      if (m?.aoMap) {
        // le canal UV (texCoord) est celui declare dans le glTF, deja pose par le chargeur
        m.lightMap = m.aoMap
        m.lightMap.colorSpace = THREE.SRGBColorSpace
        m.lightMapIntensity = K
        m.lightMap.needsUpdate = true
        m.aoMap = null; m.needsUpdate = true
        avecLightmap++
      }
      if (m?.lightMap) poserPatch(m, 'ibl', patchIblDiffus)
      const fam = familleDe(m?.name)
      // `tv` relie la source a une ligne du panneau Televisions. Les ecrans de devanture n'y
      // sont pas : ils restent allumes, comme decide avec le client.
      if (fam) {
        // L INTENSITE D ORIGINE EST RELEVEE UNE SEULE FOIS, ET RANGEE SUR LE MATERIAU.
        //
        // `useGLTF` met le GLB en cache PAR URL : d un montage a l autre, ce sont les memes
        // objets Material. Relever `base` sur `m.emissiveIntensity` relevait donc, au second
        // montage, la valeur DEJA multipliee par le montage precedent, et l ecart se composait
        // a chaque reouverture. Mesure avant correctif, sur mat_abat_jour, reglage de lumiere
        // a 1,26 : 1,02 puis 0,867 puis 0,737 puis 0,626 — un facteur 0,85 par cycle, sans
        // retour possible. Johanna ne montait la boutique qu une fois par chargement de page
        // et ne pouvait pas le voir ; un tableau de bord ouvre et ferme sans recharger.
        //
        // `userData` survit avec le materiau, donc avec le cache : la valeur relevee est
        // toujours celle du GLB tel qu il est sorti du fichier.
        if (typeof m.userData.__emissiveOrigine !== 'number') {
          m.userData.__emissiveOrigine = m.emissiveIntensity ?? 1
        }
        sources.current.push({ m, base: m.userData.__emissiveOrigine, famille: fam,
                               tv: cleDepuisMateriau(m?.name) })
      }
      if (o.name === GRANDE.maillage) grandeDalle.current = o
      const cleTele = cleDepuisMateriau(m?.name)
      if (cleTele) {
        // MEME PIEGE QUE POUR LA LUMIERE, EN PIRE. Si le montage precedent a laisse la dalle
        // sur le materiau « ecran eteint », `o.material` EST ce materiau : il devenait alors
        // la reference « allumee », et le vrai materiau etait perdu pour de bon. Le materiau
        // eteint ayant ete libere au demontage, rallumer reposait un materiau detruit.
        // Mesure avant correctif : screen_nouveautes passe de mat_ecran_nouveautes a
        // mat_dalle_eteinte, y reste apres fermeture/reouverture, et y reste encore apres
        // qu on l ait rallumee — pendant que __ecransEteints annonce [] et que le panneau
        // affiche la tele comme allumee. L ecran restait noir, sans aucun moyen de revenir.
        if (!o.userData.__materiauAllume) o.userData.__materiauAllume = o.material
        ecrans.current.set(cleTele, { maillage: o, materiau: o.userData.__materiauAllume })
      }
      if (m?.name === MATERIAU_SOL) solTrouve = o
      if (m?.name?.startsWith('mat_verre')) {
        const ecran = m.name.includes('ecran')
        o.material = new THREE.MeshPhysicalMaterial({
          color: ecran ? 0x2a3038 : 0x9fb4c8, transparent: true, opacity: ecran ? 0.10 : 0.14,
          roughness: 0.04, metalness: 0, envMapIntensity: 1.4, depthWrite: false, side: THREE.DoubleSide,
        })
        o.renderOrder = 10
      }
    })
    window.__lightmaps = avecLightmap
    materiauxFaits.current = true
    if (!gestionnaires.has(glb)) gestionnaires.set(glb, creerGestionnaire({ glb, ktx2: ktx2Partage }))
    gestion.current = gestionnaires.get(glb)
    setSol(solTrouve)
  }, [glb, meta])

  // --- lumiere. Elle arrive par une REF, pas par une prop : le sous-arbre du Canvas ne se
  //     rerend pas a chaque changement d'etat de l'application (le premier cablage par prop
  //     ne recevait jamais la nouvelle valeur), et un curseur qu'on fait glisser ne doit de
  //     toute facon pas declencher de rendu React. On compare donc une reference par image,
  //     ce qui est gratuit, et on n'applique que lorsqu'elle a change.
  //     Aucune lumiere temps reel n'existe dans cette scene : tout est cuit. Les deux seuls
  //     leviers honnetes sont la teinte de cette lumiere cuite et l'intensite des sources
  //     visibles ; ni l'un ni l'autre ne coute une passe de rendu ou une texture.
  const lumiereAppliquee = useRef(null)
  const telesAppliquees = useRef(null)
  // Lumiere et Televisions se rencontrent ICI, et nulle part ailleurs : l'intensite d'un ecran
  // est son intensite CUITE, multipliee par le reglage de la famille Ecrans, et annulee s'il
  // est eteint. Si chaque systeme ecrivait dans son coin, le dernier a passer rallumerait ce
  // que l'autre venait d'eteindre.
  const appliquerRendu = (l, tv) => {
    poserTeinte(teinte(l.chaleur))
    for (const src of sources.current) {
      const f = l[src.famille]
      src.m.emissiveIntensity = src.base * (typeof f === 'number' ? f : 1)
    }
    // Extinction : la dalle prend le materiau « ecran eteint », un verre noir qui renvoie la
    // piece. Le materiau allume, lui, n'est pas touche — il garde l'intensite que la Lumiere
    // vient de lui donner, et rallumer le repose tel quel, sans rien recharger.
    for (const [cle, e] of ecrans.current) {
      const allumee = !tv || estAllumee(tv, cle)
      if (!allumee && !matEteint.current) matEteint.current = creerMateriauEteint(gl, glb)
      const voulu = allumee ? e.materiau : matEteint.current
      if (e.maillage.material !== voulu) e.maillage.material = voulu
    }
    lumiereAppliquee.current = l
    telesAppliquees.current = tv
    if (typeof window !== 'undefined') {
      window.__sourcesLumiere = sources.current.length
      window.__teinteRendu = uTeinteLumiere.value.toArray()
      window.__ecransEteints = [...ecrans.current].filter(([, e]) => e.maillage.material !== e.materiau).map(([c]) => c)
    }
  }

  /**
   * Allume ou eteint la diffusion sur la grande tele. Le maillage change de materiau : celui
   * qui perce le trou pendant la diffusion, celui d'origine sinon — d'ou le retour automatique
   * au contenu Looks des qu'on arrete. Rien n'est detruit ni recree, la lecture n'est jamais
   * coupee.
   */
  const poserDiffusion = (actif) => {
    const dalle = grandeDalle.current
    if (!dalle) return
    if (!trou.current) {
      trou.current = creerTrou(dalle)
      // la camera principale doit voir la couche du trou ; celle du reflet, non
      camera.layers.enable(COUCHE_TROU)
    }
    trou.current.visible = actif
    ecran.current?.definirVisible(actif)
    diffusionPosee.current = actif
    if (typeof window !== 'undefined') window.__diffusionTele = actif
  }
  // --- couche video de la grande tele. Elle est CREEE dans App, pas ici : ce composant vit
  //     sous <Suspense>, et une re-suspension detruirait l'iframe en pleine lecture. Ici on se
  //     contente de la caler sur la dalle mesuree dans la scene — ni taille ni orientation
  //     ne sont ecrites en dur.
  useEffect(() => {
    if (!ecranVideo || !grandeDalle.current) return
    ecran.current = ecranVideo
    const mesures = ecranVideo.poserSur(grandeDalle.current)
    ecranVideo.dimensionner(size.width, size.height)
    ecranVideo.amorcer(camera)
    if (typeof window !== 'undefined') {
      window.__ecranVideo = mesures
      const noms = []
      glb.traverse((o) => { if (o.isMesh && o.name.startsWith('screen_')) noms.push(o.name) })
      window.__televisionsScene = verifierTeles(noms)
    }
  }, [ecranVideo, glb, sol, camera])

  useEffect(() => { ecran.current?.dimensionner(size.width, size.height) }, [size])

  // --- le paquet du niveau cible se telecharge des la decision ; il sera applique quand la
  //     camera sera immobile (voir useFrame). Tant qu'une sonde est prevue (mobile en Auto sans
  //     decision memorisee), on ne telecharge rien : le niveau provisoire n'est peut-etre pas le
  //     bon (trafic inutile) et le transcodage fausserait la mesure.
  useEffect(() => {
    const g = gestion.current
    const n = qualite?.niveau
    if (!g || !n) return
    if (qualite.mode === 'auto' && qualite.sonder) return
    cible.current = n
    pretPour.current = null
    let annule = false
    g.precharger(n).then(() => { if (!annule && cible.current === n) pretPour.current = n })
    return () => { annule = true }
  }, [qualite?.niveau, qualite?.mode, qualite?.sonder, glb])

  // --- environnement : reflets discrets sur verre, marbre et laiton (aucun chargement reseau).
  //     Intensite par niveau ; aucun PMREM en Faible (verre sans reflet).
  useEffect(() => {
    const intensite = REGLAGES[niveauApplique]?.env ?? 0
    if (intensite > 0) {
      if (!envRef.current) {
        const pmrem = new THREE.PMREMGenerator(gl)
        envRef.current = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
        pmrem.dispose()
      }
      sceneR3F.environment = envRef.current
      if ('environmentIntensity' in sceneR3F) sceneR3F.environmentIntensity = intensite
    } else {
      // Faible : aucun PMREM en memoire GPU (regenere a la demande si le niveau remonte)
      sceneR3F.environment = null
      envRef.current?.dispose(); envRef.current = null
    }
  }, [gl, sceneR3F, niveauApplique])
  // AU DEMONTAGE, ON REND LE GLB TEL QU ON L A TROUVE.
  //
  // Il est PARTAGE : `useGLTF` le garde en cache par URL, et le prochain montage — ou une
  // autre boutique du meme modele dans le meme onglet — repart de ces objets. Tout ce que le
  // rendu y a ecrit doit donc etre defait ici, et defait AVANT de liberer quoi que ce soit :
  // liberer un materiau encore pose sur une dalle laissait cette dalle noire pour toujours.
  useEffect(() => () => {
    for (const src of sources.current) {
      const o = src.m?.userData?.__emissiveOrigine
      if (typeof o === 'number') src.m.emissiveIntensity = o
    }
    for (const [, e] of ecrans.current) {
      if (e.materiau && e.maillage.material !== e.materiau) e.maillage.material = e.materiau
    }
    sceneR3F.environment = null; envRef.current?.dispose(); envRef.current = null
    // plus aucune dalle ne le porte : on peut le liberer
    matEteint.current?.dispose(); matEteint.current = null; libererCarte()
  }, [sceneR3F])

  // --- placement initial : devant la facade, portes fermees
  useEffect(() => {
    const v = vues.ext || vues.hub
    if (!v) return
    posCour.current.copy(v.pos); cibleCour.current.copy(v.cible)
    camera.position.copy(v.pos); camera.lookAt(v.cible)
    onPret?.()
  }, [vues, camera, onPret])

  useEffect(() => {
    if (etape !== 'facade' || !vues.ext) return
    anim.current.actif = false
    posCour.current.copy(vues.ext.pos); cibleCour.current.copy(vues.ext.cible)
    for (const p of Object.values(portes)) p.rotation.set(0, 0, 0)
  }, [etape, vues, portes])

  useEffect(() => {
    if (etape !== 'entree' || !vues.ext || !vues.hub) return
    const noms = meta.entree.chemin
    const pts = noms.map((n) => (n.startsWith('cam_') ? vues[n.slice(4)]?.pos : wps[n])).filter(Boolean)
    const e = entree.current
    e.chemin = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
    e.debut = performance.now()
    const aspect = size.width / size.height
    e.fovA = fovPour(vues.ext, mode, aspect, meta.capteur_mm)
    e.fovB = fovPour(vues.hub, mode, aspect, meta.capteur_mm)
    anim.current.actif = false
  }, [etape, vues, wps, meta, mode, size])

  // arrivee dans la boutique : 2 s de repos pour le gouverneur
  useEffect(() => { if (etape === 'boutique') gouverneur.current.marquerChangement(performance.now()) }, [etape])

  // retour d'un onglet masque : l'intervalle de reprise n'est pas une image lente ; la fenetre
  // du gouverneur est videe et 2 s de repos s'appliquent
  useEffect(() => {
    const reprise = () => { if (!document.hidden) { tPrec.current = 0; gouverneur.current.marquerChangement(performance.now()) } }
    document.addEventListener('visibilitychange', reprise)
    return () => document.removeEventListener('visibilitychange', reprise)
  }, [])

  useEffect(() => {
    // en mode manuel la navigation guidee est suspendue : aucun vol de camera n'est arme
    if (etape !== 'boutique' || manuel) return
    const v = vues[vueActive]
    if (!v) return
    const a = anim.current
    const depart = { pos: posCour.current.clone(), cible: cibleCour.current.clone() }
    const trajet = depart.pos.distanceTo(v.pos)
    if (trajet < 0.001) { a.actif = false; cibleCour.current.copy(v.cible); return }
    a.depart = depart
    a.arrivee = { pos: v.pos.clone(), cible: v.cible.clone() }
    a.duree = vueActive === 'hub' ? DUREE_RETOUR : DUREE_ALLER
    a.t = 0; a.actif = true
    ctrl.current.copy(depart.pos).add(v.pos).multiplyScalar(0.5)
    ctrl.current.y += Math.min(0.22, trajet * 0.055)
  }, [etape, vueActive, vues, manuel])

  // --- bascule guide <-> manuel.
  // Activation : l'etat manuel part de la camera courante (position, lacet et tangage deduits
  // de la direction de vue) pour qu'il n'y ait aucun saut ; la hauteur d'oeil et le champ
  // convergent ensuite en douceur. L'etat guide (position, cible, champ) est memorise.
  // Desactivation : interpolation de 0,9 s vers l'etat memorise, puis la main est rendue a la
  // navigation guidee sur la meme vue qu'avant.
  useEffect(() => {
    const m = man.current
    if (manuel && etape === 'boutique') {
      if (!m.retour) {
        // le retour se fait TOUJOURS sur la camera principale du hub, quelle que soit la vue
        // depuis laquelle on est passe en mode manuel
        m.avant = hubRef.current || {
          pos: posCour.current.clone(), cible: cibleCour.current.clone(), fov: camera.fov,
          portee: Math.max(0.5, posCour.current.distanceTo(cibleCour.current)),
        }
      }
      m.retour = null
      const d = dirTmp.current
      camera.getWorldDirection(d)
      const a = depuisDirection(d.x, d.y, d.z)
      m.yaw = a.yaw; m.pitch = a.pitch
      m.x = camera.position.x; m.z = camera.position.z
      const lim = collisions.limites
      if (m.x > lim.x[0] - MARGE_REPLI && m.x < lim.x[1] + MARGE_REPLI &&
          m.z > lim.z[0] - MARGE_REPLI && m.z < lim.z[1] + MARGE_REPLI) {
        // une vue guidee peut froler un meuble (le comptoir, une banquette) ou etre prise en
        // plein vol au-dessus : on se decale au point valide LE PLUS PROCHE, pas au depart
        const p = collisions.degager(m.x, m.z)
        m.recalage = Math.hypot(p[0] - m.x, p[1] - m.z)
        m.x = p[0]; m.z = p[1]
      } else {
        // vraiment hors du magasin (vue exterieure) : repli sur la position de depart
        m.x = collisions.depart.x; m.z = collisions.depart.z; m.yaw = collisions.depart.yaw; m.pitch = 0
      }
      m.oeilCible = collisions.hauteurOeil
      m.oeil = camera.position.y
      m.fov = camera.fov
      m.portee = 1
      m.bouge = false
      m.actif = true
      // trois vues guidees (sacs, jeans, chaussures) sont posees a l'interieur d'un meuble :
      // la position corrigee peut etre a plus d'un metre. On y glisse au lieu d'y sauter.
      m.transition = m.recalage > 0.05
        ? { t: 0, posA: posCour.current.clone(), cibleA: cibleCour.current.clone(), fovA: camera.fov }
        : null
      anim.current.actif = false
    } else if (m.actif || m.retour) {
      const etaitActif = m.actif
      m.actif = false
      m.transition = null
      if (etape === 'boutique' && etaitActif && m.avant) {
        // le point vise du mode manuel est place a la distance du point vise memorise :
        // la rotation s'interpole alors regulierement, sans acceleration parasite
        m.portee = m.avant.portee
        const v = regarder(m, vueManuelle.current)
        const posA = new THREE.Vector3(v.position[0], v.position[1], v.position[2])
        // duree proportionnelle a la distance : revenir du fond du magasin en 0,9 s donnait
        // un travelling a 13 m/s, ressenti comme une projection. On plafonne a 1,8 s.
        const distance = posA.distanceTo(m.avant.pos)
        m.retour = {
          t: 0,
          duree: Math.min(1.8, Math.max(DUREE_RETOUR_MANUEL, 0.8 + distance * 0.08)),
          posA,
          cibleA: new THREE.Vector3(v.cible[0], v.cible[1], v.cible[2]),
          fovA: m.fov,
          posB: m.avant.pos, cibleB: m.avant.cible, fovB: m.avant.fov,
        }
      } else {
        // changement d'etape, ou etape quittee pendant le retour : la navigation guidee
        // (facade, entree) reprend la main tout de suite, sans animation en suspens
        m.retour = null; m.avant = null
      }
    }
  }, [manuel, etape, camera, collisions])

  // La destination du retour est recalculee a chaque changement de vues, de cadrage ou de
  // taille d'ecran : le champ du hub depend du format. On la tient a jour hors du mode manuel
  // pour que l'effet d'activation n'ait pas a dependre de ces valeurs.
  useEffect(() => {
    const h = vues.hub
    if (!h) return
    hubRef.current = {
      pos: h.pos.clone(), cible: h.cible.clone(),
      fov: fovPour(h, mode, size.width / size.height, meta.capteur_mm),
      portee: Math.max(0.5, h.pos.distanceTo(h.cible)),
    }
  }, [vues, mode, size, meta])

  /** Etat expose pour les tests et le diagnostic. Un seul objet, mis a jour sur place. */
  const publierManuel = () => {
    const m = man.current
    const w = window.__manuel || (window.__manuel = {})
    w.actif = m.actif; w.x = m.x; w.z = m.z; w.yaw = m.yaw; w.pitch = m.pitch
    w.vitesse = vitesse; w.collisions = collisions.nb; w.retourEnCours = !!m.retour
  }
  useEffect(publierManuel, [vitesse, collisions, manuel, etape])

  useLayoutEffect(() => {
    if (etape === 'entree') return
    const v = etape === 'facade' ? vues.ext : (vues[vueActive] || vues.hub)
    if (!v) return
    const fov = fovPour(v, mode, size.width / size.height, meta.capteur_mm)
    camera.near = 0.05; camera.far = 80
    const m = man.current
    if (m.actif || m.retour) {
      // en mode manuel le champ est celui du deplacement : on met seulement a jour le champ
      // MEMORISE (l'ecran a pu tourner pendant la visite libre), sans toucher a la camera
      if (m.avant) m.avant.fov = fov
      if (m.retour) m.retour.fovB = fov
      return
    }
    camera.fov = fov
    camera.updateProjectionMatrix()
    onMesure?.({ fov })
  }, [etape, vueActive, vues, mode, size, camera, meta, onMesure])

  /** Lit les deux manches et y ajoute le clavier (bureau), dans des objets reutilises. */
  const lireManches = () => {
    const e = entrees?.current
    const g = gManche.current, d = dManche.current
    g.x = e?.gauche?.x || 0; g.y = e?.gauche?.y || 0
    d.x = e?.droit?.x || 0;  d.y = e?.droit?.y || 0
    const t = e?.touches
    if (t) {
      if (t.avant) g.y -= 1
      if (t.arriere) g.y += 1
      if (t.gauche) g.x -= 1
      if (t.droite) g.x += 1
    }
    monteRef.current = t ? (t.monte ? 1 : 0) - (t.descend ? 1 : 0) : 0
  }

  /** Applique la rotation a la souris (clic gauche maintenu) : deltas en pixels, 1 pour 1. */
  const lireSouris = (m) => {
    const s = entrees?.current?.souris
    if (!s || (!s.dx && !s.dy)) return false
    m.yaw -= s.dx * SENSIBILITE_SOURIS
    m.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, m.pitch - s.dy * SENSIBILITE_SOURIS))
    s.dx = 0; s.dy = 0
    return true
  }

  /** Une image de mode manuel (ou de retour vers le mode guide) : pose la camera. */
  const imageManuelle = (dt) => {
    const m = man.current
    if (m.actif && m.transition) {
      // glissement d'entree : la camera rejoint la position valide du mode manuel. Les manches
      // sont ignores pendant ce demi-seconde, le temps que la transition se termine.
      const tr = m.transition
      tr.t = Math.min(1, tr.t + dt / DUREE_ENTREE_MANUEL)
      const u = easeInOutCubic(tr.t)
      m.oeil = collisions.hauteurOeil
      m.portee = 1
      const v = regarder(m, vueManuelle.current)
      posTmp.current.set(v.position[0], v.position[1], v.position[2])
      cibleTmp.current.set(v.cible[0], v.cible[1], v.cible[2])
      camera.position.lerpVectors(tr.posA, posTmp.current, u)
      cible2Tmp.current.lerpVectors(tr.cibleA, cibleTmp.current, u)
      camera.lookAt(cible2Tmp.current)
      const fovCible = size.height > size.width ? FOV_MANUEL_PORTRAIT : FOV_MANUEL_PAYSAGE
      m.fov = THREE.MathUtils.lerp(tr.fovA, fovCible, u)
      camera.fov = m.fov; camera.updateProjectionMatrix()
      if (tr.t >= 1) m.transition = null
      publierManuel()
      return
    }
    if (m.actif) {
      lireManches()
      const s = avancer(m, gManche.current, dManche.current, dt, vitesse, collisions)
      m.bouge = Math.abs(s.x - m.x) > 1e-5 || Math.abs(s.z - m.z) > 1e-5
                || s.yaw !== m.yaw || s.pitch !== m.pitch
      m.x = s.x; m.z = s.z; m.yaw = s.yaw; m.pitch = s.pitch
      if (lireSouris(m)) m.bouge = true
      // E et Q : le point de vue monte ou descend, borne au sol et au plafond
      m.oeilCible = monter(m.oeilCible, monteRef.current, dt, vitesse)
      // hauteur d'oeil et champ : convergence douce depuis l'etat guide, aucun saut a l'activation
      const k = Math.min(1, dt * 6)
      m.oeil += (m.oeilCible - m.oeil) * k
      const fovCible = size.height > size.width ? FOV_MANUEL_PORTRAIT : FOV_MANUEL_PAYSAGE
      m.fov += (fovCible - m.fov) * k
      m.portee = 1
      const v = regarder(m, vueManuelle.current)
      camera.position.set(v.position[0], v.position[1], v.position[2])
      cibleTmp.current.set(v.cible[0], v.cible[1], v.cible[2])
      camera.lookAt(cibleTmp.current)
      if (Math.abs(camera.fov - m.fov) > 0.02) { camera.fov = m.fov; camera.updateProjectionMatrix() }
    } else if (m.retour) {
      const r = m.retour
      r.t = Math.min(1, r.t + dt / (r.duree || DUREE_RETOUR_MANUEL))
      const u = easeInOutCubic(r.t)
      posTmp.current.lerpVectors(r.posA, r.posB, u)
      cibleTmp.current.lerpVectors(r.cibleA, r.cibleB, u)
      camera.position.copy(posTmp.current)
      camera.lookAt(cibleTmp.current)
      camera.fov = THREE.MathUtils.lerp(r.fovA, r.fovB, u)
      camera.updateProjectionMatrix()
      if (r.t >= 1) {
        // la navigation guidee reprend exactement la ou elle s'etait arretee
        posCour.current.copy(r.posB); cibleCour.current.copy(r.cibleB)
        camera.fov = r.fovB; camera.updateProjectionMatrix()
        m.retour = null; m.avant = null; m.bouge = false
        // la camera est exactement sur le hub : on remet la vue guidee sur 'hub', ce qui
        // n'entraine aucune animation (le trajet est nul) mais remet le menu en coherence
        props.current.onRetourFini?.()
      }
    }
    publierManuel()
  }

  // Priorite -1 : la camera est posee avant les autres abonnes (le reflet lit sa matrice).
  // Oreille du visiteur : la position et l'orientation de la camera, transmises au moteur
  // audio. Limitees a 30 fois par seconde — l'oreille ne suit pas plus vite, et cela evite
  // d'ecrire six parametres audio a chaque image.
  const ecoute = useRef({ t: 0, avant: new THREE.Vector3(), haut: new THREE.Vector3() })

  useFrame((_, dt) => {
    const l = lumiereRef?.current ?? lumiereDefaut()
    const tv = televisionsRef?.current ?? telesDefaut()
    if (l !== lumiereAppliquee.current || tv !== telesAppliquees.current) appliquerRendu(l, tv)

    const diffuser = !!diffuserRef?.current && !!ecran.current
    if (diffuser !== diffusionPosee.current) poserDiffusion(diffuser)

    if (surEcoute) {
      const e = ecoute.current
      e.t += dt
      if (e.t >= 0.033) {
        const pas = e.t
        e.t = 0
        camera.getWorldDirection(e.avant)
        e.haut.set(0, 1, 0).applyQuaternion(camera.quaternion)
        surEcoute(camera.position, e.avant, e.haut, pas)
      }
    }
    const m = man.current
    if (m.actif || m.retour) {
      // mode manuel : la camera est pilotee par les manches, la navigation guidee est a l'arret
      imageManuelle(dt)
    } else if (etape === 'entree' && entree.current.chemin) {
      const e = entree.current
      const t = (performance.now() - e.debut) / 1000
      const T = meta.entree.duree_s
      const u = easeInOutCubic(Math.min(t / T, 1))
      posCour.current.copy(e.chemin.getPointAt(u))
      cibleCour.current.lerpVectors(vues.ext.cible, vues.hub.cible, smoothstep(u))
      camera.fov = THREE.MathUtils.lerp(e.fovA, e.fovB, u); camera.updateProjectionMatrix()
      const k = THREE.MathUtils.clamp((t - meta.entree.portes_debut_s) / meta.entree.portes_duree_s, 0, 1)
      const th = THREE.MathUtils.degToRad(meta.entree.porte_ouverture_deg) * easeInOutCubic(k)
      for (const p of Object.values(portes)) p.rotation.y = (p.userData.sens ?? 1) * th
      if (t >= T) onEntreeFinie?.()
      camera.position.copy(posCour.current)
      camera.lookAt(cibleCour.current)
    } else {
      const a = anim.current
      if (a.actif) {
        a.t = Math.min(1, a.t + dt / a.duree)
        const ea = easeOutQuart(a.t), u = 1 - ea
        posCour.current.copy(a.depart.pos).multiplyScalar(u * u)
          .addScaledVector(ctrl.current, 2 * u * ea).addScaledVector(a.arrivee.pos, ea * ea)
        cibleCour.current.lerpVectors(a.depart.cible, a.arrivee.cible, ea)
        if (a.t >= 1) { posCour.current.copy(a.arrivee.pos); cibleCour.current.copy(a.arrivee.cible); a.actif = false }
      }
      camera.position.copy(posCour.current)
      camera.lookAt(cibleCour.current)
    }

    // ---- qualite : application du niveau, sonde, gouverneur (intervalles rAF en ms)
    const t = performance.now()
    const dtMs = tPrec.current ? t - tPrec.current : 0
    tPrec.current = t
    const p = props.current
    const q = p.qualite
    if (!q || !gestion.current) return
    // en mode manuel, "immobile" veut dire que le visiteur ne touche pas ses manches : un envoi
    // de textures pendant un deplacement se verrait autant que pendant un vol de camera
    const immobile = (m.actif || m.retour)
      ? (m.actif && !m.bouge)
      : (etape === 'facade' || (etape === 'boutique' && !anim.current.actif))

    // (2) sonde : 10 images de chauffe puis 40 images rendues 3 fois, camera immobile
    let sondeActive = false
    if (q.mode === 'auto' && q.sonder && !sondeFaite.current) {
      if (immobile) {
        if (!sonde.current) { sonde.current = creerSonde(); setSondeEnCours(true) }
        const s = sonde.current
        const extra = s.image(dtMs)
        for (let i = 0; i < extra; i++) gl.render(sceneR3F, camera)
        sondeActive = true
        if (s.finie) {
          sondeFaite.current = true
          sonde.current = null
          setSondeEnCours(false)
          p.onSonde?.(s.resultat())
        }
      }
    } else if (sonde.current) {
      // sonde interrompue (choix manuel) : on repartira de zero
      sonde.current = null
      setSondeEnCours(false)
    }

    // (3) le paquet precharge s'applique seulement camera immobile, jamais pendant l'entree,
    //     un vol de camera ni la sonde (les envois de textures fausseraient la mesure)
    const n = pretPour.current
    if (n && n !== applique.current && immobile && !sondeActive) {
      const aniso = Math.min(REGLAGES[n].anisotropie, gl.capabilities.getMaxAnisotropy() || 1)
      gestion.current.appliquer(n, { anisotropie: aniso })
      applique.current = n
      gouverneur.current.marquerChangement(t)
      setNiveauApplique(n)
      setVersionReflet((v) => v + 1)
      p.onNiveauApplique?.(n, { t })   // performance.now() : depuis le debut de la navigation
    }

    // (4) gouverneur : Auto seulement, etape boutique, hors sonde, hors 2 s apres un changement,
    //     et seulement quand le niveau demande est celui qui est reellement en place (sinon les
    //     images encore rendues au niveau superieur, pendant le telechargement du paquet,
    //     provoqueraient une seconde descente avant meme que la premiere soit visible)
    if (q.mode === 'auto' && etape === 'boutique' && !sondeActive && applique.current && applique.current === q.niveau) {
      if (gouverneur.current.image(dtMs, t)) {
        const inf = niveauInferieur(q.niveau)
        if (inf) p.onDescente?.(inf)
      }
    }

    // --- couche video, EN DERNIER. La camera n'est posee qu'au-dessus (entree, vol guide ou
    //     image manuelle), et l'animation d'entree change aussi le champ de vision. Rendre la
    //     couche avant cela la laisserait en retard d'une image et mal dimensionnee, pile
    //     pendant le mouvement le plus rapide de la visite.
    if (diffusionPosee.current && ecran.current) ecran.current.rendre(camera)
  }, -1)

  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.shadowMap.enabled = false
    window.__debug3d = { gl, scene: glb, camera, vues, wps, portes, etape, THREE }
  }, [gl, glb, camera, vues, wps, portes, etape])

  const reglages = REGLAGES[niveauApplique] || REGLAGES.faible

  return (
    <>
      {/* Aucune lumiere ponctuelle : tout est cuit. Une ambiante faible eclaire ce qui n'a pas de
          lightmap (portes, libelles), et l'environnement donne les reflets. */}
      <ambientLight intensity={0.02} color="#ffd6ad" />
      <primitive object={glb} />
      <Reflet actif={!!reglages.reflet} sol={sol} taille={qualite?.mobile ? 512 : 1024}
              pause={sondeEnCours} version={versionReflet} />
    </>
  )
}
