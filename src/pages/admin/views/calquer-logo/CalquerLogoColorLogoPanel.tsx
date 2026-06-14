import { useCallback } from 'react';
import { Paintbrush, RotateCcw } from 'lucide-react';
import type { LogoColorConfig, LogoColorMode, GradientDirection } from './calquer-logo-types';
import CalquerLogoBgPicker from './CalquerLogoBgPicker';
import CalquerLogoGradientPicker from './CalquerLogoGradientPicker';

interface Props {
  hasContent: boolean;
  logoColorConfig: LogoColorConfig;
  onConfigChange: (cfg: LogoColorConfig) => void;
  onReset: () => void;
}

const MODES: { key: LogoColorMode; label: string }[] = [
  { key: 'solid', label: 'Couleur unique' },
  { key: 'gradient', label: 'Degrade' },
];

const QUICK_COLORS: { label: string; color: string }[] = [
  { label: 'Noir', color: '#000000' },
  { label: 'Blanc', color: '#ffffff' },
  { label: 'Rose', color: '#ec4899' },
  { label: 'Dore', color: '#d4a017' },
];

export default function CalquerLogoColorLogoPanel({
  hasContent, logoColorConfig, onConfigChange, onReset,
}: Props) {
  const setMode = useCallback((mode: LogoColorMode) => {
    onConfigChange({ ...logoColorConfig, mode });
  }, [logoColorConfig, onConfigChange]);

  const setSolidColor = useCallback((c: string) => {
    onConfigChange({ ...logoColorConfig, mode: 'solid', solidColor: c });
  }, [logoColorConfig, onConfigChange]);

  const setGradColor1 = useCallback((c: string) => {
    onConfigChange({ ...logoColorConfig, gradientColor1: c });
  }, [logoColorConfig, onConfigChange]);

  const setGradColor2 = useCallback((c: string) => {
    onConfigChange({ ...logoColorConfig, gradientColor2: c });
  }, [logoColorConfig, onConfigChange]);

  const setGradDir = useCallback((d: GradientDirection) => {
    onConfigChange({ ...logoColorConfig, gradientDirection: d });
  }, [logoColorConfig, onConfigChange]);

  const handleQuickColor = useCallback((color: string) => {
    onConfigChange({ ...logoColorConfig, mode: 'solid', solidColor: color });
  }, [logoColorConfig, onConfigChange]);

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto border-r"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>

      <div className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(148,163,184,0.6)' }}>
          Couleur du logo
        </h3>

        {!hasContent ? (
          <div className="px-3 py-4 rounded-lg text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Paintbrush className="w-5 h-5 mx-auto mb-2" style={{ color: 'rgba(148,163,184,0.3)' }} />
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Nettoyez d'abord votre logo (Nettoyage rapide ou IA) pour pouvoir changer sa couleur.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Changez la couleur du logo. Le changement s'applique en direct.
            </p>

            <div className="flex gap-1">
              {MODES.map(({ key, label }) => {
                const active = logoColorConfig.mode === key;
                return (
                  <button key={key} onClick={() => setMode(key)}
                    className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-semibold transition-all duration-200"
                    style={{
                      background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: active ? '#60a5fa' : 'rgba(226,232,240,0.5)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {logoColorConfig.mode === 'solid' && (
              <CalquerLogoBgPicker value={logoColorConfig.solidColor} onChange={setSolidColor} inline />
            )}

            {logoColorConfig.mode === 'gradient' && (
              <CalquerLogoGradientPicker
                color1={logoColorConfig.gradientColor1}
                color2={logoColorConfig.gradientColor2}
                direction={logoColorConfig.gradientDirection}
                onColor1Change={setGradColor1}
                onColor2Change={setGradColor2}
                onDirectionChange={setGradDir}
              />
            )}

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(148,163,184,0.5)' }}>
                Couleurs rapides
              </span>
              <div className="flex gap-1.5">
                {QUICK_COLORS.map(({ label, color }) => (
                  <button key={label} onClick={() => handleQuickColor(color)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[9px] font-medium transition-all duration-150 hover:scale-105"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${logoColorConfig.mode === 'solid' && logoColorConfig.solidColor === color ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      color: 'rgba(226,232,240,0.6)',
                    }}>
                    <div className="w-5 h-5 rounded-full"
                      style={{ background: color, border: `1px solid ${color === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {logoColorConfig.mode !== 'none' && (
              <button onClick={onReset}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 mt-1"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                }}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </>
        )}
      </div>

      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.5)' }}>
          La couleur s'applique a toutes les formes visibles du logo vectorise SVG.
        </p>
      </div>
    </div>
  );
}
