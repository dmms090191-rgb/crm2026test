import { useEffect, useState, useRef } from 'react';
import { Paintbrush } from 'lucide-react';
import { useVisualCustomize } from './VisualCustomizeContext';

interface Rect { id: string; type: 'card' | 'button' | 'text'; label: string; top: number; left: number; width: number; height: number; }

const GROUP_ONLY_IDS = new Set<string>(['sa-health-audit-rows-group']);

function getModalLetter(r: Pick<Rect, 'id' | 'type' | 'label'>): 'A' | 'B' | 'C' | 'D' | 'E' | null {
  const lc = r.label.toLowerCase();
  if (r.id.startsWith('hybrid-') || lc.startsWith('hybride')) return 'E';
  const isGroup = GROUP_ONLY_IDS.has(r.id);
  if (r.type === 'button' && !isGroup) return 'A';
  if (r.type === 'text' && (lc.startsWith('icone') || lc.startsWith('icône'))) return 'B';
  if (isGroup) return 'C';
  if (r.type === 'text' && !lc.startsWith('badge')) return 'C';
  if (r.type === 'card') return 'D';
  return null;
}

export default function VisualCustomizeOverlay() {
  const { enabled, registered, setActiveSelection, activeSelection, markersHidden, quickApply, quickCommit, setQuickApplyToast } = useVisualCustomize();
  const [rects, setRects] = useState<Rect[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) { setRects([]); return; }
    let raf = 0;
    const measure = () => {
      const next: Rect[] = [];
      for (const r of registered) {
        if (!r.ref) continue;
        const b = r.ref.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        next.push({ id: r.id, type: r.type, label: r.label, top: b.top, left: b.left, width: b.width, height: b.height });
      }
      setRects(next);
    };
    const loop = () => { measure(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, registered]);

  if (!enabled || markersHidden) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998]" data-vc-overlay="true">
      {rects.map(r => {
        const isActive = activeSelection?.id === r.id;
        const isHovered = hoveredId === r.id;
        return (
          <div key={r.id} className="absolute transition-all duration-150"
            style={{ top: r.top, left: r.left, width: r.width, height: r.height,
              border: isActive ? '1.5px solid rgba(34,211,238,0.85)' : '1px dashed rgba(34,211,238,0.32)',
              borderRadius: 8,
              boxShadow: isActive ? '0 0 0 3px rgba(34,211,238,0.14), 0 0 20px rgba(34,211,238,0.28)' : 'none',
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (quickApply.active) {
                  if (!quickApply.presetConfig || !quickApply.presetModalKind) {
                    setQuickApplyToast('Selectionnez un reglage d\'abord');
                    return;
                  }
                  const elementKind = getModalLetter(r);
                  if (elementKind !== quickApply.presetModalKind) {
                    setQuickApplyToast('Reglage incompatible avec cet element');
                    return;
                  }
                  quickCommit(r.id, r.type, quickApply.presetConfig);
                  setQuickApplyToast(`"${quickApply.presetName}" applique`);
                  return;
                }
                setActiveSelection({ id: r.id, type: r.type, label: r.label });
              }}
              onMouseEnter={() => setHoveredId(r.id)}
              onMouseLeave={() => setHoveredId(curr => (curr === r.id ? null : curr))}
              aria-label={`Modifier : ${r.label}`}
              className="absolute pointer-events-auto flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
              style={{
                top: -10, right: -10,
                width: 26, height: 26,
                background: quickApply.active && quickApply.presetConfig && getModalLetter(r) === quickApply.presetModalKind
                  ? 'linear-gradient(135deg, rgba(234,179,8,0.9), rgba(245,158,11,0.9))'
                  : 'linear-gradient(135deg, rgba(6,182,212,0.85), rgba(37,99,235,0.85))',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: quickApply.active && quickApply.presetConfig && getModalLetter(r) === quickApply.presetModalKind
                  ? '0 4px 12px rgba(234,179,8,0.45), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 4px 12px rgba(8,145,178,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px) saturate(140%)',
                WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                color: '#fff',
              }}
            >
              <Paintbrush className="w-3 h-3" />
              {(() => {
                const letter = getModalLetter(r);
                if (!letter) return null;
                return (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      bottom: -4, right: -4,
                      minWidth: 13, height: 13,
                      padding: '0 3px',
                      borderRadius: 999,
                      background: 'rgba(15,23,42,0.95)',
                      color: '#a5f3fc',
                      fontSize: 9,
                      fontWeight: 800,
                      lineHeight: '13px',
                      textAlign: 'center',
                      border: '1px solid rgba(34,211,238,0.55)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                      letterSpacing: 0,
                    }}
                  >
                    {letter}
                  </span>
                );
              })()}
            </button>
            {isHovered && (
              <div
                className="absolute pointer-events-none whitespace-nowrap"
                style={{
                  top: -36, right: 22,
                  background: 'rgba(15,23,42,0.92)',
                  color: '#e2e8f0',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  border: '1px solid rgba(148,163,184,0.25)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                  zIndex: 1,
                }}
              >
                {r.label}
              </div>
            )}
          </div>
        );
      })}
      <QuickApplyToast />
    </div>
  );
}

function QuickApplyToast() {
  const { quickApplyToast, setQuickApplyToast } = useVisualCustomize();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!quickApplyToast) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuickApplyToast(null), 2000);
    return () => clearTimeout(timerRef.current);
  }, [quickApplyToast, setQuickApplyToast]);

  if (!quickApplyToast) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-[10001] animate-pulse"
      style={{
        background: 'rgba(15,23,42,0.95)',
        color: '#e2e8f0',
        padding: '8px 16px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid rgba(34,211,238,0.3)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      {quickApplyToast}
    </div>
  );
}
