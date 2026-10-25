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
  /**
   * L'adresse d'un MAGASIN, pas d'un fichier : une invitation TestFlight, une fiche App
   * Store ou Google Play. Distincte d'`url` a dessein — on ne telecharge rien, on ouvre une
   * page qui installera elle-meme. Une somme de controle n'y aurait aucun sens : il n'y a
   * pas de fichier a comparer.
   */
  lien?: string;
  /**
   * Une phrase affichee SOUS un bouton actif, quand l installation demande un geste que le
   * telechargement ne suffit pas a expliquer.
   *
   * Le cas qui l a motivee : un APK telecharge depuis un navigateur Android se heurte a deux
   * obstacles d affilee — Chrome avertit que le fichier peut endommager l appareil, puis
   * Android refuse l installation tant que la source n est pas autorisee. L utilisateur
   * telecharge, puis reste bloque devant un fichier qu il ne sait pas ouvrir. Une ligne au
   * bon moment vaut mieux qu une page d aide que personne n ouvre.
   *
   * Facultative : rien ne s affiche si elle est absente, et elle n apparait jamais sous un
   * bouton eteint — ou elle ne ferait qu ajouter du bruit a une attente.
   */
  aide?: string;
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

/**
 * L'AUTRE FACON D'INSTALLER : par un magasin, sans telecharger de fichier.
 *
 * iOS n'autorise pas la pose d'un fichier depuis une page web : l'installation passe par
 * TestFlight ou par l'App Store. Il n'y a donc ni fichier, ni taille, ni somme de controle a
 * exiger — rien de tout cela n'existe. Exiger `sha256` ici, par souci de symetrie avec le
 * telechargement direct, aurait condamne iOS a rester eteint pour toujours, ou pousse a
 * inventer une valeur, ce qui est pire.
 *
 * CE QUI EST EXIGE A LA PLACE : le statut, le nom du magasin et un lien HTTPS. Le nom sert
 * au libelle du bouton — « Installer via TestFlight » dit a l'utilisateur ou il va, et un
 * bouton qui ment sur sa destination est aussi mauvais qu'un bouton mort.
 *
 * LES DEUX VOIES S'EXCLUENT : une entree porte un fichier ou un magasin, jamais les deux.
 * Si les deux etaient remplis, le telechargement direct l'emporte — c'est le plus precis des
 * deux, et le seul dont on ait verifie l'empreinte.
 */
export function estInstallableParMagasin(e: EntreeTelechargement | undefined): boolean {
  if (!e) return false;
  if (estTelechargeable(e)) return false;
  if (e.statut !== 'disponible') return false;
  if (!e.lien || !e.magasin) return false;
  return /^https:\/\//.test(e.lien);
}

/** Les quatre cartes, dans l'ordre d'affichage, quelle que soit la plateforme detectee. */
export const PLATEFORMES: Array<{ cle: Exclude<Plateforme, 'inconnue'>; nom: string; famille: 'ordinateur' | 'mobile' }> = [
  { cle: 'windows', nom: 'Windows', famille: 'ordinateur' },
  { cle: 'macos', nom: 'macOS', famille: 'ordinateur' },
  { cle: 'android', nom: 'Android', famille: 'mobile' },
  { cle: 'ios', nom: 'iPhone / iPad', famille: 'mobile' },
];
