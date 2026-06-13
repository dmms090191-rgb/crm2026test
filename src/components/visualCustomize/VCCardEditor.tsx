import { useMemo } from 'react';
import { VCColor, VCSlider, VCTabs } from './VisualCustomizeControls';
import type { VCCardConfig } from './visualCustomizeTypes';
import { DEFAULT_CARD } from './visualCustomizeTypes';

interface Props {
  value: VCCardConfig | null;
  onChange: (v: VCCardConfig) => void;
}

function Separator() {
  return <div className="my-2" style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />;
}

export default function VCCardEditor({ value, onChange }: Props) {
  const cfg = useMemo<VCCardConfig>(() => value ?? { ...DEFAULT_CARD }, [value]);
  const patch = (p: Partial<VCCardConfig>) => onChange({ ...cfg, ...p });
  const isSolid = cfg.mode === 'solid';

  return (
    <div className="space-y-3">
      <VCTabs
        options={[{ id: 'glass', label: 'Glass transparent' }, { id: 'solid', label: 'Couleur de fond' }]}
        value={cfg.mode}
        onChange={(v) => patch({ mode: v })}
      />

      <VCColor label="Couleur principale" value={cfg.color} onChange={v => patch({ color: v })} />

      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Degrade</label>
        <button
          type="button"
          onClick={() => patch({ useGradient: !cfg.useGradient })}
          className="px-2 py-1 rounded-md text-[9px] font-bold"
          style={{
            background: cfg.useGradient ? 'linear-gradient(135deg,#06b6d4,#2563eb)' : 'rgba(255,255,255,0.06)',
            color: cfg.useGradient ? '#fff' : '#94a3b8',
          }}
        >
          {cfg.useGradient ? 'Active' : 'Desactive'}
        </button>
      </div>

      {cfg.useGradient && (
        <VCColor label="Couleur secondaire (degrade)" value={cfg.gradientTo ?? '#0f172a'} onChange={v => patch({ gradientTo: v })} />
      )}

      <VCSlider label="Opacite" value={Math.round(cfg.opacity * 100)} min={0} max={100} unit="%" onChange={v => patch({ opacity: v / 100 })} />

      {!isSolid && (
        <VCSlider label="Intensite du blur" value={cfg.blur} min={0} max={40} unit="px" onChange={v => patch({ blur: v })} />
      )}

      {isSolid && (
        <>
          <VCColor label="Couleur du texte" value={cfg.textColor ?? '#f1f5f9'} onChange={v => patch({ textColor: v })} />
          <Separator />
        </>
      )}

      <VCColor label="Bordure" value={cfg.borderColor} onChange={v => patch({ borderColor: v })} />
      <VCSlider label="Epaisseur bordure" value={cfg.borderWidth} min={0} max={6} unit="px" onChange={v => patch({ borderWidth: v })} />
      <VCSlider label="Ombre" value={cfg.shadow} min={0} max={40} unit="px" onChange={v => patch({ shadow: v })} />
      <VCSlider label="Coins arrondis" value={cfg.radius} min={0} max={48} unit="px" onChange={v => patch({ radius: v })} />
    </div>
  );
}
