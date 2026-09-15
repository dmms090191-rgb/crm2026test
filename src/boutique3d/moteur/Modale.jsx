import React, { useCallback, useEffect, useRef } from 'react'

/**
 * Modale d'un reglage, posee AU-DESSUS de la boutique et non dans le panneau.
 *
 * Pourquoi pas un depliage dans le panneau, comme avant : le panneau grandissait avec son
 * contenu. Sur telephone, ouvrir Musique ou Lumiere le faisait courir du haut au bas de
 * l'ecran, pousser les autres commandes et deborder. Une modale a une taille a elle, bornee
 * par la fenetre, et le panneau derriere ne bouge plus d'un pixel.
 *
 * Ce composant ne sait RIEN des reglages : il ne fait qu'un cadre, un titre court et une
 * fermeture. Chaque reglage garde son composant, son etat et sa persistance, inchanges.
 */
export default function Modale({ titre, onFermer, children }) {
  const fermeture = useRef(null)
  const cadre = useRef(null)

  // Le focus entre dans la modale : sans cela il reste sur la ligne du panneau, derriere
  // l'overlay, et la tabulation promene le visiteur dans une interface qu'il ne voit pas.
  useEffect(() => { fermeture.current?.focus() }, [])

  // Echap ferme. App l'ecoute deja globalement ; on le reprend ici pour que la modale reste
  // autonome, et on arrete la propagation pour ne pas AUSSI quitter le mode manuel derriere.
  const surTouche = useCallback((e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onFermer?.() }
    if (e.key !== 'Tab' || !cadre.current) return
    // piege a focus : la tabulation tourne en rond dans la modale
    const cibles = cadre.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')
    if (!cibles.length) return
    const premier = cibles[0], dernier = cibles[cibles.length - 1]
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus() }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus() }
  }, [onFermer])

  return (
    <div className="modale-fond" data-test="modale-fond"
         onPointerDown={(e) => { if (e.target === e.currentTarget) onFermer?.() }}>
      <div className="modale" role="dialog" aria-modal="true" aria-label={titre}
           data-test="modale" ref={cadre} onKeyDown={surTouche}>
        <div className="modale-tete">
          {/* Titre volontairement court et discret : sur un telephone, un en-tete epais mange
              la moitie de la place utile du reglage qu'on vient d'ouvrir. */}
          <h2 className="modale-titre" data-test="modale-titre">{titre}</h2>
          <button type="button" className="modale-fermer" data-test="modale-fermer"
                  ref={fermeture} aria-label="Fermer" onClick={() => onFermer?.()}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {/* seul le CORPS defile : le titre et la croix restent atteignables */}
        <div className="modale-corps" data-test="modale-corps">{children}</div>
      </div>
    </div>
  )
}
