import { useMemo } from 'react';
import { Sparkles, Paintbrush } from 'lucide-react';
import { VCColor, VCSlider } from './VisualCustomizeControls';
import type { VCCardConfig } from './visualCustomizeTypes';
import { DEFAULT_CARD } from './visualCustomizeTypes';

interface Props {
  value: VCCardConfig | null;
  onChange: (v: VCCardConfig) => void;
}

export default function VCHybridEditor({ value, onChange }: Props) {
  const cfg = useMemo<VCCardConfig>(() => value ?? { ...DEFAULT_CARD }, [value]);
  const patch = (p: Partial<VCCardConfig>) => onChange({ ...cfg, ...p });
  const isGlass = cfg.mode === 'glass';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
          Style de fond
        </label>
        <div className="grid grid-cols-2 gap-2">
          <ModeChoiceCard
            active={isGlass}
            title="Transparent"
            subtitle="Glass"
            tone="glass"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => patch({ mode: 'glass' })}
          />
          <ModeChoiceCard
            active={!isGlass}
            title="Couleur"
            subtitle="Nette"
            tone="solid"
            icon={<Paintbrush className="w-4 h-4" />}
            onClick={() => patch({ mode: 'solid' })}
          />
        </div>
      </div>

      <div
        className="rounded-xl p-3 space-y-3"
        style={{
          background: 'rgba(15,23,42,0.55)',
          border: '1px solid rgba(148,163,184,0.12)',
          transition: 'all 200ms ease',
        }}
      >
        {isGlass ? (
          <GlassFields cfg={cfg} patch={patch} />
        ) : (
          <SolidFields cfg={cfg} patch={patch} />
        )}
      </div>
    </div>
  );
}

interface ModeChoiceProps {
  active: boolean;
  title: string;
  subtitle: string;
  tone: 'glass' | 'solid';
  icon: React.ReactNode;
  onClick: () => void;
}

function ModeChoiceCard({ active, title, subtitle, tone, icon, onClick }: ModeChoiceProps) {
  const accent = '#22d3ee';
  const swatchGlass = 'linear-gradient(135deg, rgba(34,211,238,0.28), rgba(37,99,235,0.18))';
  const swatchSolid = 'linear-gradient(135deg, #06b6d4, #2563eb)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-start gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] text-left overflow-hidden"
      style={{
        background: active ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${active ? accent : 'rgba(255,255,255,0.08)'}`,
        boxShadow: active
          ? '0 0 0 3px rgba(34,211,238,0.18), 0 8px 24px rgba(8,145,178,0.22)'
          : 'none',
      }}
    >
      <div className="flex items-center gap-2 w-full">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: tone === 'glass' ? swatchGlass : swatchSolid,
            backdropFilter: tone === 'glass' ? 'blur(6px)' : 'none',
            color: '#fff',
            border: tone === 'glass' ? '1px solid rgba(255,255,255,0.18)' : 'none',
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold leading-tight" style={{ color: active ? '#f1f5f9' : '#cbd5e1' }}>
            {title}
          </p>
          <p className="text-[9px] uppercase tracking-wider leading-tight" style={{ color: active ? accent : '#64748b' }}>
            {subtitle}
          </p>
        </div>
      </div>
      <div
        className="w-full h-6 rounded-md"
        style={{
          background: tone === 'glass'
            ? 'linear-gradient(135deg, rgba(148,163,184,0.18), rgba(15,23,42,0.18))'
            : 'linear-gradient(135deg, #06b6d4, #2563eb)',
          backdropFilter: tone === 'glass' ? 'blur(8px)' : 'none',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />
    </button>
  );
}

interface FieldsProps {
  cfg: VCCardConfig;
  patch: (p: Partial<VCCardConfig>) => void;
}

function GlassFields({ cfg, patch }: FieldsProps) {
  return (
    <div className="space-y-3">
      <VCColor label="Couleur principale" value={cfg.color} onChange={v => patch({ color: v })} />
      <VCSlider
        label="Opacite"
        value={Math.round(cfg.opacity * 100)}
        min={0}
        max={100}
        unit="%"
        onChange={v => patch({ opacity: v / 100 })}
      />
      <VCSlider label="Intensite du blur" value={cfg.blur} min={0} max={40} unit="px" onChange={v => patch({ blur: v })} />
      <VCColor label="Bordure" value={cfg.borderColor} onChange={v => patch({ borderColor: v })} />
      <VCSlider label="Epaisseur bordure" value={cfg.borderWidth} min={0} max={6} unit="px" onChange={v => patch({ borderWidth: v })} />
      <VCSlider label="Ombre" value={cfg.shadow} min={0} max={40} unit="px" onChange={v => patch({ shadow: v })} />
      <VCSlider label="Coins arrondis" value={cfg.radius} min={0} max={48} unit="px" onChange={v => patch({ radius: v })} />
      <VCColor label="Couleur du texte" value={cfg.textColor ?? '#f1f5f9'} onChange={v => patch({ textColor: v })} />
    </div>
  );
}

function SolidFields({ cfg, patch }: FieldsProps) {
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
        label={useGradient ? 'Couleur principale' : 'Couleur nette'}
        value={cfg.color}
        onChange={v => patch({ color: v })}
      />
      {useGradient && (
        <VCColor
          label="Couleur secondaire"
          value={cfg.gradientTo ?? '#1d4ed8'}
          onChange={v => patch({ gradientTo: v })}
        />
      )}

      <VCColor label="Bordure" value={cfg.borderColor} onChange={v => patch({ borderColor: v })} />
      <VCSlider label="Epaisseur bordure" value={cfg.borderWidth} min={0} max={6} unit="px" onChange={v => patch({ borderWidth: v })} />
      <VCSlider label="Coins arrondis" value={cfg.radius} min={0} max={48} unit="px" onChange={v => patch({ radius: v })} />
      <VCColor label="Couleur du texte" value={cfg.textColor ?? '#f1f5f9'} onChange={v => patch({ textColor: v })} />
    </div>
  );
}
