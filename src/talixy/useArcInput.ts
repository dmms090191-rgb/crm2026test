import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { wheelStep, type WheelInputState } from './arcNavigation';
import type { ArcOrientation } from './arcGeometry';

/*
 * TALIXY — entrees de la roue : molette / trackpad, glisser au doigt, clavier, retour automatique.
 * Parcourir la roue ne navigue JAMAIS : seul un clic (ou Entree) sur un onglet change de page.
 * Le retour vers l'actif n'a lieu qu'apres une periode sans interaction, jamais tant que la souris
 * ou le focus clavier est dans la roue (l'element sous le curseur ne bouge pas tout seul).
 */
export type ArcKey = 'next' | 'prev' | 'first' | 'last';

export interface ArcInputOptions {
  orientation: ArcOrientation;
  /** Distance a glisser au doigt pour tourner d'un cran (px). */
  dragStepPx: number;
  /** La roue est en cours de parcours (centre different de l'actif). */
  browsing: boolean;
  idleMs?: number;
  onStep: (dir: 1 | -1) => void;
  onKey: (fromIndex: number, key: ArcKey) => void;
  onFocusSlot: (index: number) => void;
  onIdle: () => void;
}

const KEYS: Record<string, ArcKey> = { ArrowDown: 'next', ArrowRight: 'next', ArrowUp: 'prev', ArrowLeft: 'prev', Home: 'first', End: 'last' };
const DRAG_CLICK_TOLERANCE_PX = 6;
/*
 * Un appui (souris, doigt, stylet) donne aussi le focus a l'onglet. Ce focus-la ne doit JAMAIS faire tourner
 * la roue : l'onglet partirait sous le curseur avant le relachement et le clic serait perdu (double clic).
 * Seul un focus clavier (Tab) amene l'onglet au foyer.
 */
const POINTER_FOCUS_WINDOW_MS = 800;

function slotIndex(target: EventTarget | null): number | null {
  const slot = target instanceof Element ? target.closest<HTMLElement>('[data-arc-index]') : null;
  return slot ? Number(slot.dataset.arcIndex) : null;
}

export function useArcInput(ref: RefObject<HTMLElement>, opts: ArcInputOptions): void {
  const latest = useRef(opts);
  useLayoutEffect(() => { latest.current = opts; });
  const inside = useRef(false);
  const focused = useRef(false);
  const lastInput = useRef(0);
  const lastPress = useRef(-Infinity);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const touch = () => { lastInput.current = performance.now(); };
    let wheel: WheelInputState = { acc: 0, lastStepAt: 0 };
    let drag: { id: number; start: number; last: number; moved: boolean } | null = null;
    let swallowClick = false;
    const axis = (e: PointerEvent) => (latest.current.orientation === 'vertical' ? e.clientY : e.clientX);

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pincement-zoom du trackpad
      e.preventDefault();
      touch();
      const delta = latest.current.orientation === 'vertical' || Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const r = wheelStep(wheel, delta, e.deltaMode, performance.now());
      wheel = r.state;
      if (r.step !== 0) latest.current.onStep(r.step);
    };
    const onDown = (e: PointerEvent) => {
      lastPress.current = performance.now();
      if (e.pointerType === 'mouse') return;
      drag = { id: e.pointerId, start: axis(e), last: axis(e), moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const pos = axis(e);
      if (Math.abs(pos - drag.start) > DRAG_CLICK_TOLERANCE_PX) drag.moved = true;
      const d = pos - drag.last;
      if (Math.abs(d) >= latest.current.dragStepPx) {
        touch();
        latest.current.onStep(d < 0 ? 1 : -1);
        drag.last = pos;
      }
    };
    const onUp = () => { lastPress.current = performance.now(); if (drag?.moved) swallowClick = true; drag = null; };
    // Un glisser n'est jamais un clic : sinon l'onglet sous le doigt naviguerait (et le tiroir mobile se fermerait).
    const onClickCapture = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = KEYS[e.key];
      const from = slotIndex(e.target);
      if (!key || from === null) return;
      e.preventDefault();
      touch();
      latest.current.onKey(from, key);
    };
    const onFocusIn = (e: FocusEvent) => {
      focused.current = true;
      if (performance.now() - lastPress.current < POINTER_FOCUS_WINDOW_MS) return;
      const index = slotIndex(e.target);
      if (index !== null) latest.current.onFocusSlot(index);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!(e.relatedTarget instanceof Node) || !el.contains(e.relatedTarget)) focused.current = false;
    };
    const onEnter = () => { inside.current = true; };
    const onLeave = () => { inside.current = false; touch(); };
    // La roue place tout elle-meme : un focus clavier ne doit jamais faire defiler le cadre (overflow hidden).
    const keepOrigin = () => {
      for (const node of [el, el.parentElement]) if (node && (node.scrollTop || node.scrollLeft)) { node.scrollTop = 0; node.scrollLeft = 0; }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('scroll', keepOrigin);
    el.parentElement?.addEventListener('scroll', keepOrigin);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('scroll', keepOrigin);
      el.parentElement?.removeEventListener('scroll', keepOrigin);
    };
  }, [ref]);

  // Retour doux vers l'actif apres une periode sans interaction (jamais sous le curseur ni avec le focus).
  const { browsing, idleMs = 2500 } = opts;
  useEffect(() => {
    if (!browsing) return;
    const timer = window.setInterval(() => {
      if (inside.current || focused.current) return;
      if (performance.now() - lastInput.current >= idleMs) latest.current.onIdle();
    }, 250);
    return () => window.clearInterval(timer);
  }, [browsing, idleMs]);
}
