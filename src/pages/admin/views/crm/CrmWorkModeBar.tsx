import { Undo2, Redo2, Briefcase, LocateFixed } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CheckBox from './CheckBox';

interface Props {
  allChecked: boolean;
  someChecked: boolean;
  toggleAll: () => void;
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

export default function CrmWorkModeBar({
  allChecked, someChecked, toggleAll, workModeEnabled, onWorkModeToggle,
  onUndo, onRedo, canUndo, canRedo, historyPosition, historyLength, onLocate, canLocate,
}: Props) {
  const tokens = useThemeTokens();

  return (
    <div className="flex items-center gap-3 md:gap-4 px-3 md:px-5 py-2 md:py-2.5 flex-wrap" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
        <span className="text-[11px] font-medium" style={{ color: tokens.text.quaternary }}>Tout</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={workModeEnabled}
          onChange={onWorkModeToggle}
          className="accent-orange-500 w-3.5 h-3.5"
        />
        <Briefcase className="w-3 h-3" style={{ color: workModeEnabled ? '#f97316' : tokens.text.quaternary }} />
        <span className="text-[11px] font-medium" style={{ color: workModeEnabled ? '#f97316' : tokens.text.quaternary }}>Mode travail</span>
      </label>
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
