import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, PointerEvent as EvenementPointeur, RefObject } from 'react';
import {
  cibleApresGlissement, decalageLigne, deltaBorne, type BorneLigne,
} from '../../../../lib/reordonnerParGlissement';

/*
 * Le GESTE : saisir une ligne de la modale Colonnes et la deposer ailleurs.
 *
 * ---------- POURQUOI DES POINTER EVENTS, ET PAS LE GLISSER-DEPOSER HTML5 ----------
 *
 * `draggable` + `dragstart` ne se declenchent PAS au doigt. Un glisser-deposer ecrit
 * ainsi marche a la souris et ne fait rien du tout sur telephone : exactement le genre de
 * defaut qu'on ne voit pas en developpant sur un ecran de bureau. Les pointer events,
 * eux, servent la souris, le doigt et le stylet par un seul chemin.
 *
 * ---------- POURQUOI UNE POIGNEE, ET NON LA LIGNE ENTIERE ----------
 *
 * `touch-action: none` est ce qui permet de saisir au doigt : sans lui, le navigateur
 * interprete le geste comme un defilement et on ne tient jamais la ligne. Mais la ou on
 * le pose, le defilement MEURT. Pose sur la ligne entiere, il rendrait une liste longue
 * impossible a parcourir au doigt — le defaut que CrmImmoColonneRow documente deja.
 *
 * Il est donc pose sur la POIGNEE SEULE : on saisit par une bande etroite, et tout le
 * reste de la ligne continue de defiler normalement. Les chevrons restent le chemin
 * clavier et le chemin a une main ; celui-ci est le chemin au doigt et a la souris.
 *
 * ---------- DEUX LISTES QUI NE SE MELANGENT PAS ----------
 *
 * La modale montre les colonnes systeme puis les personnalisees, et leurs ordres ne vont
 * pas au meme endroit : localStorage pour les premieres, la base pour les secondes. Une
 * instance de ce hook par famille, chacune ne retrouvant QUE ses lignes — par
 * `data-glisse` — et son delta borne a sa propre bande.
 */

/** Tout ce qu'une ligne doit savoir du geste : une seule propriete a lui passer. */
export interface GlisseLigne {
  /** Pose en `data-glisse` sur la ligne : c'est par la que le hook retrouve SES lignes. */
  famille: string;
  /** Vrai pour la ligne tenue — elle passe au-dessus des autres et prend l'ombre. */
  saisie: boolean;
  /** Le deplacement de l'apercu, deja calcule, a fusionner au style de la ligne. */
  style: CSSProperties;
  /** A etaler sur la poignee. */
  poignee: HTMLAttributes<HTMLElement>;
}

/** L'etat du geste HORS rendu : il change a chaque mouvement sans rien redessiner. */
interface Vif {
  pointerId: number;
  source: number;
  cible: number;
  yDepart: number;
  yCourant: number;
  scrollDepart: number;
  bornes: BorneLigne[];
}

/** L'etat du geste DANS le rendu : ce qui doit redessiner. */
interface Apercu {
  source: number;
  cible: number;
  delta: number;
  bornes: BorneLigne[];
}

/* Le defilement automatique quand on tient une ligne contre un bord. Sans lui, on ne peut
   pas sortir une colonne du bas de l'ecran : le geste s'arrete la ou la liste s'arrete. */
const MARGE_DEFILEMENT = 44;
const PAS_DEFILEMENT = 10;

export function useGlisserColonnes(params: {
  famille: string;
  /** La zone defilante qui contient les deux listes. */
  scroller: RefObject<HTMLElement>;
  onDeplacer: (de: number, vers: number) => void;
}): { pourLigne: (index: number) => GlisseLigne } {
  const { famille, scroller, onDeplacer } = params;
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const vif = useRef<Vif | null>(null);

  /*
   * Le defilement est COMPENSE dans le delta, et non dans les bornes.
   *
   * Les bornes ont ete relevees en coordonnees d'ecran au debut du geste. Si la liste
   * defile de 20 px, le contenu monte de 20 px : le doigt reste au meme endroit de
   * l'ecran mais designe un contenu plus bas. On ajoute donc le defilement parcouru au
   * deplacement du doigt, et les bornes n'ont pas a etre relues — ce qui serait faux, de
   * toute facon, puisque l'apercu les deplace avec un `transform`.
   */
  const recalculer = useCallback(() => {
    const v = vif.current;
    const zone = scroller.current;
    if (!v || !zone) return;
    const brut = (v.yCourant - v.yDepart) + (zone.scrollTop - v.scrollDepart);
    const delta = deltaBorne(v.bornes, v.source, brut);
    v.cible = cibleApresGlissement(v.bornes, v.source, delta);
    setApercu({ source: v.source, cible: v.cible, delta, bornes: v.bornes });
  }, [scroller]);

  const actif = apercu !== null;
  useEffect(() => {
    if (!actif) return;
    let image = 0;
    const pas = () => {
      const v = vif.current;
      const zone = scroller.current;
      if (!v || !zone) return;
      const r = zone.getBoundingClientRect();
      let sens = 0;
      if (v.yCourant < r.top + MARGE_DEFILEMENT) sens = -PAS_DEFILEMENT;
      else if (v.yCourant > r.bottom - MARGE_DEFILEMENT) sens = PAS_DEFILEMENT;
      if (sens !== 0) {
        const avant = zone.scrollTop;
        zone.scrollTop = avant + sens;
        /* Arrive en butee, scrollTop ne bouge plus : on ne recalcule alors rien, pour ne
           pas redessiner soixante fois par seconde un apercu identique. */
        if (zone.scrollTop !== avant) recalculer();
      }
      image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [actif, recalculer, scroller]);

  function demarrer(index: number, e: EvenementPointeur<HTMLElement>) {
    /* Bouton principal seulement : un clic droit ou molette sur la poignee ne saisit
       rien. Au doigt et au stylet, `button` vaut 0. */
    if (e.button !== 0) return;
    const zone = scroller.current;
    if (!zone) return;
    const lignes = Array.from(zone.querySelectorAll<HTMLElement>('[data-glisse="' + famille + '"]'));
    /* Une liste d'un seul element n'a pas d'ordre : rien a saisir. */
    if (lignes.length < 2 || index < 0 || index >= lignes.length) return;
    const bornes = lignes.map(l => {
      const r = l.getBoundingClientRect();
      return { haut: r.top, bas: r.bottom };
    });
    /*
     * La capture du pointeur est ce qui rend le geste fiable : les evenements continuent
     * d'arriver A LA POIGNEE meme quand le doigt sort de la modale ou survole une autre
     * ligne. Sans elle, il faudrait des ecouteurs sur `window`, qu'un rendu intercale
     * finit toujours par laisser accroches.
     */
    e.currentTarget.setPointerCapture(e.pointerId);
    vif.current = {
      pointerId: e.pointerId, source: index, cible: index,
      yDepart: e.clientY, yCourant: e.clientY, scrollDepart: zone.scrollTop, bornes,
    };
    setApercu({ source: index, cible: index, delta: 0, bornes });
    /* Empeche la selection de texte pendant un glissement a la souris. Le defilement au
       doigt, lui, est ecarte par `touch-action`, pose sur la poignee seule. */
    e.preventDefault();
  }

  function bouger(e: EvenementPointeur<HTMLElement>) {
    const v = vif.current;
    if (!v || e.pointerId !== v.pointerId) return;
    v.yCourant = e.clientY;
    recalculer();
  }

  /* `pointercancel` n'est pas une politesse : le systeme reprend le pointeur a la moindre
     interruption — appel entrant, geste systeme, zoom a deux doigts. On relache alors
     SANS rien enregistrer, plutot que de deposer la colonne ou le doigt se trouvait. */
  function relacher(e: EvenementPointeur<HTMLElement>, appliquer: boolean) {
    const v = vif.current;
    if (!v || e.pointerId !== v.pointerId) return;
    vif.current = null;
    setApercu(null);
    if (appliquer && v.cible !== v.source) onDeplacer(v.source, v.cible);
  }

  function pourLigne(index: number): GlisseLigne {
    const saisie = apercu !== null && apercu.source === index;
    let style: CSSProperties = {};
    if (apercu && saisie) {
      style = { transform: 'translateY(' + apercu.delta + 'px)', position: 'relative', zIndex: 2 };
    } else if (apercu) {
      /* La transition n'habille QUE les lignes qui s'ecartent. Sur la ligne tenue, elle
         la ferait courir derriere le doigt au lieu de le suivre. */
      const d = decalageLigne(index, apercu.source, apercu.cible, apercu.bornes);
      style = { transform: 'translateY(' + d + 'px)', transition: 'transform 160ms ease' };
    }
    return {
      famille,
      saisie,
      style,
      poignee: {
        onPointerDown: e => demarrer(index, e),
        onPointerMove: bouger,
        onPointerUp: e => relacher(e, true),
        onPointerCancel: e => relacher(e, false),
        style: { touchAction: 'none', cursor: saisie ? 'grabbing' : 'grab' },
      },
    };
  }

  return { pourLigne };
}
