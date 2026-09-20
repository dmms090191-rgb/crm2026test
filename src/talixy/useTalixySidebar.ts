import { useEffect, useState } from 'react';
import { useEditorModeSafe } from '../contexts/EditorModeContext';
import { TALIXY_BREAKPOINTS } from './talixyConfig';
import { useTalixy } from './useTalixy';
import { useTalixySound } from './useTalixySound';

/*
 * TALIXY — etat commun d'une sidebar en mode arc (maquette gris bleute, DESKTOP uniquement pour
 * l'instant : en dessous de 1024 px ou en mode reduit, la liste classique reste affichee).
 *
 *   arc      : l'arc remplace la liste (theme Talixy, mouvement autorise, hors editeur, >= 1024 px, non reduit) ;
 *   scene    : le decor (ligne d'arc) et la coquille transparente sont montes (jamais pendant Reorganiser) ;
 *   navigate : joue le son « navigation » (uniquement quand l'onglet change vraiment), fait tourner
 *              l'arc tout de suite et change la page deux images plus tard (rotation fluide).
 */
interface Options<V extends string> {
  activeView: V;
  onNavigate: (view: V) => void;
  collapsed: boolean;
  reordering: boolean;
}

/*
 * SEUIL UNIQUE. On interroge la MEDIA QUERY, pas window.innerWidth.
 *
 * innerWidth compte la barre de defilement, les media queries CSS non : entre les deux il y a une
 * bande d'une dizaine de pixels (mesuree : 770-780 px) ou le JavaScript se croyait deja en mode
 * large pendant que le CSS etait encore en mobile. L'arc s'affichait alors dans une colonne encore
 * pleine largeur. En lisant la meme requete que le CSS, les deux basculent au meme pixel.
 */
export const TALIXY_ARC_QUERY = `(min-width: ${TALIXY_BREAKPOINTS.mobileMax + 1}px)`;

function useViewportWide(): boolean {
  const [wide, setWide] = useState(() => (
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia(TALIXY_ARC_QUERY).matches
  ));
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(TALIXY_ARC_QUERY);
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

export function useTalixySidebar<V extends string>({ activeView, onNavigate, collapsed, reordering }: Options<V>) {
  const talixy = useTalixy();
  const sound = useTalixySound();
  const editorCtx = useEditorModeSafe();
  const wide = useViewportWide();
  const arc = talixy.motion && !editorCtx?.editorOpen && !collapsed && wide;
  const scene = talixy.active && !editorCtx?.editorOpen && !collapsed && wide && !reordering;

  const [pendingView, setPendingView] = useState<V | null>(null);
  useEffect(() => { setPendingView(null); }, [activeView]);

  const navigate = (view: V) => {
    if (talixy.active && view !== (pendingView ?? activeView)) sound.play('navigation');
    if (!arc) { onNavigate(view); return; }
    setPendingView(view);
    // Le halo finit son vol (280 ms) AVANT le montage de la vue : un montage lourd (Systeme, Chat)
    // ne peut plus geler l'arc en plein mouvement. Sequence : clic -> la roue tourne -> le contenu arrive.
    window.setTimeout(() => onNavigate(view), 300);
  };

  return { talixy, arc, scene, activeId: (arc ? (pendingView ?? activeView) : activeView) as V, navigate };
}
