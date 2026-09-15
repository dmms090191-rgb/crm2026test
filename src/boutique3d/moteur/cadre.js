// LA GEOMETRIE DU CADRE — le repere de tout ce qui se pose « a une fraction de l'ecran ».
//
// Le selecteur de section, le bouton de deplacement, le retour a l'entree et le lecteur sont
// places par une FRACTION : 0,5 veut dire « au milieu ». Jusqu'ici cette fraction se mesurait
// sur `window`. En plein ecran, cadre et fenetre sont la meme boite et personne ne voyait la
// difference. Posee dans la colonne d'un tableau de bord, la boutique placait le selecteur au
// milieu de la FENETRE — donc a 140 px du milieu de sa colonne, la moitie de la barre laterale.
//
// Sans cadre, on rend la fenetre : c'est exactement le calcul d'avant, au pixel. Les fractions
// deja enregistrees gardent donc le meme sens et aucune migration n'est necessaire.

/** Boite du cadre en coordonnees de la fenetre. Sans cadre : la fenetre elle-meme. */
export function boiteCadre(cadre) {
  if (cadre && typeof cadre.getBoundingClientRect === 'function') {
    const r = cadre.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      return { x: r.left, y: r.top, l: r.width, h: r.height }
    }
  }
  const l = typeof window !== 'undefined' ? window.innerWidth : 0
  const h = typeof window !== 'undefined' ? window.innerHeight : 0
  return { x: 0, y: 0, l, h }
}

/**
 * Previent a chaque changement de taille du cadre, et pas seulement de la fenetre.
 *
 * Une barre laterale qui se replie ne declenche aucun `resize` : seul un `ResizeObserver` pose
 * sur le cadre le voit. On garde les ecouteurs de fenetre a cote — `orientationchange` et
 * `visualViewport` couvrent la rotation et la barre d'adresse des navigateurs mobiles, que
 * l'observateur, lui, ne signale pas toujours.
 */
export function surTailleCadre(cadre, rappel) {
  const observateur = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(rappel) : null
  if (cadre && observateur) observateur.observe(cadre)
  window.addEventListener('resize', rappel)
  window.addEventListener('orientationchange', rappel)
  const vv = window.visualViewport
  vv?.addEventListener('resize', rappel)
  return () => {
    observateur?.disconnect()
    window.removeEventListener('resize', rappel)
    window.removeEventListener('orientationchange', rappel)
    vv?.removeEventListener('resize', rappel)
  }
}
