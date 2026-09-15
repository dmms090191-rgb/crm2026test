import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'

// Mesures de cadence, toujours actives (peu couteuses), publiees toutes les 0,5 s :
//   fps     : moyenne des 3 dernieres secondes
//   ms      : temps par image, meme fenetre
//   fpsMin  : pire seconde complete depuis l'arrivee au hub (etape boutique)
//   fps1    : 1 % bas = 1000 / p99 des temps d'image depuis le dernier changement de niveau
const FENETRE_S = 3
const PAS_MS = 0.25                 // finesse de l'histogramme des temps d'image
const BORNE_MS = 1000               // au-dela, l'image est ignoree (onglet masque, pause)
const NB_CASES = Math.ceil(BORNE_MS / PAS_MS) + 1
const MIN_ECHANTILLONS = 100

export default function Mesures({ onMesure, actif = true, etape = 'facade', reinit = null }) {
  const acc = useRef({
    fenetre: [],                    // [t (s), dt (s)] des 3 dernieres secondes
    depuisPub: 0,
    seconde: -1, dansSeconde: 0, fpsMin: 0, secondesVues: 0,
    histo: new Uint32Array(NB_CASES), total: 0,
  })

  // arrivee au hub : la pire seconde repart de zero
  useEffect(() => {
    const a = acc.current
    a.seconde = -1; a.dansSeconde = 0; a.fpsMin = 0; a.secondesVues = 0
  }, [etape])

  // changement de niveau : l'histogramme des temps d'image repart de zero
  useEffect(() => {
    const a = acc.current
    a.histo.fill(0); a.total = 0
  }, [reinit])

  useFrame((_, dt) => {
    const a = acc.current
    const t = performance.now() / 1000
    const dtMs = dt * 1000
    if (dtMs <= 0 || dtMs > BORNE_MS) {
      // pause (onglet masque, ecran verrouille) : la seconde entamee ne doit pas etre cloturee
      // comme une seconde complete, sinon elle deviendrait le FPS min ; on repart comme a
      // l'arrivee au hub, en gardant le FPS min deja mesure
      a.seconde = -1; a.dansSeconde = 0
      return
    }

    a.fenetre.push([t, dt])
    while (a.fenetre.length && t - a.fenetre[0][0] > FENETRE_S) a.fenetre.shift()

    a.histo[Math.min(NB_CASES - 1, Math.floor(dtMs / PAS_MS))]++
    a.total++

    if (etape === 'boutique') {
      const s = Math.floor(t)
      if (s !== a.seconde) {
        // une seconde complete vient de se terminer (on ignore la premiere, partielle)
        if (a.seconde >= 0 && a.secondesVues >= 1) a.fpsMin = a.fpsMin ? Math.min(a.fpsMin, a.dansSeconde) : a.dansSeconde
        if (a.seconde >= 0) a.secondesVues++
        a.seconde = s; a.dansSeconde = 0
      }
      a.dansSeconde++
    }

    a.depuisPub += dt
    if (a.depuisPub < 0.5) return
    a.depuisPub = 0

    let somme = 0
    for (const [, d] of a.fenetre) somme += d
    const n = a.fenetre.length
    let fps1 = 0
    if (a.total >= MIN_ECHANTILLONS) {
      const cible = a.total * 0.99
      let cumul = 0, i = 0
      for (; i < NB_CASES; i++) { cumul += a.histo[i]; if (cumul >= cible) break }
      const p99 = (i + 0.5) * PAS_MS
      fps1 = p99 > 0 ? 1000 / p99 : 0
    }
    onMesure({
      fps: n && somme > 0 ? n / somme : 0,
      ms: n ? (somme / n) * 1000 : 0,
      fpsMin: a.fpsMin,
      fps1,
    })
  })

  return null
}
