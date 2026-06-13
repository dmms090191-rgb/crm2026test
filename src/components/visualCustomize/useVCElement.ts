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

  useEffect(() => {
    if (!ctx) return;
    ctx.registerElement(id, type, label, ref.current);
    return () => ctx.unregisterElement(id);
  }, [ctx, id, type, label]);

  const override = ctx?.styleFor(id, type);
  const style = override ? { ...baseStyle, ...override } : baseStyle;
  return { ref, style, vcId: id };
}
