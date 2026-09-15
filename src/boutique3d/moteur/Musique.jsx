import React, { useState } from 'react'
import { MODES_AUDIO, libellesAudio, MODES_DIFFUSION, LIBELLES_DIFFUSION } from './musique.js'
import { ambiances, estFavori, favoris as listeFavoris } from './playlist.js'

/**
 * Gestionnaire de musique du panneau Reglages : ajout d'un lien YouTube, playlist, favoris,
 * transport, boucle, volume et mode de diffusion.
 *
 * Les ambiances de la boutique et les morceaux ajoutes vivent dans la meme file : passer au
 * suivant traverse les deux sans distinction. Seules les ambiances locales sont supprimables
 * a false, elles font partie du decor sonore de la boutique.
 */
export default function Musique({
  musique, etatLecteur, playlist, morceauCourant,
  onBasculer, onVolume, onMode, onChoisirMorceau, onSauter,
  onBoucle, onFavori, onSupprimer, onAjouterLien, onDiffusion, grandeAllumee = true,
}) {
  const { joue, chargement, bloque, erreur } = etatLecteur
  const [saisie, setSaisie] = useState('')
  const [message, setMessage] = useState(null)
  const [occupe, setOccupe] = useState(false)
  const [vue, setVue] = useState('tout')        // tout | favoris

  const soumettre = async (e) => {
    e.preventDefault()
    if (occupe) return
    setOccupe(true)
    const err = await onAjouterLien(saisie)
    setOccupe(false)
    setMessage(err)
    if (!err) setSaisie('')
  }

  const montres = vue === 'favoris' ? listeFavoris(playlist)
    : [...ambiances(), ...playlist.morceaux]
  const surYoutube = etatLecteur.origine === 'youtube'
  const LIB = libellesAudio(etatLecteur.origine)

  return (
    <div className="musique">
      {/* ---- transport ---- */}
      <div className="musique-transport">
        <button type="button" className="musique-saut" data-test="musique-precedent"
                aria-label="Morceau précédent" onClick={() => onSauter(-1)}>⏮</button>
        <button type="button" className="musique-jouer" data-test="musique-jouer"
                data-joue={joue} aria-pressed={joue}
                aria-label={joue ? 'Mettre la musique en pause' : 'Lancer la musique'}
                onClick={onBasculer}>
          <span aria-hidden="true">{joue ? '❚❚' : '▶'}</span>
        </button>
        <button type="button" className="musique-saut" data-test="musique-suivant"
                aria-label="Morceau suivant" onClick={() => onSauter(1)}>⏭</button>
        <button type="button" className="musique-boucle" data-test="musique-boucle"
                data-on={playlist.boucle} aria-pressed={playlist.boucle}
                aria-label="Lecture en boucle"
                onClick={onBoucle}>↻</button>
        <span className="musique-etat" data-test="musique-etat">
          {erreur ? erreur
            : bloque ? 'Touchez pour lancer'
            : chargement ? 'Chargement…'
            : joue ? 'En lecture' : 'En pause'}
        </span>
      </div>

      <p className="musique-encours" data-test="musique-encours">
        {etatLecteur.titreYoutube || morceauCourant?.titre || '—'}
        {etatLecteur.totalYoutube > 1 && etatLecteur.indexYoutube !== null
          ? ` · ${etatLecteur.indexYoutube + 1}/${etatLecteur.totalYoutube}` : ''}
      </p>

      <label className="musique-volume">
        <span className="musique-volume-nom">Volume</span>
        <input type="range" min="0" max="100" step="1" data-test="musique-volume"
               value={Math.round(musique.volume * 100)}
               aria-label="Volume de la musique"
               onChange={(e) => onVolume(Number(e.target.value) / 100)} />
        <span className="musique-volume-valeur" data-test="musique-volume-valeur">
          {Math.round(musique.volume * 100)} %
        </span>
      </label>

      {/* ---- ou passe la video YouTube ----
          La grande tele du fond est la seule a savoir diffuser : elle mesure 2,80 m et sa
          dalle est exactement en 16:9, donc l'image y tient sans bande ni recadrage. Les
          autres ecrans sont trop petits pour qu'une video y reste lisible. */}
      <div className="musique-mode" role="radiogroup" aria-label="Image de la vidéo YouTube">
        {MODES_DIFFUSION.map((k) => (
          <button key={k} type="button" role="radio"
                  data-test={`musique-diffusion-${k}`} data-mode={k}
                  data-actif={musique.diffusion === k} aria-checked={musique.diffusion === k}
                  onClick={() => onDiffusion(k)}>
            {LIBELLES_DIFFUSION[k]}
          </button>
        ))}
      </div>
      <p className="musique-mode-note" data-test="musique-diffusion-note">
        {!surYoutube
          ? 'Ce choix concerne les morceaux YouTube. Les ambiances de la boutique n’ont pas d’image.'
          : musique.diffusion !== 'tele'
            ? 'La grande télé du fond garde son contenu boutique.'
            : !grandeAllumee
              ? 'La grande télé est éteinte : rallumez-la dans Réglages → Télévisions pour voir l’image.'
              : 'La vidéo s’affiche sur la grande télé du fond. Elle reprend son contenu dès que vous revenez à Audio uniquement.'}
      </p>

      {/* ---- diffusion ---- */}
      <div className="musique-mode" role="radiogroup" aria-label="Diffusion du son">
        {MODES_AUDIO.map((k) => (
          <button key={k} type="button" role="radio"
                  data-test={`musique-mode-${k}`} data-mode={k}
                  data-actif={musique.mode === k} aria-checked={musique.mode === k}
                  onClick={() => onMode(k)}>
            {LIB[k]}
          </button>
        ))}
      </div>
      <p className="musique-mode-note" data-test="musique-mode-note">
        {surYoutube
          ? (musique.mode === 'spatial'
            ? 'Le son de la vidéo reste dans le lecteur de YouTube : nous ne pouvons agir que sur son volume. Il monte quand vous approchez des colonnes et baisse quand vous vous en éloignez. Il n’y a pas d’équilibre gauche/droite.'
            : 'Volume constant, identique partout dans la boutique.')
          : musique.mode === 'spatial'
            ? 'Le son sort des deux colonnes, de part et d’autre du grand écran.'
            : 'Diffusion uniforme, identique partout dans la boutique.'}
      </p>

      {/* ---- ajout d'un lien ---- */}
      <form className="musique-ajout" onSubmit={soumettre}>
        <input type="text" data-test="musique-lien" value={saisie} inputMode="url"
               placeholder="Coller un lien YouTube (vidéo ou playlist)"
               aria-label="Lien YouTube à ajouter"
               onChange={(e) => { setSaisie(e.target.value); setMessage(null) }} />
        <button type="submit" data-test="musique-ajouter" disabled={occupe || !saisie.trim()}>
          Ajouter
        </button>
      </form>
      {message && <p className="musique-erreur" data-test="musique-message">{message}</p>}

      {/* ---- liste ---- */}
      <div className="musique-onglets" role="tablist" aria-label="Filtrer la liste">
        {[['tout', 'Playlist'], ['favoris', 'Favoris']].map(([k, libelle]) => (
          <button key={k} type="button" role="tab" data-test={`musique-vue-${k}`}
                  data-actif={vue === k} aria-selected={vue === k}
                  onClick={() => setVue(k)}>
            {libelle}{k === 'favoris' ? ` (${playlist.favoris.length})` : ''}
          </button>
        ))}
      </div>

      <div className="musique-liste" data-test="musique-liste">
        {montres.length === 0 && (
          <p className="musique-vide" data-test="musique-vide">
            {vue === 'favoris' ? 'Aucun favori pour l’instant.' : 'Aucun morceau.'}
          </p>
        )}
        {montres.map((m) => {
          const actif = morceauCourant?.id === m.id
          return (
            <div className="musique-ligne" key={m.id} data-test={`musique-item-${m.id}`}
                 data-actif={actif} data-origine={m.origine}>
              <button type="button" className="musique-ligne-jouer"
                      data-test={`musique-lire-${m.id}`}
                      aria-label={actif && joue ? `Mettre ${m.titre} en pause` : `Écouter ${m.titre}`}
                      onClick={() => (actif ? onBasculer() : onChoisirMorceau(m.id))}>
                <span aria-hidden="true">{actif && joue ? '❚❚' : '▶'}</span>
              </button>
              <span className="musique-ligne-titre">
                <span className="musique-ligne-nom">{m.titre}</span>
                <span className="musique-ligne-detail">{m.detail}</span>
              </span>
              <button type="button" className="musique-favori" data-test={`musique-favori-${m.id}`}
                      data-on={estFavori(playlist, m.id)}
                      aria-pressed={estFavori(playlist, m.id)}
                      aria-label={`Mettre ${m.titre} en favori`}
                      onClick={() => onFavori(m.id)}>★</button>
              {m.supprimable && (
                <button type="button" className="musique-supprimer"
                        data-test={`musique-supprimer-${m.id}`}
                        aria-label={`Retirer ${m.titre} de la playlist`}
                        onClick={() => onSupprimer(m.id)}>✕</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
