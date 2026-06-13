import { useMemo } from 'react';
import { VCColor, VCSlider } from './VisualCustomizeControls';
import type { VCTextConfig } from './visualCustomizeTypes';
import { DEFAULT_TEXT } from './visualCustomizeTypes';

const FONT_CHOICES = [
  'system-ui', 'Inter', 'Manrope', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans',
  'Playfair Display', 'Lora', 'Merriweather', 'Space Grotesk', 'JetBrains Mono',
];

interface Props {
  value: VCTextConfig | null;
  onChange: (v: VCTextConfig) => void;
}

export default function VCTextEditor({ value, onChange }: Props) {
  const cfg = useMemo<VCTextConfig>(() => value ?? { ...DEFAULT_TEXT }, [value]);
  const patch = (p: Partial<VCTextConfig>) => onChange({ ...cfg, ...p });

  return (
    <div className="space-y-3">
      <VCColor label="Couleur" value={cfg.color} onChange={v => patch({ color: v })} />
      <VCSlider label="Taille" value={cfg.fontSize} min={10} max={64} unit="px" onChange={v => patch({ fontSize: v })} />
      <VCSlider label="Epaisseur" value={cfg.fontWeight} min={300} max={900} step={100} onChange={v => patch({ fontWeight: v })} />

      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Typographie</label>
        <select
          value={cfg.fontFamily}
          onChange={e => patch({ fontFamily: e.target.value })}
          className="w-full px-2 py-2 rounded-lg text-[11px] outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
        >
          {FONT_CHOICES.map(f => <option key={f} value={f} style={{ background: '#0f172a' }}>{f}</option>)}
        </select>
      </div>

      <VCSlider label="Ombre" value={cfg.shadow} min={0} max={16} unit="px" onChange={v => patch({ shadow: v })} />
      <VCSlider label="Espacement" value={cfg.letterSpacing} min={-2} max={12} step={0.5} unit="px" onChange={v => patch({ letterSpacing: v })} />
      <VCSlider label="Transparence" value={cfg.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={v => patch({ opacity: v })} />

      <div className="flex items-center justify-between gap-2 pt-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Fond / Badge</label>
        <button
          type="button"
          onClick={() => patch({ useBackground: !cfg.useBackground })}
          className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide"
          style={{
            background: cfg.useBackground ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.04)',
            color: cfg.useBackground ? '#22d3ee' : '#94a3b8',
            border: `1px solid ${cfg.useBackground ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          {cfg.useBackground ? 'Active' : 'Inactif'}
        </button>
      </div>
      {cfg.useBackground && (
        <VCColor label="Couleur fond" value={cfg.background ?? '#22c55e20'} onChange={v => patch({ background: v })} />
      )}
    </div>
  );
}
