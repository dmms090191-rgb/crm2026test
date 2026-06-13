import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Move, RotateCcw, AlignCenterHorizontal } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { OverlayElement } from './overlayElementTypes';

const STEP_PRESETS = [
  { label: 'Precis', value: 1 },
  { label: 'Normal', value: 3 },
  { label: 'Rapide', value: 8 },
];

export default function PositionControls({ el, onUpdate, t, freeDragActive, onToggleFreeDrag }: {
  el: OverlayElement;
  onUpdate: (partial: Partial<OverlayElement>) => void;
  t: ThemeTokens;
  freeDragActive: boolean;
  onToggleFreeDrag: () => void;
}) {
  const [step, setStep] = useState(3);

  const clamp = (val: number) => Math.max(0, Math.min(100, val));

  const move = (dx: number, dy: number) => {
    const updates: Partial<OverlayElement> = {};
    if (dy !== 0) (updates as { topPercent: number }).topPercent = clamp(el.topPercent + dy * step);
    if (dx !== 0) (updates as { leftPercent: number }).leftPercent = clamp(el.leftPercent + dx * step);
    onUpdate(updates);
  };

  const resetPosition = () => {
    onUpdate({ topPercent: 50, leftPercent: 50 } as Partial<OverlayElement>);
  };

  const alignCenterX = () => {
    onUpdate({ leftPercent: 50 } as Partial<OverlayElement>);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-semibold" style={{ color: t.text.tertiary }}>Position</label>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono" style={{ color: t.text.quaternary }}>
            X:{Math.round(el.leftPercent)}% Y:{Math.round(el.topPercent)}%
          </span>
          <button
            onClick={resetPosition}
            className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.quaternary }}
            title="Recentrer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="grid grid-cols-3 gap-1" style={{ width: '96px' }}>
          <div />
          <button
            onClick={() => move(0, -1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ background: t.surface.secondary, border: `1.5px solid ${t.surface.border}`, color: t.text.primary }}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <div />
          <button
            onClick={() => move(-1, 0)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ background: t.surface.secondary, border: `1.5px solid ${t.surface.border}`, color: t.text.primary }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(14,165,233,0.06)', border: '1.5px solid rgba(14,165,233,0.15)' }}
          >
            <Move className="w-3 h-3" style={{ color: '#0ea5e9' }} />
          </div>
          <button
            onClick={() => move(1, 0)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ background: t.surface.secondary, border: `1.5px solid ${t.surface.border}`, color: t.text.primary }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div />
          <button
            onClick={() => move(0, 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ background: t.surface.secondary, border: `1.5px solid ${t.surface.border}`, color: t.text.primary }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <div />
        </div>
      </div>

      <button
        onClick={alignCenterX}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: el.leftPercent === 50 ? 'rgba(16,185,129,0.1)' : t.surface.secondary,
          border: `1.5px solid ${el.leftPercent === 50 ? 'rgba(16,185,129,0.3)' : t.surface.border}`,
          color: el.leftPercent === 50 ? '#10b981' : t.text.secondary,
        }}
      >
        <AlignCenterHorizontal className="w-3.5 h-3.5" />
        Aligner au centre
      </button>

      <div>
        <label className="text-[9px] font-semibold mb-1.5 block" style={{ color: t.text.tertiary }}>
          Vitesse deplacement
        </label>
        <div className="grid grid-cols-3 gap-1">
          {STEP_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setStep(p.value)}
              className="py-1.5 rounded-lg text-[9px] font-semibold transition-all"
              style={{
                background: step === p.value ? 'rgba(14,165,233,0.1)' : t.surface.secondary,
                border: `1.5px solid ${step === p.value ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
                color: step === p.value ? '#0ea5e9' : t.text.tertiary,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={onToggleFreeDrag}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: freeDragActive ? 'rgba(14,165,233,0.1)' : t.surface.secondary,
            border: `1.5px solid ${freeDragActive ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
            color: freeDragActive ? '#0ea5e9' : t.text.secondary,
          }}
        >
          <Move className="w-3.5 h-3.5" />
          Deplacement libre
          {freeDragActive && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#0ea5e9', boxShadow: '0 0 6px rgba(14,165,233,0.6)' }}
            />
          )}
        </button>
      </div>
    </div>
  );
}
