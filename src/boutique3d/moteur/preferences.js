// Preferences du proprietaire de la boutique : ce qui regle la VISITE plutot que le decor.
//
// Deux reglages pour l'instant :
//   - la vitesse de deplacement manuel, un nombre en metres par seconde ;
//   - l'affichage du panneau de mesures techniques, eteint par defaut.
//
// Pourquoi un module a part plutot qu'un coin de `musique.js` ou de `qualite.js` : ces deux
// reglages appartiennent a la boutique, comme la playlist, la lumiere et les televisions, et
// suivent donc la meme couture de depot. La qualite d'image, elle, reste dans `qualite.js` :
// elle depend de l'APPAREIL qui regarde, pas de la boutique regardee, et n'a donc rien a faire
// dans les donnees du proprietaire.

import { VITESSE_PAR_DEFAUT, serrerVitesse, CLE_VITESSE, estRepere, msPour } from './manuel.js'
import { BOUTIQUE_DEFAUT } from './playlist.js'

export const CLE_PREFERENCES = 'johanna.preferences'

// --- Manches tactiles. Deux facteurs, pas deux tailles absolues : la taille de base depend
//     deja de l'ecran (min(32vw, 146px)), et un facteur la suit au lieu de la remplacer.
export const TAILLE_MANCHE = { min: 0.7, max: 1.4, defaut: 1 }
// L'opacite descend tres bas a la demande du client. Elle ne touche QUE ce qui est peint :
// la zone tactile, elle, garde sa surface entiere — sans quoi le reglage rendrait la boutique
// injouable des qu'on le baisse.
export const OPACITE_MANCHE = { min: 0.05, max: 1, defaut: 1 }

// --- Bouton Reglages deplacable. La position est retenue en FRACTION de l'ecran et non en
//     pixels : une rotation ou un autre appareil la replacerait sinon hors de l'ecran.
export const POSITION_DEFAUT = { x: 0.5, y: 0.945 }

// --- Elements d'interface que le visiteur peut deplacer et redimensionner lui-meme.
//     Une seule liste, une seule persistance : ces quatre-la existent deja et gardent leur
//     comportement, l'editeur ne touche QUE leur place et leur taille.
export const ELEMENTS_UI = [
  { cle: 'section', libelle: 'Sélecteur de section', sel: '[data-test="barre-section"]' },
  { cle: 'deplacement', libelle: 'Bouton déplacement', sel: '[data-test="manuel"]' },
  { cle: 'revoir', libelle: "Retour à l'entrée", sel: '[data-test="revoir"]' },
  { cle: 'lecteur', libelle: 'Lecteur musique', sel: '.lecteur-bloc' },
]
export const CLES_UI = ELEMENTS_UI.map((e) => e.cle)
export const TAILLE_UI = { min: 0.6, max: 1.6, defaut: 1, pas: 0.01 }

export const etatDefaut = () => ({
  vitesse: VITESSE_PAR_DEFAUT,
  // Les outils techniques ne doivent pas polluer la visite : un visiteur normal ne voit rien.
  mesures: false,
  manches: { taille: TAILLE_MANCHE.defaut, opacite: OPACITE_MANCHE.defaut },
  // null = jamais deplace, on garde la place d'origine en bas au centre
  bouton: null,
  // Disposition personnalisee : une entree par element, ou null tant que le visiteur n'y a
  // pas touche. Null n'est pas un detail : il veut dire « garde la place du gabarit », et
  // c'est ce qui permet a la mise en page d'origine de suivre l'ecran et l'orientation.
  ui: {},
  // etat du panneau de gauche et de son contenu, pour qu'un changement de mode n'y touche pas
  panneau: { replie: false, onglet: 'magasin' },
  categorie: 'hub',
})

const borne = (v, { min, max, defaut }) =>
  (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : defaut)

/** Position du bouton, ramenee dans l'ecran. Une fraction hors [0,1] n'atteint jamais l'ecran. */
export const bornerPosition = (p) => (p && Number.isFinite(p.x) && Number.isFinite(p.y)
  ? { x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) }
  : null)

/** Une entree de disposition : position bornee a l'ecran, taille bornee a la plage. */
export const bornerUI = (v) => {
  const p = bornerPosition(v)
  if (!p) return null
  return { x: p.x, y: p.y, taille: borne(v.taille, TAILLE_UI) }
}

/** Disposition complete, nettoyee : seules les cles connues, seules les valeurs valides. */
export const lireUI = (objet) => {
  const out = {}
  if (!objet || typeof objet !== 'object') return out
  for (const cle of CLES_UI) {
    const v = bornerUI(objet[cle])
    if (v) out[cle] = v
  }
  return out
}

export function lire(objet) {
  const d = etatDefaut()
  if (!objet || typeof objet !== 'object') return d
  if (typeof objet.vitesse === 'number') d.vitesse = serrerVitesse(objet.vitesse)
  if (typeof objet.mesures === 'boolean') d.mesures = objet.mesures
  if (objet.manches && typeof objet.manches === 'object') {
    d.manches = {
      taille: borne(objet.manches.taille, TAILLE_MANCHE),
      opacite: borne(objet.manches.opacite, OPACITE_MANCHE),
    }
  }
  d.bouton = bornerPosition(objet.bouton)
  d.ui = lireUI(objet.ui)
  // Reprise de l'ancienne place du bouton flottant, enregistree seule avant l'editeur
  // d'interface. Sans elle, un visiteur qui avait deplace sa barre la verrait revenir au
  // centre sans explication — ce qui ressemble a une panne plutot qu'a une evolution.
  if (!d.ui.section && d.bouton) d.ui.section = { ...d.bouton, taille: TAILLE_UI.defaut }
  if (objet.panneau && typeof objet.panneau === 'object') {
    d.panneau = {
      replie: objet.panneau.replie === true,
      // La section n'est PAS reprise au chargement : on arrive dans une boutique, pas dans un
      // panneau de reglages. Elle reste memorisee pendant la visite — changer de mode n'y
      // touche pas — mais une nouvelle visite repart du Magasin.
      onglet: 'magasin',
    }
  }
  if (typeof objet.categorie === 'string' && objet.categorie) d.categorie = objet.categorie
  return d
}

export const regler = (etat, cle, valeur) => {
  if (cle === 'vitesse') return { ...etat, vitesse: serrerVitesse(valeur) }
  if (cle === 'mesures') return { ...etat, mesures: !!valeur }
  if (cle === 'taille') return { ...etat, manches: { ...etat.manches, taille: borne(valeur, TAILLE_MANCHE) } }
  if (cle === 'opacite') return { ...etat, manches: { ...etat.manches, opacite: borne(valeur, OPACITE_MANCHE) } }
  if (cle === 'bouton') return { ...etat, bouton: bornerPosition(valeur) }
  if (cle === 'replie') return { ...etat, panneau: { ...etat.panneau, replie: !!valeur } }
  if (cle === 'onglet') return { ...etat, panneau: { ...etat.panneau, onglet: valeur === 'reglages' ? 'reglages' : 'magasin' } }
  if (cle === 'categorie') return { ...etat, categorie: String(valeur || 'hub') }
  // toute la disposition d'un coup : c'est ce qu'ecrit le bouton Valider de l'editeur
  if (cle === 'ui') return { ...etat, ui: lireUI(valeur) }
  return etat
}

/**
 * Reprise de l'ancien reglage de vitesse, enregistre seul sous `johanna.vitesse` et parfois
 * sous forme de mot ('rapide'). Sans cette reprise, un visiteur qui revient perdrait son
 * reglage en silence — ce qui ressemble a une panne plutot qu'a une evolution.
 */
export function reprendreAncien(storage) {
  try {
    const brut = storage?.getItem(CLE_VITESSE)
    if (brut === null || brut === undefined) return null
    if (estRepere(brut)) return msPour(brut)
    const n = Number(brut)
    return Number.isFinite(n) ? serrerVitesse(n) : null
  } catch { return null }
}

export function depotLocal(storage, boutique = BOUTIQUE_DEFAUT) {
  const cle = `${CLE_PREFERENCES}.${boutique}`
  return {
    charger() {
      let brut = null
      try { brut = storage?.getItem(cle) } catch { return etatDefaut() }
      if (brut) {
        try { return lire(JSON.parse(brut)) } catch { return etatDefaut() }
      }
      const ancienne = reprendreAncien(storage)
      return ancienne === null ? etatDefaut() : { ...etatDefaut(), vitesse: ancienne }
    },
    enregistrer(etat) {
      try { storage?.setItem(cle, JSON.stringify(lire(etat))) } catch { /* stockage refuse */ }
    },
  }
}
