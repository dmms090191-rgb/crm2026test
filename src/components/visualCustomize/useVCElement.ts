import { useEffect, useRef, type CSSProperties } from 'react';
import { useVisualCustomizeSafe } from './VisualCustomizeContext';
import type { VCElementType } from './visualCustomizeTypes';

export function useVCElement<T extends HTMLElement>(
  id: string,
  type: VCElementType,
  label: string,
  baseStyle?: CSSProperties,
): { ref: React.RefObject<T | null>; style: CSSProperties | undefined; vcId: string } {
  const ctx = useVisualCustomizeSafe();
  const ref = useRef<T | null>(null);

  // On depend des DEUX callbacks, pas de l'objet `ctx` entier.
  // `ctx` est un useMemo dont les dependances incluent `registered` : s'en
  // servir comme dependance creait une boucle infinie — l'effet enregistrait,
  // `registered` changeait, `ctx` changeait, le nettoyage desenregistrait, et
  // ainsi de suite (« Maximum update depth exceeded »).
  // registerElement et unregisterElement sont des useCallback(..., []) :
  // leur identite est stable, l'effet ne joue donc qu'une fois par element.
  const registerElement = ctx?.registerElement;
  const unregisterElement = ctx?.unregisterElement;

  useEffect(() => {
    if (!registerElement || !unregisterElement) return;
    registerElement(id, type, label, ref.current);
    return () => unregisterElement(id);
  }, [registerElement, unregisterElement, id, type, label]);

  const override = ctx?.styleFor(id, type);
  const style = override ? { ...baseStyle, ...override } : baseStyle;
  return { ref, style, vcId: id };
}
