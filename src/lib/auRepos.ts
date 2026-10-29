/**
 * UN CRENEAU AU REPOS, SUR TOUS LES RUNTIMES — Y COMPRIS CEUX QUI N'EN ONT PAS.
 *
 * ---------- LE DEFAUT QUI A FAIT NAITRE CE FICHIER, LE 29 OCTOBRE 2026 ----------
 *
 * David ouvre Talvex sur son iPhone et recoit, de Safari :
 *
 *     Can't find variable: requestIdleCallback
 *
 * puis l'ecran de l'ErrorBoundary — « Une erreur est survenue ». L'application etait
 * donc ATTEINTE : rien ne manquait au reseau, au manifeste ni a la session. Un seul
 * appel, pose il y a des semaines pour GAGNER du temps, remplacait l'interface entiere
 * par un message d'erreur.
 *
 * CE QUI PARTAIT EN PRODUCTION, releve dans le paquet servi le 29/10/2026 (110 morceaux
 * lus sur 110, 5 400 Ko) : DEUX appels, tous deux NUS, dans le meme morceau
 * AdminDashboard-*.js.
 *
 *     const d = requestIdleCallback(() => { ms() }); return () => cancelIdleCallback(d)
 *     const M = requestIdleCallback(() => { fs() }); return () => cancelIdleCallback(M)
 *
 * LA FORME NUE EST CE QUI REND LE DEFAUT FATAL, et c'est tout l'objet de ce module. En
 * JavaScript, `window.requestIdleCallback(...)` sur un moteur qui ne l'a pas leve « n'est
 * pas une fonction » — mauvais, mais rattrapable. `requestIdleCallback(...)` tout court
 * est une variable INTROUVABLE : une ReferenceError, levee avant le moindre argument. Et
 * comme elle part du corps d'un useEffect, React la remonte a la frontiere d'erreur la
 * plus proche, qui demonte l'arbre. Un prechargement optionnel tuait donc le panel.
 *
 * ---------- POURQUOI SAFARI, ET POURQUOI PERSONNE NE L'AVAIT VU ----------
 *
 * Chrome et Edge portent requestIdleCallback depuis 2016, Firefox depuis 2018. WebKit a
 * longtemps refuse de l'exposer ; la fonctionnalite est encore donnee comme NON prise en
 * charge par Safari et Safari iOS chez web-platform-dx. L'iPhone de David tranche la
 * question pour lui : chez lui, elle n'existe pas.
 *
 * ET AUCUN DE NOS OUTILS NE POUVAIT LE DIRE. TypeScript type `requestIdleCallback` dans
 * lib.dom.d.ts sans aucune reserve — le typecheck etait donc VERT sur les deux appels.
 * ESLint ne connait pas les navigateurs. Et les releves tournent sous Node, ou l'on a
 * mesure le 29/10/2026, en Node 24.15 : `typeof globalThis.window` et
 * `typeof globalThis.requestIdleCallback` valent TOUS DEUX « undefined ». Un releve qui
 * aurait appele ce code n'aurait donc exerce NI la branche du navigateur NI celle du
 * repli — il aurait mesure un troisieme monde, ou il n'y a pas d'ecran du tout.
 *
 * Windows, Android et le bureau Tauri, eux, ont la fonction. Le seul endroit ou ce code
 * echouait est le seul ou il n'avait jamais ete execute.
 *
 * ---------- CE QUE CE MODULE GARANTIT, ET CE QU'IL NE PEUT PAS ----------
 *
 * IL GARANTIT QU'ON NE PLANTE PLUS, et que la tache finit par partir : la ou il n'y a pas
 * de creneau au repos, un minuteur court prend la suite.
 *
 * IL NE GARANTIT PAS LE REPOS LUI-MEME, et il serait malhonnete de le laisser croire. Un
 * minuteur ne sait pas si le navigateur est occupe : il attend un delai FIXE, puis part.
 * Le repli respecte donc l'INTENTION de l'appel d'origine — laisser passer ce qui presse —
 * sans en reproduire la mesure. C'est pour cela que la tache ne recoit AUCUN argument :
 * requestIdleCallback remet a la sienne un `IdleDeadline` avec un `timeRemaining()`, qu'un
 * repli ne saurait que CONTREFAIRE. Une echeance inventee serait pire qu'absente, puisque
 * l'appelant la croirait. Ce module ne convient donc qu'aux taches « lance et oublie » —
 * un prechargement, une mise en cache — jamais a un travail decoupe sur une echeance.
 */

/** Ce que l'appelant garde pour renoncer. Se branche tel quel sur le retour d'un useEffect. */
export type AnnulerAuRepos = () => void;

/**
 * LE DELAI DU REPLI. 200 ms, et c'est un arbitrage, pas une constante magique.
 *
 * Trop court (1 ms, le choix des polyfills courants), et la tache part dans la foulee du
 * premier rendu, en concurrence avec les requetes qui remplissent l'ecran. Trop long, et
 * le prechargement arrive apres le clic qu'il devait servir — il ne sert plus a rien.
 */
export const DELAI_DE_REPLI_MS = 200;

/**
 * L'hote, reduit a ce dont ce module a besoin. Les deux premiers champs sont `unknown` a
 * DESSEIN : c'est leur absence qu'on mesure, et les typer en fonction laisserait croire au
 * compilateur qu'ils sont toujours la — l'erreur meme qui a produit le defaut.
 */
export interface HoteAuRepos {
  requestIdleCallback?: unknown;
  cancelIdleCallback?: unknown;
  setTimeout: (tache: () => void, delai: number) => unknown;
  clearTimeout: (jeton: unknown) => void;
}

/**
 * La decision, sans aucune lecture de l'environnement : c'est elle que les releves
 * exercent. Un releve qui lirait le vrai `window` se mesurerait lui-meme — et sous Node,
 * requestIdleCallback EXISTE, donc la branche du repli ne serait jamais parcourue.
 *
 * ON EXIGE LES DEUX FONCTIONS, pas seulement la premiere. Un hote qui saurait demander un
 * creneau sans savoir l'annuler nous laisserait avec une tache qu'aucun demontage ne peut
 * reprendre : le composant parti, le prechargement continuerait de pointer vers lui.
 * Mieux vaut le minuteur, qu'on sait toujours arreter.
 */
export function planifierAuReposSur(hote: HoteAuRepos, tache: () => void): AnnulerAuRepos {
  const demander = hote.requestIdleCallback;
  const annuler = hote.cancelIdleCallback;
  if (typeof demander === 'function' && typeof annuler === 'function') {
    try {
      const jeton = (demander as (rappel: () => void) => unknown).call(hote, () => { tache(); });
      return () => {
        /* L'annulation ne doit JAMAIS lever : elle part d'un nettoyage de useEffect, ou une
           exception interromprait le demontage des autres effets du meme composant. */
        try { (annuler as (jeton: unknown) => void).call(hote, jeton); } catch { /* deja passe */ }
      };
    } catch {
      /* La fonction existait mais a refuse. On ne laisse pas tomber la tache pour autant :
         le minuteur ci-dessous la reprend, et elle n'aura ete planifiee qu'une fois. */
    }
  }
  const minuteur = hote.setTimeout(tache, DELAI_DE_REPLI_MS);
  return () => hote.clearTimeout(minuteur);
}

/**
 * Le seul appel que le code applicatif doit connaitre.
 *
 * HORS NAVIGATEUR, ON NE PLANIFIE RIEN — et ce n'est pas de la paresse. Sous Node (les
 * releves, un rendu serveur) il n'y a pas d'ecran a preparer, et un minuteur pose la
 * tiendrait le processus eveille apres la fin du test qui l'a declenche.
 */
export function planifierAuRepos(tache: () => void): AnnulerAuRepos {
  if (typeof window === 'undefined') return () => {};
  return planifierAuReposSur(window as unknown as HoteAuRepos, tache);
}
