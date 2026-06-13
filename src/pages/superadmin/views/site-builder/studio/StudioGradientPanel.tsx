import { RotateCcw, ArrowLeftRight } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { GradientConfig } from './studioSectionTypes';
import { DEFAULT_GRADIENT } from './studioSectionTypes';
import { gradientToCss } from './gradientHelpers';
import GradientColorInput from './GradientColorInput';
import GradientSavedPresets from './GradientSavedPresets';
import { GradientBalanceSlider, GradientStrengthSlider } from './GradientSliders';
import { GradientDirectionButtons, GradientToggleButtons } from './GradientActions';
import useGradientHandlers from './useGradientHandlers';

interface Props {
  gradient: GradientConfig | null;
  onChange: (gradient: GradientConfig | null) => void;
  onReset: () => void;
  isActive?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  t: ThemeTokens;
}

export default function StudioGradientPanel({ gradient, onChange, onReset, isActive: isModeActive, onActivate, onDeactivate, t }: Props) {
  const {
    config, isActive,
    handleColor1Change, handleColor2Change,
    handleBalanceChange, handleStrengthChange,
    handleDirectionChange,
    handleApplyTrait,
    handleCenter, handleSwapColors, handleApplyPreset,
  } = useGradientHandlers({ gradient, onChange });

  const previewGradient = isActive ? gradientToCss(config) : gradientToCss(DEFAULT_GRADIENT);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* 1. Gradient preview */}
        <div>
          <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: t.text.tertiary }}>
            Apercu du degrade
          </label>
          <div
            className="w-full h-20 rounded-xl relative overflow-hidden transition-all duration-300"
            style={{
              background: previewGradient,
              border: `1px solid ${t.surface.border}`,
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15)',
              opacity: isActive ? 1 : 0.45,
            }}
          >
            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-md"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: '#fff' }}
                >
                  Degrade inactif
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Colors */}
        <GradientColorInput label="Couleur 1" color={config.color1} onChange={handleColor1Change} t={t} />
        <button
          onClick={handleSwapColors}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: t.surface.secondary,
            border: `1px solid ${t.surface.border}`,
            color: t.text.secondary,
          }}
        >
          <ArrowLeftRight className="w-3 h-3" />
          Inverser les couleurs
        </button>
        <GradientColorInput label="Couleur 2" color={config.color2} onChange={handleColor2Change} t={t} />

        <div className="my-1" style={{ borderTop: `1px solid ${t.surface.border}`, opacity: 0.6 }} />

        {/* 3. Sliders */}
        <GradientBalanceSlider
          value={config.balance}
          color1={config.color1}
          color2={config.color2}
          onChange={handleBalanceChange}
          t={t}
        />
        <GradientStrengthSlider value={config.strength} onChange={handleStrengthChange} t={t} />

        <div className="my-1" style={{ borderTop: `1px solid ${t.surface.border}`, opacity: 0.6 }} />

        {/* 4. Direction + actions */}
        <GradientDirectionButtons current={config.direction} onChange={handleDirectionChange} t={t} />
        <GradientToggleButtons
          isActive={isActive}
          showGuideLine={config.showGuideLine}
          onToggleTrait={handleApplyTrait}
          onCenter={handleCenter}
          t={t}
        />

        <div className="my-1" style={{ borderTop: `1px solid ${t.surface.border}`, opacity: 0.6 }} />

        {/* 6. Saved presets */}
        <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}`, opacity: 0.6 }}>
          <GradientSavedPresets
            currentGradient={gradient}
            onApplyPreset={handleApplyPreset}
            t={t}
          />
        </div>

        {/* 7. Reset gradient */}
        {config && (
          <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.12)',
                color: '#ef4444',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reinitialiser le degrade
            </button>
          </div>
        )}

        {/* 8. Activate / Deactivate */}
        {onActivate && onDeactivate && (
          <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            {isModeActive ? (
              <button
                onClick={onDeactivate}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'rgba(245,158,11,0.06)',
                  border: '1.5px solid rgba(245,158,11,0.25)',
                  color: '#f59e0b',
                }}
              >
                Degrade actif
              </button>
            ) : (
              <button
                onClick={onActivate}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(245,158,11,0.3)',
                }}
              >
                Activer le degrade
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}