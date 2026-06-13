import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ArrowDownRight, ArrowDownLeft,
  Eye, EyeOff, Crosshair,
} from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { GradientDirection } from './studioSectionTypes';

const DIRECTION_ROWS: { id: GradientDirection; label: string; icon: typeof ArrowUp }[][] = [
  [
    { id: 'top', label: 'Haut', icon: ArrowUp },
    { id: 'bottom', label: 'Bas', icon: ArrowDown },
  ],
  [
    { id: 'left', label: 'Gauche', icon: ArrowLeft },
    { id: 'right', label: 'Droite', icon: ArrowRight },
  ],
  [
    { id: 'diagonal-left', label: 'Diagonale gauche', icon: ArrowDownLeft },
    { id: 'diagonal-right', label: 'Diagonale droite', icon: ArrowDownRight },
  ],
];

interface DirectionButtonsProps {
  current: GradientDirection;
  onChange: (dir: GradientDirection) => void;
  t: ThemeTokens;
}

export function GradientDirectionButtons({ current, onChange, t }: DirectionButtonsProps) {
  return (
    <div>
      <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: t.text.tertiary }}>
        Orientation
      </label>
      <div className="space-y-1.5">
        {DIRECTION_ROWS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 gap-1.5">
            {row.map(d => {
              const active = current === d.id;
              const Icon = d.icon;
              return (
                <button
                  key={d.id}
                  onClick={() => onChange(d.id)}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: active ? 'rgba(14,165,233,0.08)' : t.surface.secondary,
                    border: `1.5px solid ${active ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
                    color: active ? '#0ea5e9' : t.text.secondary,
                    boxShadow: active ? '0 1px 6px rgba(14,165,233,0.08)' : 'none',
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {d.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ToggleButtonProps {
  isActive: boolean;
  showGuideLine: boolean;
  onToggleTrait: () => void;
  onCenter: () => void;
  t: ThemeTokens;
}

export function GradientToggleButtons({
  isActive, showGuideLine,
  onToggleTrait, onCenter, t,
}: ToggleButtonProps) {
  return (
    <>
      <button
        onClick={onToggleTrait}
        className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: isActive && showGuideLine
            ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.06))'
            : 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(6,182,212,0.04))',
          border: `1.5px solid ${isActive && showGuideLine ? 'rgba(245,158,11,0.3)' : 'rgba(14,165,233,0.25)'}`,
          color: isActive && showGuideLine ? '#f59e0b' : '#0ea5e9',
          boxShadow: isActive && showGuideLine
            ? '0 2px 12px rgba(245,158,11,0.1)'
            : '0 2px 12px rgba(14,165,233,0.08)',
        }}
      >
        {isActive && showGuideLine ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {isActive && showGuideLine ? 'Masquer le trait' : 'Appliquer un trait'}
      </button>

      <button
        onClick={onCenter}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{
          background: t.surface.secondary,
          border: `1.5px solid ${t.surface.border}`,
          color: t.text.secondary,
        }}
      >
        <Crosshair className="w-3.5 h-3.5" />
        Centrer
      </button>
    </>
  );
}
