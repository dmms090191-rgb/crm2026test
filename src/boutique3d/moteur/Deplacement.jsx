import React from 'react'
import { VITESSE_MIN, VITESSE_MAX, REPERES, barreVitesse, fractionVitesse } from './manuel.js'

/**
 * Reglages > Deplacement.
 *
 * La vitesse est un nombre, pas trois crans : sur ordinateur elle se regle a la molette
 * pendant qu'on marche, ce qui n'aurait aucun sens avec trois valeurs. Ce panneau donne le
 * meme reglage sous une forme utilisable au doigt, et c'est le SEUL endroit ou il vit sur
 * telephone — la vue 3D n'a plus a porter de boutons Lent / Normal / Rapide.
 *
 * Les trois reperes restent proposes comme raccourcis : ils nomment des points de la plage,
 * ils ne la remplacent pas.
 */
export default function Deplacement({ vitesse, onVitesse }) {
  return (
    <div className="deplacement-reglage">
      <label className="lumiere-curseur">
        <span className="lumiere-curseur-tete">
          <span className="lumiere-curseur-nom">Vitesse de marche</span>
          <span className="lumiere-curseur-valeur" data-test="deplacement-valeur">
            {vitesse.toFixed(1)} m/s
          </span>
        </span>
        <input type="range" data-test="deplacement-vitesse"
               min={VITESSE_MIN} max={VITESSE_MAX} step="0.05" value={vitesse}
               aria-label="Vitesse de marche"
               onChange={(e) => onVitesse(Number(e.target.value))} />
        <span className="lumiere-curseur-bornes" aria-hidden="true">
          <span>Lent</span><span>Rapide</span>
        </span>
      </label>

      <div className="deplacement-reperes" role="group" aria-label="Vitesses repères">
        {REPERES.map((r) => (
          <button key={r.cle} type="button" data-test={`deplacement-repere-${r.cle}`}
                  data-actif={Math.abs(vitesse - r.ms) < 0.03}
                  onClick={() => onVitesse(r.ms)}>
            {r.libelle}
          </button>
        ))}
      </div>

      <p className="deplacement-barre" data-test="deplacement-barre" aria-hidden="true">
        {barreVitesse(vitesse)} <span>{Math.round(fractionVitesse(vitesse) * 100)} %</span>
      </p>

      <p className="lumiere-note" data-test="deplacement-note">
        Sur ordinateur, la molette de la souris règle la vitesse pendant le déplacement manuel,
        et une barre apparaît le temps du réglage. Le réglage est gardé pour la boutique.
      </p>
    </div>
  )
}
