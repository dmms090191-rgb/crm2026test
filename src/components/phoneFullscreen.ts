/*
 * TELEPHONE VIRTUEL — calcul du plein ecran.
 *
 * Module pur, sans aucun import : testable avec node --test.
 *
 * Rappel de ce que ce calcul NE fait PAS : il ne touche jamais au viewport logique du telephone.
 * L'iframe garde sa largeur et sa hauteur en pixels CSS (440x956 pour l'iPhone, 480x1040 pour le
 * Samsung) ; on ne change que l'echelle d'affichage du panneau qui la contient. Une transformation
 * CSS n'affecte pas le viewport de mise en page d'un document : le contenu mobile continue donc de
 * se croire dans la meme fenetre, en plein ecran comme au zoom.
 */

export interface Taille {
  w: number;
  h: number;
}

/**
 * Plus grande echelle permettant d'afficher le panneau ENTIER dans l'ecran, sans rognage et sans
 * deformation : une seule echelle pour les deux axes, donc le plus petit des deux rapports.
 * Retourne 1 tant que la mesure n'est pas disponible (premier rendu).
 */
export function echelleAjustement(naturel: Taille, ecran: Taille, marge: number): number {
  if (naturel.w <= 0 || naturel.h <= 0) return 1;
  const dispoW = ecran.w - marge;
  const dispoH = ecran.h - marge;
  if (dispoW <= 0 || dispoH <= 0) return 1;
  return Math.min(dispoW / naturel.w, dispoH / naturel.h);
}

/**
 * Echelle finale appliquee au panneau. Le zoom reste une commande a part entiere : il multiplie
 * l'ajustement. A 100 % le telephone remplit donc exactement la place disponible.
 */
export function echelleFinale(ajustement: number, zoomPourCent: number): number {
  return ajustement * (zoomPourCent / 100);
}
