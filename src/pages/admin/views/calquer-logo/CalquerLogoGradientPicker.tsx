import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { GradientDirection } from './calquer-logo-types';
import CalquerLogoBgPicker from './CalquerLogoBgPicker';

interface Props {
  color1: string;
  color2: string;
  direction: GradientDirection;
  onColor1Change: (c: string) => void;
  onColor2Change: (c: string) => void;
  onDirectionChange: (d: GradientDirection) => void;
}

const DIRECTIONS: { key: GradientDirection; label: string; arrow: string }[] = [
  { key: 'top', label: 'Haut', arrow: '\u2191' },
  { key: 'bottom', label: 'Bas', arrow: '\u2193' },
  { key: 'left', label: 'Gauche', arrow: '\u2190' },
  { key: 'right', label: 'Droite', arrow: '\u2192' },
  { key: 'diag-left', label: 'Diag. gauche', arrow: '\u2196' },
  { key: 'diag-right', label: 'Diag. droite', arrow: '\u2197' },
];

export default function CalquerLogoGradientPicker({
  color1, color2, direction,
  onColor1Change, onColor2Change, onDirectionChange,
}: Props) {
  const [expanded, setExpanded] = useState<'color1' | 'color2' | null>(null);

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-2.5 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Orientation
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-2">
          {DIRECTIONS.map(({ key, label, arrow }) => {
            const active = direction === key;
            return (
              <button key={key} onClick={() => onDirectionChange(key)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all duration-150"
                style={{
                  background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? '#60a5fa' : 'rgba(226,232,240,0.6)',
                }}>
                <span className="text-xs">{arrow}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <ColorSection
        label="Couleur 1"
        color={color1}
        expanded={expanded === 'color1'}
        onToggle={() => setExpanded(v => v === 'color1' ? null : 'color1')}
        onChange={onColor1Change}
      />

      <ColorSection
        label="Couleur 2"
        color={color2}
        expanded={expanded === 'color2'}
        onToggle={() => setExpanded(v => v === 'color2' ? null : 'color2')}
        onChange={onColor2Change}
      />

      <GradientPreview color1={color1} color2={color2} direction={direction} />
    </div>
  );
}

function ColorSection({ label, color, expanded, onToggle, onChange }: {
  label: string; color: string; expanded: boolean; onToggle: () => void; onChange: (c: string) => void;
}) {
  const Icon = expanded ? ChevronUp : ChevronDown;
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors"
        style={{ borderBottom: expanded ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <div className="w-5 h-5 rounded flex-shrink-0" style={{ background: color, border: '1px solid rgba(255,255,255,0.15)' }} />
        <span className="flex-1 text-[11px] font-medium" style={{ color: 'rgba(226,232,240,0.8)' }}>{label}</span>
        <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>{color}</span>
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.5)' }} />
      </button>
      {expanded && (
        <div className="p-2">
          <CalquerLogoBgPicker value={color} onChange={onChange} inline />
        </div>
      )}
    </div>
  );
}

function GradientPreview({ color1, color2, direction }: { color1: string; color2: string; direction: GradientDirection }) {
  const dirCss: Record<GradientDirection, string> = {
    top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right',
    'diag-left': 'to top left', 'diag-right': 'to top right',
  };
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-2.5 py-1.5" style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Apercu
        </span>
      </div>
      <div className="h-12 w-full" style={{ background: `linear-gradient(${dirCss[direction]}, ${color1}, ${color2})` }} />
    </div>
  );
}
