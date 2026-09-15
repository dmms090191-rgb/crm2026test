import React from 'react'
import { BORNES } from './lumiere.js'

/**
 * Trois commandes qui vivaient dans la barre d'outils du coin bas droit et qui n'avaient rien a
 * faire dans la vue d'une boutique : le cadrage, l'exposition et le mode photo.
 *
 * Aucune n'est reimplementee ici. Le cadrage appelle le meme etat `mode` qu'avant, l'exposition
 * EST l'intensite de la section Lumiere — les touches + et - la nudgent toujours — et le mode
 * photo reste la meme bascule, atteignable aussi par la barre d'espace. Un seul reglage, une
 * seule verite, deux facons de l'atteindre.
 */

export function Cadrage({ mode, onMode }) {
  return (
    <div className="vue-reglage">
      <div className="musique-mode" role="radiogroup" aria-label="Cadrage des vues guidées">
        {[['adaptatif', 'Adaptatif'], ['exact', 'Focale Blender']].map(([k, libelle]) => (
          <button key={k} type="button" role="radio"
                  data-test={`cadrage-${k}`} data-actif={mode === k} aria-checked={mode === k}
                  onClick={() => onMode(k)}>
            {libelle}
          </button>
        ))}
      </div>
      <p className="lumiere-note" data-test="cadrage-note">
        Adaptatif cadre chaque vue sur son sujet, quel que soit le format de l’écran. Focale
        Blender reprend exactement l’objectif de la caméra d’origine, au risque de couper en
        portrait.
      </p>
    </div>
  )
}

export function Exposition({ valeur, onValeur }) {
  const b = BORNES.intensite
  return (
    <div className="vue-reglage">
      <label className="lumiere-curseur">
        <span className="lumiere-curseur-tete">
          <span className="lumiere-curseur-nom">Exposition</span>
          <span className="lumiere-curseur-valeur" data-test="exposition-valeur">
            {Math.round(valeur * 100)} %
          </span>
        </span>
        <input type="range" data-test="exposition-curseur"
               min={b.min} max={b.max} step={b.pas} value={valeur}
               aria-label="Exposition du rendu"
               onChange={(e) => onValeur(Number(e.target.value))} />
        <span className="lumiere-curseur-bornes" aria-hidden="true">
          <span>Sombre</span><span>Clair</span>
        </span>
      </label>
      <p className="lumiere-note" data-test="exposition-note">
        C’est le même réglage que l’Intensité de la section Lumière : le modifier ici le modifie
        là-bas. Les touches + et − l’ajustent aussi au clavier.
      </p>
    </div>
  )
}

export function ModePhoto({ actif, onBasculer }) {
  return (
    <div className="vue-reglage">
      <div className="tv-ligne" data-on={actif}>
        <span className="tv-nom">
          Mode photo
          <span className="tv-detail">Masque toute l’interface, le temps d’une image</span>
        </span>
        <button type="button" className="tv-bascule" data-test="photo-bascule"
                role="switch" aria-checked={actif}
                aria-label={`Mode photo : ${actif ? 'activé' : 'désactivé'}`}
                onClick={() => onBasculer(!actif)}>
          <span className="tv-pastille" aria-hidden="true" />
          <span className="tv-etat">{actif ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      <p className="lumiere-note" data-test="photo-note">
        La barre d’espace fait la même chose, et la ressort.
      </p>
    </div>
  )
}
