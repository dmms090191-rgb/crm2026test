import React, { useEffect, useRef } from 'react'
import { boiteCadre, surTailleCadre } from './cadre.js'
import { ZONE_MORTE } from './manuel.js'

// Deux manches virtuels, fixes en bas de l'ecran, confortables au pouce et multitouch :
// gauche = avancer / reculer / pas de cote, droit = tourner et regarder en haut / en bas.
//
// Aucun re-rendu React pendant le mouvement : les evenements pointeur sont branches une seule
// fois, la pastille bouge par style direct et les valeurs partent dans les rappels du parent
// (qui les ecrit dans une ref). Chaque disque suit SON pointerId : un pouce peut avancer
// pendant que l'autre tourne.

const COURSE = 0.6          // part du rayon parcourue par la pastille (elle reste dans le disque)

/**
 * `taille` et `opacite` passent par des VARIABLES CSS posees sur le conteneur, et non par des
 * proprietes React sur chaque disque : les evenements pointeur ne sont ainsi jamais rebranches
 * quand on bouge un curseur.
 *
 * L'opacite ne touche QUE ce qui est peint — le disque et la pastille — jamais le conteneur :
 * une opacite nulle sur le conteneur laisserait l'element tactile, mais `opacity` cree un
 * contexte d'empilement et le rendrait invisible ET inutilisable a l'usage. En la posant sur
 * les seuls fonds, la surface tactile garde toute sa taille meme a 5 %.
 *
 * `onEncombrement` remonte la hauteur reellement occupee par la bande des manches, du haut du
 * disque au bas de la fenetre. Elle est MESUREE et non recalculee : la taille vient d'un
 * `min()` CSS que le code n'a pas a refaire, et une deuxieme formule finirait par mentir.
 * Le bouton Reglages et le retour a l'entree s'en servent pour ne jamais se poser sur un pouce.
 */
export default function Joysticks({ onGauche, onDroit, taille = 1, opacite = 1,
                                    onEncombrement, cadre = null }) {
  // les rappels peuvent changer d'identite a chaque rendu du parent : on les lit dans une ref
  // pour ne jamais rebrancher les evenements
  const rappels = useRef({ onGauche, onDroit, onEncombrement })
  rappels.current = { onGauche, onDroit, onEncombrement }
  // meme raison que les rappels : l'effet de mesure ne doit pas se rebrancher quand le noeud
  // du cadre arrive. Sans cadre, boiteCadre() rend la fenetre — le calcul d'avant.
  const cadreRef = useRef(cadre)
  cadreRef.current = cadre
  const refGauche = useRef(null)
  const refDroit = useRef(null)
  const etats = useRef([])

  useEffect(() => {
    const debranchements = []
    etats.current = []

    const brancher = (element, nom) => {
      if (!element) return
      const pastille = element.querySelector('.joystick-pastille')
      const etat = { id: null, cx: 0, cy: 0, rayon: 1, perime: false }
      etats.current.push(etat)

      const emettre = (x, y) => { rappels.current[nom]?.({ x, y }) }
      const poser = (x, y) => { pastille.style.transform = `translate(${x}px, ${y}px)` }
      const mesurer = () => {
        const r = element.getBoundingClientRect()
        etat.cx = r.left + r.width / 2
        etat.cy = r.top + r.height / 2
        etat.rayon = Math.max(1, r.width / 2)
        etat.perime = false
      }

      const suivre = (e) => {
        // le disque a pu changer de taille sous le doigt (curseur de Reglages) : sans cette
        // remesure, le centre et le rayon restent ceux d'avant et le personnage part tout seul
        if (etat.perime) mesurer()
        let x = (e.clientX - etat.cx) / etat.rayon
        let y = (e.clientY - etat.cy) / etat.rayon
        const n = Math.hypot(x, y)
        if (n > 1) { x /= n; y /= n }
        if (n < ZONE_MORTE) { x = 0; y = 0 }
        poser(x * etat.rayon * COURSE, y * etat.rayon * COURSE)
        emettre(x, y)
      }

      const bas = (e) => {
        if (etat.id !== null) return                 // ce disque est deja tenu par un doigt
        mesurer()
        etat.id = e.pointerId
        // le doigt garde le manche meme si le pouce sort du disque
        try { element.setPointerCapture(e.pointerId) } catch { /* pointeur deja parti */ }
        element.setAttribute('data-tenu', 'true')
        e.preventDefault()
        suivre(e)
      }
      const bouge = (e) => { if (e.pointerId === etat.id) { e.preventDefault(); suivre(e) } }
      const relache = (e) => {
        if (e.pointerId !== etat.id) return
        etat.id = null
        element.removeAttribute('data-tenu')
        try { element.releasePointerCapture(e.pointerId) } catch { /* deja relache */ }
        poser(0, 0)
        emettre(0, 0)
      }

      element.addEventListener('pointerdown', bas, { passive: false })
      element.addEventListener('pointermove', bouge, { passive: false })
      element.addEventListener('pointerup', relache)
      element.addEventListener('pointercancel', relache)
      element.addEventListener('lostpointercapture', relache)
      debranchements.push(() => {
        element.removeEventListener('pointerdown', bas)
        element.removeEventListener('pointermove', bouge)
        element.removeEventListener('pointerup', relache)
        element.removeEventListener('pointercancel', relache)
        element.removeEventListener('lostpointercapture', relache)
        emettre(0, 0)                                // demontage : le deplacement s'arrete net
      })
    }

    brancher(refGauche.current, 'onGauche')
    brancher(refDroit.current, 'onDroit')
    return () => {
      for (const f of debranchements) f()
      etats.current = []
      rappels.current.onEncombrement?.(0)            // plus de manches : plus de bande reservee
    }
  }, [])

  // Bande occupee par les manches, remesuree quand la taille change et a chaque
  // redimensionnement — c'est la rotation du telephone qui la fait le plus varier.
  useEffect(() => {
    let image = 0
    const publier = () => {
      const el = refGauche.current
      if (!el) return
      const r = el.getBoundingClientRect()
      // Hauteur occupee depuis le BAS DU CADRE, et non depuis le bas de la fenetre : dans une
      // colonne, les deux different de tout ce qui vit sous la boutique.
      const c = boiteCadre(cadreRef.current)
      rappels.current.onEncombrement?.(Math.max(0, Math.round(c.y + c.h - r.top)))
    }
    // apres la peinture : la nouvelle taille CSS n'est pas encore appliquee au moment du rendu
    image = requestAnimationFrame(publier)
    const arreter = surTailleCadre(cadre, publier)
    return () => { cancelAnimationFrame(image); arreter() }
  }, [taille, cadre])

  // un doigt deja pose garde l'ancien rayon : on le marque perime plutot que de remesurer ici,
  // la taille CSS n'etant pas encore appliquee pendant le rendu
  useEffect(() => { for (const e of etats.current) if (e.id !== null) e.perime = true }, [taille])

  return (
    <div className="joysticks"
         style={{ '--manche-taille': taille, '--manche-opacite': opacite }}>
      <div ref={refGauche} className="joystick joystick-gauche" data-test="joystick-gauche"
           role="application" aria-label="Manche de déplacement">
        <div className="joystick-pastille" />
      </div>
      <div ref={refDroit} className="joystick joystick-droit" data-test="joystick-droit"
           role="application" aria-label="Manche du regard">
        <div className="joystick-pastille" />
      </div>
    </div>
  )
}
