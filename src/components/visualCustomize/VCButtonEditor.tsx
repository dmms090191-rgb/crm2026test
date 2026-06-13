import { useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { VCColor, VCSlider } from './VisualCustomizeControls';
import type { VCButtonConfig, VCGradientDirection } from './visualCustomizeTypes';
import { DEFAULT_BUTTON } from './visualCustomizeTypes';

interface Props {
  value: VCButtonConfig | null;
  onChange: (v: VCButtonConfig) => void;
}

const DIRECTIONS: { value: VCGradientDirection; label: string; icon: typeof ArrowUp }[] = [
  { value: 'top', label: 'Haut', icon: ArrowUp },
  { value: 'bottom', label: 'Bas', icon: ArrowDown },
  { value: 'left', label: 'Gauche', icon: ArrowLeft },
  { value: 'right', label: 'Droite', icon: ArrowRight },
];

function Separator() {
  return <div className="my-2" style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />;
}

export default function VCButtonEditor({ value, onChange }: Props) {
  const cfg = useMemo<VCButtonConfig>(() => value ?? { ...DEFAULT_BUTTON }, [value]);
  const patch = (p: Partial<VCButtonConfig>) => onChange({ ...cfg, ...p });
  const useGradient = !!cfg.useGradient;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
          Mode couleur
        </label>
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            type="button"
            onClick={() => patch({ useGradient: false })}
            className="px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all"
            style={{
              background: !useGradient ? 'rgba(34,211,238,0.18)' : 'transparent',
              color: !useGradient ? '#22d3ee' : '#94a3b8',
              border: `1px solid ${!useGradient ? 'rgba(34,211,238,0.35)' : 'transparent'}`,
            }}
          >
            Unique
          </button>
          <button
            type="button"
            onClick={() => patch({ useGradient: true, gradientTo: cfg.gradientTo ?? '#1d4ed8' })}
            className="px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all"
            style={{
              background: useGradient ? 'rgba(34,211,238,0.18)' : 'transparent',
              color: useGradient ? '#22d3ee' : '#94a3b8',
              border: `1px solid ${useGradient ? 'rgba(34,211,238,0.35)' : 'transparent'}`,
            }}
          >
            Degrade
          </button>
        </div>
      </div>

      <VCColor
        label={useGradient ? 'Couleur principale' : 'Couleur du bouton'}
        value={cfg.bg}
        onChange={v => patch({ bg: v })}
      />
      {useGradient && (
        <>
          <VCColor
            label="Couleur secondaire"
            value={cfg.gradientTo ?? '#1d4ed8'}
            onChange={v => patch({ gradientTo: v })}
          />
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
              Direction du degrade
            </label>
            <div
              className="grid grid-cols-4 gap-1 p-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {DIRECTIONS.map(d => {
                const active = cfg.gradientDirection === d.value;
                const Icon = d.icon;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => patch({ gradientDirection: d.value })}
                    className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all"
                    style={{
                      background: active ? 'rgba(34,211,238,0.18)' : 'transparent',
                      color: active ? '#22d3ee' : '#94a3b8',
                      border: `1px solid ${active ? 'rgba(34,211,238,0.35)' : 'transparent'}`,
                    }}
                    title={d.label}
                  >
                    <Icon className="w-3 h-3" />
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <Separator />

      <VCColor label="Couleur du texte" value={cfg.text} onChange={v => patch({ text: v })} />

      <Separator />

      <VCColor label="Bordure" value={cfg.borderColor} onChange={v => patch({ borderColor: v })} />
      <VCSlider label="Epaisseur bordure" value={cfg.borderWidth} min={0} max={6} unit="px" onChange={v => patch({ borderWidth: v })} />
      <VCSlider label="Coins arrondis" value={cfg.radius} min={0} max={32} unit="px" onChange={v => patch({ radius: v })} />
    </div>
  );
}
