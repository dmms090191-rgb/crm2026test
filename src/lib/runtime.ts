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

export type Runtime = 'web' | 'pwa' | 'desktop';

/** Les signaux bruts, pour que la decision soit une fonction PURE, donc verifiable. */
export interface SignauxRuntime {
  /** `window.isTauri === true` : pose par Tauri avant tout script de la page. */
  tauri: boolean;
  /** `matchMedia('(display-mode: standalone)').matches` : vrai pour une PWA installee. */
  afficheAutonome: boolean;
  /** `navigator.standalone === true` : la forme propre a Safari iOS. */
  standaloneApple: boolean;
}

/**
 * La decision, sans aucune lecture de l'environnement : c'est elle que les releves
 * exercent, parce qu'un test qui lirait l'environnement reel se mesurerait lui-meme.
 * Ce n'est pas une precaution de style : sous Node, `navigator.platform` existe et vaut
 * « Win32 », donc une detection naive y passe au vert contre le mauvais objet.
 */
export function runtimeDepuisSignaux(signaux: SignauxRuntime): Runtime {
  if (signaux.tauri) return 'desktop';
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
    return { tauri: false, afficheAutonome: false, standaloneApple: false };
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
  };
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

/** Reservee aux releves : oublie la valeur memoisee. N'a aucun appelant applicatif. */
export function oublierRuntimeMemoise(): void { memoire = null; }
