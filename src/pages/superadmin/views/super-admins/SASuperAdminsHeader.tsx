import { ShieldPlus, RefreshCw, CheckSquare, Trash2, X } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  total: number;
  shownCount: number;
  loading: boolean;
  selectMode: boolean;
  selectedCount: number;
  tokens: ThemeTokens;
  onRefresh: () => void;
  onDelete: () => void;
  onToggleSelectMode: () => void;
  onCreate: () => void;
}

/** Titre, compteur et barre d'actions de la liste des groupes. Aucun etat propre. */
export default function SASuperAdminsHeader({
  total, shownCount, loading, selectMode, selectedCount,
  tokens: t, onRefresh, onDelete, onToggleSelectMode, onCreate,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-base sm:text-lg font-bold truncate" style={{ color: t.text.primary }}>
          Liste des groupes
        </h1>
        {total > 0 && (
          <span className="flex-shrink-0 min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            {shownCount === total ? total : `${shownCount} / ${total}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onRefresh} disabled={loading} className="p-2 rounded-lg transition-colors" style={{ background: t.surface.hover, color: t.text.tertiary }} title="Actualiser">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        {selectMode && selectedCount > 0 && (
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
          >
            <Trash2 className="w-4 h-4" />
            Supprimer ({selectedCount})
          </button>
        )}
        {total > 0 && (
          <button
            onClick={onToggleSelectMode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: selectMode ? 'rgba(239,68,68,0.1)' : t.surface.hover,
              border: `1px solid ${selectMode ? 'rgba(239,68,68,0.25)' : t.surface.border}`,
              color: selectMode ? '#ef4444' : t.text.secondary,
            }}
          >
            {selectMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
            <span className="hidden sm:inline">{selectMode ? 'Annuler' : 'Sélectionner'}</span>
          </button>
        )}
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
        >
          <ShieldPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Créer un groupe</span>
          <span className="sm:hidden">Creer</span>
        </button>
      </div>
    </div>
  );
}
