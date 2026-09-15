import React, { useState } from 'react'
import { AMBIANCES, BORNES, FAMILLES, CLES_FAMILLES } from './lumiere.js'

// Curseurs du reglage fin, dans l'ordre d'importance : d'abord ce qui touche toute la piece,
// ensuite chaque famille de sources visibles.
const CURSEURS = [
  { cle: 'intensite', libelle: 'Intensité', gauche: 'Sombre', droite: 'Clair' },
  { cle: 'chaleur',   libelle: 'Chaleur',   gauche: 'Froid',  droite: 'Chaud' },
  // pas de bornes pour les familles : « 0 % » et « 150 % » disent deja le sens, et trois
  // lignes « Éteint / Fort » de plus ne feraient qu'allonger le panneau
  ...CLES_FAMILLES.map((c) => ({ cle: c, libelle: FAMILLES[c].libelle })),
]

const pourcent = (v) => `${Math.round(v * 100)} %`
const degres = (v) => (v === 0 ? 'neutre' : `${v > 0 ? 'chaud' : 'froid'} ${Math.round(Math.abs(v) * 100)} %`)
const afficher = (cle, v) => (cle === 'chaleur' ? degres(v) : pourcent(v))

/**
 * Lumiere de la boutique.
 *
 * Ce que ce panneau NE fait pas, et ne peut pas faire : deplacer, allumer ou eteindre une
 * lampe. L'eclairage de la piece est cuit dans des lightmaps, il n'y a aucune lumiere temps
 * reel a piloter. Ce qui est offert ici est reel et immediat : l'exposition du rendu, la
 * teinte de la lumiere cuite, et l'intensite des sources qu'on voit briller. L'interface le
 * dit plutot que de proposer des interrupteurs qui ne commanderaient rien.
 */
export default function Lumiere({ lumiere, onAmbiance, onRegler, onReinitialiser }) {
  const [fin, setFin] = useState(false)
  const perso = lumiere.ambiance === 'perso'

  return (
    <div className="lumiere">
      <div className="lumiere-ambiances" role="radiogroup" aria-label="Ambiance lumineuse">
        {AMBIANCES.map((a) => (
          <button key={a.cle} type="button" role="radio"
                  className="lumiere-ambiance" data-test={`lumiere-ambiance-${a.cle}`}
                  data-actif={lumiere.ambiance === a.cle}
                  aria-checked={lumiere.ambiance === a.cle}
                  onClick={() => onAmbiance(a.cle)}>
            <span className="lumiere-ambiance-nom">{a.libelle}</span>
            <span className="lumiere-ambiance-resume">{a.resume}</span>
          </button>
        ))}
      </div>

      {perso && (
        <p className="lumiere-perso" data-test="lumiere-perso">
          Réglage personnalisé.
          <button type="button" className="lumiere-lien" data-test="lumiere-reinitialiser"
                  onClick={onReinitialiser}>Revenir à Boutique</button>
        </p>
      )}

      <button type="button" className="lumiere-bascule" data-test="lumiere-fin"
              aria-expanded={fin} onClick={() => setFin((v) => !v)}>
        Réglage fin <span aria-hidden="true">{fin ? '▾' : '▸'}</span>
      </button>

      {fin && (
        <div className="lumiere-curseurs" data-test="lumiere-curseurs">
          {CURSEURS.map(({ cle, libelle, gauche, droite }) => {
            const b = BORNES[cle]
            return (
              <label className="lumiere-curseur" key={cle}>
                <span className="lumiere-curseur-tete">
                  <span className="lumiere-curseur-nom">{libelle}</span>
                  <span className="lumiere-curseur-valeur" data-test={`lumiere-valeur-${cle}`}>
                    {afficher(cle, lumiere[cle])}
                  </span>
                </span>
                <input type="range" data-test={`lumiere-reglage-${cle}`}
                       min={b.min} max={b.max} step={b.pas} value={lumiere[cle]}
                       aria-label={libelle}
                       onChange={(e) => onRegler(cle, Number(e.target.value))} />
                {gauche && (
                  <span className="lumiere-curseur-bornes" aria-hidden="true">
                    <span>{gauche}</span><span>{droite}</span>
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}

      <p className="lumiere-note" data-test="lumiere-note">
        L’éclairage est cuit dans le décor : les lampes ne se déplacent pas d’ici. Ces
        réglages agissent sur l’exposition, la teinte de cette lumière et les sources visibles.
      </p>
    </div>
  )
}
