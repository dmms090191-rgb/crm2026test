// Modele de playlist : ce qu'on ecoute, dans quel ordre, ce qui est en favori.
// Module pur, sans DOM ni reseau : il se teste sans navigateur et sans YouTube.
//
// Un morceau a l'une de deux origines :
//   'ambiance' -> un fichier local de la boutique, joue par Web Audio, donc spatialisable.
//   'youtube'  -> une video ou une playlist, jouee par le lecteur YouTube dans son iframe.
//                 Son flux audio est hors de notre portee (iframe d'un autre domaine), il ne
//                 peut donc pas passer par nos deux tetes de spatialisation. Le Son 3D ne
//                 s'applique qu'aux ambiances, et l'interface le dit au lieu de faire semblant.
import { PISTES } from './musique.js'

export const CLE_PLAYLIST = 'johanna.playlist'      // version 1 du format
export const BOUTIQUE_DEFAUT = 'boutique-test'      // une playlist par boutique, des aujourd'hui

/** Morceaux integres a la boutique : toujours la, jamais supprimables. */
export const ambiances = () => PISTES.map((p) => ({
  id: 'amb:' + p.cle,
  origine: 'ambiance',
  cle: p.cle,
  titre: p.titre,
  detail: p.description,
  url: p.url,
  supprimable: false,
}))

// ---------------------------------------------------------------- lecture d'un lien
const ID_VIDEO = /^[A-Za-z0-9_-]{11}$/
const ID_LISTE = /^[A-Za-z0-9_-]{12,42}$/

/**
 * Reconnait un lien YouTube. Renvoie { genre:'video'|'playlist', id } ou null.
 * Accepte les formes courantes : youtube.com/watch?v=, youtu.be/, /shorts/, /embed/,
 * /playlist?list=, et un identifiant colle tel quel.
 */
export function lireLienYoutube(saisie) {
  const texte = String(saisie ?? '').trim()
  if (!texte) return null

  // identifiant colle sans URL
  if (ID_VIDEO.test(texte)) return { genre: 'video', id: texte }
  if (/^(PL|OL|UU|LL|FL|RD)[A-Za-z0-9_-]{10,}$/.test(texte)) return { genre: 'playlist', id: texte }

  let u
  try {
    u = new URL(texte.includes('://') ? texte : 'https://' + texte)
  } catch {
    return null
  }
  const hote = u.hostname.replace(/^www\.|^m\./, '').toLowerCase()
  if (!['youtube.com', 'youtu.be', 'music.youtube.com', 'youtube-nocookie.com'].includes(hote)) return null

  const liste = u.searchParams.get('list')
  const v = u.searchParams.get('v')
  const chemin = u.pathname.replace(/\/+$/, '')

  // Une URL de lecture qui porte AUSSI une liste : on privilegie la video demandee, sinon on
  // ajouterait la playlist entiere alors que le visiteur a colle un morceau precis.
  if (v && ID_VIDEO.test(v)) return { genre: 'video', id: v }
  if (chemin === '/playlist' && liste && ID_LISTE.test(liste)) return { genre: 'playlist', id: liste }

  const court = hote === 'youtu.be' ? chemin.slice(1) : null
  if (court && ID_VIDEO.test(court)) return { genre: 'video', id: court }

  const m = chemin.match(/^\/(shorts|embed|v|live)\/([A-Za-z0-9_-]{11})$/)
  if (m) return { genre: 'video', id: m[2] }

  if (liste && ID_LISTE.test(liste)) return { genre: 'playlist', id: liste }
  return null
}

/** Titre provisoire, le temps que le vrai titre arrive de YouTube. */
export const titreProvisoire = (lien) =>
  lien.genre === 'playlist' ? 'Playlist YouTube' : 'Vidéo YouTube'

export const idMorceau = (lien) => (lien.genre === 'playlist' ? 'ytl:' : 'ytv:') + lien.id

export function creerMorceauYoutube(lien, titre) {
  return {
    id: idMorceau(lien),
    origine: 'youtube',
    genre: lien.genre,
    videoId: lien.genre === 'video' ? lien.id : null,
    listeId: lien.genre === 'playlist' ? lien.id : null,
    titre: titre || titreProvisoire(lien),
    detail: lien.genre === 'playlist' ? 'Playlist' : 'YouTube',
    supprimable: true,
  }
}

// ---------------------------------------------------------------- operations sur la liste
/** File complete : les ambiances integrees, puis les morceaux ajoutes. */
export const file = (etat) => [...ambiances(), ...(etat?.morceaux ?? [])]

export const morceauParId = (etat, id) => file(etat).find((m) => m.id === id) || null

export const estFavori = (etat, id) => !!etat?.favoris?.includes(id)

export const favoris = (etat) => file(etat).filter((m) => estFavori(etat, m.id))

export function ajouter(etat, morceau) {
  if (!morceau) return etat
  if (file(etat).some((m) => m.id === morceau.id)) return etat     // deja present
  return { ...etat, morceaux: [...etat.morceaux, morceau] }
}

export function supprimer(etat, id) {
  const m = morceauParId(etat, id)
  if (!m || !m.supprimable) return etat
  const morceaux = etat.morceaux.filter((x) => x.id !== id)
  const favoris = etat.favoris.filter((x) => x !== id)
  // si on supprime le morceau en cours, on retombe sur le precedent de la file
  let courant = etat.courant
  if (courant === id) {
    const f = file(etat)
    const i = f.findIndex((x) => x.id === id)
    courant = (f[i - 1] ?? f[i + 1] ?? f[0]).id
    if (courant === id) courant = ambiances()[0].id
  }
  return { ...etat, morceaux, favoris, courant }
}

export function basculerFavori(etat, id) {
  if (!morceauParId(etat, id)) return etat
  const favoris = etat.favoris.includes(id)
    ? etat.favoris.filter((x) => x !== id)
    : [...etat.favoris, id]
  return { ...etat, favoris }
}

export function renommer(etat, id, titre) {
  if (!titre) return etat
  return { ...etat, morceaux: etat.morceaux.map((m) => (m.id === id ? { ...m, titre } : m)) }
}

/**
 * Morceau suivant ou precedent dans la file.
 * Sans boucle, on s'arrete aux deux bouts et la fonction renvoie null : c'est a l'appelant
 * de decider s'il arrete la lecture. Avec boucle, la file tourne en rond.
 */
export function voisin(etat, sens, boucle) {
  const f = file(etat)
  if (!f.length) return null
  const i = f.findIndex((m) => m.id === etat.courant)
  const j = (i < 0 ? 0 : i) + (sens < 0 ? -1 : 1)
  if (j < 0 || j >= f.length) return boucle ? f[(j + f.length) % f.length] : null
  return f[j]
}

// ---------------------------------------------------------------- memoire
const PAR_DEFAUT = () => ({
  boutique: BOUTIQUE_DEFAUT,
  morceaux: [],
  favoris: [],
  courant: ambiances()[0].id,
  boucle: true,
})

/**
 * La forme SORTANTE d une playlist — celle qu on ecrit, ici comme en base.
 *
 * Le `v: 1` n est pas decoratif : `nettoyer` ci-dessous REFUSE tout objet qui ne le porte pas
 * et rend les valeurs par defaut. Cette fonction a ete extraite parce que les deux chemins
 * d ecriture avaient diverge : le cache local ajoutait `v`, la base recevait l etat en
 * memoire, qui ne l a pas. La playlist publiee n etait donc jamais relisible — un appareil
 * neuf ouvrait la boutique sur une playlist par defaut alors que la ligne existait et etait
 * correcte. Tant que les deux chemins passent par ici, ils ne peuvent plus diverger.
 */
export const serialiser = (etat) => ({
  v: 1, boutique: etat.boutique, morceaux: etat.morceaux,
  favoris: etat.favoris, courant: etat.courant, boucle: etat.boucle,
})

const nettoyer = (o) => {
  const d = PAR_DEFAUT()
  if (!o || o.v !== 1) return d
  const morceaux = Array.isArray(o.morceaux)
    ? o.morceaux.filter((m) => m && typeof m.id === 'string' && m.origine === 'youtube'
        && (ID_VIDEO.test(m.videoId ?? '') || ID_LISTE.test(m.listeId ?? '')))
        .map((m) => ({ ...m, supprimable: true }))
    : []
  const etat = { boutique: typeof o.boutique === 'string' ? o.boutique : d.boutique, morceaux,
                 favoris: [], courant: d.courant,
                 boucle: typeof o.boucle === 'boolean' ? o.boucle : d.boucle }
  const connus = new Set(file(etat).map((m) => m.id))
  etat.favoris = Array.isArray(o.favoris) ? o.favoris.filter((x) => connus.has(x)) : []
  etat.courant = connus.has(o.courant) ? o.courant : d.courant
  return etat
}

/**
 * Depot de playlist. Aujourd'hui le navigateur, demain la base : la boutique est deja la cle,
 * et `charger`/`enregistrer` sont les deux seules fonctions a reecrire pour brancher Supabase.
 * Le reste du code ne sait pas ou vivent les donnees.
 */
/**
 * Validateur public. Les reglages arrivent desormais de deux endroits — le cache local et la
 * base — et les DEUX doivent passer par le meme filtre : une ligne pourrie en base ne doit pas
 * pouvoir casser la boutique.
 */
export const lire = (objet) => nettoyer(objet)

export function depotLocal(storage) {
  const cle = (boutique) => `${CLE_PLAYLIST}.${boutique}`
  return {
    charger(boutique = BOUTIQUE_DEFAUT) {
      if (!storage) return { ...PAR_DEFAUT(), boutique }
      let brut = null
      try { brut = storage.getItem(cle(boutique)) } catch { return { ...PAR_DEFAUT(), boutique } }
      if (!brut) return { ...PAR_DEFAUT(), boutique }
      let o = null
      try { o = JSON.parse(brut) } catch { return { ...PAR_DEFAUT(), boutique } }
      return { ...nettoyer(o), boutique }
    },
    enregistrer(etat) {
      if (!storage || !etat) return
      try {
        storage.setItem(cle(etat.boutique ?? BOUTIQUE_DEFAUT), JSON.stringify(serialiser(etat)))
      } catch { /* navigation privee : le reglage vaut pour la session */ }
    },
  }
}
