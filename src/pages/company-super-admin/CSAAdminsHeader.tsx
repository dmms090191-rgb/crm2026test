import { Users, RefreshCw, Plus, CheckSquare, Trash2, X } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface Props {
  total: number;
  shownCount: number;
  loading: boolean;
  selectMode: boolean;
  selectedCount: number;
  t: ThemeTokens;
  setDeleteOpen: (v: boolean) => void;
  onToggleSelectMode: () => void;
  setShowCreate: (v: boolean) => void;
  fetchAdmins: () => void;
}

/** En-tete et barre d'actions de « Gestion des societes ». Aucun etat propre. */
export default function CSAAdminsHeader({
  total, shownCount, loading, selectMode, selectedCount, t,
  setDeleteOpen, onToggleSelectMode, setShowCreate, fetchAdmins,
}: Props) {
  return (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: t.text.primary }}>Gestion des sociétés</h2>
          <p className="text-xs mt-0.5" style={{ color: t.text.tertiary }}>
            {shownCount === total ? total : `${shownCount} / ${total}`} société{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode && selectedCount > 0 && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer ({selectedCount})
            </button>
          )}
          {total > 0 && (
            <button
              onClick={onToggleSelectMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{
                background: selectMode ? 'rgba(239,68,68,0.1)' : t.surface.hover,
                border: `1px solid ${selectMode ? 'rgba(239,68,68,0.25)' : t.surface.border}`,
                color: selectMode ? '#ef4444' : t.text.secondary,
              }}
            >
              {selectMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{selectMode ? 'Annuler' : 'Sélectionner'}</span>
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 8px rgba(245,158,11,0.35)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter une société
          </button>
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, boxShadow: `0 0 16px ${t.accent.border}` }}>
            <Users className="w-4 h-4" style={{ color: t.accent.text }} />
          </div>
        </div>
      </div>
  );
}
