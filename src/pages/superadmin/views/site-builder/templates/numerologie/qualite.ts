/**
 * QUALITE ADAPTATIVE — le reglage decide avant le premier rendu, pas apres.
 *
 * Une scene volumetrique coute surtout en PIXELS : le raymarch tourne une fois par pixel et
 * par pas. Doubler le rapport de pixels quadruple le travail. Sur un telephone, c'est la
 * difference entre une scene fluide et un diaporama. Les deux premiers leviers sont donc le
 * rapport de pixels et le nombre de pas — jamais la geometrie, qui ne coute presque rien ici.
 *
 * `reglagesPour` est une fonction PURE : elle ne lit ni window ni navigator. C'est ce qui la
 * rend verifiable sans navigateur. La lecture de l'appareil est isolee dans `detecterAppareil`,
 * qui ne fait que remplir la structure.
 *
 * `prefers-reduced-motion` n'est pas une question de performance mais de respect : il coupe la
 * derive de la camera et le scintillement, sans degrader l'image.
 */

export type Niveau = 'bas' | 'moyen' | 'haut';

export interface Appareil {
  /** Largeur de la fenetre en pixels CSS. */
  largeur: number;
  /** devicePixelRatio tel que l'ecran l'annonce. */
  dprEcran: number;
  /** Coeurs logiques annonces, 0 si inconnu. */
  coeurs: number;
  /** Memoire annoncee en Go, 0 si inconnue. */
  memoire: number;
  /** L'appareil est-il tactile (donc probablement mobile) ? */
  tactile: boolean;
  /** L'utilisateur demande-t-il moins d'animation ? */
  mouvementReduit: boolean;
}

export interface Reglages {
  niveau: Niveau;
  /** Rapport de pixels a imposer au rendu. Plafonne : au-dela, le gain visuel est nul. */
  dpr: number;
  /** Pas de traversee des nuages. En dessous de 10, la couche se delite visiblement. */
  pas: number;
  /** Pas vers le soleil pour l'eclairage interne des nuages. 0 = nuages plats. */
  pasLumiere: number;
  /** Nombre de particules dorees. */
  particules: number;
  /** Lueur sur les hautes lumieres. */
  lueur: boolean;
  /** Rayons solaires traversant la scene. Le plus couteux des trois. */
  rayons: boolean;
  /** Profondeur de champ. */
  profondeurChamp: boolean;
  /** Intensite des etoiles, 0 a 1. */
  etoiles: number;
  /** La camera derive-t-elle toute seule ? */
  deriveCamera: boolean;
}

// Niveau bas : AUCUN post-traitement (voir Atmosphere.tsx). `lueur` vaut donc false — un
// reglage qui annonce un effet que le rendu ne monte pas finirait par tromper quelqu'un.
const BAS: Reglages = {
  niveau: 'bas', dpr: 1, pas: 12, pasLumiere: 2, particules: 220,
  lueur: false, rayons: false, profondeurChamp: false, etoiles: 0.5, deriveCamera: true,
};

const MOYEN: Reglages = {
  niveau: 'moyen', dpr: 1.35, pas: 20, pasLumiere: 4, particules: 520,
  lueur: true, rayons: true, profondeurChamp: false, etoiles: 0.75, deriveCamera: true,
};

const HAUT: Reglages = {
  niveau: 'haut', dpr: 1.75, pas: 28, pasLumiere: 6, particules: 900,
  lueur: true, rayons: true, profondeurChamp: true, etoiles: 1, deriveCamera: true,
};

/**
 * Choisit le niveau a partir des seules caracteristiques de l'appareil.
 *
 * Un ecran tactile etroit part en bas quoi qu'il annonce : la puissance declaree d'un
 * telephone ne dit rien de son enveloppe thermique, et une scene qui demarre fluide puis
 * s'effondre apres vingt secondes est pire qu'une scene sobre d'emblee.
 */
export function reglagesPour(a: Appareil): Reglages {
  let base: Reglages;

  if (a.tactile && a.largeur < 820) {
    base = BAS;
  } else if (a.largeur < 1280 || (a.coeurs > 0 && a.coeurs <= 4) || (a.memoire > 0 && a.memoire <= 4)) {
    base = MOYEN;
  } else {
    base = HAUT;
  }

  // Le rapport de pixels ne depasse jamais celui de l'ecran : sur-echantillonner un ecran a
  // 1 dpr ne change rien a l'image et double le cout.
  const dpr = Math.min(base.dpr, Math.max(1, a.dprEcran));

  if (!a.mouvementReduit) return { ...base, dpr };

  // Mouvement reduit : l'image garde sa qualite, c'est le mouvement qui s'arrete.
  return { ...base, dpr, deriveCamera: false, etoiles: base.etoiles > 0 ? 0.6 : 0 };
}

/** Lit l'appareil. Sans navigateur, rend des valeurs qui menent au niveau moyen. */
export function detecterAppareil(): Appareil {
  if (typeof window === 'undefined') {
    return { largeur: 1280, dprEcran: 1, coeurs: 0, memoire: 0, tactile: false, mouvementReduit: false };
  }
  const nav = navigator as Navigator & { hardwareConcurrency?: number; deviceMemory?: number };
  return {
    largeur: window.innerWidth,
    dprEcran: window.devicePixelRatio || 1,
    coeurs: nav.hardwareConcurrency ?? 0,
    memoire: nav.deviceMemory ?? 0,
    tactile: window.matchMedia('(pointer: coarse)').matches,
    mouvementReduit: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

/** Le navigateur sait-il faire du WebGL ? Sinon la page doit montrer autre chose. */
export function webglDisponible(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const toile = document.createElement('canvas');
    return Boolean(toile.getContext('webgl2') || toile.getContext('webgl'));
  } catch {
    return false;
  }
}
