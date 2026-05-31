import { Loader2, Check, X, Trash2, CheckSquare, GripVertical } from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import type { SavedLogo } from './logoAiTypes';

interface SelectionBarProps {
  t: ReturnType<typeof useThemeTokens>;
  filteredSaved: SavedLogo[];
  checkedIds: Set<string>;
  setCheckedIds: (ids: Set<string>) => void;
  confirmBulkDelete: boolean;
  setConfirmBulkDelete: (v: boolean) => void;
  bulkDeleting: boolean;
  handleBulkDeleteGallery: () => void;
  exitSelectionMode: () => void;
  compact?: boolean;
}

export function SelectionActionBar({
  t, filteredSaved, checkedIds, setCheckedIds, confirmBulkDelete, setConfirmBulkDelete,
  bulkDeleting, handleBulkDeleteGallery, exitSelectionMode, compact,
}: SelectionBarProps) {
  return (
    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
      <button onClick={() => {
        if (checkedIds.size === filteredSaved.length) setCheckedIds(new Set());
        else setCheckedIds(new Set(filteredSaved.map(l => l.id)));
        setConfirmBulkDelete(false);
      }}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all"
        style={{
          background: checkedIds.size === filteredSaved.length ? 'rgba(14,165,233,0.08)' : t.surface.secondary,
          border: `1px solid ${checkedIds.size === filteredSaved.length ? 'rgba(14,165,233,0.2)' : t.surface.border}`,
          color: checkedIds.size === filteredSaved.length ? '#0284c7' : t.text.tertiary,
        }}>
        <CheckSquare className="w-3 h-3" />
        {compact
          ? (checkedIds.size === filteredSaved.length ? 'Decocher' : 'Tout')
          : (checkedIds.size === filteredSaved.length ? 'Tout decocher' : 'Tout selectionner')}
      </button>
      {checkedIds.size > 0 && (
        <>
          <span className="text-[8px] font-bold px-2 py-1 rounded-full"
            style={{ background: 'rgba(14,165,233,0.06)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.12)' }}>
            {checkedIds.size}{!compact && ` selectionne${checkedIds.size > 1 ? 's' : ''}`}
          </span>
          {!confirmBulkDelete ? (
            <button onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkDeleting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          ) : (
            <button onClick={handleBulkDeleteGallery}
              disabled={bulkDeleting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-50"
              style={{ background: '#ef4444', color: '#fff', boxShadow: '0 2px 8px rgba(239,68,68,0.25)' }}>
              {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Confirmer
            </button>
          )}
        </>
      )}
      <button onClick={exitSelectionMode}
        className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all"
        style={{ border: `1px solid ${t.surface.border}`, color: t.text.quaternary }}>
        <X className="w-2.5 h-2.5" />{!compact && ' Quitter'}
      </button>
    </div>
  );
}

interface ReorderBarProps {
  t: ReturnType<typeof useThemeTokens>;
  savingOrder: boolean;
  saveReorder: () => void;
  cancelReorder: () => void;
  compact?: boolean;
}

export function ReorderActionBar({ t, savingOrder, saveReorder, cancelReorder, compact }: ReorderBarProps) {
  return (
    <div className="flex items-center gap-1.5 mb-2 rounded-lg px-3 py-2"
      style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
      <GripVertical className="w-3 h-3 flex-shrink-0" style={{ color: '#d97706' }} />
      <span className="text-[9px] font-medium flex-1" style={{ color: '#d97706' }}>
        {compact ? 'Reorganisez les logos.' : 'Glissez-deposez les logos pour les reorganiser.'}
      </span>
      <button onClick={saveReorder}
        disabled={savingOrder}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-50 hover:brightness-110"
        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', boxShadow: '0 2px 8px rgba(22,163,106,0.2)' }}>
        {savingOrder ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        Valider
      </button>
      <button onClick={cancelReorder}
        disabled={savingOrder}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-50"
        style={{ border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}>
        <X className="w-2.5 h-2.5" />{!compact && ' Annuler'}
      </button>
    </div>
  );
}
