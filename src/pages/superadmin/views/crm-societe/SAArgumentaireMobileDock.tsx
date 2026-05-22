import { useState, useRef, useCallback } from 'react';
import { X, GripHorizontal, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

const MOBILE_MIN_H = 100;
const MOBILE_DEFAULT_H = 180;
const MOBILE_MAX_H_RATIO = 0.65;

const STORAGE_KEY = 'sa_arg_float_mobile_h';

function loadH(): number | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return Number(raw); } catch { /* ignore */ }
  return null;
}
function saveH(h: number) {
  try { localStorage.setItem(STORAGE_KEY, String(h)); } catch { /* ignore */ }
}

interface Props {
  title: string;
  content: string;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  t: ReturnType<typeof useThemeTokens>;
}

export default function SAArgumentaireMobileDock({ title, content, onClose, collapsed, onToggleCollapse, t }: Props) {
  const maxH = Math.floor(window.innerHeight * MOBILE_MAX_H_RATIO);
  const [height, setHeight] = useState(() => {
    const saved = loadH();
    return saved ? Math.min(Math.max(saved, MOBILE_MIN_H), maxH) : MOBILE_DEFAULT_H;
  });
  const resizing = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    resizing.current = true;
    startY.current = e.clientY;
    startH.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [height]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizing.current) return;
    const curMax = Math.floor(window.innerHeight * MOBILE_MAX_H_RATIO);
    const delta = startY.current - e.clientY;
    setHeight(Math.min(Math.max(startH.current + delta, MOBILE_MIN_H), curMax));
  }, []);

  const onPointerUp = useCallback(() => {
    if (resizing.current) { resizing.current = false; saveH(height); }
  }, [height]);

  const handleReset = () => { setHeight(MOBILE_DEFAULT_H); saveH(MOBILE_DEFAULT_H); };

  return (
    <div
      className="fixed left-0 right-0 bottom-0 flex flex-col select-none"
      style={{
        zIndex: 9998,
        height: collapsed ? 'auto' : height,
        maxHeight: collapsed ? 'auto' : `${maxH}px`,
        background: t.surface.secondary,
        borderTop: `1px solid ${t.surface.border}`,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        borderRadius: '16px 16px 0 0',
      }}
    >
      {/* Resize handle */}
      {!collapsed && (
        <div
          className="flex items-center justify-center h-5 cursor-ns-resize flex-shrink-0 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="w-10 h-1 rounded-full" style={{ background: t.text.tertiary, opacity: 0.35 }} />
        </div>
      )}

      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: collapsed ? 'none' : `1px solid ${t.surface.borderLight}` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripHorizontal className="w-3.5 h-3.5 flex-shrink-0 opacity-40" style={{ color: t.text.tertiary }} />
          <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleReset} className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" style={{ color: t.text.tertiary }} title="Reinitialiser la taille">
            <RotateCcw className="w-3 h-3" />
          </button>
          <button onClick={onToggleCollapse} className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" style={{ color: t.text.tertiary }}>
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content with internal scroll */}
      {!collapsed && (
        <div
          className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed min-h-0"
          style={{ color: t.text.secondary }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
}
