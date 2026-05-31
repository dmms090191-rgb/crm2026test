import { Paintbrush, Blend, Check, ChevronRight } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { GradientConfig, BgMode } from './studioSectionTypes';
import { DEFAULT_GRADIENT } from './studioSectionTypes';
import { gradientToCss } from './gradientHelpers';

interface Props {
  bgMode: BgMode;
  bg: string;
  gradient: GradientConfig | null;
  onNavigate: (panel: 'solid' | 'gradient') => void;
  t: ThemeTokens;
}

export default function MobileModeCards({
  bgMode, bg, gradient, onNavigate, t,
}: Props) {
  const isSolid = bgMode === 'solid';
  const isGradient = bgMode === 'gradient';
  const gradientPreview = gradient ? gradientToCss(gradient) : gradientToCss(DEFAULT_GRADIENT);

  return (
    <div className="px-2.5 py-2 space-y-1.5">
      {/* Solid color card */}
      <button
        onClick={() => onNavigate('solid')}
        className="w-full rounded-xl p-2.5 text-left transition-all active:scale-[0.98]"
        style={{
          background: isSolid
            ? 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(6,182,212,0.03))'
            : t.surface.secondary,
          border: `1.5px solid ${isSolid ? 'rgba(14,165,233,0.35)' : t.surface.border}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: bg,
              border: `1.5px solid ${isSolid ? 'rgba(14,165,233,0.4)' : t.surface.border}`,
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            <Paintbrush className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.6)' }} />
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
        className="w-full rounded-xl p-2.5 text-left transition-all active:scale-[0.98]"
        style={{
          background: isGradient
            ? 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(234,179,8,0.03))'
            : t.surface.secondary,
          border: `1.5px solid ${isGradient ? 'rgba(245,158,11,0.35)' : t.surface.border}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: gradientPreview,
              border: `1.5px solid ${isGradient ? 'rgba(245,158,11,0.4)' : t.surface.border}`,
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            <Blend className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.6)' }} />
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
  );
}
