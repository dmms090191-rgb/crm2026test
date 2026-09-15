import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ELEMENTS_UI, TAILLE_UI } from './preferences.js'
import { boiteCadre, surTailleCadre } from './cadre.js'

const MARGE = 6          // px gardes entre un element et le bord, encoches comprises

const borne = (v, min, max) => (max < min ? (min + max) / 2 : Math.min(max, Math.max(min, v)))

/**
 * Style a poser sur un element dont le visiteur a choisi la place et la taille.
 *
 * Rend `undefined` tant qu'il n'y a rien de choisi : l'element garde alors la mise en page du
 * gabarit, qui suit l'ecran et l'orientation. C'est important — figer tout le monde en
 * coordonnees des le premier rendu casserait le responsive de ceux qu'on n'a jamais touches.
 */
export function styleUI(ui, cle) {
  const v = ui?.[cle]
  if (!v) return undefined
  return {
    position: 'fixed',
    left: `${v.x * 100}%`,
    top: `${v.y * 100}%`,
    right: 'auto', bottom: 'auto',
    // l'echelle part du CENTRE : agrandir un bouton ne le fait pas sauter ailleurs
    transform: `translate(-50%, -50%) scale(${v.taille ?? 1})`,
    transformOrigin: 'center center',
  }
}

/**
 * Editeur de disposition : on touche un element, on le deplace au doigt, on regle sa taille.
 *
 * Il ne reimplemente AUCUN des elements qu'il deplace. Il pose une poignee transparente
 * par-dessus chacun, mesuree sur sa vraie boite, et c'est elle qui recoit les gestes. Les
 * elements, eux, sont simplement rendus inertes pendant l'edition (classe `edition` sur
 * `.ui`) : leur logique n'est pas touchee, et elle revient telle quelle en sortant.
 *
 * Les changements vivent dans un BROUILLON. Valider l'ecrit dans les preferences, Annuler le
 * jette. Fermer sans valider ne doit jamais detruire une disposition qui marchait.
 */
export default function EditeurInterface({ brouillon, onDeplacer, selection, onSelection,
                                           onValider, onAnnuler, onReinitialiser,
                                           cadre = null }) {
  const [boites, setBoites] = useState({})
  const [confirme, setConfirme] = useState(false)
  const geste = useRef({ id: null, cle: null, ecart: null, bouge: false })

  // Mesure des vraies boites, apres peinture : c'est la seule facon d'attraper la place
  // effective d'un element qu'on n'a jamais deplace, dont la position vient du CSS.
  const mesurer = useCallback(() => {
    const c = boiteCadre(cadre)
    const out = {}
    for (const e of ELEMENTS_UI) {
      const el = document.querySelector(e.sel)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      // Boites RAMENEES DANS LE CADRE : les poignees sont posees en absolu dans .editeur, qui
      // couvre le cadre. Sans cette soustraction elles se decaleraient de l'origine du cadre.
      out[e.cle] = { x: r.left - c.x, y: r.top - c.y, l: r.width, h: r.height }
    }
    setBoites(out)
  }, [cadre])

  useEffect(() => {
    const t = requestAnimationFrame(mesurer)
    const arreter = surTailleCadre(cadre, mesurer)
    return () => { cancelAnimationFrame(t); arreter() }
  }, [mesurer, brouillon, selection, cadre])

  /** Place bornee : un element ne doit jamais pouvoir etre perdu hors de l'ecran. */
  const poser = useCallback((cle, cx, cy) => {
    const b = boites[cle]
    const l = b ? b.l : 44, h = b ? b.h : 44
    const c = boiteCadre(cadre)
    const x = borne(cx, MARGE + l / 2, c.l - MARGE - l / 2) / c.l
    const y = borne(cy, MARGE + h / 2, c.h - MARGE - h / 2) / c.h
    const t = brouillon?.[cle]?.taille ?? TAILLE_UI.defaut
    onDeplacer(cle, { x, y, taille: t })
  }, [boites, brouillon, onDeplacer, cadre])

  const surDescente = (cle) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    onSelection(cle)
    const b = boites[cle]
    // b est dans le repere du CADRE, e.clientX dans celui de la FENETRE : on ramene le pointeur
    // avant de calculer l'ecart, sinon l'element saute de l'origine du cadre au premier geste.
    const c = boiteCadre(cadre)
    geste.current = {
      id: e.pointerId, cle, bouge: false,
      ecart: b ? { x: b.x + b.l / 2 - (e.clientX - c.x), y: b.y + b.h / 2 - (e.clientY - c.y) }
               : { x: 0, y: 0 },
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const surMouvement = (e) => {
    const g = geste.current
    if (g.id !== e.pointerId || !g.cle) return
    g.bouge = true
    e.preventDefault()
    const c = boiteCadre(cadre)
    poser(g.cle, e.clientX - c.x + g.ecart.x, e.clientY - c.y + g.ecart.y)
  }
  const surRemontee = (e) => {
    const g = geste.current
    if (g.id !== e.pointerId) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    geste.current = { id: null, cle: null, ecart: null, bouge: false }
  }

  const taille = brouillon?.[selection]?.taille ?? TAILLE_UI.defaut
  const changerTaille = (v) => {
    const b = boites[selection]
    const c = boiteCadre(cadre)
    const cx = b ? b.x + b.l / 2 : c.l / 2
    const cy = b ? b.y + b.h / 2 : c.h / 2
    const actuel = brouillon?.[selection]
    // on garde le centre : grandir ne doit pas faire sauter l'element ailleurs
    onDeplacer(selection, {
      x: actuel?.x ?? cx / c.l,
      y: actuel?.y ?? cy / c.h,
      taille: v,
    })
  }

  const nom = ELEMENTS_UI.find((e) => e.cle === selection)?.libelle

  return (
    <div className="editeur" data-test="editeur-interface">
      {ELEMENTS_UI.map((e) => {
        const b = boites[e.cle]
        if (!b) return null
        return (
          <button key={e.cle} type="button" className="editeur-poignee"
                  data-test={`poignee-${e.cle}`} data-cle={e.cle}
                  data-choisi={selection === e.cle} aria-label={`Déplacer : ${e.libelle}`}
                  style={{ left: `${b.x}px`, top: `${b.y}px`, width: `${b.l}px`, height: `${b.h}px` }}
                  onPointerDown={surDescente(e.cle)} onPointerMove={surMouvement}
                  onPointerUp={surRemontee} onPointerCancel={surRemontee} />
        )
      })}

      <div className="editeur-barre" data-test="editeur-barre">
        <p className="editeur-cible" data-test="editeur-cible">
          {nom || 'Touchez un élément à déplacer'}
        </p>

        <label className="editeur-taille">
          <span className="editeur-taille-tete">
            <span>Taille</span>
            <span data-test="editeur-taille-valeur">{Math.round(taille * 100)} %</span>
          </span>
          <input type="range" data-test="editeur-taille"
                 min={TAILLE_UI.min} max={TAILLE_UI.max} step={TAILLE_UI.pas}
                 value={taille} disabled={!selection}
                 aria-label="Taille de l'élément sélectionné"
                 onChange={(ev) => changerTaille(Number(ev.target.value))} />
        </label>

        {confirme ? (
          <p className="editeur-confirme" data-test="editeur-confirme">
            Réinitialiser la disposition&nbsp;?
            <button type="button" className="editeur-lien" data-test="editeur-reinit-annuler"
                    onClick={() => setConfirme(false)}>Annuler</button>
            <button type="button" className="editeur-lien editeur-danger"
                    data-test="editeur-reinit-oui"
                    onClick={() => { setConfirme(false); onReinitialiser() }}>Réinitialiser</button>
          </p>
        ) : (
          <div className="editeur-actions">
            <button type="button" className="editeur-lien" data-test="editeur-annuler"
                    onClick={onAnnuler}>Annuler</button>
            <button type="button" className="editeur-lien" data-test="editeur-reinit"
                    onClick={() => setConfirme(true)}>Réinitialiser</button>
            <button type="button" className="editeur-valider" data-test="editeur-valider"
                    onClick={onValider}>Valider</button>
          </div>
        )}
      </div>
    </div>
  )
}
