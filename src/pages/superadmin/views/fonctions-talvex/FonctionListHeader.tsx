import { CheckSquare, X, Trash2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CheckBox from '../../../admin/views/crm/CheckBox';

interface Props {
  catLabel: string;
  count: number;
  selectMode: boolean;
  checkedCount: number;
  allChecked: boolean;
  someChecked: boolean;
  onToggleSelectMode: () => void;
  toggleAll: () => void;
  onBulkDelete: () => void;
}

export default function FonctionListHeader({ catLabel, count, selectMode, checkedCount, allChecked, someChecked, onToggleSelectMode, toggleAll, onBulkDelete }: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
      {/* Title + selection bar */}
      <div className="px-3 py-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: t.text.tertiary }}>
          Fonctions {catLabel ? `- ${catLabel}` : ''} ({count})
        </span>

        <div className="flex-1" />

        {/* Selectionner / Annuler toggle */}
        <button
          onClick={onToggleSelectMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={selectMode ? {
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444',
          } : {
            background: t.surface.hover,
            border: `1px solid ${t.surface.borderLight}`,
            color: t.text.secondary,
          }}
        >
          {selectMode ? <><X className="w-3.5 h-3.5" />Annuler</> : <><CheckSquare className="w-3.5 h-3.5" />Selectionner</>}
        </button>

        {/* Tout checkbox */}
        {selectMode && count > 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1.5 rounded-lg"
            style={{ background: t.surface.hover, border: `1px solid ${t.surface.borderLight}` }}>
            <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
            <span className="text-[11px] font-medium" style={{ color: t.text.secondary }}>Tout</span>
          </label>
        )}

        {/* Supprimer button */}
        {selectMode && checkedCount > 0 && (
          <>
            <div className="w-px h-5" style={{ background: t.surface.border }} />
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer {checkedCount}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
