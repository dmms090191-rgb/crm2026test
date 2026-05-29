import { X } from 'lucide-react';
import { PRESETS, type Preset } from './logoAiConstants';

interface Props {
  selected: Preset[];
  onRemove: (id: Preset) => void;
}

export default function LogoTypeSelectedBadges({ selected, onRemove }: Props) {
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {selected.map(id => {
        const def = PRESETS.find(p => p.id === id);
        if (!def) return null;
        return (
          <span key={id}
            className="inline-flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl text-[11px] font-extrabold transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(180,83,9,0.14))',
              border: '1.5px solid rgba(245,158,11,0.25)',
              color: '#92400e',
              boxShadow: '0 2px 8px rgba(245,158,11,0.06)',
            }}>
            <span className="flex items-center justify-center w-6 h-6 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.15)', boxShadow: '0 1px 3px rgba(245,158,11,0.1)' }}>
              {def.icon}
            </span>
            <span className="leading-none">{def.label}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onRemove(id); }}
              className="ml-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-amber-100/60"
              style={{ color: '#b45309' }}>
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
