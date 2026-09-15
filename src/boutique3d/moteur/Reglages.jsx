import React from 'react'
import { MODES, LIBELLES } from './qualite.js'
import Musique from './Musique.jsx'
import Lumiere from './Lumiere.jsx'
import Televisions from './Televisions.jsx'
import { resume as resumeTeles } from './televisions.js'
import Deplacement from './Deplacement.jsx'
import MesuresReglage from './MesuresReglage.jsx'
import Joystick from './Joystick.jsx'
import Interface from './Interface.jsx'
import { Cadrage, Exposition, ModePhoto } from './Vue.jsx'
import { ambianceParCle } from './lumiere.js'


// Entrees du menu Reglages, dans l'ordre voulu. `pret` a false = l'entree existe, elle est
// visible et annoncee, mais ses commandes viendront a l'etape suivante.
export const ENTREES = [
  { cle: 'musique', libelle: 'Musique', pret: true },
  { cle: 'televisions', libelle: 'Télévisions', pret: true },
  { cle: 'qualite', libelle: "Qualité d'image", pret: true },
  { cle: 'lumiere', libelle: 'Lumière', pret: true },
  { cle: 'joystick', libelle: 'Joystick', pret: true },
  { cle: 'interface', libelle: 'Interface', pret: true },
  { cle: 'deplacement', libelle: 'Déplacement', pret: true },
  { cle: 'cadrage', libelle: 'Cadrage', pret: true },
  { cle: 'exposition', libelle: 'Exposition', pret: true },
  { cle: 'photo', libelle: 'Mode photo', pret: true },
  { cle: 'mesures', libelle: 'Mesures', pret: true },
]

export const titreDe = (cle) => ENTREES.find((e) => e.cle === cle)?.libelle ?? ''

/** Resume affiche a droite de chaque ligne. Toujours court : la ligne ne s'elargit jamais. */
export function resumes(p) {
  const q = p.qualite || {}
  return {
    qualite: q.mode === 'auto' ? `${LIBELLES.auto} (${LIBELLES[q.niveau]})` : LIBELLES[q.mode],
    musique: p.etatLecteur?.joue
      ? (p.etatLecteur.titreYoutube || p.morceauCourant?.titre || '—')
      : 'En pause',
    lumiere: ambianceParCle(p.lumiere?.ambiance)?.libelle ?? 'Personnalisée',
    televisions: resumeTeles(p.televisions),
    deplacement: `${(p.preferences?.vitesse ?? 1.6).toFixed(1)} m/s`,
    mesures: p.preferences?.mesures ? 'Affichées' : 'Masquées',
    joystick: `${Math.round((p.preferences?.manches?.taille ?? 1) * 100)} %`,
    interface: (() => {
      const n = Object.keys(p.preferences?.ui || {}).length
      return n ? `${n} déplacé${n > 1 ? 's' : ''}` : 'D’origine'
    })(),
    cadrage: p.cadrage === 'exact' ? 'Focale Blender' : 'Adaptatif',
    exposition: `${Math.round((p.exposition ?? 1) * 100)} %`,
    photo: p.photo ? 'ON' : 'OFF',
  }
}

/**
 * Contenu d'UN reglage, celui qu'on vient d'ouvrir. Il vit desormais dans une modale posee
 * au-dessus de la boutique, plus dans le panneau : le panneau ne grandit donc plus jamais.
 *
 * Aucun de ces systemes n'est reecrit ici. La qualite d'image n'a PAS de systeme a elle :
 * elle affiche l'etat de `qualite` et appelle le meme `choisirMode` qu'ailleurs. Un seul
 * reglage, deux endroits pour l'atteindre, jamais deux verites.
 */
export function ContenuReglage({ cle, ...p }) {
  if (cle === 'qualite') {
    return (
      <div className="reglage-liste" role="menu" data-test="reglage-qualite-options">
        {MODES.map((k) => (
          <button key={k} type="button" role="menuitemradio"
                  data-option={k} data-actif={p.qualite.mode === k}
                  aria-checked={p.qualite.mode === k}
                  onClick={() => p.onChoisirMode(k)}>
            {k === 'auto' && p.qualite.mode === 'auto'
              ? `${LIBELLES.auto} (${LIBELLES[p.qualite.niveau]})`
              : LIBELLES[k]}
          </button>
        ))}
      </div>
    )
  }
  if (cle === 'televisions') {
    return <Televisions televisions={p.televisions} diffusion={p.musique?.diffusion}
                        onBasculer={p.onBasculerTele} onToutes={p.onToutesTeles} />
  }
  if (cle === 'joystick') {
    return <Joystick manches={p.preferences?.manches ?? { taille: 1, opacite: 1 }}
                     onManches={p.onManches} tactile={p.tactile} />
  }
  if (cle === 'interface') {
    return <Interface ui={p.preferences?.ui} onPersonnaliser={p.onPersonnaliser} />
  }
  if (cle === 'cadrage') return <Cadrage mode={p.cadrage} onMode={p.onCadrage} />
  if (cle === 'exposition') return <Exposition valeur={p.exposition} onValeur={p.onExposition} />
  if (cle === 'photo') return <ModePhoto actif={p.photo} onBasculer={p.onPhoto} />
  if (cle === 'deplacement') {
    return <Deplacement vitesse={p.preferences?.vitesse ?? 1.6} onVitesse={p.onVitesse} />
  }
  if (cle === 'mesures') {
    return <MesuresReglage actif={!!p.preferences?.mesures} onBasculer={p.onMesures} />
  }
  if (cle === 'lumiere') {
    return <Lumiere lumiere={p.lumiere} onAmbiance={p.onAmbiance}
                    onRegler={p.onReglerLumiere} onReinitialiser={p.onReinitLumiere} />
  }
  if (cle === 'musique') {
    return <Musique musique={p.musique} etatLecteur={p.etatLecteur}
                    playlist={p.playlist} morceauCourant={p.morceauCourant}
                    onBasculer={p.onBasculerMusique} onVolume={p.onVolume} onMode={p.onMode}
                    onChoisirMorceau={p.onChoisirMorceau} onSauter={p.onSauter}
                    onBoucle={p.onBoucle} onFavori={p.onFavori}
                    onSupprimer={p.onSupprimer} onAjouterLien={p.onAjouterLien}
                    onDiffusion={p.onDiffusion}
                    grandeAllumee={p.televisions?.allumees?.looks !== false} />
  }
  return null
}

/**
 * Menu Reglages : une ligne par entree, rien d'autre. Cliquer une ligne ouvre sa modale.
 *
 * Le menu garde donc TOUJOURS la meme hauteur et la meme largeur, quel que soit le reglage
 * ouvert — c'est tout l'interet du changement. Le resume de droite est tronque plutot que
 * d'elargir la ligne : un titre YouTube de soixante caracteres ne doit pas decider de la
 * largeur du panneau.
 */
export default function Reglages(p) {
  const valeur = resumes(p)
  return (
    <>
      {ENTREES.map((e) => (
        <button type="button" className="reglage-ligne" key={e.cle}
                data-test={`reglage-${e.cle}`} data-reglage={e.cle}
                data-pret={e.pret} disabled={!e.pret}
                aria-haspopup="dialog" aria-expanded={p.ouvert === e.cle}
                onClick={() => e.pret && p.onOuvrir(e.cle)}>
          <span className="reglage-nom">{e.libelle}</span>
          {e.pret
            ? <span className="reglage-valeur">{valeur[e.cle]}</span>
            : <span className="reglage-bientot">bientôt</span>}
          <span className="reglage-chevron" aria-hidden="true">›</span>
        </button>
      ))}
    </>
  )
}
