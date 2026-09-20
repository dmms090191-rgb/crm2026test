import { useEffect, useMemo, useState } from 'react';
import { arcMetrics, type ArcMetrics } from './arcFluid';

/*
 * TALIXY — la geometrie fluide de l'arc, cote React.
 *
 * Une seule source pour tout le monde : la colonne de navigation et la roue appellent ce meme
 * crochet, avec la meme fenetre, donc elles obtiennent exactement les memes nombres. C'est ce qui
 * garantit que l'arc reste centre dans sa colonne a TOUTES les largeurs, et pas seulement aux
 * trois tailles d'autrefois.
 */
export function useViewport(): { w: number; h: number } {
  const [vp, setVp] = useState(() => (typeof window === 'undefined'
    ? { w: 1440, h: 900 }
    : { w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    const onResize = () => setVp(prev => (
      prev.w === window.innerWidth && prev.h === window.innerHeight
        ? prev
        : { w: window.innerWidth, h: window.innerHeight }
    ));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return vp;
}

/**
 * Une requete media, suivie en direct. C'est LA source de verite des seuils : le CSS et le
 * JavaScript lisent alors exactement la meme chose, au meme pixel.
 */
export function useMediaQuery(query: string): boolean {
  const [ok, setOk] = useState(() => (
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia(query).matches
  ));
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const onChange = () => setOk(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return ok;
}

/** Geometrie de l'arc pour la fenetre courante. Recalculee seulement quand la fenetre change. */
export function useArcMetrics(): ArcMetrics & { viewport: { w: number; h: number } } {
  const viewport = useViewport();
  // La LARGEUR seule pilote la courbe. La hauteur est traitee plus tard, et mesuree :
  // c est TalixyArc qui connait la hauteur reelle de sa colonne, pas la fenetre.
  return useMemo(() => ({ ...arcMetrics(viewport.w), viewport }), [viewport]);
}
