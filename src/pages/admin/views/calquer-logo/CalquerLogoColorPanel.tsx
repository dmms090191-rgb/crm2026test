import { useCallback } from 'react';
import { Grid3x3 } from 'lucide-react';
import type { BgConfig, BgMode, GradientDirection } from './calquer-logo-types';
import CalquerLogoBgPicker from './CalquerLogoBgPicker';
import CalquerLogoGradientPicker from './CalquerLogoGradientPicker';

interface Props {
  bgConfig: BgConfig;
  onBgConfigChange: (cfg: BgConfig) => void;
  hasTransformed: boolean;
}

const MODES: { key: BgMode; label: string }[] = [
  { key: 'checker', label: 'Damier' },
  { key: 'solid', label: 'Couleur unique' },
  { key: 'gradient', label: 'Degrade' },
];

export default function CalquerLogoColorPanel({ bgConfig, onBgConfigChange, hasTransformed }: Props) {
  const setMode = useCallback((mode: BgMode) => {
    onBgConfigChange({ ...bgConfig, mode });
  }, [bgConfig, onBgConfigChange]);

  const setSolidColor = useCallback((c: string) => {
    onBgConfigChange({ ...bgConfig, mode: 'solid', solidColor: c });
  }, [bgConfig, onBgConfigChange]);

  const setGradColor1 = useCallback((c: string) => {
    onBgConfigChange({ ...bgConfig, gradientColor1: c });
  }, [bgConfig, onBgConfigChange]);

  const setGradColor2 = useCallback((c: string) => {
    onBgConfigChange({ ...bgConfig, gradientColor2: c });
  }, [bgConfig, onBgConfigChange]);

  const setGradDir = useCallback((d: GradientDirection) => {
    onBgConfigChange({ ...bgConfig, gradientDirection: d });
  }, [bgConfig, onBgConfigChange]);

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto border-r"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>

      <div className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(148,163,184,0.6)' }}>
          Arriere-plan transforme
        </h3>

        {!hasTransformed ? (
          <div className="px-3 py-4 rounded-lg text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Transformez d'abord un logo pour pouvoir changer l'arriere-plan.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Choisissez le type d'arriere-plan pour verifier la transparence.
            </p>

            <div className="flex gap-1">
              {MODES.map(({ key, label }) => {
                const active = bgConfig.mode === key;
                return (
                  <button key={key} onClick={() => setMode(key)}
                    className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-semibold transition-all duration-200"
                    style={{
                      background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: active ? '#60a5fa' : 'rgba(226,232,240,0.5)',
                    }}>
                    {key === 'checker' && <Grid3x3 className="w-3 h-3" />}
                    {label}
                  </button>
                );
              })}
            </div>

            {bgConfig.mode === 'solid' && (
              <CalquerLogoBgPicker value={bgConfig.solidColor} onChange={setSolidColor} />
            )}

            {bgConfig.mode === 'gradient' && (
              <CalquerLogoGradientPicker
                color1={bgConfig.gradientColor1}
                color2={bgConfig.gradientColor2}
                direction={bgConfig.gradientDirection}
                onColor1Change={setGradColor1}
                onColor2Change={setGradColor2}
                onDirectionChange={setGradDir}
              />
            )}
          </>
        )}
      </div>

      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.5)' }}>
          La couleur s'applique uniquement au cote droit "Transforme" en mode ecran divise.
        </p>
      </div>
    </div>
  );
}
