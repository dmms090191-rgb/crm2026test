import { Check } from 'lucide-react';
import type { SAStatut } from './types';
import { getStatutColor } from './types';
import type { Prospect } from './SAProspectModal';

interface Props {
  rect: { top: number; right: number };
  filterStatut: string | null;
  saStatuts: SAStatut[];
  prospects: Prospect[];
  onSelect: (nom: string | null) => void;
  onClose: () => void;
  t: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function SAStatutFilterDropdown({
  rect, filterStatut, saStatuts, prospects, onSelect, onClose, t,
}: Props) {
  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        className="fixed py-1 rounded-xl z-[100] min-w-[180px]"
        style={{
          top: rect.top,
          right: rect.right,
          background: t.surface.secondary,
          border: `1px solid ${t.surface.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
          style={{ background: !filterStatut ? 'rgba(14,165,233,0.08)' : 'transparent' }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.text.tertiary }} />
          <span className="text-xs font-medium flex-1" style={{ color: !filterStatut ? '#0ea5e9' : t.text.secondary }}>
            Tous les statuts
          </span>
          {!filterStatut && <Check className="w-3 h-3" style={{ color: '#0ea5e9' }} />}
        </button>

        {saStatuts.length > 0 && (
          <div style={{ borderTop: `1px solid ${t.surface.borderLight}`, margin: '4px 0' }} />
        )}

        {saStatuts.map(s => {
          const sc = getStatutColor(s.nom, saStatuts);
          const count = prospects.filter(p => p.statut === s.nom).length;
          const isActive = filterStatut === s.nom;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.nom)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
              style={{ background: isActive ? sc.bg : 'transparent' }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
              <span className="text-xs font-medium flex-1" style={{ color: isActive ? sc.color : t.text.secondary }}>
                {s.nom}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? `${sc.color}22` : t.surface.primary,
                  color: isActive ? sc.color : t.text.tertiary,
                }}
              >
                {count}
              </span>
              {isActive && <Check className="w-3 h-3 ml-1" style={{ color: sc.color }} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
