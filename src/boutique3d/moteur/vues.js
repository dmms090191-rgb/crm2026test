// Ordre = parcours de la boutique, de l'entree vers le fond.
export const CATEGORIES = [
  ['hub',        'Vue principale'],
  ['nouveautes', 'Nouveautés'],
  ['bijoux',     'Bijoux'],
  ['sacs',       'Sacs'],
  ['jeans',      'Jeans'],
  ['robes',      'Robes'],
  ['tshirts',    'T-shirts'],
  ['chaussures', 'Chaussures'],
  ['looks',      'Looks'],
]

export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const smoothstep = (t) => t * t * (3 - 2 * t)
export const DUREE_ALLER  = 1.15
export const DUREE_RETOUR = 0.98
// Retour du mode manuel vers la navigation guidee : la camera retrouve la position, la cible et
// le champ qu'elle avait avant l'activation, sans teleportation.
export const DUREE_RETOUR_MANUEL = 0.9

// Facteur de conversion Blender (watts) -> Three.js (candela), etabli par le calcul :
//   Cycles  : radiance = albedo * P / (4 pi^2 d^2)
//   Three.js: radiance = albedo * I / (pi d^2)      avec I = P * 683 / (4 pi) exporte en candela
// Pour retrouver la meme radiance il faut I_three = P / 683, donc diviser la valeur
// exportee par 683. (L'ancien 4pi/683 laissait le web 12,6 fois trop lumineux.)
export const CALIBRE_LUMIERE = 1 / 683
export const ECHELLES = [0.25, 0.5, 1, 2, 4]         // multiplicateurs autour du calibre
