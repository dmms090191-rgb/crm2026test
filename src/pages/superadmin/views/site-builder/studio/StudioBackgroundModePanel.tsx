import { useState } from 'react';
import { Paintbrush, Blend, Check, Palette, ChevronRight, ChevronDown } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { BgMode, GradientConfig } from './studioSectionTypes';
import { gradientToCss } from './gradientHelpers';
import { DEFAULT_GRADIENT } from './studioSectionTypes';

interface Props {
  bgMode: BgMode;
  solidColor: string;
  gradient: GradientConfig | null;
  onNavigate: (panel: 'solid' | 'gradient') => void;
  isMobile: boolean;
  t: ThemeTokens;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}

export default function StudioBackgroundModePanel({
  bgMode, solidColor, gradient, onNavigate, isMobile, t,
  open: controlledOpen, onToggle,
}: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (v: boolean) => {
    if (onToggle) onToggle(v);
    else setLocalOpen(v);
  };
  const gradientPreview = gradient ? gradientToCss(gradient) : gradientToCss(DEFAULT_GRADIENT);
  const isSolid = bgMode === 'solid';
  const isGradient = bgMode === 'gradient';

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full group rounded-xl px-3 py-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: open
            ? 'linear-gradient(135deg, rgba(14,165,233,0.04), rgba(6,182,212,0.02))'
            : t.surface.secondary,
          border: `1.5px solid ${open ? 'rgba(14,165,233,0.2)' : t.surface.border}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(6,182,212,0.06))',
              border: '1px solid rgba(14,165,233,0.15)',
            }}
          >
            <Palette className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
          </div>
          <p className="flex-1 min-w-0 text-[11px] font-bold" style={{ color: t.text.primary }}>
            Arriere-plan
          </p>
          {open
            ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ color: t.text.quaternary }} />
            : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ color: t.text.quaternary }} />
          }
        </div>
      </button>

      {open && (
        <div
          className="space-y-2 pl-2 pr-0.5 pt-2 pb-1 transition-all"
          style={{
            borderLeft: '2px solid rgba(14,165,233,0.12)',
            marginLeft: '18px',
          }}
        >
          {/* Solid color card */}
          <button
            onClick={() => onNavigate('solid')}
            className="w-full group rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: isSolid
                ? 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(6,182,212,0.03))'
                : t.surface.secondary,
              border: `1.5px solid ${isSolid ? 'rgba(14,165,233,0.35)' : t.surface.border}`,
              boxShadow: isSolid ? '0 2px 12px rgba(14,165,233,0.08)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative"
                style={{
                  background: solidColor,
                  border: `1.5px solid ${isSolid ? 'rgba(14,165,233,0.4)' : t.surface.border}`,
                  boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.15)',
                }}
              >
                <Paintbrush className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold" style={{ color: isSolid ? '#0ea5e9' : t.text.primary }}>
                    Couleur unie
                  </p>
                  {isSolid && (
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(14,165,233,0.15)' }}
                    >
                      <Check className="w-2 h-2" style={{ color: '#0ea5e9' }} />
                    </div>
                  )}
                </div>
                <p className="text-[8px] mt-0.5" style={{ color: t.text.quaternary }}>
                  Fond avec une seule couleur
                </p>
              </div>
              <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: t.text.quaternary }} />
            </div>
          </button>

          {/* Gradient card */}
          <button
            onClick={() => onNavigate('gradient')}
            className="w-full group rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: isGradient
                ? 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(234,179,8,0.03))'
                : t.surface.secondary,
              border: `1.5px solid ${isGradient ? 'rgba(245,158,11,0.35)' : t.surface.border}`,
              boxShadow: isGradient ? '0 2px 12px rgba(245,158,11,0.08)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                style={{
                  background: gradientPreview,
                  border: `1.5px solid ${isGradient ? 'rgba(245,158,11,0.4)' : t.surface.border}`,
                  boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.15)',
                }}
              >
                <Blend className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold" style={{ color: isGradient ? '#f59e0b' : t.text.primary }}>
                    Degrade
                  </p>
                  {isGradient && (
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(245,158,11,0.15)' }}
                    >
                      <Check className="w-2 h-2" style={{ color: '#f59e0b' }} />
                    </div>
                  )}
                </div>
                <p className="text-[8px] mt-0.5" style={{ color: t.text.quaternary }}>
                  Fond avec deux couleurs
                </p>
              </div>
              <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: t.text.quaternary }} />
            </div>
          </button>

        </div>
      )}
    </div>
  );
}
