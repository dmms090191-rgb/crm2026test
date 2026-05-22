import { useState, useEffect } from 'react';
import { Undo2, Redo2, Briefcase, LocateFixed, CheckSquare, X, RotateCcw, Bot } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CheckBox from './CheckBox';
import CrmWorkModeBarMobile from './CrmWorkModeBarMobile';

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
  onResetHistory: () => void;
  allAiEnabled?: boolean;
  onGlobalAiToggle?: (enabled: boolean) => Promise<void>;
}

export default function CrmWorkModeBar({
  allChecked, someChecked, toggleAll, selectMode, onToggleSelectMode,
  workModeEnabled, onWorkModeToggle,
  onUndo, onRedo, canUndo, canRedo, historyPosition, historyLength, onLocate, canLocate,
  onResetHistory, allAiEnabled, onGlobalAiToggle,
}: Props) {
  const tokens = useThemeTokens();
  const [showToast, setShowToast] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 1500);
    return () => clearTimeout(t);
  }, [showToast]);

  useEffect(() => {
    if (!aiSuccessMsg) return;
    const t = setTimeout(() => setAiSuccessMsg(null), 2500);
    return () => clearTimeout(t);
  }, [aiSuccessMsg]);

  const handleReset = () => {
    onResetHistory();
    setShowToast(true);
  };

  const handleGlobalAiClick = async () => {
    if (!onGlobalAiToggle) return;
    const newState = !allAiEnabled;
    await onGlobalAiToggle(newState);
    setAiSuccessMsg(newState ? 'IA activee pour tous' : 'IA desactivee pour tous');
  };

  return (
    <div className="px-3 md:px-5 py-2.5 md:py-3 space-y-2 md:space-y-0" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={onToggleSelectMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
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
          {selectMode ? <><X className="w-3.5 h-3.5" />Annuler</> : <><CheckSquare className="w-3.5 h-3.5" />Selectionner</>}
        </button>

        {selectMode && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1.5 rounded-lg" style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}` }}>
            <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
            <span className="text-[11px] font-medium" style={{ color: tokens.text.secondary }}>Tout</span>
          </label>
        )}

        <div className="w-px h-5 mx-0.5" style={{ background: tokens.surface.border }} />

        {onGlobalAiToggle && (
          <button
            onClick={handleGlobalAiClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
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

        {aiSuccessMsg && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold animate-pulse"
            style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}
          >
            <Bot className="w-3 h-3" />
            {aiSuccessMsg}
          </div>
        )}

        <div className="w-px h-5 mx-0.5" style={{ background: tokens.surface.border }} />

        <button
          onClick={onWorkModeToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
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
          Mode travail
        </button>

        {workModeEnabled && (
          <div className="flex items-center gap-2 ml-1 relative">
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid rgba(249,115,22,0.2)' }}>
              <button onClick={onUndo} disabled={!canUndo} className="w-7 h-7 flex items-center justify-center transition-colors disabled:opacity-25 hover:bg-orange-50" style={{ color: '#f97316' }}>
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold tabular-nums px-2 h-7 flex items-center border-x" style={{ color: '#f97316', background: 'rgba(249,115,22,0.04)', borderColor: 'rgba(249,115,22,0.15)' }}>
                {historyPosition}/{historyLength}
              </span>
              <button onClick={onRedo} disabled={!canRedo} className="w-7 h-7 flex items-center justify-center transition-colors disabled:opacity-25 hover:bg-orange-50" style={{ color: '#f97316' }}>
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button onClick={onLocate} disabled={!canLocate} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 hover:scale-105" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}>
              <LocateFixed className="w-3.5 h-3.5" />
            </button>

            {historyLength > 0 && (
              <button onClick={handleReset} className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg transition-all hover:scale-[1.02] active:scale-95" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }} title="Reinitialiser le compteur">
                <RotateCcw className="w-3 h-3" />
                <span className="text-[10px] font-semibold">Reset</span>
              </button>
            )}

            {showToast && (
              <div className="absolute -bottom-8 left-0 z-50 rounded-md px-2.5 py-1 shadow-lg text-[10px] font-medium whitespace-nowrap" style={{ background: tokens.card.bg, border: `1px solid ${tokens.surface.border}`, color: '#f97316' }}>
                Historique reinitialise
              </div>
            )}
          </div>
        )}
      </div>

      <CrmWorkModeBarMobile
        allChecked={allChecked} someChecked={someChecked} toggleAll={toggleAll}
        selectMode={selectMode} onToggleSelectMode={onToggleSelectMode}
        workModeEnabled={workModeEnabled} onWorkModeToggle={onWorkModeToggle}
        onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo}
        historyPosition={historyPosition} historyLength={historyLength}
        onLocate={onLocate} canLocate={canLocate}
        onReset={handleReset} showToast={showToast}
        allAiEnabled={allAiEnabled}
        onGlobalAiClick={onGlobalAiToggle ? handleGlobalAiClick : undefined}
      />
    </div>
  );
}
