/**
 * Le RUNTIME dans lequel Talvex s'execute. Trois valeurs, et une seule source de verite.
 *
 *   web      le site, dans un onglet de navigateur
 *   pwa      la PWA installee (ecran d'accueil mobile, ou installation Edge/Chrome)
 *   desktop  l'application installee Windows/macOS, dans une fenetre Tauri
 *
 * CE QUI A ETE MESURE le 25/10/2026, par une sonde Tauri jetable hors du depot, en
 * `tauri dev` ET sur l'executable REELLEMENT INSTALLE :
 *
 *   contexte  | window.isTauri | display-mode: standalone | navigator.standalone
 *   web       | undefined      | false                    | undefined
 *   pwa       | undefined      | true                     | true sur iOS
 *   desktop   | TRUE           | FALSE                    | undefined
 *
 * Le piege est dans la troisieme ligne : en Tauri, `display-mode: standalone` vaut FAUX,
 * dans les deux modes. Un code qui se brancherait dessus croirait etre sur le web et
 * afficherait la landing au lieu du portail. Le seul signal fiable du bureau est
 * `window.isTauri`, et il est pose par Tauri AVANT le premier script de la page — donc
 * disponible plus tot que React, et meme que les modules.
 *
 * L'ORDRE DES TESTS EST UNE DECISION, PAS UN HASARD : `desktop` est examine AVANT `pwa`.
 * Aujourd'hui les deux signaux ne se recouvrent pas, mais si une version future de Tauri
 * se declarait aussi autonome, le bureau doit continuer de gagner — sinon l'application
 * Windows retomberait sur la coquille MOBILE, qui n'est pas faite pour un ecran de PC.
 *
 * CE QUE CE MODULE NE COUVRE PAS : l'apercu « telephone virtuel », qui vit dans une
 * iframe et se reconnait a son propre marqueur (IS_VIRTUAL_PHONE, src/App.tsx). Il est
 * ORTHOGONAL aux trois runtimes et ne doit pas etre absorbe ici : un telephone virtuel
 * peut s'afficher dans n'importe lequel des trois.
 */

export type Runtime = 'web' | 'pwa' | 'desktop' | 'mobile';

/** Les signaux bruts, pour que la decision soit une fonction PURE, donc verifiable. */
export interface SignauxRuntime {
  /** `window.isTauri === true` : pose par Tauri avant tout script de la page. */
  tauri: boolean;
  /** `matchMedia('(display-mode: standalone)').matches` : vrai pour une PWA installee. */
  afficheAutonome: boolean;
  /** `navigator.standalone === true` : la forme propre a Safari iOS. */
  standaloneApple: boolean;
  /**
   * `window.Capacitor.isNativePlatform() === true` : l'application empaquetee par
   * Capacitor, sur Android ou iOS.
   *
   * ON APPELLE LA METHODE, ON NE REGARDE PAS SI L'OBJET EXISTE. `window.Capacitor` est
   * aussi pose sur le WEB des que @capacitor/core entre dans le paquet : tester sa
   * presence classerait donc le site ordinaire en « mobile ». Seul isNativePlatform()
   * distingue l'application native de la page web qui embarque la meme bibliotheque.
   */
  capacitorNatif: boolean;
}

/**
 * La decision, sans aucune lecture de l'environnement : c'est elle que les releves
 * exercent, parce qu'un test qui lirait l'environnement reel se mesurerait lui-meme.
 * Ce n'est pas une precaution de style : sous Node, `navigator.platform` existe et vaut
 * « Win32 », donc une detection naive y passe au vert contre le mauvais objet.
 */
export function runtimeDepuisSignaux(signaux: SignauxRuntime): Runtime {
  if (signaux.tauri) return 'desktop';
  /*
   * MOBILE AVANT PWA, ET CE N'EST PAS UN DETAIL D'ORDRE. Une application Capacitor peut
   * tres bien repondre vrai a `display-mode: standalone` : la tester apres la PWA la
   * ferait classer « pwa », avec deux consequences mesurees — main.tsx purgerait ses
   * jetons de session a chaque lancement (donc reconnexion forcee), et la deconnexion
   * repasserait en portee globale, si bien que fermer sa session sur le telephone
   * fermerait aussi celle de Windows. L'ordre voulu par David est donc :
   * desktop > mobile > pwa > web.
   */
  if (signaux.capacitorNatif) return 'mobile';
  if (signaux.afficheAutonome || signaux.standaloneApple) return 'pwa';
  return 'web';
}

/**
 * Lecture DEFENSIVE des signaux : hors navigateur (tests sous Node, rendu serveur), tout
 * vaut faux et le runtime retombe donc sur `web`, qui est le defaut sur et le seul
 * comportement deja eprouve.
 */
export function lireSignauxRuntime(): SignauxRuntime {
  if (typeof window === 'undefined') {
    return { tauri: false, afficheAutonome: false, standaloneApple: false, capacitorNatif: false };
  }
  const fenetre = window as unknown as Record<string, unknown>;
  let afficheAutonome = false;
  try {
    afficheAutonome = typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches;
  } catch { /* matchMedia indisponible : on reste sur faux */ }
  return {
    tauri: fenetre.isTauri === true,
    afficheAutonome,
    standaloneApple: (navigator as unknown as Record<string, unknown>).standalone === true,
    capacitorNatif: lireCapacitorNatif(fenetre),
  };
}

/**
 * ON N'IMPORTE PAS @capacitor/core ICI, A DESSEIN. Ce module doit rester sans aucune
 * dependance : les releves l'importent sous Node, ou un paquet qui touche au natif
 * echouerait au chargement — c'est deja la raison pour laquelle porteeDeconnexion vit a
 * part de deconnexion. Capacitor pose lui-meme `window.Capacitor` avant le premier script
 * de la page, exactement comme Tauri pose `window.isTauri` : le lire suffit, et cela
 * fonctionne aussi quand le paquet n'est pas installe.
 *
 * Tout est enveloppe : sur une implementation inattendue, isNativePlatform peut ne pas
 * etre une fonction, ou lever. On retombe alors sur faux, donc sur le comportement web
 * deja eprouve.
 */
function lireCapacitorNatif(fenetre: Record<string, unknown>): boolean {
  try {
    const cap = fenetre.Capacitor as { isNativePlatform?: () => boolean } | undefined;
    return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform() === true;
  } catch {
    return false;
  }
}

let memoire: Runtime | null = null;

/**
 * Le runtime courant, calcule une fois puis conserve. Memoise a dessein : les signaux ne
 * changent pas pendant la vie d'une page, et deux lectures qui divergeraient en cours de
 * route produiraient deux ecrans differents pour un meme utilisateur.
 */
export function runtimeActuel(): Runtime {
  if (memoire === null) memoire = runtimeDepuisSignaux(lireSignauxRuntime());
  return memoire;
}

export function estWeb(): boolean { return runtimeActuel() === 'web'; }
export function estPwa(): boolean { return runtimeActuel() === 'pwa'; }
export function estDesktop(): boolean { return runtimeActuel() === 'desktop'; }
/** L'application Capacitor sur Android ou iOS. */
export function estMobile(): boolean { return runtimeActuel() === 'mobile'; }
/**
 * Les deux runtimes INSTALLES : bureau et mobile. C'est la distinction qui compte pour la
 * session (persistante dans une application installee, pas sur le web), pour la portee de
 * la deconnexion, et pour le service worker. L'ecrire une fois evite que chaque appelant
 * reinvente « desktop ou mobile » et en oublie un.
 */
export function estApplicationInstallee(): boolean {
  const r = runtimeActuel();
  return r === 'desktop' || r === 'mobile';
}

/** Reservee aux releves : oublie la valeur memoisee. N'a aucun appelant applicatif. */
export function oublierRuntimeMemoise(): void { memoire = null; }
