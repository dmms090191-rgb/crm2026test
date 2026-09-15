// Dalle d'un televiseur ETEINT.
//
// Ce que le client refuse : un rectangle noir mat. Ce qu'il veut : l'aspect d'un OLED haut de
// gamme eteint — un verre noir profond qui renvoie discretement la piece, avec le cadre du
// televiseur toujours lisible autour.
//
// Comment on l'obtient sans lancer de rayons. Une dalle eteinte n'emet rien : tout ce qu'on en
// voit est un REFLET speculaire. Il suffit donc d'un materiau dielectrique tres sombre et tres
// lisse, avec une couche de vernis par-dessus pour le verre, et d'une carte d'environnement
// pour lui donner quelque chose a refleter.
//
// Le piege, mesure dans ce projet : `scene.environmentIntensity` vaut 0,05 en Ultra, 0,03 en
// Equilibre et ZERO en Faible (qualite.js). Un materiau qui se contenterait de l'environnement
// de la scene serait donc presque noir au mieux, et parfaitement noir en Faible — exactement ce
// qu'on cherche a eviter. La dalle eteinte porte pour cette raison SA PROPRE carte
// d'environnement : `material.envMap` court-circuite l'intensite globale, et le rendu est alors
// le meme aux quatre niveaux de qualite. La carte est fabriquee une seule fois, a la premiere
// extinction, et jamais si aucune tele n'est eteinte.

import * as THREE from 'three'

// Le nom ne commence PAS par « mat_ecran_ » : ce prefixe designe les dalles ALLUMEES, et deux
// mecanismes s'en servent pour les reconnaitre — la famille Ecrans de la Lumiere et la
// correspondance avec une ligne du panneau Televisions. Un materiau d'extinction qui porterait
// ce prefixe finirait par se faire piloter comme une dalle allumee.
export const NOM_MATERIAU = 'mat_dalle_eteinte'

// Valeurs du materiau. Chacune repond a une question physique, pas a un gout.
//
//   couleur 0x05050a  un verre noir n'est jamais un zero absolu : a zero la dalle devient un
//                     trou dans le mur, et le cadre disparait avec elle. Le leger bleu vient du
//                     polariseur, qui est ce qu'on voit reellement sur une dalle eteinte.
//   metallique 0      une dalle est un dielectrique. A metallique > 0, la reflexion se teinte
//                     de la couleur de base, presque noire : on obtient un miroir de metal
//                     noir, plus sombre encore et sans montee de Fresnel au rasant.
//   rugosite 0,10     et surtout PAS proche de zero. Un quasi-miroir rendrait le reflet
//                     LISIBLE — or une carte d'environnement est a l'infini, alors que la dalle
//                     du fond est a trois metres : la parallaxe serait fausse et sauterait aux
//                     yeux. A 0,10 le reflet devient un degrade doux, credible, et l'on lit
//                     « verre noir brillant » sans chercher ce qui s'y reflete.
//   env               l'intensite du reflet, arretee par mesure de luminance sur capture.
//   tramage           une grande surface tres sombre et lentement variable est exactement le
//                     cas ou une sortie sur huit bits fabrique des anneaux. Cout nul.
//
// Le materiau est un MeshStandardMaterial et non un MeshPhysicalMaterial avec vernis : la face
// avant d'un televiseur est UNE seule interface air/verre. Le chemin dielectrique de Standard
// donne deja exactement la courbe de Fresnel du verre — 4 % de face, 100 % au rasant. Ajouter
// un vernis poserait un SECOND reflet par-dessus le premier, c'est-a-dire un double vitrage, et
// changerait de programme de shader, donc une recompilation a la premiere extinction.
export const REGLAGES_DALLE = {
  couleur: 0x05050a,
  metallique: 0,
  rugosite: 0.10,
  env: 1.2,
}

// Resolution de la sonde de reflet. 128 par face suffit largement : le reflet d'une dalle
// eteinte est une image sombre et floue, pas un miroir. Plus haut serait du travail perdu.
export const TAILLE_SONDE = 128
// D'ou l'on regarde la piece pour fabriquer le reflet : au centre de la boutique, a hauteur
// d'ecran. Un reflet par ecran serait plus juste mais couterait six rendus par ecran, pour un
// gain invisible sur une surface aussi sombre.
export const POINT_SONDE = [0, 2.05, -7]

let carte = null        // PMREM partagee, fabriquee au plus une fois par session

/**
 * Carte d'environnement de la dalle eteinte : une sonde de reflet prise DANS la boutique.
 *
 * Un studio generique donnerait un degrade gris uniforme, qui se lit comme du plastique. Ce
 * qu'une vraie dalle renvoie, c'est la piece : le lambris chaud, les rainures de LED, le
 * comptoir. On prend donc six images de la scene depuis un point du magasin, une seule fois,
 * a la premiere extinction. Si aucune tele n'est jamais eteinte, cela ne coute rien.
 */
export function carteEnvironnement(renderer, scene) {
  if (carte) return carte
  if (!renderer || !scene) return null
  const cible = new THREE.WebGLCubeRenderTarget(TAILLE_SONDE, { type: THREE.HalfFloatType })
  const cam = new THREE.CubeCamera(0.1, 60, cible)
  cam.position.set(...POINT_SONDE)
  // la couche du trou video n'entre pas dans le reflet : c'est un artifice de rendu, pas un objet
  cam.children.forEach((c) => { c.layers.set(0) })
  cam.update(renderer, scene)

  const pmrem = new THREE.PMREMGenerator(renderer)
  carte = pmrem.fromCubemap(cible.texture).texture
  pmrem.dispose()
  cible.dispose()
  return carte
}

export function libererCarte() {
  carte?.dispose()
  carte = null
}

/**
 * Le materiau de dalle eteinte. Un seul exemplaire pour toutes les teles : elles portent le
 * meme verre, et partager le materiau evite autant de programmes de shader.
 */
export function creerMateriauEteint(renderer, scene) {
  const r = REGLAGES_DALLE
  const m = new THREE.MeshStandardMaterial({
    color: r.couleur,
    metalness: r.metallique,
    roughness: r.rugosite,
    envMapIntensity: r.env,
    dithering: true,
    emissive: 0x000000,
    // explicite : c'est ce 0 que lisent les mesures et les tests. La couleur emissive noire
    // suffirait au rendu, mais pas a rendre l'extinction verifiable par un chiffre.
    emissiveIntensity: 0,
  })
  m.name = NOM_MATERIAU
  const env = carteEnvironnement(renderer, scene)
  if (env) m.envMap = env
  return m
}

export const estEteinte = (materiau) => materiau?.name === NOM_MATERIAU
