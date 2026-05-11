import { Undo2, Redo2, Briefcase, LocateFixed, CheckSquare, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CheckBox from '../../../admin/views/crm/CheckBox';

interface Props {
  allChecked: boolean;
  someChecked: boolean;
  toggleAll: () => void;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  workModeEnabled: boolean;
  onWorkModeToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyPosition: number;
  historyLength: number;
  onLocate: () => void;
  canLocate: boolean;
}

export default function VendorLeadWorkModeBar({
  allChecked, someChecked, toggleAll, selectMode, onToggleSelectMode,
  workModeEnabled, onWorkModeToggle,
  onUndo, onRedo, canUndo, canRedo, historyPosition, historyLength, onLocate, canLocate,
}: Props) {
  const tokens = useThemeTokens();

  return (
    <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 flex-wrap" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>
      <button
        onClick={onToggleSelectMode}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
        style={selectMode ? {
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444',
        } : {
          background: tokens.surface.hover,
          border: `1px solid ${tokens.surface.borderLight}`,
          color: tokens.text.secondary,
        }}
      >
        {selectMode ? <><X className="w-3 h-3" />Annuler</> : <><CheckSquare className="w-3 h-3" />Selectionner</>}
      </button>

      {selectMode && (
        <label className="flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded-lg" style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}` }}>
          <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
          <span className="text-[11px] font-medium" style={{ color: tokens.text.secondary }}>Tout selectionner</span>
        </label>
      )}

      <button
        onClick={onWorkModeToggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
        style={workModeEnabled ? {
          background: 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.2)',
          color: '#f97316',
        } : {
          background: tokens.surface.hover,
          border: `1px solid ${tokens.surface.borderLight}`,
          color: tokens.text.secondary,
        }}
      >
        <Briefcase className="w-3 h-3" />
        Mode travail
      </button>

      {workModeEnabled && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
          >
            <Undo2 className="w-3 h-3" />
          </button>
          {historyLength > 0 && (
            <span className="text-[10px] font-semibold tabular-nums min-w-[28px] text-center" style={{ color: '#f97316' }}>
              {historyPosition}/{historyLength}
            </span>
          )}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
          >
            <Redo2 className="w-3 h-3" />
          </button>
          <button
            onClick={onLocate}
            disabled={!canLocate}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
          >
            <LocateFixed className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
