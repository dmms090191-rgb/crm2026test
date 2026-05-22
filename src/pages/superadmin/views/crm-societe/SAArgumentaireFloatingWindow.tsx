import { useState, useRef, useCallback, useEffect } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  title: string;
  content: string;
  onClose: () => void;
}

const MIN_W = 320;
const MIN_H = 220;
const INITIAL_W = 480;
const INITIAL_H = 380;

export default function SAArgumentaireFloatingWindow({ title, content, onClose }: Props) {
  const t = useThemeTokens();

  const [pos, setPos] = useState(() => ({
    x: Math.max(40, Math.floor((window.innerWidth - INITIAL_W) / 2)),
    y: Math.max(40, Math.floor((window.innerHeight - INITIAL_H) / 3)),
  }));
  const [size, setSize] = useState({ w: INITIAL_W, h: INITIAL_H });

  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onPointerMoveDrag = useCallback((e: PointerEvent) => {
    if (dragging.current) {
      setPos({
        x: Math.max(0, e.clientX - offset.current.x),
        y: Math.max(0, e.clientY - offset.current.y),
      });
    }
  }, []);

  const onPointerMoveResize = useCallback((e: PointerEvent) => {
    if (resizing.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSize({
        w: Math.max(MIN_W, e.clientX - rect.left),
        h: Math.max(MIN_H, e.clientY - rect.top),
      });
    }
  }, []);

  const stopDrag = useCallback(() => {
    dragging.current = false;
    document.removeEventListener('pointermove', onPointerMoveDrag);
    document.removeEventListener('pointerup', stopDrag);
  }, [onPointerMoveDrag]);

  const stopResize = useCallback(() => {
    resizing.current = false;
    document.removeEventListener('pointermove', onPointerMoveResize);
    document.removeEventListener('pointerup', stopResize);
  }, [onPointerMoveResize]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    document.addEventListener('pointermove', onPointerMoveDrag);
    document.addEventListener('pointerup', stopDrag);
  }, [pos.x, pos.y, onPointerMoveDrag, stopDrag]);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    document.addEventListener('pointermove', onPointerMoveResize);
    document.addEventListener('pointerup', stopResize);
  }, [onPointerMoveResize, stopResize]);

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', onPointerMoveDrag);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointermove', onPointerMoveResize);
      document.removeEventListener('pointerup', stopResize);
    };
  }, [onPointerMoveDrag, onPointerMoveResize, stopDrag, stopResize]);

  return (
    <div
      ref={containerRef}
      className="fixed flex flex-col rounded-xl overflow-hidden select-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 9999,
        background: t.surface.secondary,
        border: `1px solid ${t.surface.border}`,
        boxShadow: '0 12px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
        resize: 'none',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
        style={{ background: t.surface.main, borderBottom: `1px solid ${t.surface.border}` }}
        onPointerDown={startDrag}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripHorizontal className="w-3.5 h-3.5 flex-shrink-0 opacity-40" style={{ color: t.text.tertiary }} />
          <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{title}</span>
        </div>
        <button
          onClick={onClose}
          onPointerDown={e => e.stopPropagation()}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0 hover:brightness-125"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed"
        style={{ color: t.text.secondary }}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pr-0.5 pb-0.5 opacity-40 hover:opacity-70 transition-opacity"
        onPointerDown={startResize}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M9 1v8H1" stroke={t.text.tertiary} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 5v4H5" stroke={t.text.tertiary} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
