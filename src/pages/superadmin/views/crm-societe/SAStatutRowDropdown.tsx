import { Check } from 'lucide-react';
import type { SAStatut } from './types';
import { getStatutColor } from './types';

interface Props {
  rect: { top: number; left: number };
  currentStatut: string;
  saStatuts: SAStatut[];
  onSelect: (nom: string) => void;
  onClose: () => void;
  t: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function SAStatutRowDropdown({
  rect, currentStatut, saStatuts, onSelect, onClose, t,
}: Props) {
  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        className="fixed py-1 rounded-xl z-[100] min-w-[160px]"
        style={{
          top: rect.top,
          left: rect.left,
          background: t.surface.secondary,
          border: `1px solid ${t.surface.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {saStatuts.length === 0 ? (
          <div className="px-3 py-3 text-xs text-center" style={{ color: t.text.tertiary }}>
            Aucun statut. Creez-en dans Statuts.
          </div>
        ) : saStatuts.map(s => {
          const sc = getStatutColor(s.nom, saStatuts);
          const isActive = currentStatut === s.nom;
          return (
            <button
              key={s.nom}
              type="button"
              onClick={() => onSelect(s.nom)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
              style={{ background: isActive ? sc.bg : 'transparent' }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
              <span className="text-xs font-medium flex-1" style={{ color: isActive ? sc.color : t.text.secondary }}>
                {s.nom}
              </span>
              {isActive && <Check className="w-3 h-3" style={{ color: sc.color }} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
