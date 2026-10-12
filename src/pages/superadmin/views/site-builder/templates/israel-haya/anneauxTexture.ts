/**
 * LES CHIFFRES DES ANNEAUX, dessines plutot que telecharges.
 *
 * Trois facons existaient de poser des chiffres sur un anneau 3D : une police typeface.json
 * extrudee, un composant de texte 3D, ou une texture peinte. On peint.
 *
 * Pourquoi : les deux premieres exigent un fichier de police, donc un telechargement, donc une
 * dependance qui peut manquer et une scene qui s'affiche sans ses chiffres. Un canvas, lui, est
 * toujours la. Et comme les chiffres tournent autour d'un anneau, personne ne lira jamais leur
 * contour de pres : la nettete d'une geometrie extrudee serait payee pour rien.
 *
 * Les chiffres restent des chiffres ARABES, y compris dans une page en hebreu : en hebreu les
 * nombres s'ecrivent ainsi, de gauche a droite, a l'interieur d'un texte qui va de droite a
 * gauche. Les transformer serait une faute, pas une adaptation.
 *
 * Module sans React ni DOM au moment de l'import : il ne touche au document qu'a l'appel.
 */

export interface OptionsAnneau {
  /** Les symboles a repartir, dans l'ordre. */
  symboles: readonly string[];
  /** Largeur de la texture. Plus large = chiffres plus nets sur un grand anneau. */
  largeur?: number;
  hauteur?: number;
  /** Couleur de l'encre. */
  encre?: string;
  /** Taille de police, en pixels de texture. */
  taille?: number;
}

/**
 * Peint les symboles regulierement espaces sur une bande horizontale.
 *
 * La bande s'enroule ensuite autour de l'anneau : la largeur devient la circonference, donc
 * des symboles regulierement espaces en pixels le sont aussi en degres.
 */
export function peindreAnneau(o: OptionsAnneau): HTMLCanvasElement {
  const largeur = o.largeur ?? 2048;
  const hauteur = o.hauteur ?? 128;
  const encre = o.encre ?? '#f0dfae';
  const taille = o.taille ?? 76;

  const toile = document.createElement('canvas');
  toile.width = largeur;
  toile.height = hauteur;
  const ctx = toile.getContext('2d');
  if (!ctx) return toile;

  ctx.clearRect(0, 0, largeur, hauteur);
  ctx.font = `300 ${taille}px "Cormorant Garamond", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = encre;

  const n = o.symboles.length;
  for (let i = 0; i < n; i++) {
    // Chaque symbole au centre de sa part de bande.
    const x = ((i + 0.5) / n) * largeur;
    ctx.fillText(o.symboles[i], x, hauteur / 2);
  }

  return toile;
}

/** Les neuf nombres de la numerologie, dans l'ordre. */
export const NEUF: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * UN chiffre, sur sa propre petite texture carree.
 *
 * Premiere version : les neuf chiffres etaient peints sur une bande enroulee autour d'un
 * cylindre. Erreur de geometrie — un cylindre dont l'axe pointe vers la camera se voit par la
 * TRANCHE, et sa surface laterale, donc la bande, devient invisible. Les anneaux tournaient
 * sans un seul chiffre.
 *
 * Chaque chiffre est donc porte par son propre petit plan, pose sur le cercle et tourne vers
 * l'exterieur, comme une graduation gravee sur un instrument. On le voit sous tous les angles,
 * et il tourne avec son anneau.
 */
export function peindreChiffre(symbole: string, taille = 256): HTMLCanvasElement {
  const toile = document.createElement('canvas');
  toile.width = taille;
  toile.height = taille;
  const ctx = toile.getContext('2d');
  if (!ctx) return toile;

  ctx.clearRect(0, 0, taille, taille);
  ctx.font = `300 ${taille * 0.72}px "Frank Ruhl Libre", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Une lueur sous le chiffre : sans elle il se perd sur un fond etoile.
  ctx.shadowColor = 'rgba(255, 220, 150, 0.85)';
  ctx.shadowBlur = taille * 0.1;
  ctx.fillStyle = '#f6e7bd';
  ctx.fillText(symbole, taille / 2, taille * 0.54);

  return toile;
}

/**
 * Petits traits de graduation pour l'anneau exterieur. Ce ne sont pas des symboles : c'est de
 * la mesure, et elle donne a l'objet l'air d'un instrument plutot que d'un ornement.
 */
export function peindreGraduations(nombre = 72, largeur = 2048, hauteur = 64): HTMLCanvasElement {
  const toile = document.createElement('canvas');
  toile.width = largeur;
  toile.height = hauteur;
  const ctx = toile.getContext('2d');
  if (!ctx) return toile;

  ctx.clearRect(0, 0, largeur, hauteur);
  ctx.strokeStyle = 'rgba(240, 223, 174, 0.75)';
  for (let i = 0; i < nombre; i++) {
    const x = (i / nombre) * largeur;
    // Un trait sur quatre est plus long : l'oeil y lit un rythme.
    const longue = i % 4 === 0;
    ctx.lineWidth = longue ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, hauteur * (longue ? 0.18 : 0.34));
    ctx.lineTo(x, hauteur * (longue ? 0.82 : 0.66));
    ctx.stroke();
  }
  return toile;
}
