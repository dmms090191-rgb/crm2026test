import { useState, useRef, useCallback } from 'react';
import { Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
import type { EditorPanelTokens } from './editorPanelTheme';

export function PositionControls({ posX, posY, onChange, pt }: {
  posX: number;
  posY: number;
  onChange: (x: number, y: number) => void;
  pt: EditorPanelTokens;
}) {
  const [speed, setSpeed] = useState(5);
  const isDefault = posX === 0 && posY === 0;
  const posRef = useRef({ x: posX, y: posY });
  posRef.current = { x: posX, y: posY };

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dxRef = useRef(0);
  const dyRef = useRef(0);

  const startHold = useCallback((dx: number, dy: number) => {
    dxRef.current = dx;
    dyRef.current = dy;
    onChange(posRef.current.x + dx, posRef.current.y + dy);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      onChange(posRef.current.x + dxRef.current, posRef.current.y + dyRef.current);
    }, 100);
  }, [onChange]);

  const stopHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const dirBtnStyle = {
    background: pt.surface.primary,
    border: `1px solid ${pt.surface.border}`,
    color: pt.text.primary,
  };

  const dirBtnClass = "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95";

  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col gap-2.5"
      style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Move className="w-3 h-3" style={{ color: pt.accent.solid }} />
          <span className="text-[10px] font-semibold" style={{ color: pt.text.primary }}>Position</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded-md"
            style={{ background: pt.surface.primary, color: pt.label.muted, border: `1px solid ${pt.surface.border}` }}
          >
            {posX},{posY}
          </span>
          {!isDefault && (
            <button
              onClick={() => onChange(0, 0)}
              title="Recentrer l'image"
              className="flex items-center justify-center w-5 h-5 rounded-md transition-all hover:scale-110"
              style={{ background: pt.surface.primary, border: `1px solid ${pt.surface.border}`, color: pt.label.muted }}
            >
              <LocateFixed className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <button
            className={dirBtnClass}
            style={dirBtnStyle}
            onMouseDown={() => startHold(0, -speed)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            title="Haut"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <div className="flex gap-0.5">
            <button
              className={dirBtnClass}
              style={dirBtnStyle}
              onMouseDown={() => startHold(-speed, 0)}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              title="Gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className={dirBtnClass}
              style={dirBtnStyle}
              onMouseDown={() => startHold(speed, 0)}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              title="Droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            className={dirBtnClass}
            style={dirBtnStyle}
            onMouseDown={() => startHold(0, speed)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            title="Bas"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium" style={{ color: pt.label.muted }}>Vitesse</span>
            <span
              className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
              style={{ background: pt.surface.primary, color: pt.accent.text, border: `1px solid ${pt.surface.border}` }}
            >
              {speed}px
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${pt.accent.solid} ${((speed - 1) / 19) * 100}%, ${pt.surface.border} ${((speed - 1) / 19) * 100}%)`,
              accentColor: pt.accent.solid,
            }}
          />
          <div className="flex justify-between">
            <span className="text-[8px]" style={{ color: pt.label.muted }}>Lent</span>
            <span className="text-[8px]" style={{ color: pt.label.muted }}>Rapide</span>
          </div>

          {!isDefault && (
            <button
              onClick={() => onChange(0, 0)}
              className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all hover:scale-[1.02]"
              style={{ background: pt.surface.primary, color: pt.accent.text, border: `1px solid ${pt.accent.border}` }}
            >
              <LocateFixed className="w-3 h-3" />
              Recentrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
