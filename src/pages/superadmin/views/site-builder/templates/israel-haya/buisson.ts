/**
 * LE BUISSON ARDENT, construit par le calcul.
 *
 * « Et l'ange de l'Eternel lui apparut dans une flamme de feu, au milieu d'un buisson. Moise
 * regarda ; et voici, le buisson etait tout en feu, et le buisson ne se consumait point. »
 * — Exode 3:2
 *
 * Toute la scene tient dans cette derniere phrase. Un buisson qui brule et qui se consume est
 * un feu de broussailles ; celui-ci doit bruler SANS NOIRCIR. Trois consequences, qui ont
 * dicte la geometrie autant que le rendu :
 *
 *   1. Les branches restent du bois clair et les feuilles restent vertes. Le feu est ajoute
 *      par-dessus, en melange ADDITIF, jamais en remplacement : il eclaire la matiere au lieu
 *      de la manger. C'est la difference entre un buisson ardent et un buisson calcine.
 *   2. Le feuillage doit rester LISIBLE a travers les flammes. D'ou un buisson DENSE : une
 *      ramure claire disparaitrait derriere le feu, et on ne verrait plus qu'un brasier.
 *   3. Les flammes naissent DANS le feuillage, pas sous lui. Un feu qui monte du sol est un
 *      incendie ; celui de l'Exode habite le buisson.
 *
 * ---------- POURQUOI UN BUISSON ET NON UN ARBRE ----------
 *
 * L'olivier de arbre.ts reste sur disque et n'a pas bouge : il part d'UN tronc, et sa silhouette
 * est celle d'un arbre — haute, etroite, portee par un axe. Un buisson n'a pas d'axe : il jaillit
 * du sol par une dizaine de tiges a la fois, s'ouvre tot, et tient plus de largeur que de hauteur.
 * On ne parametre donc pas l'olivier, on ecrit la bonne forme.
 *
 * ---------- LE PRINCIPE CONSERVE ----------
 *
 * Comme pour l'olivier : la geometrie est construite UNE fois, entiere, et porte sa CHRONOLOGIE.
 * Chaque segment, chaque feuille et chaque foyer de flamme sait l'instant ou il doit paraitre.
 * La croissance n'est pas une animation, c'est une lecture — d'ou la reversibilite gratuite
 * quand on remonte la page, et un cout par image qui ne depend pas de l'avancement.
 *
 * Module PUR : aucun import, verifiable sans navigateur.
 */

export interface SegmentBuisson {
  /** Extremites, en coordonnees monde. */
  x1: number; y1: number; z1: number;
  x2: number; y2: number; z2: number;
  /** Instant d'apparition, de 0 a 1 dans la progression du chapitre. */
  naissance: number;
  /** Epaisseur relative : la tige est epaisse a sa base, la brindille ne l'est pas. */
  epaisseur: number;
}

export interface FeuilleBuisson {
  x: number; y: number; z: number;
  naissance: number;
  /** Phase propre, pour que le vent ne les agite pas toutes ensemble. */
  phase: number;
}

export interface Flamme {
  /** Le FOYER : d'ou la flamme part. Elle montera depuis la. */
  x: number; y: number; z: number;
  naissance: number;
  /** Phase propre : sans elle, toutes les flammes battraient ensemble comme un stroboscope. */
  phase: number;
  /** Vitesse de montee, propre a chaque langue de feu. */
  vitesse: number;
  /** Taille relative, de 0 a 1 : quelques grandes langues, beaucoup de petites. */
  taille: number;
  /** Hauteur que cette flamme parcourt avant de s'eteindre. */
  portee: number;
}

export interface Buisson {
  segments: SegmentBuisson[];
  feuilles: FeuilleBuisson[];
  flammes: Flamme[];
}

/**
 * LA CHRONOLOGIE DU CHAPITRE, en quatre temps qui se CHEVAUCHENT.
 *
 * Des plages disjointes donnent un chapitre a paliers : on attend que les racines finissent,
 * puis que les tiges finissent. Mesure faite sur l'olivier, c'est exactement ce qui le laissait
 * en arbre d'hiver pendant la moitie du chapitre. Ici chaque temps commence avant que le
 * precedent soit fini, et quelque chose est donc toujours en train de naitre.
 */
const RACINES_FIN = 0.22;
const TIGES_DEBUT = 0.12;
const TIGES_FIN = 0.58;
const FEUILLES_FIN = 0.82;
/** Le feu prend APRES que le feuillage existe : on ne met pas le feu a des branches nues. */
const FEU_DEBUT = 0.46;
const FEU_FIN = 0.9;

/** Generateur reproductible : le meme buisson a chaque chargement, jamais un buisson au hasard. */
function graine(n: number): () => number {
  let etat = n >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

export interface OptionsBuisson {
  /** Nombre de tiges partant de la souche. */
  tiges?: number;
  /** Profondeur de ramification de chaque tige. */
  profondeur?: number;
  /** Rayon d'etalement vise, en unites de scene. */
  envergure?: number;
  seed?: number;
}

/**
 * Construit le buisson entier : souche, racines, tiges, feuillage, foyers de flamme.
 *
 * Le buisson est volontairement pose sur son propre centre horizontal — les tiges partent de
 * la souche dans TOUTES les directions, donc il est symetrique par construction, contrairement
 * a l'olivier dont le houppier penchait et coutait 20 % de recul de camera pour cadrer du vide.
 */
export function construireBuisson(o: OptionsBuisson = {}): Buisson {
  const nTiges = o.tiges ?? 11;
  const profondeur = o.profondeur ?? 4;
  const envergure = o.envergure ?? 2.55;
  const alea = graine(o.seed ?? 20261016);

  const segments: SegmentBuisson[] = [];
  const feuilles: FeuilleBuisson[] = [];
  const flammes: Flamme[] = [];

  /* ---------- LA SOUCHE, a ras de terre ----------
   *
   * Pas de racines etalees : la premiere version en semait neuf, droites, et le pied du buisson
   * ressemblait a un oursin — un eventail de pointes nettes sous la masse. Un buisson du desert
   * sort de la caillasse par une souche courte et noueuse ; ce qui se voit, c'est elle.
   *
   * Elles restent BASSES aussi : les racines de l'olivier descendaient a 3,93 unites et leurs
   * pointes sortaient du cadre. Ici rien ne depasse de l'image.
   */
  const nSouches = 5;
  for (let i = 0; i < nSouches; i++) {
    const angle = (i / nSouches) * Math.PI * 2 + alea() * 0.9;
    const longueur = 0.2 + alea() * 0.16;
    segments.push({
      x1: 0, y1: 0, z1: 0,
      x2: Math.cos(angle) * longueur,
      y2: -longueur * (0.7 + alea() * 0.5),
      z2: Math.sin(angle) * longueur,
      naissance: alea() * RACINES_FIN,
      epaisseur: 0.5,
    });
  }

  /* ---------- Les tiges, et ce qu'elles portent ---------- */
  const brancher = (
    x: number, y: number, z: number,
    dx: number, dy: number, dz: number,
    longueur: number, niveau: number, t0: number,
  ) => {
    if (niveau > profondeur || longueur < 0.07) return;
    const x2 = x + dx * longueur;
    const y2 = y + dy * longueur;
    const z2 = z + dz * longueur;

    // Chaque niveau occupe une tranche EGALE de la fenetre : la pousse est reguliere, sans
    // palier mort. Une fraction du reste donnerait une suite geometrique, et tous les derniers
    // niveaux se tasseraient contre la fin.
    const t1 = TIGES_DEBUT + ((niveau + 1) / (profondeur + 1)) * (TIGES_FIN - TIGES_DEBUT);

    segments.push({
      x1: x, y1: y, z1: z, x2, y2, z2,
      naissance: t0,
      epaisseur: Math.max(0.05, 0.72 - niveau / (profondeur + 1)),
    });

    /*
     * Le feuillage occupe les DEUX derniers niveaux, et il est DENSE.
     *
     * Un buisson qui doit rester lisible a travers les flammes ne peut pas etre une ramure
     * claire : il faut une masse. Chaque brindille porte donc une touffe, pas une guirlande.
     */
    if (niveau >= profondeur - 2) {
      const n = 16 + Math.floor(alea() * 12);
      for (let f = 0; f < n; f++) {
        feuilles.push({
          x: x2 + (alea() - 0.5) * 0.46,
          y: y2 + (alea() - 0.5) * 0.42,
          z: z2 + (alea() - 0.5) * 0.46,
          // Le feuillage est COMPLET avant que le feu ne culmine : on voit le buisson entier,
          // puis on le voit bruler sans se consumer. L'inverse raconterait un feu qui devance
          // ce qu'il devait epargner.
          naissance: Math.min(FEUILLES_FIN, t1 + alea() * 0.24),
          phase: alea() * Math.PI * 2,
        });
      }

      /*
       * LES FOYERS DE FLAMME NAISSENT ICI, dans le feuillage, et non sous le buisson.
       *
       * Un feu pose au pied monte en rideau et lit comme un incendie de broussailles. Celui de
       * l'Exode habite le buisson : chaque touffe porte ses propres langues, qui montent de
       * leur place. C'est ce qui donne un brasier qui EPOUSE la forme du buisson au lieu de la
       * masquer.
       */
      /*
       * PEU DE FOYERS, DE GRANDES LANGUES. La premiere version en semait huit par brindille,
       * soit seize cents en tout, et chacune etait si petite qu a l ecran le brasier se
       * reduisait a un poudroiement orange. Un feu se lit a ses LANGUES, pas a sa quantite de
       * particules — et quatre fois moins de flammes quatre fois plus grandes coutent le meme
       * remplissage tout en se voyant enfin.
       */
      const nf = 2 + Math.floor(alea() * 3);
      for (let f = 0; f < nf; f++) {
        // Un tiers de grandes langues : un feu dont toutes les flammes ont la meme taille
        // ressemble a une frange, pas a un brasier.
        const grande = alea() < 0.34;
        flammes.push({
          x: x2 + (alea() - 0.5) * 0.5,
          y: y2 + (alea() - 0.5) * 0.4,
          z: z2 + (alea() - 0.5) * 0.5,
          naissance: FEU_DEBUT + alea() * (FEU_FIN - FEU_DEBUT),
          phase: alea() * Math.PI * 2,
          vitesse: 0.42 + alea() * 0.5,
          taille: grande ? 0.78 + alea() * 0.42 : 0.4 + alea() * 0.34,
          portee: grande ? 1.3 + alea() * 1.0 : 0.5 + alea() * 0.6,
        });
      }
    }

    if (niveau >= profondeur - 1) return;

    // Un buisson se divise davantage qu'un arbre, et plus tot : c'est ce qui lui donne sa masse.
    const enfants = alea() < 0.45 ? 3 : 2;
    for (let c = 0; c < enfants; c++) {
      const ouverture = 0.46 + alea() * 0.5;
      const rotation = (c / enfants) * Math.PI * 2 + alea() * 1.1;
      const ndx = dx * Math.cos(ouverture) + Math.cos(rotation) * Math.sin(ouverture);
      // Dominante verticale plus faible que pour l'arbre : le buisson s'etale au lieu de monter.
      const ndy = dy * Math.cos(ouverture) + 0.14 * Math.sin(ouverture);
      const ndz = dz * Math.cos(ouverture) + Math.sin(rotation) * Math.sin(ouverture);
      const norme = Math.hypot(ndx, ndy, ndz) || 1;
      brancher(x2, y2, z2, ndx / norme, ndy / norme, ndz / norme, longueur * (0.7 + alea() * 0.12), niveau + 1, t1);
    }
  };

  /*
   * LES TIGES, ET POURQUOI ELLES SONT COURBES.
   *
   * Premiere version : chaque tige etait une DROITE partant de l'origine. Resultat a l'ecran,
   * sans appel — un feu d'artifice. Onze rayons nets issus d'un meme point ne font pas un
   * buisson, ils font une gerbe. Une tige de buisson ARQUE : elle sort du sol vers l'exterieur,
   * se redresse en montant sous son propre poids, et ne lache ses ramilles qu'au bout.
   *
   * On la construit donc en trois troncons, en faisant tourner la direction vers la verticale
   * a chaque troncon. La ramification n'arrive qu'apres l'arc, au sommet, la ou la masse doit
   * se former. Et les tiges ne partent pas toutes du meme point : une souche a de la largeur.
   */
  const ARC = 3;

  /**
   * Une tige : un arc de trois troncons qui se redresse en montant, et qui lache des ramilles
   * A CHAQUE troncon, pas seulement au bout.
   *
   * C'est ce dernier point qui fait la difference entre un buisson et une coupe. Premiere
   * version : les ramilles ne partaient que du sommet, donc le feuillage se posait en anneau
   * sur les pointes et le milieu du buisson restait CREUX — une vasque, un verre a pied. Un
   * buisson est une masse PLEINE : il porte des feuilles a toutes les hauteurs, et c'est ce
   * qui lui donne son volume et, ici, ce qui permet au feu de l'habiter au lieu de le survoler.
   *
   * `allonge` varie d'une tige a l'autre : les courtes montent droit au centre, les longues
   * s'etalent. Des tiges de meme longueur rangeraient toutes leurs pointes sur un meme cercle.
   */
  const poserTige = (azimut: number, allonge: number, depart: number) => {
    // Plus la tige est longue, plus elle part ouverte ; une courte monte presque droit.
    let inclinaison = 0.3 + allonge * 0.92 + alea() * 0.22;

    // Le pied de chaque tige est decale sur la souche, jamais au centre exact.
    const rayonSouche = 0.08 + alea() * 0.15;
    let x = Math.cos(azimut) * rayonSouche;
    let y = -0.04 + alea() * 0.08;
    let z = Math.sin(azimut) * rayonSouche;

    let longueur = envergure * (0.2 + allonge * 0.26);
    let t = depart;
    const pasTemps = (TIGES_FIN - TIGES_DEBUT) * 0.4 / ARC;

    for (let a = 0; a < ARC; a++) {
      const derive = (alea() - 0.5) * 0.34;
      const dx = Math.cos(azimut + derive) * Math.sin(inclinaison);
      const dy = Math.cos(inclinaison);
      const dz = Math.sin(azimut + derive) * Math.sin(inclinaison);
      const x2 = x + dx * longueur;
      const y2 = y + dy * longueur;
      const z2 = z + dz * longueur;

      segments.push({
        x1: x, y1: y, z1: z, x2, y2, z2,
        naissance: t,
        epaisseur: 0.78 - a * 0.13,
      });

      x = x2; y = y2; z = z2;
      // Elle se redresse : l'inclinaison se rapproche de la verticale a chaque troncon.
      inclinaison *= 0.6 + alea() * 0.12;
      longueur *= 0.8;
      t += pasTemps;

      /*
       * Des ramilles a CHAQUE etage. Le premier troncon en porte de courtes — le bas du
       * buisson est moins fourni que son sommet, mais il n'est pas nu.
       */
      const ampleur = a === ARC - 1 ? 1.05 : 0.46 + a * 0.2;
      const inc = inclinaison * (0.7 + alea() * 0.5);
      const az = azimut + (alea() - 0.5) * 1.4;
      brancher(
        x, y, z,
        Math.cos(az) * Math.sin(inc),
        Math.cos(inc),
        Math.sin(az) * Math.sin(inc),
        longueur * ampleur,
        a === ARC - 1 ? 0 : 1,
        t,
      );
    }
  };

  for (let i = 0; i < nTiges; i++) {
    poserTige(
      (i / nTiges) * Math.PI * 2 + alea() * 0.55,
      // Longues tiges, qui donnent l'envergure.
      0.62 + alea() * 0.38,
      // Les tiges ne partent pas toutes au meme instant : le buisson se remplit, il n'eclot pas.
      TIGES_DEBUT + alea() * 0.09,
    );
  }

  /*
   * ET DES TIGES INTERIEURES, courtes et droites, qui remplissent le coeur.
   *
   * Sans elles, toutes les pointes sont sur le pourtour et le buisson reste une coquille : vu
   * de face on voit au travers, et le feu n'a rien a habiter au milieu.
   */
  const nCoeur = Math.max(3, Math.round(nTiges * 0.55));
  for (let i = 0; i < nCoeur; i++) {
    poserTige(
      (i / nCoeur) * Math.PI * 2 + 0.7 + alea() * 0.8,
      0.12 + alea() * 0.3,
      TIGES_DEBUT + 0.04 + alea() * 0.1,
    );
  }

  return { segments, feuilles, flammes };
}

/** Un element est-il ne ? Sert au rendu comme aux tests. */
export function estNe(element: { naissance: number }, progression: number): boolean {
  return progression >= element.naissance;
}

/**
 * L'ARDEUR DU FEU a une progression donnee, de 0 a 1.
 *
 * Elle monte en S entre FEU_DEBUT et FEU_FIN : le feu prend doucement, s'empare du buisson, puis
 * se stabilise. Une rampe lineaire s'allumerait d'un coup au premier foyer ne.
 */
export function ardeur(progression: number): number {
  const u = Math.min(1, Math.max(0, (progression - FEU_DEBUT) / (FEU_FIN - FEU_DEBUT)));
  return u * u * (3 - 2 * u);
}

/** Les bornes du buisson, mesurees sur sa geometrie. Sert au cadrage et aux tests. */
export function bornesBuisson(b: Buisson): {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
} {
  let minX = Infinity; let maxX = -Infinity;
  let minY = Infinity; let maxY = -Infinity;
  let minZ = Infinity; let maxZ = -Infinity;
  const voir = (x: number, y: number, z: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  };
  for (const s of b.segments) { voir(s.x1, s.y1, s.z1); voir(s.x2, s.y2, s.z2); }
  for (const f of b.feuilles) voir(f.x, f.y, f.z);
  // Les flammes montent au-dessus de leur foyer : leur portee compte dans la hauteur occupee.
  for (const f of b.flammes) voir(f.x, f.y + f.portee, f.z);
  return { minX, maxX, minY, maxY, minZ, maxZ };
}
