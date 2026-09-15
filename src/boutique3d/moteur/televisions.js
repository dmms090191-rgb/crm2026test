// Televisions de la boutique.
//
// Chaque entree correspond a un maillage `screen_*` reellement present dans le GLB. Les noms
// ne sont pas devines : ils viennent du fichier, et un releve de la scene les verifie au
// chargement (voir `verifier` ci-dessous). Si un ecran est renomme cote Blender, on le sait
// tout de suite plutot que de laisser une ligne de reglage qui ne commande rien.
//
// Etat d'un ecran aujourd'hui : allume ou eteint. La `source` est deja portee par le modele
// mais ne vaut encore que 'articles' : c'est la place prevue pour Image, Promo, YouTube et le
// reste, pour que l'ajout se fasse ici et pas en reecrivant le panneau.

import { BOUTIQUE_DEFAUT } from './playlist.js'

export const CLE_TELEVISIONS = 'johanna.televisions'

// La grande tele du fond EST l'ecran Looks : un seul et meme maillage, 2,80 x 1,575 m au fond
// de la piece. Elle porte les deux noms parce que le client emploie les deux.
export const TELEVISIONS = [
  { cle: 'nouveautes', libelle: 'Nouveautés', maillage: 'screen_nouveautes' },
  { cle: 'sacs', libelle: 'Sacs', maillage: 'screen_sacs' },
  { cle: 'robes', libelle: 'Robes', maillage: 'screen_robes' },
  { cle: 'bijoux', libelle: 'Bijoux', maillage: 'screen_bijoux' },
  { cle: 'jeans', libelle: 'Jeans', maillage: 'screen_jeans' },
  { cle: 'tshirts', libelle: 'T-shirts', maillage: 'screen_tshirts' },
  { cle: 'chaussures', libelle: 'Chaussures', maillage: 'screen_chaussures' },
  { cle: 'looks', libelle: 'Grande télé du fond · Looks', detail: '2,80 m, 16:9',
    maillage: 'screen_looks', grande: true },
]

// Les deux ecrans de devanture (screen_vitrine_g / screen_vitrine_d) existent dans la scene
// mais ne sont PAS pilotes ici : ils suivront la personnalisation de la facade. C'est un choix
// du client, pas un oubli — d'ou la liste d'ecrans tolerES ci-dessous, qui evite que
// `verifier` les signale comme inconnus a chaque chargement.
export const HORS_PANNEAU = ['screen_vitrine_g', 'screen_vitrine_d']

/** La grande tele du fond : la seule qui sache diffuser une video pour l'instant. */
export const GRANDE = TELEVISIONS.find((t) => t.grande)
export const CLES = TELEVISIONS.map((t) => t.cle)
export const parMaillage = (nom) => TELEVISIONS.find((t) => t.maillage === nom) || null
export const parCle = (cle) => TELEVISIONS.find((t) => t.cle === cle) || null

/**
 * Ecran pilote par un materiau. Le GLB ecrit parfois un suffixe « .001 » quand un materiau a
 * ete duplique a l'export (c'est le cas de mat_ecran_looks.001) : on le retire avant de
 * comparer, sinon la grande tele ne serait reliee a aucune ligne du panneau.
 */
export function cleDepuisMateriau(nom) {
  const m = /^mat_ecran_(.+?)(?:[.][0-9]+)?$/.exec(nom || '')
  return m && parCle(m[1]) ? m[1] : null
}

// Sources de contenu. Une seule est operante aujourd'hui ; les autres sont declarees pour que
// la suite se branche ici sans toucher au panneau.
export const SOURCES = ['articles']
export const SOURCE_DEFAUT = 'articles'

export const etatDefaut = () => ({
  allumees: Object.fromEntries(CLES.map((c) => [c, true])),
  sources: Object.fromEntries(CLES.map((c) => [c, SOURCE_DEFAUT])),
})

export function basculer(etat, cle) {
  if (!parCle(cle)) return etat
  return { ...etat, allumees: { ...etat.allumees, [cle]: !etat.allumees[cle] } }
}

export const estAllumee = (etat, cle) => etat?.allumees?.[cle] !== false

export function toutes(etat, valeur) {
  return { ...etat, allumees: Object.fromEntries(CLES.map((c) => [c, !!valeur])) }
}

export const nombreAllumees = (etat) => CLES.filter((c) => estAllumee(etat, c)).length

/** Resume affiche sur la ligne du panneau Reglages. */
export function resume(etat) {
  const n = nombreAllumees(etat)
  if (n === CLES.length) return 'Toutes allumées'
  if (n === 0) return 'Toutes éteintes'
  return `${n} sur ${CLES.length}`
}

// --- lecture et persistance -----------------------------------------------------------
// Meme couture que la playlist et la lumiere : la boutique est deja la cle, il n'y aura qu'a
// remplacer ce depot par un depot en base.

export function lire(objet) {
  const d = etatDefaut()
  if (!objet || typeof objet !== 'object') return d
  for (const c of CLES) {
    if (typeof objet.allumees?.[c] === 'boolean') d.allumees[c] = objet.allumees[c]
    if (SOURCES.includes(objet.sources?.[c])) d.sources[c] = objet.sources[c]
  }
  return d
}

export function depotLocal(storage, boutique = BOUTIQUE_DEFAUT) {
  const cle = `${CLE_TELEVISIONS}.${boutique}`
  return {
    charger() {
      try { return lire(JSON.parse(storage.getItem(cle) || 'null')) } catch { return etatDefaut() }
    },
    enregistrer(etat) {
      try { storage.setItem(cle, JSON.stringify(etat)) } catch { /* stockage refuse */ }
    },
  }
}

/**
 * Compare la liste ci-dessus a ce que porte reellement la scene. Renvoie les ecarts plutot
 * que de lever : un ecran renomme ne doit pas empecher la boutique de s'ouvrir, mais il ne
 * doit pas non plus disparaitre en silence d'un reglage.
 */
export function verifier(nomsDansLaScene) {
  const presents = new Set(nomsDansLaScene)
  const manquants = TELEVISIONS.filter((t) => !presents.has(t.maillage)).map((t) => t.maillage)
  const inconnus = [...presents].filter((n) => !parMaillage(n) && !HORS_PANNEAU.includes(n))
  return { manquants, inconnus, ok: manquants.length === 0 && inconnus.length === 0 }
}
