// Moteur audio de la boutique. Un seul lecteur pour toute la session, cree une fois et
// pilote par des appels ; il ne redemarre donc pas quand React redessine l'interface.
//
// Le son passe par un GainNode plutot que par `audio.volume` : iOS ignore purement et
// simplement les ecritures sur `volume`, un curseur branche dessus n'y ferait rien du tout.
// La chaine Web Audio, elle, obeit partout.
//
// Le contexte audio n'est cree qu'au premier ordre de lecture, c'est-a-dire apres un geste du
// visiteur : un contexte cree au chargement naitrait suspendu et resterait muet.
import { gainDepuisCurseur } from './musique.js'
import { asset } from './modele.js'
import { creerLecteurYoutube } from './youtube.js'

const FONDU = 0.35        // secondes : montee et descente du volume, pour ne pas claquer
const BASCULE = 0.12      // secondes : fondu enchaine entre son normal et son 3D

// Reglages de spatialisation. La boutique fait 14 m de long : une attenuation physique
// complete (rolloff 1) rendrait la musique inaudible depuis l'entree. On garde donc une pente
// douce, assez marquee pour qu'on sente qu'on s'approche des colonnes, assez plate pour que
// l'ambiance reste presente partout.
const SPATIAL = { refDistance: 1.8, maxDistance: 26, rolloffFactor: 0.55 }

// Le son d'une video YouTube vit dans une iframe d'un autre domaine : il ne peut pas traverser
// Web Audio, donc pas davantage nos deux tetes HRTF. Le SEUL levier que l'API expose est le
// volume. On applique donc la MEME loi d'attenuation que les colonnes, calculee a la main, en
// prenant la distance au milieu des deux colonnes. Le son monte quand on approche de la grande
// tele et baisse quand on s'en eloigne — mais il n'a pas d'equilibre gauche/droite, et
// l'interface le dit au lieu de faire semblant.
const LISSAGE_YT = 0.15    // secondes : setVolume est un saut, pas une rampe
const PERIODE_YT = 0.1     // secondes : dix envois par seconde au plus vers l'iframe

/** Loi inverse de Web Audio, reproduite a l'identique. */
export function attenuationDistance(d) {
  const { refDistance: r, maxDistance: m, rolloffFactor: k } = SPATIAL
  const dd = Math.max(r, Math.min(m, d))
  return r / (r + k * (dd - r))
}

export function creerLecteur({ surEtat, surFin } = {}) {
  let audio = null, ctx = null, source = null, gain = null
  let voieDirecte = null, voieSpatiale = null, separateur = null
  let panneurs = []
  let enceintes = []
  // attenuation YouTube : valeur lissee, date du dernier envoi, et milieu des colonnes
  let attYt = 1, dernierEnvoiYt = 0, milieuEnceintes = null
  let mode = 'normal'
  let pisteCourante = null
  let curseur = 0
  let boucle = true
  let morceau = null            // le morceau demande, ambiance ou YouTube
  let yt = null                 // lecteur YouTube, cree a la premiere demande seulement
  let etat = { piste: null, morceau: null, origine: null, joue: false, chargement: false,
               bloque: false, erreur: null, mode: 'normal', spatialPret: false,
               titreYoutube: null, indexYoutube: null, totalYoutube: null }

  const publier = (p) => { etat = { ...etat, ...p }; surEtat?.(etat) }
  const estYoutube = () => morceau?.origine === 'youtube'

  function creerElement() {
    if (audio) return audio
    audio = new Audio()
    // La boucle n'est plus deleguee a l'element : c'est le bouton Boucle qui decide, et la fin
    // d'un morceau doit pouvoir enchainer sur le suivant de la file.
    audio.loop = false
    audio.addEventListener('ended', () => {
      if (boucle) { audio.currentTime = 0; audio.play().catch(() => {}) }
      else { publier({ joue: false }); surFin?.() }
    })
    audio.preload = 'none'        // aucun octet tant que le visiteur n'a rien demande
    audio.crossOrigin = 'anonymous'
    audio.addEventListener('playing', () => publier({ joue: true, chargement: false, bloque: false }))
    audio.addEventListener('pause', () => publier({ joue: false }))
    audio.addEventListener('waiting', () => publier({ chargement: true }))
    audio.addEventListener('canplay', () => publier({ chargement: false }))
    audio.addEventListener('error', () => publier({
      joue: false, chargement: false, erreur: 'lecture impossible',
    }))
    return audio
  }

  /** Cree le contexte et la chaine, une seule fois, au premier geste. */
  function brancher() {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC || ctx) return
    try {
      ctx = new AC()
      source = ctx.createMediaElementSource(creerElement())
      gain = ctx.createGain()
      gain.gain.value = gainDepuisCurseur(curseur)
      voieDirecte = ctx.createGain()
      voieDirecte.gain.value = mode === 'spatial' ? 0 : 1
      source.connect(gain)
      gain.connect(voieDirecte).connect(ctx.destination)
      if (mode === 'spatial') brancherSpatial()
    } catch {
      // Pas de Web Audio (contexte trop restreint, quota depasse) : on retombe sur le
      // volume de l'element. Moins bon sur iOS, mais audible partout ailleurs.
      ctx = null; source = null; gain = null; voieDirecte = null
      creerElement().volume = gainDepuisCurseur(curseur)
    }
  }

  /**
   * Deuxieme voie : le canal gauche part de la colonne de gauche, le droit de celle de
   * droite, chacun spatialise par sa propre tete HRTF. Construite seulement le jour ou on
   * demande le son 3D : tant que le visiteur reste en son normal, il n'y a rien a calculer.
   */
  function brancherSpatial() {
    if (!ctx || !gain || voieSpatiale || enceintes.length < 2) return
    try {
      voieSpatiale = ctx.createGain()
      voieSpatiale.gain.value = mode === 'spatial' ? 1 : 0
      separateur = ctx.createChannelSplitter(2)
      gain.connect(voieSpatiale).connect(separateur)
      panneurs = enceintes.slice(0, 2).map((e, i) => {
        const p = ctx.createPanner()
        p.panningModel = 'HRTF'
        p.distanceModel = 'inverse'
        p.refDistance = SPATIAL.refDistance
        p.maxDistance = SPATIAL.maxDistance
        p.rolloffFactor = SPATIAL.rolloffFactor
        poser(p, e)
        separateur.connect(p, i)
        p.connect(ctx.destination)
        return p
      })
      publier({ spatialPret: true })
    } catch {
      voieSpatiale = null; separateur = null; panneurs = []
      publier({ spatialPret: false })
    }
  }

  /** Ecrit une position sur un noeud, avec les deux ecritures possibles de l'API. */
  function poser(noeud, p) {
    if (noeud.positionX) {
      const t = ctx.currentTime
      noeud.positionX.setValueAtTime(p.x, t)
      noeud.positionY.setValueAtTime(p.y, t)
      noeud.positionZ.setValueAtTime(p.z, t)
    } else if (noeud.setPosition) {
      noeud.setPosition(p.x, p.y, p.z)      // Safari
    }
  }

  function definirEnceintes(liste) {
    enceintes = Array.isArray(liste) ? liste.filter((e) => Number.isFinite(e?.x)) : []
    // Point d'ou le son est cense venir pour une video YouTube : le milieu des deux colonnes,
    // c'est-a-dire le centre de la grande tele. Faute de pouvoir spatialiser, on peut au moins
    // faire varier le niveau autour du bon endroit.
    milieuEnceintes = enceintes.length
      ? enceintes.reduce((a, e) => ({ x: a.x + e.x / enceintes.length,
                                      y: a.y + e.y / enceintes.length,
                                      z: a.z + e.z / enceintes.length }), { x: 0, y: 0, z: 0 })
      : null
    if (panneurs.length === enceintes.length) {
      panneurs.forEach((p, i) => poser(p, enceintes[i]))
    }
  }

  /** Bascule normal <-> 3D par fondu enchaine : aucun clic, la lecture ne s'interrompt pas. */
  function definirMode(m) {
    const voulu = m === 'spatial' ? 'spatial' : 'normal'
    if (voulu === mode) return
    mode = voulu
    publier({ mode })
    if (!ctx || !gain) return               // rien a faire tant que le son n'a pas demarre
    if (mode === 'spatial') brancherSpatial()
    const t = ctx.currentTime
    const rampe = (n, v) => {
      if (!n) return
      n.gain.cancelScheduledValues(t)
      n.gain.setValueAtTime(n.gain.value, t)
      n.gain.linearRampToValueAtTime(v, t + BASCULE)
    }
    rampe(voieDirecte, mode === 'spatial' && voieSpatiale ? 0 : 1)
    rampe(voieSpatiale, mode === 'spatial' ? 1 : 0)
  }

  /**
   * Oreille du visiteur. `avant` et `haut` sont les axes de la camera ; sans le vecteur haut,
   * la scene sonore basculerait des qu'on leve les yeux.
   */
  function majEcoute(position, avant, haut, dt = 1 / 30, dansLaBoutique = true) {
    // --- cas YouTube : pas de Web Audio, donc pas de tetes. On ne peut agir que sur le volume.
    if (estYoutube()) {
      if (mode !== 'spatial' || !milieuEnceintes || !dansLaBoutique) {
        if (attYt !== 1) { attYt = 1; yt?.definirAttenuation(1) }
        return
      }
      const cible = attenuationDistance(Math.hypot(
        position.x - milieuEnceintes.x, position.y - milieuEnceintes.y, position.z - milieuEnceintes.z))
      // lissage du premier ordre : sans lui, marcher produirait un bruit d'escalier
      const a = 1 - Math.exp(-Math.max(0.001, dt) / LISSAGE_YT)
      attYt += (cible - attYt) * a
      const t = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000
      if (t - dernierEnvoiYt >= PERIODE_YT) { dernierEnvoiYt = t; yt?.definirAttenuation(attYt) }
      return
    }
    if (!ctx || mode !== 'spatial' || !panneurs.length) return
    const l = ctx.listener
    if (l.positionX) {
      const t = ctx.currentTime
      l.positionX.setValueAtTime(position.x, t)
      l.positionY.setValueAtTime(position.y, t)
      l.positionZ.setValueAtTime(position.z, t)
      l.forwardX.setValueAtTime(avant.x, t)
      l.forwardY.setValueAtTime(avant.y, t)
      l.forwardZ.setValueAtTime(avant.z, t)
      l.upX.setValueAtTime(haut.x, t)
      l.upY.setValueAtTime(haut.y, t)
      l.upZ.setValueAtTime(haut.z, t)
    } else if (l.setPosition) {
      l.setPosition(position.x, position.y, position.z)
      l.setOrientation(avant.x, avant.y, avant.z, haut.x, haut.y, haut.z)
    }
  }

  function definirVolume(c) {
    curseur = Math.max(0, Math.min(1, Number.isFinite(c) ? c : 0))
    const g = gainDepuisCurseur(curseur)
    yt?.definirVolume(curseur)
    if (gain && ctx) {
      const t = ctx.currentTime
      gain.gain.cancelScheduledValues(t)
      gain.gain.setValueAtTime(gain.gain.value, t)
      gain.gain.linearRampToValueAtTime(g, t + 0.08)
    } else if (audio) {
      audio.volume = g
    }
  }

  function definirPiste(piste) {
    if (!piste || (pisteCourante && pisteCourante.cle === piste.cle)) return
    pisteCourante = piste
    const a = creerElement()
    const jouait = !a.paused
    a.src = asset(piste.url)
    publier({ piste: piste.cle, erreur: null, chargement: jouait })
    if (jouait) a.play().catch(() => publier({ joue: false, bloque: true, chargement: false }))
  }

  /** Lecteur YouTube, cree a la premiere demande. Tant qu'on reste sur les ambiances, rien. */
  function assurerYoutube() {
    if (yt) return yt
    yt = creerLecteurYoutube({
      surEtat: (p) => {
        if (p.fin) {
          // fin d'une video seule ou d'une playlist entiere
          if (boucle) { yt.reprendreAuDebut(); return }
          publier({ joue: false })
          surFin?.()
          return
        }
        const q = {}
        if ('joue' in p) q.joue = p.joue
        if ('chargement' in p) q.chargement = p.chargement
        if ('erreur' in p) q.erreur = p.erreur
        if ('titre' in p) q.titreYoutube = p.titre
        if ('index' in p) q.indexYoutube = p.index
        if ('total' in p) q.totalYoutube = p.total
        if (Object.keys(q).length) publier(q)
      },
    })
    yt.definirVolume(curseur)
    return yt
  }

  /**
   * Choisit le morceau a jouer. Les deux origines s'excluent : passer a YouTube met la
   * nappe locale en pause et inversement, sinon on entendrait les deux a la fois.
   */
  async function definirMorceau(m, { jouer: lancer = false } = {}) {
    const change = morceau?.id !== m?.id
    morceau = m || null
    if (!morceau) return
    publier({ morceau: morceau.id, origine: morceau.origine, erreur: null })
    if (morceau.origine === 'youtube') {
      try { audio?.pause() } catch { /* pas encore la */ }
      // Sans ordre de lecture on se contente de noter le morceau : ni le script de l'API ni
      // l'iframe ne doivent partir tant que personne n'a demande de son.
      if (!lancer) { if (yt && change) { try { await yt.precharger(morceau) } catch { /* rien */ } } return }
      const j = assurerYoutube()
      try { await j.jouer(morceau) }
      catch { publier({ joue: false, chargement: false, erreur: 'lecteur YouTube indisponible' }) }
      return
    }
    try { yt?.pause() } catch { /* pas encore la */ }
    definirPiste({ cle: morceau.cle, url: morceau.url })
    if (lancer) await jouer()
  }

  async function jouer() {
    if (estYoutube()) {
      const j = assurerYoutube()
      publier({ chargement: true, erreur: null })
      try { await j.jouer(morceau) } catch { publier({ chargement: false, erreur: 'lecteur YouTube indisponible' }) }
      return
    }
    const a = creerElement()
    if (!pisteCourante) return
    if (!a.src) a.src = asset(pisteCourante.url)
    brancher()
    if (ctx && ctx.state === 'suspended') { try { await ctx.resume() } catch { /* rien a faire */ } }
    publier({ chargement: true, erreur: null })
    try {
      await a.play()
      publier({ joue: true, bloque: false })
      // montee douce : sans elle, la nappe entre d'un coup a plein volume
      if (gain && ctx) {
        const t = ctx.currentTime
        gain.gain.cancelScheduledValues(t)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(gainDepuisCurseur(curseur), t + FONDU)
      }
    } catch {
      // Le navigateur exige un geste : on le dit a l'interface plutot que de rester muet
      // sans explication.
      publier({ joue: false, chargement: false, bloque: true })
    }
  }

  function pause() {
    if (estYoutube()) { yt?.pause(); publier({ joue: false, chargement: false }); return }
    if (!audio) return
    audio.pause()
    publier({ joue: false, chargement: false })
  }

  function definirBoucle(b) { boucle = !!b }

  /**
   * Avance ou recule. A l'interieur d'une playlist YouTube, on se deplace de titre en titre ;
   * une fois au bout, on rend la main pour que l'appelant passe au morceau suivant de la file.
   * Renvoie true si le lecteur a gere le saut lui-meme.
   */
  function sautInterne(sens) {
    if (!estYoutube() || morceau?.genre !== 'playlist' || !yt) return false
    return sens < 0 ? yt.precedentInterne() : yt.suivantInterne()
  }

  function detruire() {
    try { audio?.pause() } catch { /* deja parti */ }
    if (audio) { audio.removeAttribute('src'); audio.load() }
    try { ctx?.close() } catch { /* deja ferme */ }
    try { yt?.detruire() } catch { /* deja parti */ }
    audio = null; ctx = null; source = null; gain = null; pisteCourante = null
    voieDirecte = null; voieSpatiale = null; separateur = null; panneurs = []
    yt = null; morceau = null
  }

  return {
    definirPiste, definirMorceau, definirVolume, definirMode, definirEnceintes, majEcoute,
    definirBoucle, sautInterne,
    jouer, pause, detruire,
    etat: () => etat,
    morceau: () => morceau,
    // Le son 3D ne vaut que pour les ambiances locales : le flux d'une iframe YouTube est
    // hors de portee de Web Audio, on ne peut pas le spatialiser.
    spatialisable: () => !estYoutube(),
    // YouTube ne traverse pas Web Audio, mais son volume, lui, se pilote a la distance
    attenuable: () => estYoutube(),
    attenuationYoutube: () => attYt,
    youtubePret: () => !!yt,
    // pour les tests : quelle voie porte reellement le son, et ou sont posees les colonnes
    mode: () => mode,
    voieActive: () => (!ctx ? null
      : (voieSpatiale && voieSpatiale.gain.value > 0.5) ? 'spatiale'
      : (voieDirecte && voieDirecte.gain.value > 0.5) ? 'directe' : 'muette'),
    positionsPanneurs: () => panneurs.map((p) => (p.positionX
      ? { x: +p.positionX.value.toFixed(3), y: +p.positionY.value.toFixed(3), z: +p.positionZ.value.toFixed(3) }
      : null)),
    positionEcoute: () => {
      const l = ctx?.listener
      if (!l?.positionX) return null
      return { x: +l.positionX.value.toFixed(3), y: +l.positionY.value.toFixed(3),
               z: +l.positionZ.value.toFixed(3),
               avant: [+l.forwardX.value.toFixed(3), +l.forwardY.value.toFixed(3), +l.forwardZ.value.toFixed(3)] }
    },
    // L'element n'est pas dans le document : ces trois lectures sont le seul moyen, pour un
    // test, de verifier que le son avance vraiment et a quel volume.
    voie: () => (gain ? 'webaudio' : audio ? 'element' : null),
    tempsCourant: () => (audio ? audio.currentTime : null),
    gainCourant: () => (gain ? +gain.gain.value.toFixed(4) : audio ? audio.volume : null),
    source: () => (audio ? audio.src : null),
  }
}
