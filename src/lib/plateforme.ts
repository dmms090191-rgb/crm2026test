/**
 * LA PLATEFORME DU VISITEUR, et le contrat du manifeste de telechargement.
 *
 * Deux choses vivent ici, et toutes deux sont PURES : les releves les interrogent
 * directement, sans navigateur ni reseau.
 *
 * CE QUE LA DETECTION DECIDE, ET CE QU'ELLE NE DECIDE PAS. Elle choisit seulement quelle
 * carte est mise en avant. Les quatre plateformes restent visibles et accessibles : une
 * detection qui se trompe doit couter un regard, jamais une impasse. Surtout, elle
 * n'active AUCUN bouton — cela, seul le manifeste le decide (voir estTelechargeable).
 */

export type Plateforme = 'windows' | 'macos' | 'android' | 'ios' | 'inconnue';

export interface SignauxPlateforme {
  /** navigator.userAgent */
  ua: string;
  /** navigator.userAgentData?.platform — absent de Firefox et de Safari. */
  platformUAData?: string;
  /** navigator.maxTouchPoints : c'est lui qui demasque l'iPad. */
  maxTouchPoints: number;
}

/**
 * L'ORDRE COMPTE, et chaque etape repare un defaut de la suivante.
 *
 * 1. userAgentData.platform d'abord quand il existe : c'est une donnee declaree, pas une
 *    chaine a deviner. Absente de Firefox et de Safari, donc jamais seule.
 * 2. L'IPAD AVANT LE MAC. Depuis iPadOS 13, un iPad se presente comme un Macintosh : son
 *    UA ne contient ni iPad ni iPhone. Le seul signal qui les separe est le nombre de
 *    points de contact. Teste apres Mac OS X, un iPad serait classe macOS et on lui
 *    proposerait un .dmg — c'est exactement le defaut qu'a usePwaInstall.ts aujourd'hui.
 * 3. Android avant Linux : un Android porte « Linux » dans son UA.
 */
export function plateformeDepuisSignaux(s: SignauxPlateforme): Plateforme {
  const ua = s.ua || '';

  if (s.platformUAData) {
    const p = s.platformUAData.toLowerCase();
    if (p.includes('win')) return 'windows';
    if (p.includes('android')) return 'android';
    if (p.includes('mac')) {
      // Meme ici l'iPad se fait passer pour un Mac : le contact tranche.
      return s.maxTouchPoints > 1 ? 'ios' : 'macos';
    }
  }

  if (/iPhone|iPod/.test(ua)) return 'ios';
  if (/iPad/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows NT/.test(ua)) return 'windows';
  if (/Mac OS X|Macintosh/.test(ua)) {
    return s.maxTouchPoints > 1 ? 'ios' : 'macos';
  }
  return 'inconnue';
}

/** Lecture defensive : un navigateur sans ces API ne doit pas faire echouer la page. */
export function lireSignauxPlateforme(): SignauxPlateforme {
  if (typeof navigator === 'undefined') return { ua: '', maxTouchPoints: 0 };
  const n = navigator as unknown as {
    userAgent?: string;
    maxTouchPoints?: number;
    userAgentData?: { platform?: string };
  };
  return {
    ua: n.userAgent ?? '',
    platformUAData: n.userAgentData?.platform,
    maxTouchPoints: typeof n.maxTouchPoints === 'number' ? n.maxTouchPoints : 0,
  };
}

/* ------------------------------------------------------------------ LE MANIFESTE */

/** Une entree du manifeste, telle que public/telechargements.json la porte. */
export interface EntreeTelechargement {
  statut: 'disponible' | 'bientot';
  version?: string;
  url?: string;
  taille?: number;
  sha256?: string;
  publie_le?: string;
  /** Pour les stores : le texte du bouton differe d'un telechargement direct. */
  magasin?: string;
}

export type Manifeste = Partial<Record<Exclude<Plateforme, 'inconnue'>, EntreeTelechargement>>;

/**
 * LA REGLE QUI REND UN FAUX BOUTON IMPOSSIBLE.
 *
 * Un bouton n'est actif que si l'entree est COMPLETE : statut exactement 'disponible', et
 * une url, une version et une somme de controle non vides. Tout le reste — manifeste
 * absent, illisible, hors ligne, champ oublie, statut mal orthographie — rend false.
 *
 * L'etat par defaut est donc INACTIF, et il faut une declaration complete pour en sortir.
 * C'est l'inverse du reflexe habituel (« actif sauf si... »), et c'est volontaire : avec
 * ce sens-la, un oubli ne peut produire qu'un bouton eteint, jamais un lien mort.
 *
 * La somme de controle est exigee alors que la page ne la verifie pas : elle n'est pas la
 * pour proteger le navigateur, mais pour forcer celui qui publie a l'avoir calculee sur le
 * fichier reellement mis en ligne. On ne peut pas la remplir sans avoir tenu le fichier.
 */
export function estTelechargeable(e: EntreeTelechargement | undefined): boolean {
  if (!e) return false;
  if (e.statut !== 'disponible') return false;
  if (!e.url || !e.version || !e.sha256) return false;
  return true;
}

/** Les quatre cartes, dans l'ordre d'affichage, quelle que soit la plateforme detectee. */
export const PLATEFORMES: Array<{ cle: Exclude<Plateforme, 'inconnue'>; nom: string; famille: 'ordinateur' | 'mobile' }> = [
  { cle: 'windows', nom: 'Windows', famille: 'ordinateur' },
  { cle: 'macos', nom: 'macOS', famille: 'ordinateur' },
  { cle: 'android', nom: 'Android', famille: 'mobile' },
  { cle: 'ios', nom: 'iPhone / iPad', famille: 'mobile' },
];
