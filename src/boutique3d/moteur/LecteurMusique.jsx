import React, { useEffect, useRef, useState } from 'react'
import { MODES_AUDIO, libellesAudio } from './musique.js'
import { estFavori } from './playlist.js'

/**
 * Petit lecteur, colle au bord droit a mi-hauteur.
 *
 * Ce bord est le seul endroit libre dans TOUS les etats : le panneau est a gauche, les mesures
 * en haut a droite, la barre d'outils en bas a droite, la barre principale en bas au centre, et
 * les deux manches du mode manuel dans les deux coins bas. C'est donc ici que vit l'acces
 * permanent a la musique, celui qui reste disponible pendant un deplacement manuel alors que
 * la barre Magasin / Reglages, elle, s'efface.
 *
 * SUR LARGE ECRAN, replie c'est un bouton rond ; deplie, un petit panneau colle a la poignee :
 * precedent, lecture/pause, suivant, boucle, favori, volume et le choix Son normal / Son 3D.
 *
 * SUR TELEPHONE, la poignee ouvre la MODALE Musique, celle-la meme que Reglages > Musique.
 * Le panneau lateral, lui, etait ancre a la poignee : des que le visiteur deplacait le bouton
 * avec l'editeur d'interface, le bloc passait en translate(-50%, -50%) — CENTRE sur le point
 * choisi — et le panneau deplie, large de pres de 200 px, sortait par le bord droit. Rien ne le
 * ramenait dans l'ecran. Une modale, elle, est posee a la racine : elle est centree par la
 * fenetre, bornee par elle, et ne depend plus d'ou vit la poignee. On y gagne aussi la playlist,
 * l'ajout YouTube et la suppression, qui n'ont jamais tenu dans le petit panneau.
 */
// Meme seuil que la feuille de style : au-dela on est sur un large ecran.
const TELEPHONE = '(max-width: 899px)'

/** Suit la media query EN DIRECT. Une detection au seul chargement laisserait la mauvaise
 *  forme en place apres une rotation de l'ecran. */
function useTelephone() {
  const [petit, setPetit] = useState(() => window.matchMedia?.(TELEPHONE).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(TELEPHONE)
    if (!mq) return undefined
    const relire = () => setPetit(mq.matches)
    relire()
    mq.addEventListener('change', relire)
    return () => mq.removeEventListener('change', relire)
  }, [])
  return petit
}
export default function LecteurMusique({
  musique, etatLecteur, playlist, morceauCourant,
  onBasculer, onVolume, onSauter, onBoucle, onFavori, onMode, onOuvrirModale,
}) {
  const [ouvert, setOuvert] = useState(false)
  const surTelephone = useTelephone()
  const boite = useRef(null)
  const { joue, chargement, bloque } = etatLecteur
  const titre = etatLecteur.titreYoutube || morceauCourant?.titre || '—'
  // Sur une video YouTube, le second mode n'est pas du Son 3D : c'est un volume qui suit la
  // distance aux colonnes. Le bouton porte donc un autre libelle, et le meme etat.
  const surYoutube = etatLecteur.origine === 'youtube'
  const LIB = libellesAudio(etatLecteur.origine)

  // Passer au format telephone ne doit pas laisser le panneau lateral ouvert : c'est lui qui
  // sortait de l'ecran. La modale prend le relais au prochain appui.
  useEffect(() => { if (surTelephone) setOuvert(false) }, [surTelephone])

  // se replie des qu'on touche ailleurs ; sur telephone il n'y a pas de touche Echap
  useEffect(() => {
    if (!ouvert) return
    const fermer = (e) => { if (!boite.current?.contains(e.target)) setOuvert(false) }
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('pointerdown', fermer)
    window.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('pointerdown', fermer)
      window.removeEventListener('keydown', echap)
    }
  }, [ouvert])

  return (
    <div className="lecteur-bloc" ref={boite}>
      {/* L'hote du lecteur YouTube ne vit plus ici : il est pose une fois pour toutes dans la
          couche video de la grande tele (voir ecranVideo.js). Deplacer une iframe dans le
          document la recharge et couperait la lecture ; elle n'a donc qu'un seul domicile.
          En « Audio uniquement » elle reste derriere le canvas opaque, donc invisible. */}
      <div className="lecteur" data-ouvert={ouvert} data-joue={joue}>
      <button type="button" className="lecteur-poignee" data-test="lecteur-poignee"
              aria-expanded={surTelephone ? undefined : ouvert}
              aria-haspopup={surTelephone ? 'dialog' : 'true'}
              aria-label={`Musique : ${joue ? 'en lecture' : 'en pause'}`}
              onClick={() => {
                if (surTelephone) { setOuvert(false); onOuvrirModale?.(); return }
                setOuvert((v) => !v)
              }}>
        <span aria-hidden="true">♪</span>
        <span className="lecteur-pastille" data-on={joue} aria-hidden="true" />
      </button>

      {ouvert && (
        <div className="lecteur-panneau" data-test="lecteur-panneau">
          <div className="lecteur-rang">
            <button type="button" className="lecteur-saut" data-test="lecteur-precedent"
                    aria-label="Morceau précédent" onClick={() => onSauter(-1)}>⏮</button>
            <button type="button" className="lecteur-jouer" data-test="lecteur-jouer"
                    data-joue={joue} aria-pressed={joue}
                    aria-label={joue ? 'Mettre la musique en pause' : 'Lancer la musique'}
                    onClick={onBasculer}>
              <span aria-hidden="true">{joue ? '❚❚' : '▶'}</span>
            </button>
            <button type="button" className="lecteur-saut" data-test="lecteur-suivant"
                    aria-label="Morceau suivant" onClick={() => onSauter(1)}>⏭</button>
            <button type="button" className="lecteur-bascule" data-test="lecteur-boucle"
                    data-on={playlist.boucle} aria-pressed={playlist.boucle}
                    aria-label="Lecture en boucle" onClick={onBoucle}>↻</button>
            <button type="button" className="lecteur-bascule lecteur-favori"
                    data-test="lecteur-favori"
                    data-on={morceauCourant ? estFavori(playlist, morceauCourant.id) : false}
                    aria-pressed={morceauCourant ? estFavori(playlist, morceauCourant.id) : false}
                    aria-label="Mettre le morceau en favori"
                    disabled={!morceauCourant}
                    onClick={() => morceauCourant && onFavori(morceauCourant.id)}>★</button>
          </div>

          <div className="lecteur-rang">
            <input type="range" min="0" max="100" step="1" className="lecteur-volume"
                   data-test="lecteur-volume" value={Math.round(musique.volume * 100)}
                   aria-label="Volume de la musique"
                   onChange={(e) => onVolume(Number(e.target.value) / 100)} />
            <div className="lecteur-mode" role="radiogroup" aria-label="Diffusion du son">
              {MODES_AUDIO.map((k) => (
                <button key={k} type="button" role="radio"
                        data-test={`lecteur-mode-${k}`} data-actif={musique.mode === k}
                        aria-checked={musique.mode === k}
                        title={surYoutube && k === 'spatial'
                          ? 'Volume selon la distance aux colonnes — sans gauche/droite'
                          : LIB[k]}
                        onClick={() => onMode(k)}>
                  {k === 'normal' ? 'Normal' : (surYoutube ? 'Distance' : '3D')}
                </button>
              ))}
            </div>
          </div>

          <p className="lecteur-titre" data-test="lecteur-titre">
            {chargement ? 'Chargement…' : bloque ? 'Touchez ▶' : titre}
          </p>
        </div>
      )}
      </div>
    </div>
  )
}
