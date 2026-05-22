import { Undo2, Redo2, Briefcase, LocateFixed, CheckSquare, X, RotateCcw, Bot } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CheckBox from './CheckBox';

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
  onReset: () => void;
  showToast: boolean;
  allAiEnabled?: boolean;
  onGlobalAiClick?: () => void;
}

export default function CrmWorkModeBarMobile({
  allChecked, someChecked, toggleAll, selectMode, onToggleSelectMode,
  workModeEnabled, onWorkModeToggle,
  onUndo, onRedo, canUndo, canRedo, historyPosition, historyLength, onLocate, canLocate,
  onReset, showToast, allAiEnabled, onGlobalAiClick,
}: Props) {
  const tokens = useThemeTokens();

  return (
    <div className="flex md:hidden flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSelectMode}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
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
          {selectMode ? <><X className="w-3.5 h-3.5" />Annuler</> : <><CheckSquare className="w-3.5 h-3.5" />Select.</>}
        </button>

        {selectMode && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none px-2 py-2 rounded-lg" style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}` }}>
            <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
            <span className="text-[11px] font-medium" style={{ color: tokens.text.secondary }}>Tout</span>
          </label>
        )}

        {onGlobalAiClick && (
          <button
            onClick={onGlobalAiClick}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
            style={allAiEnabled ? {
              background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.3)',
              color: '#06b6d4',
            } : {
              background: tokens.surface.hover,
              border: `1px solid ${tokens.surface.borderLight}`,
              color: tokens.text.secondary,
            }}
          >
            <Bot className="w-3.5 h-3.5" />
            {allAiEnabled ? 'IA : Tous' : 'IA : Aucun'}
          </button>
        )}

        <button
          onClick={onWorkModeToggle}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ml-auto"
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
          <Briefcase className="w-3.5 h-3.5" />
          Travail
        </button>
      </div>

      {workModeEnabled && (
        <div className="flex items-center gap-2 relative">
          <div className="flex items-center rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(249,115,22,0.2)' }}>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-9 h-9 flex items-center justify-center transition-colors disabled:opacity-25"
              style={{ color: '#f97316' }}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <span
              className="text-[12px] font-bold tabular-nums px-2.5 h-9 flex items-center border-x"
              style={{ color: '#f97316', background: 'rgba(249,115,22,0.04)', borderColor: 'rgba(249,115,22,0.15)' }}
            >
              {historyPosition}/{historyLength}
            </span>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="w-9 h-9 flex items-center justify-center transition-colors disabled:opacity-25"
              style={{ color: '#f97316' }}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onLocate}
            disabled={!canLocate}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 flex-shrink-0"
            style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
          >
            <LocateFixed className="w-4 h-4" />
          </button>

          {historyLength > 0 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg transition-all active:scale-95 ml-auto flex-shrink-0"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">Reset</span>
            </button>
          )}

          {showToast && (
            <div
              className="absolute -bottom-7 left-0 z-50 rounded-md px-2.5 py-1 shadow-lg text-[10px] font-medium whitespace-nowrap"
              style={{ background: tokens.card.bg, border: `1px solid ${tokens.surface.border}`, color: '#f97316' }}
            >
              Historique reinitialise
            </div>
          )}
        </div>
      )}
    </div>
  );
}
