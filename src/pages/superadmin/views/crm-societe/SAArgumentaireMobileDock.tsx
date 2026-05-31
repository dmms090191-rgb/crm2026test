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

type SnapState = 'collapsed' | 'half' | 'expanded';

const COLLAPSED_H = 56;
const HALF_RATIO = 0.40;
const EXPANDED_RATIO = 0.75;
const SNAP_VELOCITY_THRESHOLD = 0.4;
const STORAGE_KEY = 'sa_arg_float_mobile_snap';

function loadSnap(): SnapState {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'collapsed' || v === 'half' || v === 'expanded') return v;
  } catch { /* ignore */ }
  return 'half';
}

function saveSnap(s: SnapState) {
  try { localStorage.setItem(STORAGE_KEY, s); } catch { /* ignore */ }
}

function snapHeight(state: SnapState, vh: number): number {
  if (state === 'collapsed') return COLLAPSED_H;
  if (state === 'expanded') return Math.floor(vh * EXPANDED_RATIO);
  return Math.floor(vh * HALF_RATIO);
}

function closestSnap(h: number, vh: number): SnapState {
  const dCollapsed = Math.abs(h - COLLAPSED_H);
  const dHalf = Math.abs(h - vh * HALF_RATIO);
  const dExpanded = Math.abs(h - vh * EXPANDED_RATIO);
  if (dCollapsed <= dHalf && dCollapsed <= dExpanded) return 'collapsed';
  if (dExpanded <= dHalf) return 'expanded';
  return 'half';
}

interface Props {
  title: string;
  content: string;
  onClose: () => void;
  t: ReturnType<typeof useThemeTokens>;
}

export default function SAArgumentaireMobileDock({ title, content, onClose, t }: Props) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const [snap, setSnap] = useState<SnapState>(loadSnap);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);

  const currentHeight = dragHeight ?? snapHeight(snap, vh);
  const isCollapsed = snap === 'collapsed' && dragHeight === null;

  useEffect(() => {
    const onResize = () => {
      if (!isDragging.current) setDragHeight(null);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startH.current = dragHeight ?? snapHeight(snap, vh);
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    velocity.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [dragHeight, snap, vh]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastY.current - e.clientY) / dt;
    }
    lastY.current = e.clientY;
    lastTime.current = now;
    const delta = startY.current - e.clientY;
    const maxH = Math.floor(vh * EXPANDED_RATIO);
    const newH = Math.min(Math.max(startH.current + delta, COLLAPSED_H), maxH);
    setDragHeight(newH);
  }, [vh]);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const h = dragHeight ?? snapHeight(snap, vh);
    const v = velocity.current;
    let nextSnap: SnapState;
    if (Math.abs(v) > SNAP_VELOCITY_THRESHOLD) {
      if (v > 0) {
        nextSnap = snap === 'collapsed' ? 'half' : snap === 'half' ? 'expanded' : 'expanded';
      } else {
        nextSnap = snap === 'expanded' ? 'half' : snap === 'half' ? 'collapsed' : 'collapsed';
      }
    } else {
      nextSnap = closestSnap(h, vh);
    }
    setSnap(nextSnap);
    saveSnap(nextSnap);
    setDragHeight(null);
  }, [dragHeight, snap, vh]);

  const handleReset = () => {
    setSnap('half');
    saveSnap('half');
    setDragHeight(null);
  };

  const handleTitleTap = () => {
    if (isCollapsed) {
      setSnap('half');
      saveSnap('half');
    }
  };

  return (
    <div
      className="fixed left-0 right-0 bottom-0 flex flex-col select-none"
      style={{
        zIndex: 9998,
        height: currentHeight,
        background: t.surface.secondary,
        borderTop: `1px solid ${t.surface.border}`,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.22)',
        borderRadius: '16px 16px 0 0',
        transition: dragHeight !== null ? 'none' : 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'height',
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center h-6 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="w-9 h-1 rounded-full"
          style={{ background: t.text.tertiary, opacity: 0.35 }}
        />
      </div>

      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 flex-shrink-0"
        style={{
          height: 30,
          borderBottom: isCollapsed ? 'none' : `1px solid ${t.surface.borderLight}`,
        }}
        onClick={handleTitleTap}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripHorizontal className="w-3.5 h-3.5 flex-shrink-0 opacity-40" style={{ color: t.text.tertiary }} />
          <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); handleReset(); }}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ color: t.text.tertiary }}
            title="Reinitialiser la taille"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content with internal scroll */}
      {!isCollapsed && (
        <HtmlContent className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 text-sm leading-relaxed min-h-0" style={{ color: t.text.secondary, WebkitOverflowScrolling: 'touch' }} html={content} />
      )}
    </div>
  );
}
