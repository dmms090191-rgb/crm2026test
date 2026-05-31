import { useState, useRef, useCallback, useEffect, type CSSProperties } from 'react';
import { X, GripHorizontal, RotateCcw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

function HtmlContent({ html, className, style }: { html: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.innerHTML = html;
    return () => { if (el) el.innerHTML = ''; };
  }, [html]);
  return <div ref={ref} className={className} style={style} />;
}

const STORAGE_KEY = 'sa_arg_float_desktop';
const MIN_W = 320;
const MIN_H = 200;
const DEFAULT_W = 480;
const DEFAULT_H = 360;

function load(): { x: number; y: number; w: number; h: number } | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return null;
}
function save(v: { x: number; y: number; w: number; h: number }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

interface Props {
  title: string;
  content: string;
  onClose: () => void;
  t: ReturnType<typeof useThemeTokens>;
}

export default function SAArgumentaireDesktopFloat({ title, content, onClose, t }: Props) {
  const saved = load();
  const [pos, setPos] = useState(() => ({
    x: saved?.x ?? Math.max(40, Math.floor((window.innerWidth - DEFAULT_W) / 2)),
    y: saved?.y ?? Math.max(40, Math.floor((window.innerHeight - DEFAULT_H) / 3)),
  }));
  const [size, setSize] = useState({
    w: saved?.w ?? DEFAULT_W,
    h: saved?.h ?? DEFAULT_H,
  });

  const dragging = useRef(false);
  const resizeDir = useRef<string | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const startRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const startMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const persist = useCallback((p: typeof pos, s: typeof size) => {
    save({ x: p.x, y: p.y, w: s.w, h: s.h });
  }, []);

  const onPointerMoveDrag = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, Math.min(e.clientX - offset.current.x, window.innerWidth - 60)),
      y: Math.max(0, Math.min(e.clientY - offset.current.y, window.innerHeight - 40)),
    });
  }, []);

  const onPointerMoveResize = useCallback((e: PointerEvent) => {
    if (!resizeDir.current) return;
    const dir = resizeDir.current;
    const dx = e.clientX - startMouse.current.x;
    const dy = e.clientY - startMouse.current.y;
    const s = { ...startRect.current };
    let nx = s.x, ny = s.y, nw = s.w, nh = s.h;
    if (dir.includes('e')) nw = Math.max(MIN_W, s.w + dx);
    if (dir.includes('w')) { nw = Math.max(MIN_W, s.w - dx); nx = s.x + (s.w - nw); }
    if (dir.includes('s')) nh = Math.max(MIN_H, s.h + dy);
    if (dir.includes('n')) { nh = Math.max(MIN_H, s.h - dy); ny = s.y + (s.h - nh); }
    setPos({ x: nx, y: ny });
    setSize({ w: nw, h: nh });
  }, []);

  const stopDrag = useCallback(() => {
    dragging.current = false;
    document.removeEventListener('pointermove', onPointerMoveDrag);
    document.removeEventListener('pointerup', stopDrag);
  }, [onPointerMoveDrag]);

  const stopResize = useCallback(() => {
    resizeDir.current = null;
    document.removeEventListener('pointermove', onPointerMoveResize);
    document.removeEventListener('pointerup', stopResize);
  }, [onPointerMoveResize]);

  useEffect(() => { persist(pos, size); }, [pos, size, persist]);
  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', onPointerMoveDrag);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointermove', onPointerMoveResize);
      document.removeEventListener('pointerup', stopResize);
    };
  }, [onPointerMoveDrag, onPointerMoveResize, stopDrag, stopResize]);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    document.addEventListener('pointermove', onPointerMoveDrag);
    document.addEventListener('pointerup', stopDrag);
  };

  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeDir.current = dir;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startRect.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
    document.addEventListener('pointermove', onPointerMoveResize);
    document.addEventListener('pointerup', stopResize);
  };

  const handleReset = () => {
    setPos({
      x: Math.max(40, Math.floor((window.innerWidth - DEFAULT_W) / 2)),
      y: Math.max(40, Math.floor((window.innerHeight - DEFAULT_H) / 3)),
    });
    setSize({ w: DEFAULT_W, h: DEFAULT_H });
  };

  const edge = 'absolute z-10';

  return (
    <div
      ref={containerRef}
      className="fixed flex flex-col rounded-xl overflow-hidden select-none"
      style={{
        left: pos.x, top: pos.y, width: size.w, height: size.h,
        zIndex: 9999, background: t.surface.secondary,
        border: `1px solid ${t.surface.border}`,
        boxShadow: '0 12px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      <div className={`${edge} top-0 left-2 right-2 h-1.5 cursor-ns-resize`} onPointerDown={startResize('n')} />
      <div className={`${edge} bottom-0 left-2 right-2 h-1.5 cursor-ns-resize`} onPointerDown={startResize('s')} />
      <div className={`${edge} left-0 top-2 bottom-2 w-1.5 cursor-ew-resize`} onPointerDown={startResize('w')} />
      <div className={`${edge} right-0 top-2 bottom-2 w-1.5 cursor-ew-resize`} onPointerDown={startResize('e')} />
      <div className={`${edge} top-0 left-0 w-3 h-3 cursor-nw-resize`} onPointerDown={startResize('nw')} />
      <div className={`${edge} top-0 right-0 w-3 h-3 cursor-ne-resize`} onPointerDown={startResize('ne')} />
      <div className={`${edge} bottom-0 left-0 w-3 h-3 cursor-sw-resize`} onPointerDown={startResize('sw')} />
      <div className={`${edge} bottom-0 right-0 w-3 h-3 cursor-se-resize`} onPointerDown={startResize('se')} />

      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
        style={{ background: t.surface.main, borderBottom: `1px solid ${t.surface.border}` }}
        onPointerDown={startDrag}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripHorizontal className="w-3.5 h-3.5 flex-shrink-0 opacity-40" style={{ color: t.text.tertiary }} />
          <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleReset} onPointerDown={e => e.stopPropagation()} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:brightness-125" style={{ color: t.text.tertiary }} title="Reinitialiser la taille">
            <RotateCcw className="w-3 h-3" />
          </button>
          <button onClick={onClose} onPointerDown={e => e.stopPropagation()} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0 hover:brightness-125" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <HtmlContent className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed min-h-0" style={{ color: t.text.secondary }} html={content} />

      <div className="absolute bottom-0.5 right-0.5 pointer-events-none opacity-30">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M9 1v8H1" stroke={t.text.tertiary} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 5v4H5" stroke={t.text.tertiary} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
