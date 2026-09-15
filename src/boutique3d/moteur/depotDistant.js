// Persistance des reglages d'une boutique, cote base de donnees.
//
// Jusqu'ici tout vivait dans `localStorage` : la playlist de Johanna disparaissait donc des
// qu'elle changeait de navigateur ou d'appareil. Ce module ajoute la couche qui manque, sans
// rien retirer : le cache local reste ce qui s'affiche a la premiere image, la base n'est
// qu'un avis qui arrive ensuite.
//
// Trois regles tenues ici :
//   1. AUCUNE nouvelle dependance. L'API REST de Supabase est du HTTP ordinaire (PostgREST) :
//      une soixantaine de lignes de `fetch` suffisent, contre une centaine de kilo-octets pour
//      la bibliotheque officielle, dans un projet qui surveille le poids de son paquet.
//   2. Le site ne se bloque JAMAIS pour une raison de reseau. Pas de table, pas de cle, pas de
//      connexion, delai depasse : la boutique s'ouvre exactement comme avant, sur son cache.
//   3. `fetch` et l'horloge sont injectables : les tests n'ont besoin ni de reseau ni de base.
//
// LIMITE DE SECURITE, dite ici plutot que decouverte plus tard : tant qu'il n'y a pas
// d'authentification, une cle anonyme ouverte en ECRITURE laisse n'importe quel visiteur
// remplacer la playlist de la boutique. Tant que Johanna ne se connecte pas vraiment, la
// politique de la table doit rester en lecture publique et ecriture fermee — et ce module le
// supporte sans bruit : un refus d'ecriture n'est pas une panne, c'est le mode lecture seule.

// ECRITURE DISTANTE : FERMEE, ET PAS PAR HASARD.
//
// Tant qu'aucun vendeur ne se connecte, la seule cle dont dispose le navigateur est la cle
// anonyme. L'ouvrir en ecriture reviendrait a laisser n'importe quel visiteur d'Internet
// remplacer la playlist diffusee sur la grande tele de la boutique, sans trace et sans retour
// arriere. Ce drapeau est donc a `false` par DECISION, pas par oubli de configuration : meme
// si les variables d'environnement sont posees, aucune requete d'ecriture ne part.
//
// Il passera a `true` le jour ou il y aura un vrai proprietaire authentifie, en meme temps que
// la politique d'ecriture de supabase/reglages_boutique.sql (etape 2). D'ici la, les reglages
// vivent dans le cache local du navigateur, exactement comme avant.
export const ECRITURE_ACTIVE = false

export const TABLE = 'boutique_reglages'
// Nom de la colonne qui porte l'identite de la boutique. 'boutique' est ce qu'emploie Johanna 2
// (une chaine libre). Une application qui possede deja ses boutiques passera le nom de SA cle
// etrangere — 'boutique_id' — sans qu'une ligne de ce module ne change.
export const COLONNE_DEFAUT = 'boutique'
export const DELAI_MS = 4000        // au-dela, on se contente du cache : personne n'attend
export const REPORT_MS = 900        // ecriture groupee : taper un lien ne doit pas poster 20 fois

/** Configuration lue a la construction du paquet. Absente = mode purement local. */
export function configuration(env = (typeof import.meta !== 'undefined' ? import.meta.env : null)) {
  const url = env?.VITE_SUPABASE_URL || ''
  const cle = env?.VITE_SUPABASE_CLE || ''
  return url && cle ? { url: url.replace(/\/+$/, ''), cle } : null
}

/**
 * Acces a la table. Renvoie `null` si rien n'est configure : l'appelant retombe alors sur le
 * seul cache local, sans une seule requete reseau.
 */
export function creerAcces({ url, cle, fetch: chercher, delai = DELAI_MS,
                             colonne = COLONNE_DEFAUT } = {}) {
  if (!url || !cle) return null
  const appel = chercher || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null)
  if (!appel) return null

  const entetes = {
    apikey: cle,
    Authorization: `Bearer ${cle}`,
    'Content-Type': 'application/json',
  }

  /** Un aller-retour, avec delai maximal. Toute panne devient `null`, jamais une exception. */
  async function requete(chemin, options) {
    const arret = typeof AbortController !== 'undefined' ? new AbortController() : null
    const minuterie = setTimeout(() => arret?.abort(), delai)
    try {
      const r = await appel(`${url}/rest/v1/${chemin}`, {
        ...options,
        headers: { ...entetes, ...(options?.headers || {}) },
        signal: arret?.signal,
      })
      if (!r || !r.ok) return null
      const texte = await r.text()
      return texte ? JSON.parse(texte) : []
    } catch {
      return null            // reseau coupe, table absente, cle refusee : meme reponse
    } finally {
      clearTimeout(minuterie)
    }
  }

  return {
    /** Reglages d'une boutique, ou null si rien n'est lisible. */
    async lire(boutique) {
      const lignes = await requete(
        `${TABLE}?${colonne}=eq.${encodeURIComponent(boutique)}&select=donnees,maj`)
      if (!Array.isArray(lignes) || !lignes.length) return null
      const d = lignes[0]?.donnees
      return d && typeof d === 'object' ? d : null
    },

    /**
     * Ecrit les reglages. Renvoie true seulement si la base a accepte : un refus (ecriture
     * fermee, hors ligne) laisse le cache local faire son travail et ne derange personne.
     */
    async ecrire(boutique, donnees) {
      // Porte fermee : on ne construit meme pas la requete. Voir ECRITURE_ACTIVE plus haut.
      if (!ECRITURE_ACTIVE) return false
      const r = await requete(`${TABLE}?on_conflict=${colonne}`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ [colonne]: boutique, donnees, maj: new Date().toISOString() }]),
      })
      return r !== null
    },
  }
}

/**
 * Depot d'une boutique : le cache local devant, la base derriere.
 *
 * `charger()` rend IMMEDIATEMENT le cache — la boutique s'ouvre sans attendre le reseau — puis
 * appelle `surDistant` si la base finit par repondre quelque chose de different. `enregistrer`
 * ecrit le cache tout de suite et groupe les envois vers la base.
 */
export function creerDepotBoutique({ local, acces, boutique, surDistant, differer = setTimeout }) {
  let enAttente = null
  let dernier = null

  return {
    charger() {
      const cache = local.charger()
      if (acces) {
        acces.lire(boutique).then((distant) => {
          if (distant && surDistant) surDistant(distant)
        }).catch(() => { /* le cache a deja servi */ })
      }
      return cache
    },

    enregistrer(etat) {
      local.enregistrer(etat)
      if (!acces || !ECRITURE_ACTIVE) return
      dernier = etat
      if (enAttente) return
      enAttente = differer(() => {
        enAttente = null
        const a = dernier
        dernier = null
        if (a) acces.ecrire(boutique, a).catch(() => { /* lecture seule ou hors ligne */ })
      }, REPORT_MS)
    },

    /** Pour les tests et le diagnostic : la base est-elle branchee ? */
    distant: () => !!acces,
  }
}
