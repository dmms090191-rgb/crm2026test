/**
 * L'OLIVIER, construit par le calcul plutot que telecharge.
 *
 * Aucun modele d'olivier libre ne POUSSE : les deux candidats serieux trouves sont des maillages
 * figes, non animes, dont l'un pese 2,7 millions de triangles. Or la scene demande exactement
 * l'inverse d'un maillage fige : un arbre qui nait de ses racines et se deploie.
 *
 * On genere donc l'arbre entier, une fois, et on lui donne une CHRONOLOGIE : chaque segment
 * porte l'instant ou il doit apparaitre. La croissance n'est alors plus une animation, c'est
 * une lecture — on affiche les segments dont l'heure est venue. D'ou deux proprietes gratuites :
 * remonter la page fait rentrer l'arbre dans sa graine, exactement ; et le cout par image ne
 * depend pas de l'avancement, puisque la geometrie ne change jamais.
 *
 * Les racines naissent en premier, vers le BAS, pendant que les particules du chapitre
 * precedent descendent. Le tronc et les branches suivent. La loi du defilement est respectee :
 * ce qui arrive d'abord descend.
 *
 * Module PUR : aucun import, verifiable sans navigateur.
 */

export interface Segment {
  /** Extremites, en coordonnees monde. */
  x1: number; y1: number; z1: number;
  x2: number; y2: number; z2: number;
  /** Instant d'apparition, de 0 a 1 dans la progression du chapitre. */
  naissance: number;
  /** Epaisseur relative, de 0 a 1 : le tronc est epais, la brindille ne l'est pas. */
  epaisseur: number;
}

export interface Feuille {
  x: number; y: number; z: number;
  naissance: number;
  /** Phase propre, pour que le vent ne les agite pas toutes ensemble. */
  phase: number;
}

export interface Arbre {
  segments: Segment[];
  feuilles: Feuille[];
}

/**
 * Les racines occupent le premier tiers. Les branches suivent, mais s'arretent AVANT la fin
 * du chapitre : il faut du temps apres elles pour que le feuillage se forme.
 *
 * La premiere version faisait courir les branches jusqu'a 0,94, si bien que les feuilles,
 * qui naissent apres leur branche, n'arrivaient qu'entre 0,85 et 0,93 — et en petit nombre.
 * Mesure a l'ecran : l'olivier restait un arbre d'HIVER pendant tout le chapitre, branches
 * nues sur ciel noir, et le feuillage apparaissait trop tard pour qu'on le voie.
 */
const DEBUT_BRANCHES = 0.3;
const FIN_BRANCHES = 0.78;

/** Generateur reproductible : le meme arbre a chaque chargement, jamais un arbre au hasard. */
function graine(n: number): () => number {
  let etat = n >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

interface Options {
  /** Profondeur de ramification. 6 donne environ 250 segments. */
  profondeur?: number;
  /** Longueur du tronc. */
  tronc?: number;
  seed?: number;
}

/**
 * Construit l'arbre complet : racines vers le bas, tronc, branches.
 *
 * La chronologie est repartie ainsi : les racines occupent le premier tiers de la progression,
 * le tronc et les branches les deux tiers suivants. Les feuilles arrivent en dernier, une fois
 * leur branche nee — jamais avant, sinon elles flotteraient dans le vide.
 */
export function construireArbre(o: Options = {}): Arbre {
  const profondeur = o.profondeur ?? 6;
  const tronc = o.tronc ?? 3.1;
  const alea = graine(o.seed ?? 20261012);

  const segments: Segment[] = [];
  const feuilles: Feuille[] = [];

  // ---- Les racines, vers le bas, sur la premiere moitie du premier tiers ----
  const nRacines = 7;
  for (let i = 0; i < nRacines; i++) {
    const angle = (i / nRacines) * Math.PI * 2 + alea() * 0.4;
    let x = 0, y = 0, z = 0;
    let longueur = 0.9;
    for (let d = 0; d < 3; d++) {
      const ecart = (alea() - 0.5) * 0.7;
      const x2 = x + Math.cos(angle + ecart) * longueur;
      const z2 = z + Math.sin(angle + ecart) * longueur;
      const y2 = y - longueur * (0.55 + alea() * 0.3);
      segments.push({
        x1: x, y1: y, z1: z, x2, y2, z2,
        naissance: (d / 3) * 0.3,
        epaisseur: 0.5 - d * 0.12,
      });
      x = x2; y = y2; z = z2;
      longueur *= 0.68;
    }
  }

  // ---- Le tronc et les branches ----
  const brancher = (
    x: number, y: number, z: number,
    dx: number, dy: number, dz: number,
    longueur: number, niveau: number, t0: number,
  ) => {
    if (niveau > profondeur || longueur < 0.08) return;
    const x2 = x + dx * longueur;
    const y2 = y + dy * longueur;
    const z2 = z + dz * longueur;
    /*
     * Chaque niveau occupe une tranche EGALE de la fenetre de croissance.
     *
     * Premiere version : chaque niveau prenait une fraction de ce qui restait, ce qui donne une
     * suite geometrique — les derniers niveaux se tassaient tous contre 1, et a mi-chapitre
     * l arbre n avait encore que son tronc et deux branches. Mesure a l appui. Une repartition
     * lineaire fait pousser l arbre regulierement, du debut a la fin du chapitre.
     */
    const t1 = DEBUT_BRANCHES + ((niveau + 1) / (profondeur + 1)) * (FIN_BRANCHES - DEBUT_BRANCHES);

    segments.push({
      x1: x, y1: y, z1: z, x2, y2, z2,
      naissance: t0,
      epaisseur: Math.max(0.06, 1 - niveau / (profondeur + 1)),
    });

    /*
     * Le feuillage occupe les DEUX derniers niveaux, pas seulement les bouts : un olivier porte
     * ses feuilles sur toute la ramure fine, et une couronne accrochee aux seules extremites se
     * lit comme une guirlande. Environ 370 feuilles au lieu de 150, et elles s'ouvrent sur une
     * fenetre large pour que la couronne se remplisse au lieu d'apparaitre d'un coup.
     */
    if (niveau >= profondeur - 2) {
      // Beaucoup de feuilles, serrees autour de chaque brindille : une couronne se lit comme
      // une MASSE. A cinq cents points on comptait encore les feuilles une a une, ce qui donne
      // un arbre de maquette ; il en faut plusieurs milliers pour que l oeil voie du feuillage.
      const n = 12 + Math.floor(alea() * 10);
      for (let f = 0; f < n; f++) {
        feuilles.push({
          x: x2 + (alea() - 0.5) * 0.58,
          y: y2 + (alea() - 0.5) * 0.52,
          z: z2 + (alea() - 0.5) * 0.58,
          // Fenetre LARGE : la couronne se remplit tout au long de la fin du chapitre au lieu
          // de se poser d un bloc, et il ne reste aucun palier mort avant la frontiere suivante.
          naissance: Math.min(0.97, t1 + alea() * 0.28),
          phase: alea() * Math.PI * 2,
        });
      }
    }

    // La ramification, elle, s'arrete au dernier niveau.
    if (niveau >= profondeur - 1) return;

    const enfants = alea() < 0.25 ? 3 : 2;
    for (let c = 0; c < enfants; c++) {
      const ouverture = 0.42 + alea() * 0.42;
      const rotation = (c / enfants) * Math.PI * 2 + alea() * 0.9;
      // On incline la direction courante, en gardant une dominante verticale.
      const ndx = dx * Math.cos(ouverture) + Math.cos(rotation) * Math.sin(ouverture);
      const ndy = dy * Math.cos(ouverture) + 0.26 * Math.sin(ouverture);
      const ndz = dz * Math.cos(ouverture) + Math.sin(rotation) * Math.sin(ouverture);
      const norme = Math.hypot(ndx, ndy, ndz) || 1;
      brancher(x2, y2, z2, ndx / norme, ndy / norme, ndz / norme, longueur * (0.66 + alea() * 0.12), niveau + 1, t1);
    }
  };

  brancher(0, 0, 0, 0, 1, 0, tronc, 0, DEBUT_BRANCHES);

  return { segments, feuilles };
}

/** Un segment est-il ne ? Sert aussi bien au shader qu'aux tests. */
export function estNe(segment: { naissance: number }, progression: number): boolean {
  return progression >= segment.naissance;
}

/** Combien de segments sont nes a cette progression. Utile pour verifier la croissance. */
export function comptePousse(arbre: Arbre, progression: number): number {
  return arbre.segments.filter(s => estNe(s, progression)).length;
}
