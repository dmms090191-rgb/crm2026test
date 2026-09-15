// Lecteur YouTube, encapsule.
//
// Deux regles tenues ici :
//   1. On ne telecharge rien. La video reste chez YouTube et c'est son lecteur officiel qui la
//      lit, dans son iframe. On ne fait que lui donner des ordres.
//   2. Rien n'est charge tant que personne n'a demande de musique YouTube : ni le script de
//      l'API, ni l'iframe. Le premier morceau YouTube declenche les deux.
//
// L'iframe appartient a un autre domaine : son flux audio est hors de notre portee, il ne peut
// donc pas traverser nos tetes de spatialisation. Le Son 3D ne concerne que les ambiances
// locales, et l'interface l'annonce plutot que de faire semblant.

const SRC_API = 'https://www.youtube.com/iframe_api'
export const ID_HOTE = 'hote-youtube'

let promesseApi = null

/** Charge l'API une seule fois. Si un test a pose un faux `window.YT`, on le prend tel quel. */
export function chargerApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sans navigateur'))
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (promesseApi) return promesseApi
  promesseApi = new Promise((resoudre, rejeter) => {
    const precedent = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      precedent?.()
      resoudre(window.YT)
    }
    const s = document.createElement('script')
    s.src = SRC_API
    s.async = true
    s.onerror = () => { promesseApi = null; rejeter(new Error('API YouTube injoignable')) }
    document.head.appendChild(s)
  })
  return promesseApi
}

/**
 * Titre reel d'une video ou d'une playlist, via oEmbed : point public, sans cle d'API.
 * En cas d'echec on garde le titre provisoire, ce n'est pas bloquant.
 */
export async function lireTitre(lien) {
  const cible = lien.genre === 'playlist'
    ? `https://www.youtube.com/playlist?list=${lien.id}`
    : `https://www.youtube.com/watch?v=${lien.id}`
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cible)}&format=json`)
    if (!r.ok) return null
    const j = await r.json()
    return typeof j.title === 'string' && j.title.trim() ? j.title.trim() : null
  } catch {
    return null
  }
}

/**
 * Traduit le code d'erreur du lecteur. Sans cela, toutes les pannes se ressemblent alors
 * qu'elles n'appellent pas la meme reponse : un identifiant fautif se corrige, une video que
 * son proprietaire refuse d'exposer ne se corrigera jamais.
 */
export function messageErreur(code) {
  switch (Number(code)) {
    case 2: return 'Lien YouTube invalide'
    case 5: return 'Lecture impossible dans ce navigateur'
    case 100: return 'Vidéo introuvable ou privée'
    case 101:
    case 150:
    case 153: return 'Le propriétaire n’autorise pas la lecture hors de YouTube'
    default: return 'Vidéo indisponible'
  }
}

/**
 * Enveloppe le lecteur. `surEtat` recoit { pret, joue, fin, titre, index, total }.
 * `fin` est un signal : il vaut true le temps d'une notification quand un morceau ou une
 * playlist se termine, pour que l'appelant decide de boucler ou d'enchainer.
 */
export function creerLecteurYoutube({ surEtat } = {}) {
  let joueur = null, pret = false, voulu = null, volume = 45, enMarche = false
  // Attenuation par la distance. Elle multiplie le volume BRUT (0 a 100) et non le volume
  // percu : setVolume n'accepte que des entiers, et appliquer d'abord la courbe au carre
  // ferait tomber la resolution a trois ou quatre crans au fond de la boutique, ce qui
  // s'entend comme un escalier. `envoye` evite de poster un message a l'iframe pour rien.
  let attenuation = 1, envoye = -1
  let dernier = { genre: null, id: null }

  const publier = (p) => surEtat?.(p)

  async function assurer() {
    if (joueur) return joueur
    const YT = await chargerApi()
    const hote = document.getElementById(ID_HOTE)
    if (!hote) throw new Error('hote du lecteur absent')
    await new Promise((resoudre) => {
      joueur = new YT.Player(hote, {
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          // controls: 0 — la video s'affiche sur une dalle de 2,80 m et la couche ne recoit
          // aucun clic : une barre de progression y serait visible et inutilisable. Le
          // transport de la boutique est le seul qui commande.
          autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1,
          rel: 0, playsinline: 1, iv_load_policy: 3, origin: window.location.origin,
        },
        events: {
          onReady: () => {
            pret = true
            envoye = -1
            try { poserVolume() } catch { /* pas encore pret */ }
            publier({ pret: true })
            resoudre()
          },
          onStateChange: (e) => {
            const S = YT.PlayerState || {}
            if (e.data === S.PLAYING) { enMarche = true; publier({ joue: true, chargement: false, titre: titreCourant(), index: index(), total: total() }) }
            else if (e.data === S.PAUSED) { enMarche = false; publier({ joue: false }) }
            else if (e.data === S.BUFFERING) publier({ chargement: true })
            else if (e.data === S.ENDED) { enMarche = false; publier({ joue: false, fin: true }) }
          },
          onError: (e) => publier({ joue: false, chargement: false, erreur: messageErreur(e?.data) }),
        },
      })
    })
    return joueur
  }

  // Plancher a 8 sur 100 : depuis l'entree, la boutique est a treize metres des colonnes et la
  // loi d'attenuation tomberait sous le seuil d'audition. Un filet de son lointain est juste ;
  // le silence complet passerait pour une panne.
  const PLANCHER = 8
  function poserVolume() {
    // Le plancher evite le silence au fond de la boutique, mais il ne doit JAMAIS depasser le
    // volume demande : a curseur tres bas, un plancher absolu jouerait plus fort que le reglage.
    const v = Math.min(volume, Math.max(volume > 0 ? PLANCHER : 0, Math.round(volume * attenuation)))
    if (v === envoye) return
    envoye = v
    try { joueur?.setVolume?.(v) } catch { /* pas encore la */ }
  }

  const titreCourant = () => {
    try { return joueur?.getVideoData?.()?.title || null } catch { return null }
  }
  const index = () => {
    try { const i = joueur?.getPlaylistIndex?.(); return typeof i === 'number' && i >= 0 ? i : null } catch { return null }
  }
  const total = () => {
    try { const l = joueur?.getPlaylist?.(); return Array.isArray(l) ? l.length : null } catch { return null }
  }

  /** Charge un morceau. `demarrer` a false se contente de le mettre en attente. */
  async function charger(morceau, demarrer) {
    voulu = morceau
    await assurer()
    const memeCible = dernier.genre === morceau.genre
      && dernier.id === (morceau.genre === 'playlist' ? morceau.listeId : morceau.videoId)
    if (!memeCible) {
      dernier = { genre: morceau.genre, id: morceau.genre === 'playlist' ? morceau.listeId : morceau.videoId }
      publier({ chargement: true, erreur: null })
      if (morceau.genre === 'playlist') {
        const o = { listType: 'playlist', list: morceau.listeId }
        demarrer ? joueur.loadPlaylist(o) : joueur.cuePlaylist(o)
      } else {
        demarrer ? joueur.loadVideoById(morceau.videoId) : joueur.cueVideoById(morceau.videoId)
      }
      envoye = -1
      try { poserVolume() } catch { /* pret plus tard */ }
      return
    }
    if (demarrer) joueur.playVideo()
  }

  return {
    async jouer(morceau) { await charger(morceau, true) },
    async precharger(morceau) { await charger(morceau, false) },
    pause() { try { joueur?.pauseVideo?.(); enMarche = false } catch { /* pas encore la */ } },
    reprendre() { try { joueur?.playVideo?.() } catch { /* pas encore la */ } },
    /** Volume 0..1 ; l'API YouTube travaille de 0 a 100. */
    definirVolume(v) {
      volume = Math.round(Math.max(0, Math.min(1, v)) * 100)
      poserVolume()
    },
    /**
     * Facteur 0..1 applique au volume. C'est le SEUL levier sonore que l'API IFrame expose :
     * setVolume, et rien d'autre. Aucun panoramique, aucun equilibre gauche/droite, aucun
     * acces au signal. On peut donc faire monter le son quand on approche des colonnes, pas
     * le faire venir de la gauche ou de la droite.
     */
    definirAttenuation(f) {
      attenuation = Math.max(0, Math.min(1, Number.isFinite(f) ? f : 1))
      poserVolume()
    },
    attenuationCourante: () => attenuation,
    volumeEnvoye: () => envoye,
    /** Rejoue le morceau courant depuis le debut, ou la playlist depuis son premier titre. */
    reprendreAuDebut() {
      try {
        if (voulu?.genre === 'playlist' && joueur?.playVideoAt) joueur.playVideoAt(0)
        else { joueur?.seekTo?.(0, true); joueur?.playVideo?.() }
      } catch { /* pas encore la */ }
    },
    /** Avance dans la playlist YouTube. Renvoie false s'il n'y a pas de suivant. */
    suivantInterne() {
      const i = index(), n = total()
      if (i === null || n === null || i + 1 >= n) return false
      try { joueur.nextVideo(); return true } catch { return false }
    },
    precedentInterne() {
      const i = index()
      if (i === null || i <= 0) return false
      try { joueur.previousVideo(); return true } catch { return false }
    },
    etat: () => ({ pret, joue: enMarche, titre: titreCourant(), index: index(), total: total() }),
    detruire() {
      try { joueur?.destroy?.() } catch { /* deja parti */ }
      joueur = null; pret = false; enMarche = false; dernier = { genre: null, id: null }
      attenuation = 1; envoye = -1
    },
  }
}
