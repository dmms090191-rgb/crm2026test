import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  arcPose, arcXAtY, CAROUSEL_SLOTS, carouselPositions, carouselStart, fixedAnchor, resolveCenter,
  rimPositions, separatorRim, transitionMs, wheelPivot, wheelRadius, wheelTurnDeg, withOverrides,
  type ArcOrientation, type RimKind,
} from './arcGeometry';
import { ajusteALaHauteur } from './arcFluid';
import { edgeItem, stepItem } from './arcNavigation';
import { TALIXY_MOTION, type WheelParams } from './talixyConfig';
import { useArcInput, type ArcKey } from './useArcInput';

/*
 * TALIXY — la roue. Composant reutilisable (sidebar verticale, onglets horizontaux).
 *
 * Aucune geometrie ici : chaque case est placee par arcPose (arcGeometry.ts, teste), qui ecrit sa
 * transformation comme une rotation autour du centre de la roue avec la meme liste de fonctions pour
 * toutes les cases. Quand l'actif change, le navigateur interpole donc les angles : toutes les cases
 * voyagent EN MEME TEMPS SUR LE CERCLE. On n'anime que transform et opacity (compositeur).
 * La lumiere de l'actif (talixy.css) arrive juste apres le debut de la rotation.
 */
/** Moyeu de la roue, dans le repere du conteneur : pour dessiner un decor centre sur lui (planete). */
export interface ArcHub {
  x: number;
  y: number;
  radius: number;
  /** Rotation de toute la roue (degres) et duree de la rotation en cours (ms). */
  turnDeg: number;
  ms: number;
  element: HTMLElement;
}

export interface ArcItem {
  key: string;
  kind: RimKind;
  /** Nom du compartiment : affiche a gauche de l'arc par le separateur elastique (mode fixe). */
  label?: string;
  render: (isActive: boolean) => ReactNode;
}

/** Retrait du nom de compartiment depuis le bord gauche de la colonne (une seule source). */
const SEP_LEFT = 22;
/*
 * Longueur FIXE du prolongement interieur : 5 segments de 5 px espaces de 5 px (motif de 10 px).
 * Signature graphique constante, identique pour tous les compartiments — elle ne depend NI du
 * libelle des onglets, NI de la position du carrousel. Seul le trait GAUCHE reste elastique.
 */
const SEP_DASH_W = 45;

/** Un separateur de compartiment, calcule a chaque rendu depuis la position reelle des onglets. */
interface Separator {
  key: string;
  label: string;
  y: number;
  dotX: number;
  /** Faux des que le compartiment n a plus aucun onglet visible : il s efface en fondu. */
  visible: boolean;
}

interface Props {
  items: ArcItem[];
  /** Index de l'element actif dans items ; -1 : actif absent (onglet masque), la roue garde son dernier centre. */
  activeIndex: number;
  params: WheelParams;
  orientation?: ArcOrientation;
  /** Reglages directs facultatifs : rayon (px), pas angulaire (degres), recul par cran (px). */
  radius?: number;
  angleStep?: number;
  depth?: number;
  /** Selection au clic sur une case. Facultatif : la sidebar garde ses propres boutons. */
  onSelect?: (index: number) => void;
  /** Position du foyer : fraction de la hauteur (vertical) ou de la largeur (horizontal). */
  focus?: number;
  padStart?: number;
  padEnd?: number;
  /**
   * 'wheel'  : roue classique, l'actif est TOUJOURS ramene au foyer (video de reference).
   * 'fixed'  : maquette gris bleute — si toute la liste tient dans la fenetre (7 visibles au plus),
   *            l'arc est FIXE (ancre au milieu de la liste) et seul un halo glisse vers l'actif ;
   *            si la liste depasse, l'arc tourne comme la roue (actif au centre, molette, snap).
   */
  mode?: 'wheel' | 'fixed';
  /** Ecart entre le cercle des disques et la ligne d'arc : sert a poser le point du separateur. */
  lineGap?: number;
  className?: string;
  /** Variables fluides publiees par la sidebar. */
  style?: React.CSSProperties;
  /** Diametre du disque voulu par la courbe de largeur (px). L arc le reduit si la hauteur l exige. */
  disc?: number;
  /** Appele a chaque changement de taille ou de rotation : position du moyeu pour un decor. */
  onHub?: (hub: ArcHub) => void;
}

export default function TalixyArc({
  items, activeIndex, params: base, orientation = 'vertical', radius, angleStep, depth, onSelect,
  focus = 0.42, padStart = 14, padEnd = 22, mode = 'wheel', lineGap = 0, className, style, disc = 0, onHub,
}: Props) {
  const baseParams = useMemo(() => withOverrides(base, { radius, angleStep, depth }), [base, radius, angleStep, depth]);
  const kinds = useMemo(() => items.map(i => i.kind), [items]);
  const rim = useMemo(() => rimPositions(kinds, baseParams), [kinds, baseParams]);
  const vertical = orientation === 'vertical';

  // Centre de la roue : l'actif, ou l'onglet parcouru (molette, doigt, clavier) sans navigation.
  // Mode fixe : « ca tient » se juge au NOMBRE D'ONGLETS (7 au plus, decision de David) — les
  // respirations des compartiments occupent de la place sur la jante mais ne comptent pas ; la
  // fenetre s'elargit alors pour englober toute la liste, ancre au MILIEU, immobile (maquette).
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const itemCount = useMemo(() => kinds.filter(k => k === 'item').length, [kinds]);
  const span = rim.length ? rim[rim.length - 1] - rim[0] : 0;

  /*
   * ESPACEMENT AJUSTE A LA HAUTEUR MESUREE.
   *
   * size.h est la hauteur REELLE du conteneur de l'arc, relevee par un ResizeObserver : logo, pied
   * et marges sont deja deduits par la mise en page, il n'y a donc rien a deviner. On en tire le
   * plus grand espacement qui laisse tenir toute l'etendue a loger, des deux cotes du foyer.
   *
   * Objectif : garder les 7 positions. Avant, l'arc gardait un espacement calibre sur la largeur,
   * constatait que ca ne tenait pas, et se rabattait sur « actif au centre » — l'actif etant le
   * premier onglet, la moitie haute restait vide et il ne restait que 3 onglets a 768 px de haut.
   * Desormais l'espacement retrecit d'abord ; on ne perd des positions que si la place physique
   * ne permet vraiment plus de descendre (SPACING_MIN).
   */
  const spanALoger = itemCount > CAROUSEL_SLOTS ? CAROUSEL_SLOTS - 1 : span;
  const geometrie = useMemo(() => {
    const depart = { spacing: baseParams.spacing, padStart, padEnd, asideW: 0, lineGap, disc, focus };
    if (mode !== 'fixed' || !vertical || size.h === 0 || spanALoger === 0) return depart;
    return ajusteALaHauteur(depart, size.h, spanALoger);
  }, [baseParams.spacing, padStart, padEnd, lineGap, disc, focus, mode, vertical, size.h, spanALoger]);

  const ajuste = useMemo(
    () => (geometrie.spacing === baseParams.spacing ? baseParams : { ...baseParams, spacing: geometrie.spacing }),
    [baseParams, geometrie.spacing],
  );

  // « Ca tient » = 7 onglets au plus ET la place verticale REELLE suffit (l'arc flotte sans boite :
  // rien ne doit deborder sur le logo ni sur le pied). Sinon : rotation, actif au centre.
  const halfPx = (span / 2) * ajuste.spacing + ajuste.spacing / 2 + 6;
  const fitsH = size.h === 0 || (size.h * focus >= halfPx && size.h * (1 - focus) >= halfPx);
  const fits = mode === 'fixed' && itemCount <= CAROUSEL_SLOTS && fitsH;
  /*
   * CARROUSEL — au-dela de 7 onglets, la jante porte 7 positions FIXES et ce sont les onglets qui
   * tournent dessus. La fenetre reste donc TOUJOURS pleine, y compris aux deux extremites de la
   * liste : plus jamais 4 ou 5 onglets avec du vide en haut ou en bas. Le decor sort de la jante
   * (position infinie) pour ne pas manger de position.
   */
  const carousel = mode === 'fixed' && itemCount > CAROUSEL_SLOTS;
  const positions = useMemo(() => (carousel ? carouselPositions(kinds) : rim), [carousel, kinds, rim]);
  const params = useMemo(() => {
    if (!fits || span === 0) return ajuste;
    const half = span / 2;
    return half > ajuste.windowSteps ? { ...ajuste, windowSteps: half + 0.02 } : ajuste;
  }, [fits, span, ajuste]);
  const lastCenter = useRef(0);
  const [browse, setBrowse] = useState<number | null>(null);
  useEffect(() => { setBrowse(null); }, [activeIndex]);
  const [carStart, setCarStart] = useState(0);
  // Rang de l'onglet actif dans la jante du carrousel (-1 : rien a ramener dans la fenetre).
  const activeRank = carousel && activeIndex >= 0 && Number.isFinite(positions[activeIndex]) ? positions[activeIndex] : -1;
  /*
   * Le rappel de l'actif ne s'applique QU'AU CHANGEMENT D'ACTIF. L'appliquer a chaque rendu
   * annulerait le defilement : la molette avancait d'un cran et l'onglet actif, reste en place,
   * ramenait aussitot la fenetre sur lui.
   */
  useEffect(() => {
    if (!carousel || activeRank < 0) return;
    setCarStart(s => carouselStart(s, activeRank, itemCount));
  }, [carousel, activeRank, itemCount]);
  const start = carousel ? carouselStart(carStart, -1, itemCount) : 0;
  const startRef = useRef(start);
  startRef.current = start;
  const activeCenter = resolveCenter(positions, activeIndex, lastCenter.current);
  const center = fits
    ? fixedAnchor(rim)
    : carousel
      ? start + (CAROUSEL_SLOTS - 1) / 2
      : browse !== null && positions[browse] !== undefined ? positions[browse] : activeCenter;
  // Duree selon le nombre de crans a parcourir depuis la position affichee.
  const shown = useRef(center);
  const ms = transitionMs(center - shown.current, TALIXY_MOTION);
  useEffect(() => { shown.current = center; lastCenter.current = center; });

  const focusSlot = (index: number) => {
    const root = ref.current;
    if (index < 0 || !root) return;
    root.querySelector<HTMLElement>(`[data-arc-index="${index}"] button, [data-arc-index="${index}"] [tabindex]`)?.focus({ preventScroll: true });
  };
  useArcInput(ref, {
    orientation,
    dragStepPx: params.spacing * 0.8,
    browsing: browse !== null,
    // Molette / trackpad / doigt : une impulsion = UN cran de carrousel, jamais de position batarde.
    onStep: dir => {
      if (carousel) { setCarStart(carouselStart(startRef.current + dir, -1, itemCount)); return; }
      if (!fits) setBrowse(stepItem(browse ?? activeIndex, kinds, dir));
    },
    onKey: (from: number, key: ArcKey) => {
      focusSlot(key === 'next' || key === 'prev' ? stepItem(from, kinds, key === 'next' ? 1 : -1) : edgeItem(kinds, key));
    },
    onFocusSlot: index => {
      // Au clavier, un onglet hors fenetre fait tourner le carrousel juste assez pour le montrer.
      if (carousel) {
        const rank = positions[index];
        if (Number.isFinite(rank)) setCarStart(carouselStart(startRef.current, rank, itemCount));
        return;
      }
      if (kinds[index] === 'item') setBrowse(index === activeIndex ? null : index);
    },
    onIdle: () => setBrowse(null),
  });

  const focusPx = (vertical ? size.h : size.w) * focus;
  const slotW = vertical ? Math.max(0, size.w - padStart - padEnd) : params.spacing * 2;
  const slotH = vertical ? params.spacing : Math.max(0, size.h - padStart);
  const ease = TALIXY_MOTION.easeOut;

  /*
   * SEPARATEURS DE COMPARTIMENT (mode fixe).
   * Le NOM reste a gauche, sur une ligne horizontale : il ne tourne JAMAIS avec l'arc. Seuls le
   * point (pose pile sur la ligne d'arc), la longueur du trait de liaison et celle des tirets
   * interieurs s'adaptent. La separation se place au MILIEU exact des deux groupes d'onglets.
   * Toutes les longueurs sont MESUREES sur le DOM reel, aucune n'est ecrite en dur.
   */
  /*
   * On ne mesure que des largeurs RELATIVES A LA CASE (bord droit du libelle moins bord gauche de
   * sa case). Mesurer une position absolue serait une boucle infinie : pendant la rotation, les
   * cases sont en transition, chaque mesure differerait de la precedente et relancerait un rendu.
   * Relatives, ces largeurs sont stables pendant l'animation — case et libelle bougent ensemble.
   */
  const [metrics, setMetrics] = useState<Record<string, number>>(() => ({}));
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || mode !== 'fixed') return;
    const labels: Record<string, number> = {};
    root.querySelectorAll<HTMLElement>('[data-tx-sep]').forEach(el => {
      labels[el.dataset.txSep ?? ''] = el.getBoundingClientRect().width;
    });
    setMetrics(prev => {
      const stable = Object.keys(prev).length === Object.keys(labels).length
        && Object.keys(labels).every(k => Math.abs((prev[k] ?? 0) - labels[k]) < 1);
      return stable ? prev : labels;
    });
    // La largeur d'un nom de compartiment ne depend que du texte et de la taille de la colonne :
    // surtout pas du centre, qui change a chaque cran de carrousel.
  }, [items, mode, size.w, size.h]);

  const poses = items.map((_, i) => arcPose(positions[i] - center, params, orientation));
  const hub = wheelPivot(params, orientation);
  const hubX = padStart + hub.x;
  const hubY = focusPx + hub.y;
  const lineR = wheelRadius(params) + lineGap;

  const separators: Separator[] = [];
  if (mode === 'fixed' && vertical && size.h > 0 && lineGap > 0) {
    items.forEach((item, s) => {
      if (item.kind !== 'section' || !item.label) return;
      // MEME moteur que les onglets : la separation est un point de la jante, pose par arcPose.
      // Elle monte, descend et sort du cadre avec son groupe, sans aucun cas particulier.
      const rimSep = separatorRim(positions, kinds, s);
      if (rimSep === null) return;
      const y = focusPx + arcPose(rimSep - center, params, orientation).y;
      const dotX = arcXAtY(y, hubX, hubY, lineR);
      if (dotX === null) return;
      // Le compartiment ne s'affiche que tant qu'au moins UN de ses onglets est visible.
      let groupeVisible = false;
      for (let i = s + 1; i < items.length && items[i].kind !== 'section'; i++) {
        if (items[i].kind === 'item' && poses[i].visible) { groupeVisible = true; break; }
      }
      separators.push({ key: item.key, label: item.label, y, dotX, visible: groupeVisible });
    });
  }

  // Decor centre sur le moyeu : il tourne avec la roue, avec la meme duree et la meme courbe.
  const hubRef = useRef(onHub);
  useLayoutEffect(() => { hubRef.current = onHub; });
  const turnDeg = wheelTurnDeg(center, params, orientation);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || size.h === 0 || !hubRef.current) return;
    const C = wheelPivot(params, orientation);
    const x = (vertical ? padStart : focusPx) + C.x;
    const y = (vertical ? focusPx : padStart + slotH) + C.y;
    hubRef.current({ x, y, radius: wheelRadius(params), turnDeg, ms, element: el });
  }, [params, orientation, vertical, padStart, focusPx, slotH, turnDeg, ms, size.w, size.h]);

  return (
    <div
      ref={ref}
      className={className ? `tx-arc ${className}` : 'tx-arc'}
      data-orientation={orientation}
      data-hub={params.hub}
      data-mode={mode}
      data-fits={fits ? 'true' : 'false'}
      data-carousel={carousel ? 'true' : 'false'}
      data-carousel-start={carousel ? start : undefined}
      data-browsing={browse !== null ? 'true' : 'false'}
      style={{
        // Les variables fluides publiees par la sidebar arrivent d abord, la mise en page ensuite.
        ...style,
        // Le disque reduit par la hauteur ecrase celui calcule sur la seule largeur.
        ...(geometrie.disc > 0 ? {
          ['--tx-disc']: `${geometrie.disc}px`,
          ['--tx-disc-cx']: `${(geometrie.disc / 2).toFixed(1)}px`,
        } as React.CSSProperties : {}),
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        perspective: params.perspective,
        perspectiveOrigin: vertical ? `${params.hub === 'left' ? 15 : 85}% ${focusPx}px` : `${focusPx}px 100%`,
        touchAction: 'none',
      }}
    >
      {size.h > 0 && mode === 'wheel' && <span aria-hidden className="tx-arc-focus" style={vertical ? { top: focusPx } : { left: focusPx }} />}
      {/* Separateurs : NOM a gauche (jamais sur l'arc) ─── point sur la ligne ----- tirets interieurs. */}
      {separators.map(sep => {
        const nameW = metrics[sep.key] ?? 0;
        const lineStart = SEP_LEFT + nameW + 16;
        return (
          <div
            key={`sep-${sep.key}`}
            aria-hidden
            className="tx-arc-sep"
            style={{
              transform: `translate3d(0, ${sep.y.toFixed(1)}px, 0)`,
              opacity: sep.visible ? 1 : 0,
              transition: `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`,
            }}
          >
            <span className="tx-arc-sep-name" data-tx-sep={sep.key} style={{ left: SEP_LEFT }}>{sep.label}</span>
            <span
              className="tx-arc-sep-line"
              style={{ left: lineStart, width: Math.max(0, sep.dotX - lineStart - 7), transition: `width ${ms}ms ${ease}` }}
            />
            <span className="tx-arc-sep-dot" style={{ left: sep.dotX, transition: `left ${ms}ms ${ease}` }} />
            <span
              className="tx-arc-sep-dash"
              style={{ left: sep.dotX + 8, width: SEP_DASH_W, transition: `left ${ms}ms ${ease}` }}
            />
          </div>
        );
      })}
      {/* Halo de l'actif : pose par la MEME rotation que les cases, donc il GLISSE le long de l'arc. */}
      {size.h > 0 && mode === 'fixed' && activeIndex >= 0 && positions[activeIndex] !== undefined && (
        <span
          aria-hidden
          className="tx-arc-halo"
          style={{
            position: 'absolute',
            left: vertical ? padStart : focusPx - slotW / 2,
            top: vertical ? Math.round(focusPx - slotH / 2) : padStart,
            width: slotW,
            height: slotH,
            transformOrigin: vertical ? '0 50%' : '50% 100%',
            transform: arcPose(positions[activeIndex] - center, params, orientation).transform,
            transition: `transform ${ms}ms ${ease}`,
            pointerEvents: 'none',
          }}
        />
      )}
      {size.h > 0 && items.map((item, i) => {
        const pose = arcPose(positions[i] - center, params, orientation);
        const active = i === activeIndex;
        /*
         * Seuls les ONGLETS recoivent le clic. Un compartiment ou un separateur est du decor
         * (son libelle n'existe que pour les lecteurs d'ecran) et n'a aucune action — mais sa case
         * fait la hauteur d'un cran (75 px) alors qu'il n'est qu'a 0,42 cran de l'onglet suivant :
         * sa boite couvre donc le disque voisin. Sous l'ancre, il passait meme AU-DESSUS (le
         * z-index decroit avec la distance au centre) et avalait le clic : « Chat Groupes » et
         * « Systeme » n'etaient atteignables que sur le bord bas de leur disque.
         */
        const interactif = item.kind === 'item';
        return (
          <div
            key={item.key}
            data-arc-index={i}
            data-kind={item.kind}
            data-active={active ? 'true' : 'false'}
            data-browsed={browse === i ? 'true' : 'false'}
            className="tx-arc-slot"
            onClick={onSelect && interactif ? () => onSelect(i) : undefined}
            style={{
              position: 'absolute',
              left: vertical ? padStart : focusPx - slotW / 2,
              top: vertical ? Math.round(focusPx - slotH / 2) : padStart,
              width: slotW,
              height: slotH,
              transformOrigin: vertical ? '0 50%' : '50% 100%',
              transform: pose.transform,
              opacity: pose.opacity,
              // Le decor ne peut jamais passer devant un onglet, quelle que soit sa distance au centre.
              zIndex: interactif ? pose.zIndex : pose.zIndex - 50,
              pointerEvents: pose.visible && interactif ? 'auto' : 'none',
              transition: `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`,
            }}
          >
            {item.render(active)}
          </div>
        );
      })}
    </div>
  );
}
