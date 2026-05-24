import { useState } from 'react';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import type { TalvexFonction } from './fonctionsTalvexTypes';
import { ETAT_CONFIG } from './fonctionsTalvexTypes';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CheckBox from '../../../admin/views/crm/CheckBox';

interface Props {
  fonction: TalvexFonction;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
}

export default function FonctionCard({ fonction, isSelected, onSelect, onEdit, onDelete, selectMode, isChecked, onToggleCheck }: Props) {
  const t = useThemeTokens();
  const [hovered, setHovered] = useState(false);
  const etat = ETAT_CONFIG[fonction.etat];

  const handleClick = () => {
    if (selectMode && onToggleCheck) onToggleCheck();
    else onSelect();
  };

  return (
    <div
      className="rounded-xl p-3 cursor-pointer transition-all duration-150"
      style={{
        background: isChecked ? 'rgba(239,68,68,0.04)' : isSelected ? t.surface.active : hovered ? t.surface.hover : t.surface.secondary,
        border: `1px solid ${isChecked ? 'rgba(239,68,68,0.2)' : isSelected ? 'rgba(245,158,11,0.3)' : t.surface.border}`,
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-2.5">
        {selectMode && (
          <div className="mt-0.5 flex-shrink-0" onClick={e => { e.stopPropagation(); onToggleCheck?.(); }}>
            <CheckBox checked={!!isChecked} onChange={() => onToggleCheck?.()} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold truncate" style={{ color: t.text.primary }}>
              {fonction.titre}
            </h4>
            <span
              className="text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
              style={{ background: etat.bg, color: etat.color }}
            >
              {etat.label}
            </span>
          </div>
          {fonction.descriptionCourte && (
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: t.text.tertiary }}>
              {fonction.descriptionCourte}
            </p>
          )}
          {fonction.utilisateurs && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px]" style={{ color: t.text.tertiary }}>{fonction.utilisateurs}</span>
            </div>
          )}
        </div>

        {!selectMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {(hovered || isSelected) && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onEdit(); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: t.text.tertiary }}
                  title="Modifier"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: '#ef4444' }}
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
            <ChevronRight className="w-4 h-4 opacity-30" style={{ color: t.text.tertiary }} />
          </div>
        )}
      </div>
    </div>
  );
}
