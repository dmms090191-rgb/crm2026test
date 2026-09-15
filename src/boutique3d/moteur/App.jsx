import React, { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from './Scene.jsx'
import Mesures from './Mesures.jsx'
import Hud from './Hud.jsx'
import Joysticks from './Joysticks.jsx'
import BarreSection from './BarreSection.jsx'
import Reglages, { ContenuReglage, titreDe } from './Reglages.jsx'
import Modale from './Modale.jsx'
import EditeurInterface from './EditeurInterface.jsx'
import LecteurMusique from './LecteurMusique.jsx'
import { CATEGORIES } from './vues.js'
import { lireReglages as lireMusique, ecrireReglages as ecrireMusique,
         aDesReglages as aDesReglagesMusique, lire as lireMusiquePur } from './musique.js'
import { useModele } from './modele.js'
import { creerLecteur } from './lecteur.js'
import { lireTitre } from './youtube.js'
import { depotLocal, file, morceauParId, voisin, ajouter, supprimer, basculerFavori as bascFav,
         renommer, lireLienYoutube, creerMorceauYoutube, lire as lirePlaylist,
         serialiser as serialiserPlaylist,
         BOUTIQUE_DEFAUT } from './playlist.js'
import * as Lum from './lumiere.js'
import * as Tv from './televisions.js'
import * as Pref from './preferences.js'
import { creerAcces, configuration, REPORT_MS, ECRITURE_ACTIVE } from './depotDistant.js'
import { creerEcranVideo } from './ecranVideo.js'
import { REGLAGES, MODES, detecterAuDemarrage, memoriserMode, memoriserDecision, niveauSonde, stockage } from './qualite.js'
import { vitesseApresMolette, barreVitesse, VITESSE_MIN, VITESSE_MAX } from './manuel.js'

// Clavier du mode manuel (bureau) : W avancer, S reculer, A gauche, D droite, E monter,
// Q descendre. e.code designe la TOUCHE PHYSIQUE : un clavier AZERTY retrouve donc les memes
// positions de doigts (ZQSD) sans reglage. Les fleches restent un raccourci de confort.
// Pendant le mode manuel, S recule et ne bascule plus le panneau Stats.
const TOUCHES_MANUEL = {
  KeyW: 'avant', ArrowUp: 'avant',
  KeyS: 'arriere', ArrowDown: 'arriere',
  KeyA: 'gauche', ArrowLeft: 'gauche',
  KeyD: 'droite', ArrowRight: 'droite',
  KeyE: 'monte',
  KeyQ: 'descend',
}

const TONE = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping

export default function App() {
  // Detection synchrone AVANT le Canvas : l'antialias (MSAA) est fixe a la creation du contexte.
  const [detection] = useState(() => detecterAuDemarrage())
  const antialias = useMemo(() => REGLAGES[detection.niveau].antialias, [detection])
  const [qualite, setQualite] = useState(() => ({
    mode: detection.mode, niveau: detection.niveau, raison: detection.raison, sonder: detection.sonder,
    niveauAuto: detection.niveauAuto, raisonAuto: detection.raisonAuto, sonderAuto: detection.sonderAuto,
    mobile: detection.mobile,
  }))
  // niveau dont les reglages sont effectivement en place (textures appliquees, DPR)
  const [niveauEffectif, setNiveauEffectif] = useState(detection.niveau)
  const [chargement, setChargement] = useState({ glb: 0, niveau: 0 })

  const [pret, setPret] = useState(false)
  const [etape, setEtape] = useState('facade')      // facade | entree | boutique
  const etapeRef = useRef(etape)
  etapeRef.current = etape

  // Section affichee par le panneau de gauche. Magasin a l'ouverture, comme demande ; la vue 3D
  // n'en depend pas, passer d'une section a l'autre ne touche donc jamais a la scene.

  const [reglageOuvert, setReglageOuvert] = useState(null)

  // --- a qui appartiennent les reglages.
  // L'identite vient du MODELE : c'est elle qui suffixe les quatre caches locaux et qui sert de
  // cle a la ligne en base. Absente — cas de Johanna 2 en autonome — on retombe sur
  // l'identifiant historique, et rien ne change pour un visiteur qui revient.
  const { boutiqueId: idModele, manifeste, acces: accesModele } = useModele()
  const boutiqueId = idModele || BOUTIQUE_DEFAUT

  // --- musique : le choix du visiteur d'un cote, l'etat reel du son de l'autre.
  // Le lecteur vit dans une ref, hors du cycle de rendu : changer d'onglet ou de categorie ne
  // doit jamais couper le son ni relancer un telechargement.
  const [musique, setMusique] = useState(() => lireMusique(stockage(), boutiqueId))
  const [etatLecteur, setEtatLecteur] = useState(
    { piste: null, morceau: null, origine: null, joue: false, chargement: false, bloque: false,
      erreur: null, mode: 'normal', spatialPret: false,
      titreYoutube: null, indexYoutube: null, totalYoutube: null })
  const lecteurRef = useRef(null)
  // Playlist de la boutique : morceaux ajoutes, favoris, morceau courant, boucle. Le depot est
  // aujourd'hui le navigateur ; la boutique sert deja de cle, il n'y aura qu'a echanger
  // `depotLocal` contre un depot en base pour que chaque vendeur ait la sienne.
  const depot = useMemo(() => depotLocal(stockage()), [])
  const [playlist, setPlaylist] = useState(() => depot.charger(boutiqueId))
  const morceauCourant = useMemo(() => morceauParId(playlist, playlist.courant), [playlist])
  // Miroir de la playlist, lisible depuis un gestionnaire de clic sans dependre d'une
  // fermeture obsolete ni attendre le prochain rendu.
  const playlistRef = useRef(playlist)
  playlistRef.current = playlist
  const [mode, setMode] = useState('adaptatif')      // adaptatif | exact
  const [photo, setPhoto] = useState(false)
  // Hauteur MESUREE de la bande des manches, remontee par Joysticks. Elle sert a deux
  // choses : empecher le bouton Reglages de se poser sur un pouce, et remonter le retour a
  // l entree au-dessus des disques. Zero des que les manches ne sont plus la.
  const [bandeManches, setBandeManches] = useState(0)
  // Edition de la disposition : null hors mode, sinon un BROUILLON. Fermer sans valider jette
  // le brouillon et rend la derniere disposition enregistree — on ne detruit jamais une
  // disposition qui marchait juste parce qu'on a essaye quelque chose.
  const [edition, setEdition] = useState(null)
  // --- lumiere. `expo` EST l'exposition du rendu : la section Lumiere la pilote, les touches
  //     +/- la nudgent. Un seul reglage d'exposition, deux facons de l'atteindre — meme regle
  //     que la qualite d'image, jamais deux verites.
  const depotLumiere = useMemo(() => Lum.depotLocal(stockage(), boutiqueId), [boutiqueId])
  const [lumiere, setLumiere] = useState(() => depotLumiere.charger())
  useEffect(() => { depotLumiere.enregistrer(lumiere) }, [lumiere, depotLumiere])
  const expo = lumiere.intensite
  // le renderer nait apres le premier rendu : sans cette ref, une exposition relue du
  // stockage ne serait jamais posee, l'effet ne se declenchant pas sur une valeur stable
  // Couche video de la grande tele : un div plein ecran pose AVANT le canvas, donc derriere
  // lui. La video n'apparait qu'a travers le trou perce dans le rendu, a l'endroit exact de la
  // dalle. Elle est construite ICI et pas dans Scene : Scene vit sous <Suspense>, et une
  // re-suspension detruirait l'iframe en pleine lecture.
  // --- persistance par boutique. Le cache local reste ce qui s'affiche a la premiere image ;
  //     la base n'est qu'un avis qui arrive ensuite, et son absence ne change rien. Sans
  //     configuration, pas une seule requete reseau ne part.
  // L'acces FOURNI par l'hote gagne : il est deja authentifie, donc il voit ce que le role
  // anonyme ne verrait pas. Sans lui — cas de Johanna 2 en autonome — le moteur construit le
  // sien a partir des variables d'environnement, exactement comme avant.
  const acces = useMemo(() => accesModele || creerAcces(configuration() || {}), [accesModele])
  const sections = useRef({})

  const [hoteVideo, setHoteVideo] = useState(null)
  const [cadre, setCadre] = useState(null)
  // Le cadre dans une ref : les ecouteurs clavier sont branches une fois et ne doivent pas se
  // rebrancher quand le noeud arrive.
  const cadreRef = useRef(null)
  cadreRef.current = cadre
  const [ecranVideo, setEcranVideo] = useState(null)
  useEffect(() => {
    if (!hoteVideo) return undefined
    const e = creerEcranVideo({ hote: hoteVideo })
    setEcranVideo(e)
    return () => { e?.detruire(); setEcranVideo(null) }
  }, [hoteVideo])

  const expoRef = useRef(expo)
  expoRef.current = expo
  // meme raison que pour les entrees des manches : la scene lit la lumiere a chaque image
  // dans une ref, plutot que de dependre d'un rendu du sous-arbre du Canvas
  const lumiereRef = useRef(lumiere)
  lumiereRef.current = lumiere

  // --- televisions : un ON/OFF par ecran, memorise par boutique. Meme couture que la
  //     playlist et la lumiere, prete pour la base.
  const depotTeles = useMemo(() => Tv.depotLocal(stockage(), boutiqueId), [boutiqueId])
  const [televisions, setTelevisions] = useState(() => depotTeles.charger())
  useEffect(() => { depotTeles.enregistrer(televisions) }, [televisions, depotTeles])
  const televisionsRef = useRef(televisions)
  televisionsRef.current = televisions
  const basculerTele = useCallback((c) => setTelevisions((t) => Tv.basculer(t, c)), [])
  const toutesTeles = useCallback((v) => setTelevisions((t) => Tv.toutes(t, v)), [])
  const setExpo = useCallback((v) => setLumiere((l) => Lum.regler(l, 'intensite',
    typeof v === 'function' ? v(l.intensite) : v)), [])
  const choisirAmbiance = useCallback((c) => setLumiere((l) => Lum.choisirAmbiance(l, c)), [])
  const reglerLumiere = useCallback((c, v) => setLumiere((l) => Lum.regler(l, c, v)), [])
  const reinitLumiere = useCallback(() => setLumiere(Lum.etatDefaut()), [])
  const [m, setM] = useState({ fps: 0, ms: 0, fpsMin: 0, fps1: 0, fov: 0 })
  const maj = useCallback((p) => setM((v) => ({ ...v, ...p })), [])

  // --- deplacement manuel : le mode, la vitesse, et les entrees (manches + clavier).
  // Les entrees vivent dans une ref : un mouvement de pouce ne doit JAMAIS provoquer de rendu
  // React (ni ici, ni dans Joysticks) ; Scene les lit a chaque image.
  const [manuel, setManuel] = useState(false)
  const manuelRef = useRef(manuel)
  manuelRef.current = manuel
  // Preferences du proprietaire : vitesse de marche et affichage des mesures. Elles suivent la
  // meme couture de depot que la playlist, la lumiere et les televisions.
  const depotPref = useMemo(() => Pref.depotLocal(stockage(), boutiqueId), [boutiqueId])
  const [preferences, setPreferences] = useState(() => depotPref.charger())
  useEffect(() => { depotPref.enregistrer(preferences) }, [preferences, depotPref])
  const vitesse = preferences.vitesse
  const vitesseRef = useRef(vitesse)
  vitesseRef.current = vitesse
  const choisirVitesse = useCallback((v) => setPreferences((p) => Pref.regler(p, 'vitesse', v)), [])
  const choisirManches = useCallback((c, v) => setPreferences((p) => Pref.regler(p, c, v)), [])
  // La place du selecteur vit dans la disposition d'interface, avec les autres elements :
  // deux endroits pour la meme chose finiraient par diverger. Pendant l'edition elle va dans
  // le brouillon, sinon directement dans les preferences.
  const poserBouton = useCallback((v) => {
    setEdition((e) => {
      if (e) {
        const t = e.brouillon.section?.taille ?? 1
        return { ...e, brouillon: { ...e.brouillon, section: v ? { ...v, taille: t } : undefined } }
      }
      setPreferences((p) => {
        const suite = { ...(p.ui || {}) }
        if (v) suite.section = { ...v, taille: suite.section?.taille ?? 1 }
        else delete suite.section
        return Pref.regler(p, 'ui', suite)
      })
      return e
    })
  }, [])
  // Le panneau de gauche et son contenu vivent dans les preferences : c'est ce qui garantit
  // qu'un passage guide <-> manuel n'y touche pas, et qu'ils se retrouvent a la visite
  // suivante exactement comme on les avait laisses.
  const replier = useCallback((v) => setPreferences((p) => Pref.regler(p, 'replie', v)), [])
  const choisirOngletPref = useCallback((v) => setPreferences((p) => Pref.regler(p, 'onglet', v)), [])
  const onglet = preferences.panneau.onglet
  const replie = preferences.panneau.replie
  const vue = preferences.categorie
  const setVue = useCallback((k) => setPreferences((p) => Pref.regler(p, 'categorie', k)), [])
  const choisirMesures = useCallback((v) => setPreferences((p) => Pref.regler(p, 'mesures', v)), [])
  // Les mesures ne sont plus une commande a part : elles suivent Reglages > Mesures.
  const stats = preferences.mesures

  // Barre de vitesse : elle ne s'affiche QUE pendant le reglage a la molette, puis s'efface.
  // Une commande permanente de plus a l'ecran est exactement ce que le client veut retirer.
  const [barre, setBarre] = useState(null)
  const minuterieBarre = useRef(null)
  const entrees = useRef({ gauche: { x: 0, y: 0 }, droit: { x: 0, y: 0 }, touches: {},
                           souris: { dx: 0, dy: 0, tenu: false } })
  // les manches ne servent qu aux ecrans tactiles : sur un bureau a la souris ils masquent
  // la boutique pour rien, le clavier et le clic maintenu suffisent
  const tactile = useMemo(() => typeof navigator !== 'undefined'
    && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window), [])
  const onGauche = useCallback((v) => { const g = entrees.current.gauche; g.x = v.x; g.y = v.y }, [])
  const onDroit = useCallback((v) => { const d = entrees.current.droit; d.x = v.x; d.y = v.y }, [])
  // appele par la scene quand le retour de camera est termine : la camera est deja posee sur
  // le hub, on remet simplement la vue guidee en coherence (aucune animation, trajet nul)
  const retourAuHub = useCallback(() => {
    const demandee = vueApresRetour.current
    vueApresRetour.current = null
    setVue(demandee || 'hub')
  }, [])
  const choisirVue = useCallback((k) => {
    if (manuelRef.current) { vueApresRetour.current = k; setManuel(false) }
    else setVue(k)
  }, [])
  // Changer de section replie le reglage ouvert : en revenant sur Reglages on retrouve la liste,
  // pas un panneau deja deplie. La vue 3D et la vue guidee ne sont pas touchees, donc revenir
  // sur Magasin reprend exactement la navigation en cours.
  // Le selecteur du bas est la SEULE commande de section, sur tous les gabarits : ses deux
  // fleches choisissent la section, son nom central ouvre et ferme le panneau sans en changer.
  // Les onglets du panneau ont disparu : deux commandes pour une meme chose, c'etaient deux
  // etats a tenir d'accord. Une fleche deplie toujours le panneau — changer de section sans
  // rien voir apparaitre serait deroutant.
  const basculerPanneau = useCallback(() => {
    setPreferences((p) => Pref.regler(p, 'replie', !p.panneau.replie))
  }, [])
  // Changer d'onglet referme la modale ouverte : revenir sur Magasin en laissant Lumiere
  // posee par-dessus la boutique n'aurait aucun sens.
  const choisirOnglet = useCallback((cle) => {
    setPreferences((p) => Pref.regler(Pref.regler(p, 'onglet', cle), 'replie', false))
    setReglageOuvert(null)
  }, [])
  const ouvrirEditeur = useCallback(() => {
    // la modale couvre l'ecran : on ne peut pas placer un bouton qu'on ne voit pas
    setReglageOuvert(null)
    setPreferences((p) => {
      setEdition({ brouillon: { ...(p.ui || {}) }, selection: null })
      return p
    })
  }, [])
  const deplacerUI = useCallback((cle, valeur) => {
    setEdition((e) => (e ? { ...e, brouillon: { ...e.brouillon, [cle]: valeur } } : e))
  }, [])
  const choisirUI = useCallback((cle) => {
    setEdition((e) => (e ? { ...e, selection: cle } : e))
  }, [])
  const validerUI = useCallback(() => {
    setEdition((e) => {
      if (e) setPreferences((p) => Pref.regler(p, 'ui', e.brouillon))
      return null
    })
  }, [])
  const annulerUI = useCallback(() => setEdition(null), [])
  const reinitUI = useCallback(() => {
    setEdition((e) => (e ? { ...e, brouillon: {}, selection: null } : e))
  }, [])

  // Entrer en mode photo ferme sa propre modale, sinon elle resterait posee sur la photo.
  const basculerPhoto = useCallback((v) => {
    setPhoto(v)
    if (v) setReglageOuvert(null)
  }, [])

  // En deplacement manuel, la barre Magasin / Reglages reste visible mais le PANNEAU ne
  // s'ouvre que si on le demande : affiche en permanence, il couvrirait la vue pendant qu'on
  // marche, et sur telephone il descendrait sur la manche gauche. Entrer ou sortir du mode
  // manuel le remet toujours a l'etat ferme.

  // Choisir une categorie pendant un deplacement manuel doit emmener a cette vue. Or la sortie
  // du mode manuel ramene TOUJOURS la camera au hub (Scene.jsx) : on retient donc la vue
  // demandee et on l'applique une fois le retour termine, ce qui donne un mouvement continu
  // du point ou l'on se trouve vers la vue choisie.
  const vueApresRetour = useRef(null)

  // Un seul lecteur pour toute la session. Le detruire et le recreer couperait le son a
  // chaque changement d'ecran, ce que personne ne veut.
  useEffect(() => {
    // surFin : un morceau s'acheve sans boucle, on enchaine sur le suivant de la file.
    const l = creerLecteur({
      surEtat: setEtatLecteur,
      surFin: () => setPlaylist((p) => {
        const v = voisin(p, 1, false)
        if (!v) { setMusique((q) => ({ ...q, actif: false })); return p }
        lecteurRef.current?.definirMorceau(v, { jouer: true })
        return { ...p, courant: v.id }
      }),
    })
    // Position des colonnes, relevee sur la geometrie a l'export : le son 3D part d'ou le
    // visiteur les voit, sans aucune coordonnee ecrite en dur cote web.
    l.definirEnceintes(manifeste?.enceintes ?? window.__meta?.enceintes)
    lecteurRef.current = l
    window.__lecteur = l          // diagnostic et tests : l'element audio n'est pas dans le document
    return () => { l.detruire(); lecteurRef.current = null; window.__lecteur = null }
  }, [])

  useEffect(() => { lecteurRef.current?.definirVolume(musique.volume) }, [musique.volume])
  useEffect(() => { lecteurRef.current?.definirMode(musique.mode) }, [musique.mode])
  useEffect(() => { ecrireMusique(stockage(), musique, boutiqueId) }, [musique, boutiqueId])
  useEffect(() => { lecteurRef.current?.definirBoucle(playlist.boucle) }, [playlist.boucle])
  useEffect(() => { depot.enregistrer(playlist) }, [playlist, depot])

  // Le morceau courant est confie au lecteur, qui choisit tout seul l'ambiance locale ou le
  // lecteur YouTube. On ne relance la lecture que si elle etait deja en cours.
  const enLecture = etatLecteur.joue
  useEffect(() => {
    if (!morceauCourant) return
    lecteurRef.current?.definirMorceau(morceauCourant, { jouer: musique.actif && enLecture })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morceauCourant?.id])

  // Marche/arret. L'appel part du clic lui-meme, sans passer par un effet : c'est exactement
  // le geste que le navigateur exige pour autoriser le son. Depuis un effet, il arriverait
  // une image trop tard et serait refuse.
  const basculerMusique = useCallback(() => {
    const actif = !musique.actif
    setMusique((m) => ({ ...m, actif }))
    if (actif) lecteurRef.current?.jouer()
    else lecteurRef.current?.pause()
  }, [musique.actif])
  const choisirVolume = useCallback((v) => setMusique((m) => ({ ...m, volume: v })), [])

  // --- playlist : ajouter, supprimer, mettre en favori, changer de morceau, boucler
  const choisirMorceau = useCallback((id, lancer = true) => {
    setPlaylist((p) => ({ ...p, courant: id }))
    const m = morceauParId(playlist, id)
    if (m && lancer) {
      setMusique((q) => ({ ...q, actif: true }))
      lecteurRef.current?.definirMorceau(m, { jouer: true })
    }
  }, [playlist])

  // Un saut demande a la main : a l'interieur d'une playlist YouTube on passe d'un titre a
  // l'autre, et seulement une fois au bout on change de morceau dans la file.
  const sauter = useCallback((sens) => {
    if (lecteurRef.current?.sautInterne(sens)) return
    const v = voisin(playlist, sens, playlist.boucle)
    if (!v) { lecteurRef.current?.pause(); setMusique((q) => ({ ...q, actif: false })); return }
    choisirMorceau(v.id, true)
  }, [playlist, choisirMorceau])

  const basculerBoucle = useCallback(() => setPlaylist((p) => ({ ...p, boucle: !p.boucle })), [])
  const basculerFavori = useCallback((id) => setPlaylist((p) => bascFav(p, id)), [])
  const supprimerMorceau = useCallback((id) => setPlaylist((p) => supprimer(p, id)), [])

  /**
   * Ajoute un lien colle. Renvoie un message d'erreur, ou null si tout va bien.
   * Le doublon se teste sur la playlist telle qu'elle est MAINTENANT : une variable
   * renseignee a l'interieur d'un setState serait lue avant que React n'ait execute la
   * mise a jour, et le message ne partirait pas.
   */
  const ajouterLien = useCallback(async (saisie) => {
    const lien = lireLienYoutube(saisie)
    if (!lien) return 'Lien YouTube non reconnu'
    const m = creerMorceauYoutube(lien)
    if (file(playlistRef.current).some((x) => x.id === m.id)) {
      return 'Ce morceau est déjà dans la playlist'
    }
    setPlaylist((p) => ajouter(p, m))
    // le vrai titre arrive ensuite, sans bloquer l'ajout
    const titre = await lireTitre(lien)
    if (titre) setPlaylist((p) => renommer(p, m.id, titre))
    return null
  }, [])
  const choisirModeAudio = useCallback((k) => setMusique((m) => ({ ...m, mode: k })), [])
  const choisirDiffusion = useCallback((k) => setMusique((m) => ({ ...m, diffusion: k })), [])
  // L'oreille suit la camera. Appel direct, sans etat React : la scene le declenche depuis sa
  // boucle de rendu, un setState a 30 Hz redessinerait l'interface pour rien.
  // Le pas de temps REEL remonte jusqu'au lissage du volume YouTube : a vingt images par
  // seconde il vaut 0,05 s et non 1/30, et un lissage cale sur la mauvaise duree s'entend.
  // L'attenuation ne vaut que DANS la boutique : a la facade le visiteur est dehors, il n'y a
  // pas de colonnes autour de lui.
  const surEcoute = useCallback((p, avant, haut, dt) => {
    lecteurRef.current?.majEcoute(p, avant, haut, dt, etapeRef.current === 'boutique')
  }, [])

  // DPR par niveau, borne par le DPR natif ; reactif (prop du Canvas)
  const dpr = Math.min(REGLAGES[niveauEffectif].dpr, typeof window !== 'undefined' ? window.devicePixelRatio : 1)

  const onPret = useCallback(() => {
    setPret(true)
    // performance.now() a pour origine le debut de la navigation : le chargement affiche
    // comprend index.html et le bundle, pas seulement le GLB
    setChargement((c) => ({ ...c, glb: performance.now() }))
  }, [])
  // Le renderer est cree par une fonction : R3F ne reapplique alors jamais la prop gl a chaque
  // rendu de App (avec un objet, is.equ(glConfig, gl) est toujours faux et toneMappingExposure
  // serait remis a 1,0 toutes les 0,5 s, ecrasant les touches +/-).
  const creerRenderer = useCallback((canvas) => new THREE.WebGLRenderer({ canvas, antialias, powerPreference: 'high-performance' }), [antialias])
  const onCree = useCallback(({ gl }) => { gl.toneMapping = TONE; gl.toneMappingExposure = expoRef.current; window.__gl = gl }, [])
  useEffect(() => { if (window.__gl) window.__gl.toneMappingExposure = expo }, [expo])

  // --- qualite : sonde, gouverneur, application. Le choix se fait dans Reglages > Qualite
  //     d'image, seul endroit ou il vit depuis le nettoyage de l'interface.
  const choisirMode = useCallback((k) => {
    if (!MODES.includes(k)) return
    memoriserMode(stockage(), k)
    setReglageOuvert(null)
    setQualite((q) => (k === 'auto'
      ? { ...q, mode: 'auto', niveau: q.niveauAuto, raison: q.raisonAuto, sonder: q.sonderAuto }
      : { ...q, mode: k, niveau: k, raison: 'manuel', sonder: false }))
  }, [])

  const onSonde = useCallback((m3) => {
    const n = niveauSonde(m3)
    const raison = `sonde ${m3.toFixed(0)} ms`
    memoriserDecision(stockage(), { niveau: n, raison: 'sonde', gpu: detection.gpu, ecran: detection.ecran })
    setQualite((q) => ({
      ...q, niveauAuto: n, raisonAuto: raison, sonderAuto: false, sonder: false,
      ...(q.mode === 'auto' ? { niveau: n, raison } : {}),
    }))
  }, [detection])

  const onDescente = useCallback((n) => {
    memoriserDecision(stockage(), { niveau: n, raison: 'gouverneur', gpu: detection.gpu, ecran: detection.ecran })
    setQualite((q) => (q.mode === 'auto'
      ? { ...q, niveau: n, niveauAuto: n, raison: 'gouverneur', raisonAuto: 'gouverneur', sonder: false, sonderAuto: false }
      : q))
  }, [detection])

  const onNiveauApplique = useCallback((n, infos) => {
    setNiveauEffectif(n)
    setChargement((c) => ({ ...c, niveau: infos?.t ?? 0 }))
  }, [])

  // expose pour les tests et le diagnostic
  useEffect(() => {
    window.__qualite = {
      mode: qualite.mode, niveau: qualite.niveau, niveauApplique: niveauEffectif, niveauAuto: qualite.niveauAuto,
      raison: qualite.raison, sonder: qualite.sonder, gpu: detection.gpu, gpuCourt: detection.gpuCourt,
      mobile: detection.mobile, antialias, dpr, chargement,
      fps: { moyen: m.fps, min: m.fpsMin, unPourcent: m.fps1, ms: m.ms },
    }
  }, [qualite, niveauEffectif, detection, antialias, dpr, chargement, m])

  useEffect(() => {
    window.__musique = { ...musique, ...etatLecteur, voie: lecteurRef.current?.voie() ?? null,
                         spatialisable: lecteurRef.current?.spatialisable() ?? true }
    window.__playlist = { ...playlist, file: file(playlist).map((m) => m.id) }
  }, [musique, etatLecteur, playlist])

  useEffect(() => { window.__lumiere = { ...lumiere, teinte: Lum.teinte(lumiere.chaleur) } }, [lumiere])

  // --- base de donnees : une ligne par boutique, toutes les sections dans le meme objet.
  //     Une seule lecture au demarrage, une seule ecriture groupee ensuite. Tout ce qui
  //     revient de la base repasse par le MEME validateur que le cache local : une ligne
  //     abimee ne doit pas pouvoir casser la boutique.
  //
  //     QUI GAGNE, L APPAREIL OU LA BOUTIQUE ? La reponse depend de QUI fournit l acces.
  //
  //     Acces fourni par un HOTE (`accesModele`) — Talvex : la BOUTIQUE gagne. Ses reglages
  //     sont poses par son proprietaire, depuis une application qui authentifie ses
  //     utilisateurs ; ils valent pour tous ses visiteurs et sur tous leurs appareils. Un
  //     appareil qui ouvre la boutique pour la premiere fois doit voir la boutique telle que
  //     son proprietaire l a laissee, pas des valeurs d usine.
  //
  //     Acces construit par le MOTEUR — Johanna autonome : l APPAREIL garde la main. Personne
  //     n y est authentifie, n importe quel visiteur peut ajouter un morceau a la playlist
  //     depuis son navigateur, et adopter la ligne publiee ecraserait son travail jusque dans
  //     son propre cache. On n adopte donc une section que si ce navigateur n en a aucune
  //     trace. C est le comportement d origine, inchange.
  //
  //     DANS LES DEUX CAS, RIEN N EST ECRIT AVANT QUE CETTE LECTURE N AIT REPONDU. Sans ce
  //     verrou, l ecriture groupee partait 900 ms apres le montage avec l etat local — donc
  //     les valeurs par defaut d un appareil neuf — et remplacait la ligne du proprietaire.
  //     Mesure avant correctif : playlist.boucle publie a false, relu a true apres la simple
  //     visite d un second appareil, sans qu on ait touche a quoi que ce soit.
  const [lectureFaite, setLectureFaite] = useState(false)
  // Ce que la base connait, sous une forme comparable. Sert a ne PAS reecrire ce qu on vient
  // de lire : ouvrir une boutique ne doit jamais modifier ses reglages.
  const signatureSections = (x) => JSON.stringify([x?.playlist, x?.musique, x?.lumiere, x?.televisions])
  const derniereEcriture = useRef(null)
  // Le volume est un reglage de l APPAREIL : il ne part jamais en base et ne doit donc jamais
  // etre repris de la base. `lire` de musique.js retombe sur le volume par defaut quand la
  // valeur manque — et elle manque toujours, puisqu on la retire avant d ecrire.
  const volumeLocal = useRef(0)
  volumeLocal.current = musique.volume
  useEffect(() => {
    if (!acces) {
      setLectureFaite(true)
      if (typeof window !== 'undefined') window.__base = { branchee: false, ecritureActive: !!accesModele || ECRITURE_ACTIVE }
      return
    }
    let vivant = true
    acces.lire(boutiqueId).then((d) => {
      if (!vivant) return
      // `undefined` veut dire « je n ai pas pu savoir » (reseau, droits), `null` veut dire
      // « il n y a pas de ligne ». Les deux se ressemblent et ne se valent pas : apres un
      // echec on ne sait pas ce que contient la base, donc on n y ecrit rien de la session.
      if (d === undefined) {
        window.__base = { branchee: true, lecture: 'echec', ecriture: 'fermee apres echec de lecture',
                          ecritureActive: !!accesModele || ECRITURE_ACTIVE }
        return
      }
      const laBoutiqueGagne = !!accesModele
      const adoptees = []
      const retenu = { playlist: undefined, musique: undefined, lumiere: undefined, televisions: undefined }
      if (d && typeof d === 'object') {
        // Quand l hote fournit l acces, aucune garde : la boutique est la source de verite,
        // section par section. Ce que la ligne ne contient pas reste ce que l appareil avait.
        // Sinon, ADOPTION PRUDENTE : on n adopte une section que si ce navigateur n en a
        // aucune trace — premiere visite sur un appareil, on recoit la configuration de la
        // boutique ; des qu on a touche a quelque chose, le local garde la main.
        const vierge = (cle) => {
          if (laBoutiqueGagne) return true
          try { return !stockage()?.getItem(`${cle}.${boutiqueId}`) } catch { return false }
        }
        if (d.playlist && vierge('johanna.playlist')) {
          retenu.playlist = { ...lirePlaylist(d.playlist), boutique: boutiqueId }
          setPlaylist(retenu.playlist); adoptees.push('playlist')
        }
        // La musique a sa propre garde : sa cle locale n a pris le suffixe de boutique que
        // recemment, et un visiteur de longue date n a encore que l ancienne. `aDesReglages`
        // regarde les DEUX, sans quoi il passerait pour neuf et se ferait ecraser.
        const musiqueVierge = laBoutiqueGagne || !aDesReglagesMusique(stockage(), boutiqueId)
        if (d.musique && musiqueVierge) {
          // le volume reste celui de CET appareil, quoi que dise la base
          retenu.musique = { ...lireMusiquePur(d.musique), volume: volumeLocal.current }
          setMusique(retenu.musique); adoptees.push('musique')
        }
        if (d.lumiere && vierge('johanna.lumiere')) {
          retenu.lumiere = Lum.lire(d.lumiere); setLumiere(retenu.lumiere); adoptees.push('lumiere')
        }
        if (d.televisions && vierge('johanna.televisions')) {
          retenu.televisions = Tv.lire(d.televisions); setTelevisions(retenu.televisions); adoptees.push('televisions')
        }
        // Les PREFERENCES ne sont jamais adoptees : taille et opacite des manches, disposition
        // posee au doigt, vitesse de marche, mesures. Elles appartiennent a l appareil qui
        // regarde, pas a la boutique regardee. Le volume non plus, voir ci-dessus.
      }
      // L etat tel que la base le connait DESORMAIS : ce qu on vient d adopter, et pour le
      // reste ce que l appareil avait deja. L ecriture groupee compare a ceci et se tait tant
      // que rien n a bouge — ouvrir une boutique ne modifie donc pas ses reglages.
      const m = retenu.musique ? { ...retenu.musique } : null
      if (m) delete m.volume
      derniereEcriture.current = signatureSections({
        // meme forme des deux cotes de la comparaison, sinon elle differe toujours
        playlist: retenu.playlist ? serialiserPlaylist(retenu.playlist) : sections.current.playlist,
        musique: m ?? sections.current.musique,
        lumiere: retenu.lumiere ?? sections.current.lumiere,
        televisions: retenu.televisions ?? sections.current.televisions,
      })
      setLectureFaite(true)
      window.__base = { branchee: true, ligne: !!(d && typeof d === 'object'),
                        regle: laBoutiqueGagne ? 'la boutique gagne' : 'l appareil garde la main',
                        sections: d && typeof d === 'object' ? Object.keys(d) : [], adoptees,
                        lectureFaite: true, ecritures: 0,
                        ecritureActive: !!accesModele || ECRITURE_ACTIVE }
    })
    return () => { vivant = false }
  }, [acces])

  // Ecriture groupee : taper un lien YouTube ne doit pas poster vingt fois de suite.
  //
  // QUI A LE DROIT D'ECRIRE. Le drapeau ECRITURE_ACTIVE protege la couche que le moteur
  // construit LUI-MEME : elle ne dispose que d'une cle anonyme, et l'ouvrir laisserait n'importe quel
  // visiteur remplacer les reglages de la boutique. Cette garde reste fermee.
  //
  // Un acces FOURNI par l'hote est d'une autre nature : il vient d'une application qui
  // authentifie ses utilisateurs et qui a ses propres regles de securite cote base. L'hote se
  // porte garant en le passant ; le moteur n'a pas a lui opposer une protection concue pour un
  // cas qui n'est pas le sien.
  // CE QUI PART EN BASE : ce que le PROPRIETAIRE decide et qui vaut pour tous ses visiteurs.
  // Ce qui n'y part pas, et pourquoi :
  //   - `preferences` : taille et opacite des manches, disposition posee au doigt, vitesse de
  //     marche, affichage des mesures. Ce sont des reglages de l'APPAREIL qui regarde. Les
  //     publier reviendrait a servir a tous les visiteurs les reglages tactiles d'un seul —
  //     c'est le seul defaut du dossier qui produisait un degat visible pour un client final.
  //   - `volume` : il depend du casque et du lieu, pas de la boutique.
  // Les deux restent enregistres localement, exactement comme avant.
  const musiqueBoutique = { ...musique }
  delete musiqueBoutique.volume
  // La playlist part en base sous sa forme SORTANTE, `v: 1` compris — sans quoi la relire
  // rend les valeurs par defaut (voir serialiser() dans playlist.js). Les trois autres
  // sections n ont pas de garde de version : leur lecteur pur accepte la forme en memoire.
  sections.current = { playlist: serialiserPlaylist(playlist), musique: musiqueBoutique,
                       lumiere, televisions }
  const ecritureOuverte = !!accesModele || ECRITURE_ACTIVE
  useEffect(() => {
    if (!acces || !ecritureOuverte) return undefined
    // DEUX VERROUS, ET LES DEUX COMPTENT.
    //   - `lectureFaite` : tant que la base n a pas repondu, on ne sait pas ce qu elle
    //     contient, et l etat local n est qu un defaut d usine. Ecrire la-dessus effacerait
    //     la configuration du proprietaire.
    //   - la signature : apres la lecture, l etat EST celui de la base. Reecrire a
    //     l identique ne changerait rien au contenu mais toucherait `maj` a chaque
    //     ouverture. Une boutique qu on ouvre et qu on referme sort intacte.
    if (!lectureFaite) return undefined
    const sig = signatureSections(sections.current)
    if (sig === derniereEcriture.current) return undefined
    // POURQUOI cette boutique ecrit-elle ? La question se pose des qu une ecriture part sans
    // qu on ait touche a un reglage : on publie donc la section qui a bouge, et ses deux
    // valeurs. Sans cela, « une ecriture est partie » est un constat sans suite.
    if (typeof window !== 'undefined') {
      const noms = ['playlist', 'musique', 'lumiere', 'televisions']
      let quoi = null
      try {
        const a = JSON.parse(derniereEcriture.current || '[]'), b = JSON.parse(sig)
        for (let i = 0; i < noms.length; i++) {
          const x = JSON.stringify(a[i]), y = JSON.stringify(b[i])
          if (x !== y) { quoi = { section: noms[i], avant: x, apres: y }; break }
        }
      } catch { /* premiere ecriture, rien a comparer */ }
      window.__base = { ...window.__base, changement: quoi }
    }
    const t = setTimeout(() => {
      acces.ecrire(boutiqueId, sections.current).then((ok) => {
        if (ok) derniereEcriture.current = sig
        if (typeof window !== 'undefined') {
          window.__base = { ...window.__base, ecriture: ok,
                            ecritures: (window.__base?.ecritures || 0) + 1 }
        }
      })
    }, REPORT_MS)
    return () => clearTimeout(t)
  }, [acces, ecritureOuverte, lectureFaite, boutiqueId, playlist, musique, lumiere, televisions])

  // La video ne part sur la grande tele que si TOUT est reuni : le mode le demande, un morceau
  // YouTube est charge, et la grande tele est allumee. Eteindre la tele coupe donc l'image et
  // laisse le son — ce qui est exactement ce qu'on attend d'un televiseur eteint.
  const diffuser = etape === 'boutique'
    && musique.diffusion === 'tele'
    && etatLecteur.origine === 'youtube' && !!etatLecteur.morceau
    && Tv.estAllumee(televisions, Tv.GRANDE.cle)
  // `etape` est dans la condition : a la facade et pendant l'animation d'entree, la video se
  // verrait a travers la devanture. Le verre de la vitrine est transparent et n'ecrit pas la
  // profondeur : il ne boucherait pas le trou.
  const diffuserRef = useRef(diffuser)
  diffuserRef.current = diffuser

  useEffect(() => {
    window.__televisions = { ...televisions, diffuser, diffusion: musique.diffusion }
  }, [televisions, diffuser, musique.diffusion])

  const entrer = useCallback(() => { if (etape === 'facade') setEtape('entree') }, [etape])
  // On reprend la categorie laissee a la visite precedente, pas systematiquement le hub :
  // elle fait partie des preferences que le client veut voir survivre.
  const onEntreeFinie = useCallback(() => { setEtape('boutique') }, [])
  const rejouer = useCallback(() => { setVue('hub'); setEtape('facade') }, [setVue])

  // le mode manuel n'existe que dans la boutique : tout changement d'etape le referme
  useEffect(() => { if (etape !== 'boutique') setManuel(false) }, [etape])

  // En entrant dans la boutique, on reprend l'ambiance si le visiteur l'avait laissee en
  // marche lors d'une visite precedente. Le clic sur "Entrer" fait office de geste.
  // Volontairement sur `etape` seul : les changements voulus passent par basculerMusique.
  useEffect(() => {
    if (etape === 'boutique' && musique.actif) lecteurRef.current?.jouer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  // sortie du mode manuel : les manches et le clavier repartent de zero (un doigt encore pose
  // ou une touche encore enfoncee ne doit pas laisser une consigne de deplacement en memoire)
  useEffect(() => {
    if (manuel) return
    const e = entrees.current
    e.gauche.x = 0; e.gauche.y = 0; e.droit.x = 0; e.droit.y = 0
    e.souris.dx = 0; e.souris.dy = 0; e.souris.tenu = false
    for (const k in e.touches) e.touches[k] = false
  }, [manuel])

    /**
   * La boutique a-t-elle le clavier ?
   *
   * Ses raccourcis — Espace, Echap, Entree, +, - et, en mode manuel, W/A/S/D/Q/E — sont poses
   * sur `window`. Il le faut : une scene 3D n'est pas un element focusable, et le visiteur
   * s'attend a ce qu'ils repondent sans avoir a cliquer quelque part d'abord.
   *
   * Seule, la boutique peut se le permettre. INTEGREE dans une autre application, elle
   * cohabite avec une barre laterale, un en-tete, des boutons et des champs de saisie : taper
   * « s » dans un champ ne doit pas faire reculer la camera, et Echap doit fermer la fenetre
   * de l'hote avant de quitter le mode manuel.
   *
   * La regle tient en une phrase : on ignore la touche des qu'un AUTRE element a le focus. Le
   * corps du document ne compte pas — c'est l'etat normal apres un clic dans la scene. Sans
   * cadre (cas qui n'existe plus, mais qui coutait une regression si on l'oubliait), on laisse
   * passer, comme avant.
   */
  const boutiqueALeClavier = useCallback((e) => {
    const c = e.target
    if (c instanceof HTMLElement && (c.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(c.tagName))) return false
    const cadreEl = cadreRef.current
    if (!cadreEl) return true
    const a = document.activeElement
    if (!a || a === document.body || a === document.documentElement) return true
    return cadreEl.contains(a)
  }, [])

  // clavier du mode manuel (bureau) : bonus, sans toucher a Espace (photo) ni a S (stats)
  useEffect(() => {
    if (!manuel) return
    const t = entrees.current.touches
    // La garde n'est posee qu'a l'APPUI. Au relachement on libere toujours : une touche
    // relachee pendant que le focus est ailleurs resterait sinon enfoncee pour toujours, et le
    // visiteur avancerait tout seul.
    const bas = (e) => {
      if (!boutiqueALeClavier(e)) return
      const k = TOUCHES_MANUEL[e.code]; if (k) { t[k] = true; e.preventDefault() }
    }
    const haut = (e) => { const k = TOUCHES_MANUEL[e.code]; if (k) t[k] = false }
    // sans cela, un alt-tab pendant une touche enfoncee laisse la consigne active : le
    // visiteur continue d'avancer tout seul au retour, le keyup etant parti ailleurs
    const vider = () => { for (const k in t) t[k] = false }
    window.addEventListener('keydown', bas)
    window.addEventListener('keyup', haut)
    window.addEventListener('blur', vider)
    document.addEventListener('visibilitychange', vider)
    return () => {
      window.removeEventListener('keydown', bas)
      window.removeEventListener('keyup', haut)
      window.removeEventListener('blur', vider)
      document.removeEventListener('visibilitychange', vider)
      vider()
    }
  }, [manuel])

  // souris du mode manuel (bureau) : la vue ne tourne QUE clic gauche maintenu et glisse.
  // On accumule des deltas en pixels ; la scene les consomme a l'image suivante, ce qui donne
  // une rotation au 1 pour 1, sans a-coup ni derive quand le bouton est relache.
  useEffect(() => {
    if (!manuel) return
    const s = entrees.current.souris
    const toile = document.querySelector('canvas')
    if (!toile) return
    let dernier = null
    const debut = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      dernier = { x: e.clientX, y: e.clientY }
      s.tenu = true
      toile.setPointerCapture?.(e.pointerId)
      e.preventDefault()
    }
    const bouge = (e) => {
      if (!dernier || e.pointerType !== 'mouse') return
      s.dx += e.clientX - dernier.x
      s.dy += e.clientY - dernier.y
      dernier.x = e.clientX; dernier.y = e.clientY
    }
    const fin = () => { dernier = null; s.tenu = false; s.dx = 0; s.dy = 0 }
    toile.addEventListener('pointerdown', debut)
    window.addEventListener('pointermove', bouge)
    window.addEventListener('pointerup', fin)
    window.addEventListener('pointercancel', fin)
    window.addEventListener('blur', fin)
    toile.style.cursor = 'grab'
    return () => {
      toile.removeEventListener('pointerdown', debut)
      window.removeEventListener('pointermove', bouge)
      window.removeEventListener('pointerup', fin)
      window.removeEventListener('pointercancel', fin)
      window.removeEventListener('blur', fin)
      toile.style.cursor = ''
      fin()
    }
  }, [manuel])

  useEffect(() => {
    const k = (e) => {
      // Un champ de saisie, ou n'importe quel element de l'hote qui a le focus, garde sa
      // touche : voir `boutiqueALeClavier`. Sur un BOUTON DE LA BOUTIQUE, Espace reste le
      // raccourci global comme avant — seul le nom de section l'arrete lui-meme, parce que
      // perdre l'interface entiere sous le doigt serait sans retour.
      if (!boutiqueALeClavier(e)) return
      if (e.code === 'Space') { e.preventDefault(); setPhoto((v) => !v) }
      // Echap replie d'abord ce qui est ouvert par-dessus, puis seulement ensuite quitte le
      // mode manuel ou ramene a la vue principale.
      if (e.key === 'Escape') {
        if (reglageOuvert) setReglageOuvert(null)
        else if (manuel) setManuel(false)
        else setVue('hub')
      }
      if (e.key === 'Enter' && etape === 'facade') entrer()
      // +/- nudgent la MEME exposition que la section Lumiere ; les bornes sont donc celles
      // du reglage, appliquees de toute facon par `Lum.regler`. Les repeter ici plus larges
      // ne ferait que decrire un comportement qui n'existe plus.
      const B = Lum.BORNES.intensite
      if (e.key === '+') setExpo((v) => Math.min(B.max, +(v * 1.25).toFixed(3)))
      if (e.key === '-') setExpo((v) => Math.max(B.min, +(v / 1.25).toFixed(3)))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [etape, entrer, manuel, reglageOuvert, boutiqueALeClavier])

  // --- molette : vitesse de marche pendant le deplacement manuel.
  //     L'ecouteur est pose sur la fenetre en NON passif pour pouvoir retenir le defilement de
  //     la page, mais il sort tout de suite si le pointeur est au-dessus d'un panneau qui
  //     defile (le panneau de gauche a overflow: auto) : la molette doit continuer d'y servir
  //     a lire. Hors mode manuel elle ne fait rien du tout.
  useEffect(() => {
    if (!manuel || etape !== 'boutique') return undefined
    const toile = window.__gl?.domElement
    if (!toile) return undefined
    const surMolette = (e) => {
      e.preventDefault()
      const v = vitesseApresMolette(vitesseRef.current, -e.deltaY)
      choisirVitesse(v)
      setBarre(v)
      clearTimeout(minuterieBarre.current)
      minuterieBarre.current = setTimeout(() => setBarre(null), 1400)
    }
    // pose sur la TOILE et non sur la fenetre : un panneau de reglages ouvert continue donc de
    // defiler a la molette, sans qu'on ait a exclure sa zone a la main.
    toile.addEventListener('wheel', surMolette, { passive: false })
    return () => {
      toile.removeEventListener('wheel', surMolette)
      clearTimeout(minuterieBarre.current)
    }
  }, [manuel, etape, choisirVitesse])

  // quitter le mode manuel efface la barre : elle n'a plus de sens
  useEffect(() => { if (!manuel) { clearTimeout(minuterieBarre.current); setBarre(null) } }, [manuel])



  // Disposition affichee : le brouillon pendant l'edition, sinon ce qui est enregistre. Un
  // element absent garde la place du gabarit, qui suit l'ecran et l'orientation.
  const disposition = edition ? edition.brouillon : (preferences.ui || {})
  // On passe par des VARIABLES CSS plutot que par un style sur chaque composant : le retour a
  // l'entree, le bouton de deplacement et le lecteur gardent ainsi leur code tel quel.
  const varsUI = {}
  for (const [cle, v] of Object.entries(disposition)) {
    varsUI[`--ui-${cle}-x`] = `${v.x * 100}%`
    varsUI[`--ui-${cle}-y`] = `${v.y * 100}%`
    varsUI[`--ui-${cle}-t`] = String(v.taille ?? 1)
  }
  const clesUI = Object.keys(disposition).join(' ')

  // Un seul sac de proprietes pour les reglages : la liste du panneau et le contenu de la
  // modale parlent au MEME etat. Deux listes de trente proprietes finiraient par diverger.
  const propsReglages = {
    qualite, onChoisirMode: choisirMode,
    musique, etatLecteur, onBasculerMusique: basculerMusique,
    onVolume: choisirVolume, onMode: choisirModeAudio,
    playlist, morceauCourant, onChoisirMorceau: choisirMorceau, onSauter: sauter,
    onBoucle: basculerBoucle, onFavori: basculerFavori,
    onSupprimer: supprimerMorceau, onAjouterLien: ajouterLien,
    lumiere, onAmbiance: choisirAmbiance,
    onReglerLumiere: reglerLumiere, onReinitLumiere: reinitLumiere,
    televisions, onBasculerTele: basculerTele,
    onToutesTeles: toutesTeles, onDiffusion: choisirDiffusion,
    preferences, onVitesse: choisirVitesse,
    onMesures: choisirMesures, onManches: choisirManches,
    onPosition: poserBouton, tactile,
    cadrage: mode, onCadrage: setMode,
    exposition: expo, onExposition: setExpo,
    photo, onPhoto: basculerPhoto,
    onPersonnaliser: ouvrirEditeur,
  }

  return (
    // Le cadre de la boutique. Tout ce qui suit se pose SUR LUI et non sur la fenetre : c'est
    // ce qui permet de monter la boutique dans la colonne d'une autre application sans qu'elle
    // recouvre la barre laterale. En autonome il a la boite de la fenetre, au pixel.
    <div className="boutique3d" data-test="boutique3d" ref={setCadre}>
      {/* Couche de la video YouTube. Elle est posee AVANT le canvas, donc derriere lui, et ne
          recoit aucun evenement de pointeur : le clic gauche maintenu du mode manuel continue
          d'aller au canvas. Elle n'est visible qu'a travers le trou perce dans le rendu. */}
      <div className="tele-scene" ref={setHoteVideo} />

      <Canvas dpr={dpr} gl={creerRenderer}
              camera={{ fov: 45, near: 0.05, far: 80 }} onCreated={onCree}>
        <Suspense fallback={null}>
          <Scene manifeste={manifeste}
                 etape={etape} vueActive={vue} mode={mode} onPret={onPret} onMesure={maj} onEntreeFinie={onEntreeFinie}
                 qualite={qualite} onSonde={onSonde} onDescente={onDescente} onNiveauApplique={onNiveauApplique}
                 manuel={manuel} vitesse={vitesse} entrees={entrees} surEcoute={surEcoute} lumiereRef={lumiereRef}
                 televisionsRef={televisionsRef} diffuserRef={diffuserRef} ecranVideo={ecranVideo}
                 onRetourFini={retourAuHub} />
        </Suspense>
        <Mesures onMesure={maj} actif={stats} etape={etape} reinit={niveauEffectif} />
      </Canvas>

      {!pret && <div className="chargement">CHARGEMENT DE LA BOUTIQUE…</div>}

      <div className={`ui etape-${etape}${photo ? ' photo' : ''}${manuel ? ' manuel' : ''}`
                      + `${edition ? ' edition' : ''}`}
           data-etape={etape} data-manuel={manuel} data-onglet={onglet}
           data-reglage={reglageOuvert || ''} data-ui={clesUI}
           style={{ '--bande-manches': `${bandeManches}px`, ...varsUI }}>
        {etape === 'facade' && pret && (
          <button className="entrer" onClick={entrer}>Entrer dans la boutique</button>
        )}

        {/* Panneau de gauche. Il ne porte plus d'onglets : le choix de section se fait
            UNIQUEMENT au selecteur du bas, a la fleche, sur tous les gabarits. Deux commandes
            pour une meme chose, c'etaient deux etats a tenir d'accord. Le panneau ne fait plus
            qu'une chose : montrer la liste de la section courante, et une seule a la fois.
            La cle sur le contenu le remonte a chaque bascule, ce qui relance le fondu sans
            toucher au Canvas. */}
        {!replie && (
        <nav className="menu" id="panneau-boutique" data-onglet={onglet} data-manuel={manuel}
             aria-label={onglet === 'magasin' ? 'Magasin' : 'Réglages'}>
          <div className="menu-tete">
            <button type="button" className="panneau-replier" data-test="panneau-replier"
                    aria-label="Réduire le menu" onClick={() => replier(true)}>
              <span aria-hidden="true">‹</span>
            </button>
          </div>
          <div className="menu-contenu" key={onglet}>
            {onglet === 'magasin'
              ? CATEGORIES.map(([k, label]) => (
                  <button key={k} data-actif={vue === k} onClick={() => choisirVue(k)}>{label}</button>
                ))
              : <Reglages {...propsReglages} ouvert={reglageOuvert} onOuvrir={setReglageOuvert} />}
          </div>
        </nav>
        )}

        {/* La modale d'un reglage vit ICI, hors du panneau : c'est ce qui garantit que le
            panneau garde exactement la meme taille, quel que soit le reglage ouvert. */}
        {etape === 'boutique' && edition && !photo && (
          <EditeurInterface cadre={cadre}
                            brouillon={edition.brouillon} selection={edition.selection}
                            onDeplacer={deplacerUI} onSelection={choisirUI}
                            onValider={validerUI} onAnnuler={annulerUI}
                            onReinitialiser={reinitUI} />
        )}

        {etape === 'boutique' && reglageOuvert && !photo && (
          <Modale titre={titreDe(reglageOuvert)} onFermer={() => setReglageOuvert(null)}>
            <ContenuReglage cle={reglageOuvert} {...propsReglages} />
          </Modale>
        )}

        {etape === 'boutique' && replie && (
          <button type="button" className="panneau-ouvrir" data-test="panneau-ouvrir"
                  aria-label="Ouvrir le menu" onClick={() => replier(false)}>
            <span aria-hidden="true">›</span>
          </button>
        )}

        {etape === 'boutique' && (
          <BarreSection cadre={cadre}
                        position={disposition.section} onDeplacer={poserBouton}
                        taille={disposition.section?.taille ?? 1}
                        ouvert={!replie} onBasculer={basculerPanneau}
                        onglet={onglet} onOnglet={choisirOnglet} />
        )}

        {etape === 'boutique' && vue !== 'hub' && (
          <button className="retour" onClick={() => choisirVue('hub')}>← Retour à la boutique</button>
        )}


        {/* Deplacement manuel : le bouton reste dans la vue, c'est une commande de visite et
            non un reglage technique. La VITESSE, elle, a quitte l'ecran : molette sur
            ordinateur, Reglages > Deplacement sur telephone. */}
        {etape === 'boutique' && (
          <div className="deplacement">
            {/* Une pastille ronde a l'icone de deplacement, la MEME sur tous les gabarits :
                un appui active le deplacement manuel, un second le coupe, et elle reste
                allumee tant qu'il est actif. Le libelle reste dans le DOM pour aria-label et
                title — c'est ce que lisent lecteur d'ecran et survol — mais quitte l'ecran :
                c'etait le plus gros bloc de texte permanent, et il masquait la boutique.
                Le nom, lui, ne change PAS avec l'etat : c'est `aria-pressed` qui le porte. Un
                libelle « Mode guidé » accompagne de aria-pressed=true s'annoncait « Mode guidé,
                active » — soit exactement l'inverse du mode reel. */}
            <button className="bouton-manuel" data-test="manuel" data-on={manuel}
                    aria-pressed={manuel}
                    aria-label="Déplacement manuel" title="Déplacement manuel"
                    onClick={() => setManuel((v) => !v)}>
              <span className="bouton-manuel-icone" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                     strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3.5 14.3 6h-4.6L12 3.5Z" fill="currentColor" stroke="none" />
                  <path d="M12 20.5 9.7 18h4.6L12 20.5Z" fill="currentColor" stroke="none" />
                  <path d="M3.5 12 6 9.7v4.6L3.5 12Z" fill="currentColor" stroke="none" />
                  <path d="M20.5 12 18 14.3V9.7l2.5 2.3Z" fill="currentColor" stroke="none" />
                  <path d="M12 5.4v13.2M5.4 12h13.2" />
                  <circle cx="12" cy="12" r="2.2" />
                </svg>
              </span>
            </button>
          </div>
        )}

        {/* lecteur discret : bord droit a mi-hauteur, le seul endroit libre dans tous les
            etats, y compris pendant un deplacement manuel. Sur telephone sa poignee n'ouvre
            plus un panneau colle a elle — il sortait de l'ecran des qu'on deplacait le bouton
            — mais la modale Musique, celle de Reglages > Musique, deja centree et bornee. */}
        <LecteurMusique musique={musique} etatLecteur={etatLecteur}
                        playlist={playlist} morceauCourant={morceauCourant}
                        onBasculer={basculerMusique} onVolume={choisirVolume}
                        onSauter={sauter} onBoucle={basculerBoucle}
                        onFavori={basculerFavori} onMode={choisirModeAudio}
                        onOuvrirModale={() => setReglageOuvert('musique')} />


        {manuel && !photo && tactile && <Joysticks cadre={cadre} onGauche={onGauche} onDroit={onDroit}
                       taille={preferences.manches.taille} opacite={preferences.manches.opacite}
                       onEncombrement={setBandeManches} />}
        {photo && tactile && (
          <button className="photo-sortie" data-test="photo-sortie"
                  aria-label="Quitter le mode photo"
                  onClick={() => setPhoto(false)} />
        )}

        {manuel && !photo && !tactile && (
          <p className="aide-manuel">W A S D se deplacer · E Q monter et descendre · clic gauche maintenu pour regarder</p>
        )}

        {/* Mesures techniques. Plus de bouton permanent : l'affichage suit Reglages > Mesures,
            et le panneau reprend exactement sa place habituelle en haut a droite. */}
        {stats && (
          <div className="coin-stats" data-test="coin-stats">
            <Hud m={m} qualite={qualite} niveauEffectif={niveauEffectif} chargement={chargement} gpu={detection.gpuCourt} />
          </div>
        )}

        {/* Barre de vitesse : elle n'existe que le temps du reglage a la molette. */}
        {barre !== null && (
          <div className="barre-vitesse" data-test="barre-vitesse" role="status" aria-live="polite">
            <span className="barre-vitesse-nom">Vitesse</span>
            <span className="barre-vitesse-jauge" aria-hidden="true">{barreVitesse(barre)}</span>
            <span className="barre-vitesse-valeur">{barre.toFixed(1)} m/s</span>
          </div>
        )}

        {/* Seule commande qui reste dans la vue : revoir l'entree. En icone, sans texte — le
            cadrage, l'exposition et le mode photo ont rejoint Reglages. */}
        {etape === 'boutique' && (
          <button className="revoir" data-test="revoir" onClick={rejouer}
                  title="Revoir l'entrée dans la boutique" aria-label="Revoir l'entrée">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11a9 9 0 1 1 2.3 6" />
              <path d="M3 4.5V11h6.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
