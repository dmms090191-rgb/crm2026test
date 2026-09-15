import React from 'react'
import { TAILLE_MANCHE, OPACITE_MANCHE } from './preferences.js'

/**
 * Reglages > Joystick.
 *
 * Les deux curseurs viennent de l'ancienne entree « Interface et controles » : ils ne sont pas
 * reecrits, seulement deplaces. Ils pilotent le MEME etat et la MEME persistance qu'avant, et
 * agissent en direct sur les manches — pas besoin de fermer la modale pour voir le resultat.
 *
 * Le placement et la taille des autres elements d'interface, eux, ont leur propre entree :
 * Reglages > Interface. Joystick = les manches. Interface = ou se posent les commandes.
 *
 * La transparence descend tres bas a la demande du client. Elle ne touche QUE ce qui est peint :
 * la zone tactile garde sa surface entiere, sinon baisser le curseur rendrait la boutique
 * injouable — c'est exactement le genre de reglage qui ressemble a une panne.
 */
export default function Joystick({ manches, onManches, tactile }) {
  const pc = (v) => `${Math.round(v * 100)} %`

  return (
    <div className="interface-reglage" data-test="reglage-joystick-corps">
      <label className="lumiere-curseur">
        <span className="lumiere-curseur-tete">
          <span className="lumiere-curseur-nom">Taille des joysticks</span>
          <span className="lumiere-curseur-valeur" data-test="manches-taille-valeur">
            {pc(manches.taille)}
          </span>
        </span>
        <input type="range" data-test="manches-taille"
               min={TAILLE_MANCHE.min} max={TAILLE_MANCHE.max} step="0.01" value={manches.taille}
               aria-label="Taille des joysticks"
               onChange={(e) => onManches('taille', Number(e.target.value))} />
        <span className="lumiere-curseur-bornes" aria-hidden="true">
          <span>Petits</span><span>Grands</span>
        </span>
      </label>

      <label className="lumiere-curseur">
        <span className="lumiere-curseur-tete">
          <span className="lumiere-curseur-nom">Transparence des joysticks</span>
          <span className="lumiere-curseur-valeur" data-test="manches-opacite-valeur">
            {pc(manches.opacite)}
          </span>
        </span>
        <input type="range" data-test="manches-opacite"
               min={OPACITE_MANCHE.min} max={OPACITE_MANCHE.max} step="0.01" value={manches.opacite}
               aria-label="Visibilité des joysticks"
               onChange={(e) => onManches('opacite', Number(e.target.value))} />
        <span className="lumiere-curseur-bornes" aria-hidden="true">
          <span>Presque invisibles</span><span>Bien visibles</span>
        </span>
      </label>

      <p className="lumiere-note" data-test="manches-note">
        Même presque invisibles, les joysticks restent entièrement tactiles : seule leur
        apparence change, pas leur surface.
        {!tactile && ' Ils n’apparaissent que sur un écran tactile, en déplacement manuel.'}
      </p>

    </div>
  )
}
