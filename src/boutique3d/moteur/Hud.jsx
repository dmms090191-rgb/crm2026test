import React from 'react'
import { LIBELLES } from './qualite.js'

const ligne = (k, v, cls = '') => (
  <div className="l" key={k}><span>{k}</span><span className={cls}>{v}</span></div>
)

const sec = (ms) => (ms ? `${(ms / 1000).toFixed(2)} s` : '…')

// Six lignes, pas une de plus : niveau, FPS moyen, FPS min / 1 % bas, temps par image,
// chargement (GLB pret, puis application du niveau), GPU.
export default function Hud({ m, qualite, niveauEffectif, chargement, gpu }) {
  const cls = m.fps >= 55 ? 'fps-bon' : m.fps >= 28 ? 'fps-moyen' : 'fps-mauvais'
  let niveau = `${LIBELLES[niveauEffectif] || niveauEffectif} (${qualite.mode === 'auto' ? 'auto' : 'manuel'})`
  if (qualite.niveau !== niveauEffectif) niveau += ` → ${LIBELLES[qualite.niveau]}…`
  return (
    <div className="hud">
      <h4>Mesures</h4>
      {ligne('niveau', niveau)}
      {ligne('FPS moyen', m.fps ? m.fps.toFixed(0) : '…', cls)}
      {ligne('FPS min / 1 % bas', `${m.fpsMin ? m.fpsMin.toFixed(0) : '…'} / ${m.fps1 ? m.fps1.toFixed(0) : '…'}`)}
      {ligne('temps par image', m.ms ? `${m.ms.toFixed(1)} ms` : '…', cls)}
      {ligne('chargement', `${sec(chargement?.glb)} / niveau ${sec(chargement?.niveau)}`)}
      {ligne('GPU', gpu || '…', 'gpu')}
    </div>
  )
}
