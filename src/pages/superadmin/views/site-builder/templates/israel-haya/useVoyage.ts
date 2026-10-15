import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * LES TROIS CROCHETS DU VOYAGE : la progression, les reglages, les polices.
 *
 * ---------- POURQUOI PAS ScrollTrigger ----------
 *
 * GSAP est installe et la methode de reference le prescrit. On ne l'emploie pas ici, et c'est
 * un choix assume. ScrollTrigger pilote le DOM depuis sa propre boucle ; React Three Fiber
 * pilote la 3D depuis la sienne. Les faire cohabiter demande de desarmer l'une des deux, et
 * c'est precisement la ou les deux mondes se blessent.
 *
 * La progression est donc LUE, jamais pilotee : une soustraction sur la position de la piste,
 * recalculee a chaque image ou le defilement bouge. C'est trois lignes, ca ne depend d'aucune
 * bibliotheque, et ca donne exactement la meme chose — avec la reversibilite en prime, puisque
 * rien n'est anime, tout est calcule.
 */

/**
 * Progression du voyage, de 0 a 1.
 *
 * ---------- POURQUOI LE TEMPLATE PORTE SON PROPRE DEFILEMENT ----------
 *
 * Mesure faite dans l'apercu de Talvex : html, body et #root y ont tous une HAUTEUR FIXE avec
 * leur propre defilement interne — l'application est une interface a hauteur d'ecran, pas une
 * page qui s'allonge. Une piste de trois mille vh posee la-dedans ne fait rien defiler du
 * tout : scrollHeight restait egal a innerHeight, et le voyage ne quittait jamais son premier
 * chapitre.
 *
 * Le template cree donc SA propre zone de defilement et lit sa position.
 *
 * ATTENTION — cette zone tire sa hauteur de `useHauteurVue`, en PIXELS MESURES, et surtout
 * PAS d'un `height: 100%` : voir ce crochet pour le defaut qu'un pourcentage a cause sur le
 * site public. Tant que la scene est mesuree, la course utile vaut 31 fois sa hauteur et ne
 * peut plus devenir negative.
 */
export function useProgressionVoyage(
  conteneur: RefObject<HTMLElement | null>,
  piste: RefObject<HTMLElement | null>,
): number {
  const [progression, setProgression] = useState(0);
  const enCours = useRef(false);
  const vue = useRef(0);

  useEffect(() => {
    const zone = conteneur.current;
    if (!zone) return;

    const lire = () => {
      enCours.current = false;
      const p0 = piste.current;
      if (!p0) return;
      // La course utile : la piste moins ce qui tient deja a l'ecran.
      const course = p0.offsetHeight - zone.clientHeight;
      if (course <= 0) { setProgression(0); return; }
      const p = Math.min(1, Math.max(0, zone.scrollTop / course));
      vue.current = p;
      setProgression(p);
    };

    // Un seul calcul par image, quoi qu'il arrive : le defilement en emet bien plus.
    const surScroll = () => {
      if (enCours.current) return;
      enCours.current = true;
      requestAnimationFrame(lire);
    };

    /*
     * ---------- LE REDIMENSIONNEMENT DEPLACE LA TETE DE LECTURE ----------
     *
     * La piste est haute de 3200vh : sa hauteur en PIXELS suit donc celle de la fenetre. Le
     * navigateur, lui, conserve scrollTop en pixels a travers un redimensionnement. Relire
     * simplement scrollTop / course apres coup revient donc a lire une AUTRE position dans
     * l'histoire, sans que personne n'ait defile.
     *
     * Mesures, en partant du milieu du chapitre 3 : passer de 1366x640 a 1600x1000 ramenait au
     * chapitre 2 ; de 1440x900 a 1024x600 propulsait au chapitre 4 ; sur telephone, la simple
     * reapparition de la barre d'URL avancait de 181vh. Autrement dit la progression etait une
     * fonction de la hauteur de la fenetre, ce qui contredit tout le principe du voyage.
     *
     * On RESTAURE donc la progression au lieu de la relire : c'est elle la verite, pas le
     * nombre de pixels. On n'ecrit que si la HAUTEUR a reellement change — un redimensionnement
     * horizontal seul n'a rien a restaurer, et ecrire scrollTop pendant un defilement inertiel
     * sur telephone le couperait net.
     */
    let hauteurVue = zone.clientHeight;
    const surTaille = () => {
      if (zone.clientHeight === hauteurVue) return;
      hauteurVue = zone.clientHeight;
      const p0 = piste.current;
      if (!p0) return;
      const course = p0.offsetHeight - zone.clientHeight;
      if (course > 0) zone.scrollTop = vue.current * course;
      surScroll();
    };

    lire();
    zone.addEventListener('scroll', surScroll, { passive: true });
    // Un observateur sur la zone plutot que sur la fenetre : le template se comporte pareil
    // dans un cadre redimensionne que dans un onglet, sans rien savoir de son hote.
    const observateur = new ResizeObserver(surTaille);
    observateur.observe(zone);
    return () => {
      zone.removeEventListener('scroll', surScroll);
      observateur.disconnect();
    };
  }, [conteneur, piste]);

  return progression;
}

/**
 * LA HAUTEUR REELLEMENT VISIBLE, EN PIXELS — et pourquoi le voyage ne peut pas s'en passer.
 *
 * ---------- LE DEFAUT QUE CE CROCHET CORRIGE ----------
 *
 * Le voyage se donnait sa scene en `height: 100%`. Un pourcentage ne vaut quelque chose que
 * si CHAQUE parent, jusqu'a la racine, porte une hauteur definie. C'etait vrai dans l'apercu
 * de Talvex, qui monte le template directement sous #root. Ce ne l'est PAS sur une page
 * publique : App.tsx enveloppe le site dans <ThemeProvider>, qui rend un <div> sans aucune
 * hauteur (ThemeContext.tsx). La chaine se casse sur ce div, et `height: 100%` retombe sur
 * `auto`, donc sur la hauteur du CONTENU.
 *
 * Mesure faite sur barbiewellness.com, telephone 375 x 812 :
 *   zone de defilement : 27 439 px au lieu de 812   (elle ne defile donc plus)
 *   course utile       : 25 984 - 27 439 = -1 455   (negative)
 *   progression        : bloquee a 0, chapitre fige sur << naissance >>
 * Le visiteur faisait alors defiler la PAGE, voyait la premiere image collee en haut, puis
 * pres de 26 000 px de piste vide : l'immense zone bleu nuit signalee.
 *
 * ---------- POURQUOI DES PIXELS MESURES, ET NON `100svh` ----------
 *
 * `100svh` reglerait la dependance aux parents, mais pas le telephone : svh est la hauteur
 * de l'ecran BARRE D'ADRESSE AFFICHEE. Des qu'elle se retire, la fenetre grandit de 60 a
 * 120 px et la scene, figee a svh, laisse une bande vide en bas — le meme defaut en plus
 * petit. `100dvh` suit la fenetre, mais relance une mise en page a chaque image pendant que
 * la barre glisse.
 *
 * On MESURE donc, une fois par image au plus, et on publie le resultat dans une variable CSS.
 * La scene, la piste et les pages en dependent toutes : une seule verite, et elle est juste.
 *
 * ---------- LE CLAVIER NE DOIT PAS REDIMENSIONNER LE VOYAGE ----------
 *
 * Sur Android, ouvrir le clavier reduit innerHeight. Au chapitre des anneaux, le visiteur
 * saisit son prenom et sa date : la scene entiere se serait alors ecrasee, et la piste avec
 * elle. On ignore donc toute diminution brutale pendant qu'un champ a le focus — un clavier
 * ne change pas la taille de l'ecran, seulement ce qu'il en reste.
 */
export function useHauteurVue(): number {
  const [hauteur, setHauteur] = useState(0);

  useEffect(() => {
    let demande = 0;
    let plafond = 0;

    const mesurer = () => {
      demande = 0;
      const brut = Math.round(window.visualViewport?.height ?? window.innerHeight);
      if (!(brut > 0)) return;
      plafond = Math.max(plafond, brut);

      const actif = document.activeElement;
      const saisieEnCours = !!actif && (
        actif.tagName === 'INPUT' || actif.tagName === 'TEXTAREA' || (actif as HTMLElement).isContentEditable
      );
      // Une chute de plus d un quart pendant une saisie : c est un clavier, pas un ecran.
      if (saisieEnCours && brut < plafond * 0.75) return;

      setHauteur(ancienne => (Math.abs(ancienne - brut) >= 1 ? brut : ancienne));
    };

    const planifier = () => { if (!demande) demande = requestAnimationFrame(mesurer); };

    mesurer();
    window.addEventListener('resize', planifier);
    window.addEventListener('orientationchange', planifier);
    window.visualViewport?.addEventListener('resize', planifier);
    return () => {
      if (demande) cancelAnimationFrame(demande);
      window.removeEventListener('resize', planifier);
      window.removeEventListener('orientationchange', planifier);
      window.visualViewport?.removeEventListener('resize', planifier);
    };
  }, []);

  return hauteur;
}

export interface ReglagesVoyage {
  /** WebGL est-il disponible ? Sinon les chapitres 3 et 4 cedent la place. */
  webgl: boolean;
  /** La lecture video est-elle praticable ? */
  video: boolean;
  mouvementReduit: boolean;
  /** Rapport de pixels a imposer. */
  dpr: number;
  niveau: 'bas' | 'moyen' | 'haut';
}

/**
 * Les reglages, decides UNE fois avant le premier rendu et jamais revus.
 *
 * Un reglage qui s'ajuste en cours de route fait clignoter la scene a chaque hesitation. Et un
 * ecran tactile etroit part en bas quoi qu'il annonce : la puissance declaree d'un telephone ne
 * dit rien de son enveloppe thermique, et une scene fluide qui s'effondre apres vingt secondes
 * est pire qu'une scene sobre d'emblee.
 */
export function useReglagesIsraelHaya(): ReglagesVoyage {
  const [reglages] = useState<ReglagesVoyage>(() => {
    if (typeof window === 'undefined') {
      return { webgl: false, video: false, mouvementReduit: true, dpr: 1, niveau: 'bas' };
    }
    let webgl = false;
    try {
      const t = document.createElement('canvas');
      webgl = Boolean(t.getContext('webgl2') || t.getContext('webgl'));
    } catch { webgl = false; }

    const video = typeof document.createElement('video').canPlayType === 'function'
      && document.createElement('video').canPlayType('video/mp4') !== '';

    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tactile = window.matchMedia('(pointer: coarse)').matches;
    const largeur = window.innerWidth;
    const nav = navigator as Navigator & { hardwareConcurrency?: number; deviceMemory?: number };

    let niveau: ReglagesVoyage['niveau'];
    if (tactile && largeur < 820) niveau = 'bas';
    else if (largeur < 1280 || (nav.hardwareConcurrency ?? 0) <= 4 || (nav.deviceMemory ?? 0) <= 4) niveau = 'moyen';
    else niveau = 'haut';

    const plafond = niveau === 'bas' ? 1 : niveau === 'moyen' ? 1.4 : 1.75;
    const dpr = Math.min(plafond, Math.max(1, window.devicePixelRatio || 1));

    return { webgl, video, mouvementReduit, dpr, niveau };
  });

  return reglages;
}

/**
 * Les polices hebraiques, chargees seulement quand ce template est monte.
 *
 * Frank Ruhl Libre porte les titres : c'est une des rares hebraiques a serif qui ait du
 * caractere sans devenir decorative. Heebo porte le texte courant, parce qu'elle reste lisible
 * en petit et qu'elle couvre latin et hebreu dans le meme dessin — utile le jour ou le site
 * sera multilingue.
 */
export function usePolicesHebraiques(): void {
  useEffect(() => {
    if (document.querySelector('link[data-ih-polices]')) return;
    const lien = document.createElement('link');
    lien.rel = 'stylesheet';
    lien.href = 'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;500&family=Heebo:wght@200;300;400&display=swap';
    lien.setAttribute('data-ih-polices', '');
    document.head.appendChild(lien);
  }, []);
}

/**
 * LE VOYAGE AU CLAVIER.
 *
 * La zone de defilement est un div : tant que rien a l'interieur n'a le focus, le navigateur n'a
 * aucune raison de la faire defiler. Mesure faite au chargement, fenetre 1440x900 : Page
 * suivante, Espace, les fleches et Fin laissaient tous scrollTop a 0. Le voyage etait donc
 * strictement impossible sans souris — pour un site de 3200vh, c'est une porte fermee.
 *
 * On ecoute donc au niveau de la fenetre et on fait defiler nous-memes. Les touches sont
 * ignorees des que la frappe s'adresse a un champ ou a un bouton : un visiteur qui tape sa date
 * de naissance ne doit pas partir au chapitre suivant en appuyant sur Espace.
 */
export function useClavierVoyage(conteneur: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const zone = conteneur.current;
    if (!zone) return;

    const auClavier = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible?.closest?.('input, textarea, select, button, summary, [contenteditable]')) return;

      const ecran = zone.clientHeight;
      const course = zone.scrollHeight - ecran;
      let vers: number | null = null;

      switch (e.key) {
        case 'PageDown': vers = zone.scrollTop + ecran * 0.9; break;
        case 'PageUp': vers = zone.scrollTop - ecran * 0.9; break;
        case 'ArrowDown': vers = zone.scrollTop + 90; break;
        case 'ArrowUp': vers = zone.scrollTop - 90; break;
        case ' ': vers = zone.scrollTop + (e.shiftKey ? -1 : 1) * ecran * 0.9; break;
        case 'Home': vers = 0; break;
        case 'End': vers = course; break;
        default: return;
      }

      e.preventDefault();
      zone.scrollTop = Math.min(course, Math.max(0, vers));
    };

    window.addEventListener('keydown', auClavier);
    return () => { window.removeEventListener('keydown', auClavier); };
  }, [conteneur]);
}
