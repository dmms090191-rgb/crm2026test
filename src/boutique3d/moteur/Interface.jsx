import React from 'react'
import { ELEMENTS_UI } from './preferences.js'

/**
 * Reglages > Interface : la porte d'entree de l'editeur de disposition.
 *
 * La modale ne contient pas l'editeur — elle couvre l'ecran, et on ne peut pas placer un
 * bouton qu'on ne voit pas. Elle explique, puis rend la main : « Personnaliser » ferme la
 * modale et arme le mode edition par-dessus la boutique.
 *
 * Ce que cet ecran NE fait pas : regler les manches. Ils ont leur propre entree, Joystick.
 */
export default function Interface({ ui, onPersonnaliser, personnalises }) {
  const n = personnalises ?? Object.keys(ui || {}).length

  return (
    <div className="interface-reglage" data-test="reglage-interface-corps">
      <p className="lumiere-note" data-test="interface-note">
        Placez les commandes où votre main les attend. Touchez un élément, faites-le glisser,
        réglez sa taille, puis validez. Les autres réglages ne bougent pas.
      </p>

      <ul className="interface-liste" data-test="interface-liste">
        {ELEMENTS_UI.map((e) => (
          <li key={e.cle} data-test={`interface-element-${e.cle}`}
              data-perso={!!ui?.[e.cle]}>
            <span className="interface-element-nom">{e.libelle}</span>
            <span className="interface-element-etat">
              {ui?.[e.cle]
                ? `${Math.round((ui[e.cle].taille ?? 1) * 100)} %`
                : 'place d’origine'}
            </span>
          </li>
        ))}
      </ul>

      <button type="button" className="interface-personnaliser"
              data-test="interface-personnaliser" onClick={onPersonnaliser}>
        Personnaliser l’interface
      </button>

      <p className="lumiere-note" data-test="interface-aide">
        {n > 0
          ? `${n} élément${n > 1 ? 's' : ''} déplacé${n > 1 ? 's' : ''}. Réinitialiser les remet à leur place d’origine.`
          : 'Rien n’a été déplacé pour l’instant : tout est à la place du gabarit.'}
      </p>
    </div>
  )
}
