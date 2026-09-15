import React, { useCallback, useEffect, useRef } from 'react'
import { POSITION_DEFAUT } from './preferences.js'
import { boiteCadre, surTailleCadre } from './cadre.js'

// Seuil, en pixels, au-dela duquel un appui devient un glissement. En dessous on agit ;
// au-dela on deplace la barre et on N'AGIT PAS. Sans ce seuil, tout deplacement finirait par
// declencher une action au relachement, et la barre serait inutilisable au doigt.
const SEUIL_GLISSEMENT = 6
// Marge gardee entre la barre et le bord de l'ecran, encoches comprises.
const MARGE = 8

const borne = (v, min, max) => (max < min ? (min + max) / 2 : Math.min(max, Math.max(min, v)))

// Les deux sections, dans l'ordre du selecteur. Deux seulement : une fleche suffirait, mais
// deux fleches disent tout de suite qu'on peut aller dans les deux sens.
export const SECTIONS = [
  { cle: 'magasin', libelle: 'Magasin' },
  { cle: 'reglages', libelle: 'Réglages' },
]
const libelleDe = (cle) => SECTIONS.find((s) => s.cle === cle)?.libelle ?? SECTIONS[0].libelle
const voisine = (cle, pas) => {
  const i = Math.max(0, SECTIONS.findIndex((s) => s.cle === cle))
  return SECTIONS[(i + pas + SECTIONS.length) % SECTIONS.length].cle
}

/**
 * Barre de section, deplacable au doigt. UNE seule forme, la meme partout.
 *
 * « ‹ Magasin › » : les fleches changent de section et le panneau remplace ENTIEREMENT son
 * contenu — jamais les deux listes ensemble ; le nom, au milieu, ouvre et ferme le panneau.
 *
 * Il y avait avant deux formes selon le gabarit : un bouton Menu sur large ecran, ce selecteur
 * sur telephone, et le panneau portait en plus deux onglets. Cela faisait DEUX commandes pour
 * une meme chose, donc deux etats a tenir d'accord et deux chemins a tester. Le selecteur les
 * remplace toutes : meme geste, meme resultat, quel que soit l'ecran.
 *
 * Le deplacement ne passe par AUCUN rendu React : la position suit le doigt par style direct,
 * et n'est ecrite dans les preferences qu'au relachement.
 *
 * UNE SEULE VOIE D'ACTIVATION, TRIEE PAR `detail`.
 *
 * C'est le coeur de ce fichier, et il a coute deux defauts en production. La barre capture le
 * pointeur des l'appui — il le faut, sinon un doigt qui sort de la barre cesse d'etre suivi et
 * le glissement s'arrete au premier pixel hors du cadre. Mais la capture retargette le `click`
 * qui suit : vers le conteneur avec une souris, pas toujours avec un doigt. Selon le cas,
 * l'action partait zero fois ou DEUX fois — et deux fois, avec deux sections, revient au point
 * de depart. D'ou « impossible de passer sur Reglages » sur un vrai telephone alors que tout
 * repondait a la souris dans les tests.
 *
 * La regle : tout clic venant d'un pointeur (`detail >= 1`) est traite ICI, au conteneur, a
 * partir du bouton retenu a l'appui, et sa propagation est arretee pour que les gestionnaires
 * des boutons ne le voient jamais. Un clic de CLAVIER (`detail === 0`, Entree ou Espace) n'est
 * pas touche et suit la voie normale de React.
 */
export default function BarreSection({ position, onDeplacer, ouvert, onBasculer,
                                       onglet, onOnglet, taille = 1, basReserve = 0,
                                       cadre = null }) {
  const boite = useRef(null)
  const etat = useRef({ id: null, depart: null, ecart: null, bouge: false, cible: null })
  // vrai entre la fin d'un GLISSEMENT et le clic que le navigateur envoie derriere : poser la
  // barre ne doit pas declencher l'action du bouton qui se trouvait sous le doigt
  const glissa = useRef(false)
  // bouton retenu a l'appui, en attente du clic qui suit
  const attente = useRef(null)
  const reserve = useRef(basReserve)
  reserve.current = basReserve
  const echelle = useRef(taille)
  echelle.current = taille
  // Le cadre dans une ref : l'effet pointeur est branche UNE fois et ne doit pas se rebrancher
  // quand le noeud arrive. Sans cadre, boiteCadre() rend la fenetre — le calcul d'avant.
  const cadreRef = useRef(cadre)
  cadreRef.current = cadre

  // Actions par bouton, relues dans une ref : l'effet pointeur est branche UNE fois, il ne
  // doit pas dependre de `onglet` sous peine de rebrancher a chaque changement de section.
  const actions = useRef({})
  actions.current = {
    'onglet-actif': () => onBasculer?.(),
    'onglet-precedent': () => onOnglet?.(voisine(onglet, -1)),
    'onglet-suivant': () => onOnglet?.(voisine(onglet, 1)),
  }

  /** Pose la barre a une fraction d'ecran, toujours entierement visible. */
  const poser = useCallback((p) => {
    const el = boite.current
    if (!el) return
    const f = p || POSITION_DEFAUT
    const l = el.offsetWidth, h = el.offsetHeight
    // La position est posee en pixels dans le repere du parent, qui EST le cadre : la fraction
    // se mesure donc sur le cadre, jamais sur la fenetre.
    const c = boiteCadre(cadreRef.current)
    const x = borne(f.x * c.l, MARGE + l / 2, c.l - MARGE - l / 2)
    const y = borne(f.y * c.h, MARGE + h / 2, c.h - MARGE - reserve.current - h / 2)
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    // l'echelle part du centre : agrandir la barre ne la fait pas sauter ailleurs
    el.style.transform = `translate(-50%, -50%) scale(${echelle.current})`
  }, [])

  // Replacement : au changement de preference, de bande reservee, et surtout a chaque
  // changement de taille de fenetre. `visualViewport` couvre en plus la barre d'adresse des
  // navigateurs mobiles, qui change la hauteur utile sans emettre `resize` partout.
  useEffect(() => {
    poser(position)
    // Une barre laterale qui se replie ne declenche aucun `resize` de fenetre : c'est
    // l'observateur pose sur le cadre qui la voit. Voir cadre.js.
    return surTailleCadre(cadre, () => poser(position))
  }, [position, basReserve, taille, poser, onglet, cadre])

  useEffect(() => {
    const el = boite.current
    if (!el) return undefined

    const surDescente = (e) => {
      if (etat.current.id !== null) return
      const r = el.getBoundingClientRect()
      etat.current = {
        id: e.pointerId,
        // le bouton reellement touche, lu AVANT la capture qui va tout retargetter
        cible: e.target instanceof Element ? e.target.closest('button')?.dataset?.test : null,
        depart: { x: e.clientX, y: e.clientY },
        // point d'accroche : on garde l'ecart entre le doigt et le centre, sinon la barre
        // saute pour se centrer sous le doigt des le sixieme pixel
        ecart: { x: r.left + r.width / 2 - e.clientX, y: r.top + r.height / 2 - e.clientY },
        bouge: false,
      }
      el.setPointerCapture?.(e.pointerId)
    }

    const surMouvement = (e) => {
      const s = etat.current
      if (s.id !== e.pointerId) return
      const dx = e.clientX - s.depart.x, dy = e.clientY - s.depart.y
      if (!s.bouge && Math.hypot(dx, dy) < SEUIL_GLISSEMENT) return
      s.bouge = true
      e.preventDefault()
      const l = el.offsetWidth, h = el.offsetHeight
      const c = boiteCadre(cadreRef.current)
      // clientX/Y sont en coordonnees de FENETRE : on les ramene dans le cadre avant de borner.
      const cx = e.clientX - c.x + s.ecart.x, cy = e.clientY - c.y + s.ecart.y
      el.style.left = `${borne(cx, MARGE + l / 2, c.l - MARGE - l / 2)}px`
      el.style.top = `${borne(cy, MARGE + h / 2, c.h - MARGE - reserve.current - h / 2)}px`
    }

    /** Fin du geste. `annule` = le systeme a repris le pointeur (appel entrant, geste du
     *  navigateur) : on ne doit surtout pas le prendre pour un appui volontaire. */
    const terminer = (e, annule) => {
      const s = etat.current
      if (s.id !== e.pointerId) return
      el.releasePointerCapture?.(e.pointerId)
      etat.current = { id: null, depart: null, ecart: null, bouge: false, cible: null }
      if (!s.bouge) {
        // appui simple : on arme l'action, c'est le clic qui suit qui la declenche
        attente.current = annule ? null : s.cible
        if (annule) glissa.current = true
        return
      }
      glissa.current = true
      const r = el.getBoundingClientRect()
      const c = boiteCadre(cadreRef.current)
      onDeplacer?.({
        x: (r.left + r.width / 2 - c.x) / c.l,
        y: (r.top + r.height / 2 - c.y) / c.h,
      })
    }
    const surRemontee = (e) => terminer(e, false)
    const surAnnulation = (e) => terminer(e, true)

    /** Phase de CAPTURE : on voit le clic avant tout le monde, React compris. */
    const surClicConteneur = (e) => {
      if (e.detail === 0) return            // clavier : on laisse la voie normale de React
      e.stopPropagation()                   // pointeur : une seule voie, celle-ci
      const cible = attente.current
      attente.current = null
      if (glissa.current) { glissa.current = false; return }
      actions.current[cible]?.()
    }

    el.addEventListener('click', surClicConteneur, true)
    el.addEventListener('pointerdown', surDescente)
    el.addEventListener('pointermove', surMouvement, { passive: false })
    el.addEventListener('pointerup', surRemontee)
    el.addEventListener('pointercancel', surAnnulation)
    return () => {
      el.removeEventListener('click', surClicConteneur, true)
      el.removeEventListener('pointerdown', surDescente)
      el.removeEventListener('pointermove', surMouvement)
      el.removeEventListener('pointerup', surRemontee)
      el.removeEventListener('pointercancel', surAnnulation)
    }
  }, [onDeplacer])

  // Espace ou Entree, sur un bouton qui a le focus, valent activation. Sans cette barriere ils
  // remonteraient aussi jusqu'au raccourci global et feraient basculer le mode photo.
  const surTouche = useCallback((e) => {
    if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') e.stopPropagation()
  }, [])

  return (
    <div ref={boite} className="barre-section" data-test="barre-section" onKeyDown={surTouche}
         onKeyUp={surTouche}>
      {/* un seul choix visible, deux fleches. Le panneau remplace entierement son contenu —
          jamais les deux listes en meme temps. */}
      <div className="section-compacte" role="group" aria-label="Section affichée">
        <button type="button" className="section-fleche" data-test="onglet-precedent"
                aria-label="Section précédente"
                onClick={() => onOnglet?.(voisine(onglet, -1))}>
          <span aria-hidden="true">‹</span>
        </button>
        {/* aria-live : le nom EST le seul indicateur de section depuis que les onglets ont
            disparu. Sans annonce, une fleche ne dit plus rien a qui n'a pas l'ecran.
            aria-controls n'est pose que si la cible existe : le panneau replie n'est pas
            dans le document, et un aria-controls pendant desoriente au lieu d'aider. */}
        <button type="button" className="section-nom" data-test="onglet-actif"
                data-onglet={onglet} aria-expanded={ouvert} aria-live="polite"
                aria-controls={ouvert ? 'panneau-boutique' : undefined}
                onClick={() => onBasculer?.()}>
          {libelleDe(onglet)}
        </button>
        <button type="button" className="section-fleche" data-test="onglet-suivant"
                aria-label="Section suivante"
                onClick={() => onOnglet?.(voisine(onglet, 1))}>
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  )
}
