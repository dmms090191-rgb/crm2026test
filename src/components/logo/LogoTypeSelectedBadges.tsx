import { X } from 'lucide-react';
import { PRESETS, type Preset } from './logoAiConstants';

interface Props {
  selected: Preset[];
  onRemove: (id: Preset) => void;
}

export default function LogoTypeSelectedBadges({ selected, onRemove }: Props) {
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {selected.map(id => {
        const def = PRESETS.find(p => p.id === id);
        if (!def) return null;
        return (
          <span key={id}
            className="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-md text-[9px] font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(180,83,9,0.10))',
              border: '1px solid rgba(245,158,11,0.20)',
              color: '#92400e',
            }}>
            <span className="flex items-center justify-center w-4 h-4 rounded"
              style={{ background: 'rgba(245,158,11,0.12)' }}>
              {def.icon}
            </span>
            <span className="leading-none">{def.label}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onRemove(id); }}
              className="w-4 h-4 rounded flex items-center justify-center transition-all hover:bg-amber-100/60"
              style={{ color: '#b45309' }}>
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
