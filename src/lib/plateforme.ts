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
  if (!/^https:\/\//.test(e.lien)) return false;
  return hoteAccordeAuMagasin(e.lien, e.magasin);
}

/**
 * LES HOTES QU'UN MAGASIN A LE DROIT D'AVOIR.
 *
 * Mesure du 29/10/2026 : avant ce garde, `estInstallableParMagasin` ne testait que le
 * schema. Un lien vers https://exemple.invalid/nimporte allumait donc le bouton
 * << Installer via TestFlight >>, et TOUS LES RELEVES RESTAIENT VERTS. Le jour de la
 * premiere activation, la page aurait pu annoncer TestFlight et emmener ailleurs.
 *
 * ON CONTRAINT L'HOTE, PAS LE CHEMIN. La tentation est d'exiger aussi la forme
 * `/join/<jeton>` d'une invitation TestFlight. On s'en abstient : selon que le groupe de
 * testeurs est interne ou externe, Apple ne fabrique pas la meme adresse, et graver une
 * forme qu'on n'a pas pu verifier reviendrait a interdire une activation legitime. L'hote,
 * lui, ne depend d'aucun reglage.
 *
 * ET L'HOTE DOIT S'ACCORDER AVEC LE NOM ANNONCE : un lien Google Play sous le libelle
 * << Installer via TestFlight >> est un bouton qui ment sur sa destination, ce que le
 * commentaire d'`estInstallableParMagasin` interdit deja en mots. Ici, c'est tenu.
 */
export const HOTES_DE_MAGASIN: Readonly<Record<string, readonly string[]>> = {
  testflight: ['testflight.apple.com'],
  'app store': ['apps.apple.com'],
  'google play': ['play.google.com'],
};

/** Vrai si l'hote du lien appartient au magasin annonce. Tout le reste rend faux. */
export function hoteAccordeAuMagasin(lien: string, magasin: string): boolean {
  const attendus = HOTES_DE_MAGASIN[magasin.trim().toLowerCase()];
  if (!attendus) return false;
  let hote: string;
  try {
    hote = new URL(lien).hostname.toLowerCase();
  } catch {
    /* Une adresse que le navigateur lui-meme ne sait pas lire n'ouvrira rien. */
    return false;
  }
  return attendus.includes(hote);
}

/* --------------------------------------------- LA TROISIEME VOIE : LE NAVIGATEUR */

/**
 * CERTAINES PLATEFORMES S'INSTALLENT DEPUIS LE NAVIGATEUR, SANS FICHIER NI MAGASIN.
 *
 * Sur iPhone, Safari pose Talvex sur l'ecran d'accueil : l'application obtient son icone,
 * son lancement plein ecran, et se comporte comme une application installee. Sans compte
 * Apple, sans magasin, sans attendre une revue.
 *
 * ---------- POURQUOI CECI NE VIT PAS DANS LE MANIFESTE ----------
 *
 * public/telechargements.json declare ce qu'on a PUBLIE : un fichier avec sa version et son
 * empreinte, ou une fiche de magasin. Or cette voie-ci n'a NI fichier, NI version, NI somme
 * de controle, NI magasin — il n'y a rien a publier. Elle ne depend pas d'une publication
 * mais du couple appareil + navigateur, et elle est vraie dès que le site est en ligne.
 *
 * L'y ranger aurait force a inventer des champs vides, ou a declarer iOS << disponible >>
 * sans qu'aucun binaire existe — ce qui aurait rendu faux le compte des plateformes
 * publiees et brouille la question qui compte vraiment : << l'.ipa existe-t-il ? >>. Les
 * deux restent donc distincts : le manifeste dit ce qu'on a publie, ceci dit ce que
 * l'appareil sait faire.
 *
 * ---------- LE NAVIGATEUR COMPTE, PAS SEULEMENT L'APPAREIL ----------
 *
 * Sur iOS, seul Safari sait poser une application sur l'ecran d'accueil. Le mode d'emploi
 * nomme donc le navigateur : sans cela, un utilisateur de Chrome sur iPhone chercherait un
 * bouton Partager qui n'ouvre pas la meme chose. C'est le defaut que porte encore
 * usePwaInstall.ts, qui teste l'APPAREIL et pas le navigateur.
 */
export interface VoieNavigateur {
  /** Le navigateur reellement employe, nomme a l'utilisateur. */
  navigateur: string;
  /** Les gestes, dans l'ordre. Deux suffisent ; une troisieme ligne ne serait pas lue. */
  etapes: readonly string[];
  /**
   * Vrai quand ce navigateur est celui qu'on recommande. Faux ne veut pas dire << ca ne
   * marche pas >> : cela veut dire << ca marche, et Safari marche mieux >>. La nuance
   * compte, parce qu'un utilisateur de Chrome a qui on dit << utilisez Safari >> sans
   * expliquer pourquoi change de navigateur pour rien, ou abandonne.
   */
  recommande: boolean;
  /** Pourquoi on en recommande un autre, quand on en recommande un autre. */
  pourquoiPasRecommande?: string;
  /**
   * Ce que l'utilisateur doit savoir AVANT d'installer, et qu'il decouvrirait sinon a la
   * mauvaise minute. Au 29/10/2026 : la session ne survit pas a la fermeture, parce que le
   * stockage de session est volontairement limite a l'onglet hors application Capacitor
   * (voir src/lib/stockageSession.ts). C'est une politique assumee, pas un defaut — mais
   * la taire ferait croire a une panne.
   */
  reserve?: string;
}

/* ------------------------------------------- QUEL NAVIGATEUR, SUR iOS */

export type NavigateurIOS = 'safari' | 'chrome' | 'firefox' | 'edge' | 'autre';

/**
 * LE NAVIGATEUR COMPTE AUTANT QUE L'APPAREIL, et c'est le defaut que ceci repare.
 *
 * Le geste n'est pas au meme endroit selon le navigateur : dans Safari, le bouton Partager
 * est en BAS de l'ecran ; dans Chrome et Edge, il est en HAUT, dans la barre d'adresse.
 * Montrer le mode d'emploi de Safari a un utilisateur de Chrome l'envoie chercher un bouton
 * la ou il n'y en a pas. C'est ce que fait encore usePwaInstall.ts, qui teste l'APPAREIL
 * (iPhone|iPad|iPod) et jamais le navigateur.
 *
 * ---------- L'ORDRE DES TESTS EST LA SEULE CHOSE QUI COMPTE ICI ----------
 *
 * Sur iOS, TOUS les navigateurs sont obliges d'employer WebKit, et tous portent donc
 * « Safari/ » dans leur chaine d'agent. Chrome s'annonce « CriOS », Firefox « FxiOS », Edge
 * « EdgiOS » — mais chacun garde « Safari/ » a cote. Tester Safari en premier classerait
 * donc les trois autres comme Safari, en silence.
 *
 * C'est le meme piege que l'iPad qui se fait passer pour un Mac, deja traite plus haut :
 * une chaine d'agent se lit du plus specifique au plus general, jamais l'inverse.
 */
export function navigateurIOSDepuisUA(ua: string): NavigateurIOS {
  if (/CriOS\//.test(ua)) return 'chrome';
  if (/FxiOS\//.test(ua)) return 'firefox';
  if (/EdgiOS\//.test(ua)) return 'edge';
  /* Opera et les autres coquilles WebKit retombent ici : le geste y passe aussi par le
     menu, donc le mode d'emploi generique leur convient. */
  if (/Safari\//.test(ua)) return 'safari';
  return 'autre';
}

/**
 * LA RESERVE, LA MEME POUR TOUS LES NAVIGATEURS.
 *
 * Elle ne depend pas du navigateur mais du STOCKAGE : hors application Capacitor, le jeton
 * de session vit dans le stockage de l'onglet (src/lib/stockageSession.ts). Decision de
 * David, confirmee le 29/10/2026 : on ne l'assouplit pas, on l'ANNONCE.
 */
const RESERVE_SESSION = 'Vous devrez vous reconnecter à chaque ouverture : par sécurité, '
  + "Talvex ne garde pas la session d'une application installée depuis le navigateur.";

/**
 * OU SE TROUVE LE PARTAGE, NAVIGATEUR PAR NAVIGATEUR.
 *
 * Mesure documentaire du 29/10/2026 : depuis iOS 16.4, les navigateurs tiers peuvent
 * proposer « Sur l'écran d'accueil » dans leur feuille de partage, et comme ils tournent
 * tous sur WebKit, l'application posee se comporte comme celle de Safari.
 *
 * SAFARI RESTE RECOMMANDE, et pour une raison qui n'est pas un gout : c'est le seul chez
 * qui l'option est presente depuis toujours et sur toutes les versions d'iOS. Sur les
 * autres, elle depend de la version du navigateur ET d'iOS 16.4 ou plus — d'ou la formule
 * << si l'option est absente, passez par Safari >>, qui ne promet rien qu'on n'ait verifie.
 */
const VOIES_IOS: Readonly<Record<NavigateurIOS, VoieNavigateur>> = {
  safari: {
    navigateur: 'Safari',
    recommande: true,
    etapes: [
      'Appuyez sur Partager, dans la barre du bas',
      "Faites défiler, puis « Sur l'écran d'accueil »",
    ],
    reserve: RESERVE_SESSION,
  },
  chrome: {
    navigateur: 'Chrome',
    recommande: false,
    pourquoiPasRecommande: "Dans Safari, l'option est toujours présente. Ici elle dépend de "
      + "la version de Chrome et d'iOS 16.4 ou plus récent.",
    etapes: [
      'Appuyez sur Partager, en haut à droite de la barre d’adresse',
      "Puis « Sur l'écran d'accueil ». Si l'option manque, ouvrez cette page dans Safari",
    ],
    reserve: RESERVE_SESSION,
  },
  edge: {
    navigateur: 'Edge',
    recommande: false,
    pourquoiPasRecommande: "Dans Safari, l'option est toujours présente. Ici elle dépend de "
      + "la version d'Edge et d'iOS 16.4 ou plus récent.",
    etapes: [
      'Appuyez sur le menu « … », puis sur Partager',
      "Puis « Sur l'écran d'accueil ». Si l'option manque, ouvrez cette page dans Safari",
    ],
    reserve: RESERVE_SESSION,
  },
  firefox: {
    navigateur: 'Firefox',
    recommande: false,
    pourquoiPasRecommande: "Dans Safari, l'option est toujours présente. Ici elle dépend de "
      + "la version de Firefox et d'iOS 16.4 ou plus récent.",
    etapes: [
      'Appuyez sur le menu « … », puis sur Partager',
      "Puis « Sur l'écran d'accueil ». Si l'option manque, ouvrez cette page dans Safari",
    ],
    reserve: RESERVE_SESSION,
  },
  /*
   * UN NAVIGATEUR QU'ON NE RECONNAIT PAS N'EST PAS UNE IMPASSE. On ne peut pas lui dire ou
   * est son bouton, puisqu'on ne sait pas lequel c'est — alors on nomme le geste sans
   * nommer l'endroit, et on indique la voie sure.
   */
  autre: {
    navigateur: 'votre navigateur',
    recommande: false,
    pourquoiPasRecommande: "Nous ne reconnaissons pas ce navigateur. Safari, lui, propose "
      + "toujours l'option.",
    etapes: [
      'Ouvrez le menu de partage de votre navigateur',
      "Cherchez « Sur l'écran d'accueil ». À défaut, ouvrez cette page dans Safari",
    ],
    reserve: RESERVE_SESSION,
  },
};

/**
 * La voie navigateur d'une plateforme, adaptee au navigateur, ou undefined si la plateforme
 * ne s'installe pas ainsi.
 *
 * `ua` est facultatif : sans lui, on rend le mode d'emploi de Safari, qui est le cas le plus
 * frequent sur iPhone et le seul garanti. Un defaut qui marche vaut mieux qu'un undefined
 * qui efface l'offre.
 */
export function voieNavigateur(p: Plateforme, ua?: string): VoieNavigateur | undefined {
  if (p !== 'ios') return undefined;
  /*
   * CHAINE D'AGENT ABSENTE : on rend SAFARI, pas le cas generique.
   *
   * Le cas arrive pour de vrai, et pas seulement en theorie : au PREMIER rendu du composant,
   * la chaine n'a pas encore ete lue par l'effet. Retomber sur << votre navigateur >> ferait
   * donc clignoter un mode d'emploi vague avant le bon, a chaque ouverture de la page.
   *
   * Safari est le defaut le moins trompeur : c'est le navigateur le plus frequent sur
   * iPhone, et le seul chez qui l'option est garantie quelle que soit la version d'iOS.
   */
  if (!ua) return VOIES_IOS.safari;
  return VOIES_IOS[navigateurIOSDepuisUA(ua)] ?? VOIES_IOS.safari;
}

/** Exporte pour les releves : ils verifient chaque navigateur sans simuler un appareil. */
export const VOIES_INSTALLATION_IOS = VOIES_IOS;

/** Les quatre cartes, dans leur ordre de declaration. */
export const PLATEFORMES: Array<{ cle: Exclude<Plateforme, 'inconnue'>; nom: string; famille: 'ordinateur' | 'mobile' }> = [
  { cle: 'windows', nom: 'Windows', famille: 'ordinateur' },
  { cle: 'macos', nom: 'macOS', famille: 'ordinateur' },
  { cle: 'android', nom: 'Android', famille: 'mobile' },
  { cle: 'ios', nom: 'iPhone / iPad', famille: 'mobile' },
];

/**
 * CE QU'ON MONTRE D'ABORD, ET CE QU'ON RANGE DERRIERE.
 *
 * DEFAUT MESURE LE 29/10/2026, et c'est le plus visible qu'un iPhone rencontrait : la page
 * affichait les quatre cartes quelle que soit la plateforme detectee, et comme l'activation
 * ne depend que du manifeste, un visiteur iPhone se voyait proposer DEUX boutons
 * actionnables qui ne le concernaient pas — un installateur .exe Windows et un .apk
 * Android — pendant que sa propre carte etait un pave mort.
 *
 * LA DETECTION NE FERME RIEN. Elle ne fait que separer ce qui concerne le visiteur de ce
 * qui concerne les autres ; les autres restent accessibles d'un geste. C'est la regle que
 * l'en-tete de ce fichier posait deja en mots — << une detection qui se trompe doit couter
 * un regard, jamais une impasse >> — et elle est tenue ici : rien n'est retire, tout est
 * seulement range.
 *
 * Une plateforme inconnue ne met rien en avant et montre tout : c'est le seul comportement
 * qui ne prive personne.
 */
export function rangerPlateformes(detectee: Plateforme): {
  sienne: Array<(typeof PLATEFORMES)[number]>;
  autres: Array<(typeof PLATEFORMES)[number]>;
} {
  const sienne = PLATEFORMES.filter((p) => p.cle === detectee);
  if (sienne.length === 0) return { sienne: [], autres: [...PLATEFORMES] };
  return { sienne, autres: PLATEFORMES.filter((p) => p.cle !== detectee) };
}
