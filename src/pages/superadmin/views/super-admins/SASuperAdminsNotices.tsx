import { AlertCircle, RotateCcw } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  error: string;
  openJobs: { id: string; group_label: string | null }[];
  resuming: boolean;
  onResume: () => void;
  selectMode: boolean;
  shownCount: number;
  totalCount: number;
  allShownSelected: boolean;
  selectedCount: number;
  onToggleAllShown: () => void;
  tokens: ThemeTokens;
}

/**
 * Bandeaux au-dessus de la liste : erreur, nettoyages de suppression
 * incomplets, et barre « Tout selectionner » du mode selection.
 */
export default function SASuperAdminsNotices({
  error, openJobs, resuming, onResume,
  selectMode, shownCount, totalCount, allShownSelected, selectedCount, onToggleAllShown,
  tokens: t,
}: Props) {
  return (
    <>
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      {openJobs.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl mb-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <p className="text-xs truncate" style={{ color: '#f59e0b' }}>
              {openJobs.length} nettoyage{openJobs.length > 1 ? 's' : ''} incomplet{openJobs.length > 1 ? 's' : ''}
              {' · '}{openJobs.map(j => j.group_label || j.id.slice(0, 8)).join(', ')}
            </p>
          </div>
          <button
            onClick={onResume}
            disabled={resuming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex-shrink-0 disabled:opacity-50"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resuming ? 'animate-spin' : ''}`} />
            Reprendre le nettoyage
          </button>
        </div>
      )}

      {selectMode && shownCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
          style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
          <input
            type="checkbox"
            checked={allShownSelected}
            onChange={onToggleAllShown}
            className="w-4 h-4 cursor-pointer accent-red-500"
          />
          <span className="text-xs" style={{ color: t.text.secondary }}>
            Tout sélectionner{shownCount !== totalCount ? ` (${shownCount} affichés)` : ''}
          </span>
          {selectedCount > 0 && (
            <span className="text-xs font-semibold ml-auto" style={{ color: '#ef4444' }}>
              {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </>
  );
}
