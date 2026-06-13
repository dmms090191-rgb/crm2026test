import { useCallback, useRef, useState } from 'react';

export function useVCDraggable(elRef?: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const startRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const clamp = useCallback((rawX: number, rawY: number) => {
    const el = elRef?.current;
    if (!el) return { x: rawX, y: rawY };
    const rect = el.getBoundingClientRect();
    const baseLeft = rect.left - posRef.current.x;
    const baseTop = rect.top - posRef.current.y;
    const w = rect.width;
    const h = rect.height;
    const minX = -baseLeft;
    const minY = -baseTop;
    const maxX = window.innerWidth - baseLeft - w;
    const maxY = window.innerHeight - baseTop - h;
    return {
      x: Math.max(minX, Math.min(rawX, maxX)),
      y: Math.max(minY, Math.min(rawY, maxY)),
    };
  }, [elRef]);

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [data-no-drag]')) return;
    e.preventDefault();
    e.stopPropagation();
    const cur = posRef.current;
    startRef.current = { mx: e.clientX, my: e.clientY, ox: cur.x, oy: cur.y };

    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const { mx, my, ox, oy } = startRef.current;
      const rawX = ox + (ev.clientX - mx);
      const rawY = oy + (ev.clientY - my);
      const c = clamp(rawX, rawY);
      posRef.current = c;
      setPos(c);
    };
    const onUp = () => {
      startRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [clamp]);

  return { pos, onHeaderMouseDown };
}
