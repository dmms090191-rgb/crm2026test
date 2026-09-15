// Video YouTube affichee SUR la dalle de la grande tele du fond.
//
// Pourquoi ce detour plutot qu'une texture. Le flux d'une video YouTube vit dans une iframe
// d'un autre domaine : ses pixels sont hors de notre portee, on ne peut donc pas la peindre
// dans une texture WebGL. La seule facon honnete d'afficher la vraie video au bon endroit est
// de poser l'iframe elle-meme dans l'espace, avec la meme camera que la scene.
//
// Comment. Trois pieces qui doivent rester coherentes :
//   1. une couche `CSS3DRenderer` placee DERRIERE le canvas, qui applique a l'iframe la
//      transformation exacte de la dalle ;
//   2. un « trou » perce dans le rendu WebGL a l'endroit de la dalle : le materiau du maillage
//      `screen_looks` est remplace par un materiau qui ecrit la profondeur mais remplace la
//      couleur par du transparent. Le canvas devient donc transparent pile sur la dalle, et
//      l'iframe apparait a travers ;
//   3. rien d'autre. Tout ce qui passe devant la tele est dessine normalement dans le canvas et
//      masque donc la video, parce que le test de profondeur rejette le trou. L'occultation
//      reste juste sans qu'on ait a la simuler.
//
// La couche est DERRIERE le canvas et ne recoit aucun evenement de pointeur : le clic gauche
// maintenu du mode manuel continue d'aller au canvas, et le visiteur ne peut pas cliquer dans
// le lecteur YouTube pour partir sur youtube.com.
//
// Cadrage. La dalle mesure 2,80 x 1,575 m, soit exactement 16:9. L'iframe est creee en
// 1600 x 900, elle aussi exactement 16:9, puis mise a l'echelle par 2,80/1600. L'image occupe
// donc la surface de la tele au pixel pres, sans deformation ni debordement. Une video qui
// n'est pas en 16:9 est mise en boite par le lecteur de YouTube lui-meme, centree dans le
// cadre : c'est le comportement correct, et il reste dans la dalle.
//
// Taille en pixels : 1600 x 900. YouTube choisit la definition qu'il sert d'apres la
// qu'il sert d'apres la taille de l'iframe. Une petite iframe recevrait une image basse
// definition, qui se verrait en s'approchant de la tele.

import * as THREE from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { ID_HOTE } from './youtube.js'

export const LARGEUR_PX = 1600
export const HAUTEUR_PX = 900

// Decalage du trou devant la dalle, en metres. Le cadre de la video est pose au MEME
// decalage : les deux plans coincident donc exactement, y compris le nez sur l'ecran en
// deplacement manuel, ou un ecart de profondeur se verrait sur les bords.
export const DECALAGE = 0.0015

// Couche du trou. La passe de reflet du sol rend toute la scene avec une camera miroir dont
// le masque de couches vaut 0 : en posant le trou sur la couche 1, le reflet continue de
// montrer le contenu Looks au lieu d'un rectangle noir a l'endroit de l'objet le plus
// lumineux de la piece. Le reflet ne montre pas la video — c'est impossible, ses pixels
// appartiennent a un autre domaine — mais il ne montre pas un trou pour autant.
export const COUCHE_TROU = 1

/**
 * Materiau du trou. `NoBlending` fait remplacer la couleur du pixel au lieu de la melanger :
 * le pixel devient (0,0,0,0), donc transparent, et laisse voir la couche placee derriere le
 * canvas. La profondeur est ecrite normalement, ce qui conserve une occultation correcte.
 */
/**
 * Dalle-trou : une copie de la geometrie de l'ecran, posee 1,5 mm devant lui, qui remplace la
 * couleur du pixel par du transparent. On ne touche PAS au materiau de l'ecran : il continue
 * de recevoir le reglage Lumiere et l'extinction du panneau Televisions, et il se retrouve
 * intact des qu'on arrete la diffusion.
 */
export function creerTrou(maillage) {
  const m = new THREE.Mesh(maillage.geometry, materiauTrou())
  m.name = 'trou_video'
  m.position.set(0, 0, DECALAGE)      // la dalle est un plan dans son plan XY local
  m.visible = false
  m.layers.set(COUCHE_TROU)
  m.frustumCulled = false
  maillage.add(m)
  return m
}

export function materiauTrou() {
  return new THREE.ShaderMaterial({
    vertexShader: `
      void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      void main() { gl_FragColor = vec4(0.0); }`,
    blending: THREE.NoBlending,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
  })
}

/**
 * Prepare la couche video dans `hote` (un div plein ecran, place AVANT le canvas).
 * Renvoie de quoi la poser sur un maillage, la dimensionner et la rendre.
 */
export function creerEcranVideo({ hote }) {
  if (!hote) return null

  const rendu = new CSS3DRenderer()
  rendu.domElement.style.position = 'absolute'
  rendu.domElement.style.top = '0'
  rendu.domElement.style.left = '0'
  rendu.domElement.style.pointerEvents = 'none'
  hote.appendChild(rendu.domElement)

  // Le cadre porte l'iframe. Il ne change JAMAIS de parent : deplacer une iframe dans le
  // document la recharge, ce qui couperait la lecture en cours. Elle nait donc ici et y reste,
  // qu'on diffuse sur la tele ou qu'on ecoute en audio seul.
  const cadre = document.createElement('div')
  cadre.className = 'ecran-video'
  cadre.style.width = `${LARGEUR_PX}px`
  cadre.style.height = `${HAUTEUR_PX}px`
  cadre.style.overflow = 'hidden'
  cadre.style.background = '#000'
  cadre.style.pointerEvents = 'none'

  // L'iframe de YouTube est focalisable : sans cela, une tabulation y entrerait et toutes les
  // touches W/A/S/D/E/Q partiraient chez youtube-nocookie.com, le visiteur perdant le clavier
  // sans rien voir. `inert` la retire de l'ordre de tabulation ET du pointeur, en une fois.
  cadre.setAttribute('inert', '')
  cadre.setAttribute('tabindex', '-1')

  const accueil = document.createElement('div')
  accueil.id = ID_HOTE
  accueil.setAttribute('data-test', 'hote-youtube')
  accueil.style.width = '100%'
  accueil.style.height = '100%'
  accueil.style.border = '0'
  cadre.appendChild(accueil)

  const scene = new THREE.Scene()
  const objet = new CSS3DObject(cadre)
  scene.add(objet)

  let pose = false
  let visible = false

  return {
    element: rendu.domElement,
    cadre,

    /**
     * Cale le cadre sur un maillage d'ecran : meme centre, meme orientation, et une echelle
     * telle que les 1280 px de large couvrent exactement la largeur reelle de la dalle.
     * Renvoie les mesures pour qu'un test puisse verifier le cadrage plutot que le croire.
     */
    poserSur(maillage) {
      if (!maillage) return null
      maillage.updateWorldMatrix(true, false)
      const g = maillage.geometry
      if (!g.boundingBox) g.computeBoundingBox()
      const taille = g.boundingBox.getSize(new THREE.Vector3())
      const echelleMonde = maillage.getWorldScale(new THREE.Vector3())
      const largeur = taille.x * echelleMonde.x
      const hauteur = taille.y * echelleMonde.y

      const centreLocal = g.boundingBox.getCenter(new THREE.Vector3())
      const centre = centreLocal.clone().applyMatrix4(maillage.matrixWorld)
      const origine = maillage.getWorldPosition(new THREE.Vector3())
      // meme decalage que la dalle-trou : les deux plans se superposent exactement
      const normale = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(maillage.getWorldQuaternion(new THREE.Quaternion()))
      objet.position.copy(centre).addScaledVector(normale, DECALAGE)
      objet.quaternion.copy(maillage.getWorldQuaternion(new THREE.Quaternion()))
      const k = largeur / LARGEUR_PX
      objet.scale.set(k, k, k)
      pose = true

      // L'ecart entre la dalle et le cadre une fois mis a l'echelle. Il vaut zero quand la
      // dalle est en 16:9, ce qui est le cas de la grande tele (2,80 / 1,575 = 1,7778).
      return {
        largeur: +largeur.toFixed(4),
        hauteur: +hauteur.toFixed(4),
        rapportDalle: +(largeur / hauteur).toFixed(4),
        rapportCadre: +(LARGEUR_PX / HAUTEUR_PX).toFixed(4),
        echelle: k,
        hauteurCadre: +(HAUTEUR_PX * k).toFixed(4),
        ecartHauteur: +Math.abs(HAUTEUR_PX * k - hauteur).toFixed(5),
        // ecart entre le centre mesure de la dalle et l'origine du noeud : s'il n'est pas nul,
        // poser l'origine aurait decale l'image dans le cadre
        ecartCentre: +centre.distanceTo(origine).toFixed(5),
        centre: [+centre.x.toFixed(4), +centre.y.toFixed(4), +centre.z.toFixed(4)],
      }
    },

    dimensionner(l, h) { rendu.setSize(l, h) },

    /**
     * Une image. On ne fait tourner la couche que lorsqu'elle sert : sinon l'iframe reste ou
     * elle etait, invisible de toute facon puisque le canvas opaque la recouvre.
     */
    rendre(camera) { if (pose && visible) rendu.render(scene, camera) },

    /**
     * Un premier rendu, quoi qu'il arrive. Sans lui l'iframe n'entre jamais dans le document :
     * `CSS3DRenderer` n'attache l'element d'un objet qu'au moment ou il le rend. Or le lecteur
     * YouTube va chercher son hote par son identifiant — absent du document, il echoue.
     */
    amorcer(camera) { if (pose) rendu.render(scene, camera) },

    /**
     * Allume ou eteint le rendu de la couche. On ne touche pas a sa visibilite CSS : un
     * navigateur peut suspendre le decodage d'une iframe cachee, or le mode « Audio
     * uniquement » a precisement besoin que la lecture continue. La couche est de toute
     * facon invisible tant qu'aucun trou n'est perce dans le canvas, qui la recouvre.
     */
    definirVisible(v) { visible = !!v },

    estVisible: () => visible,

    detruire() {
      try { rendu.domElement.remove() } catch { /* deja parti */ }
    },
  }
}
