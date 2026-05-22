import { useState, useEffect } from 'react';
import { Undo2, Redo2, Briefcase, LocateFixed, CheckSquare, X, RotateCcw, Check } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { checkboxStyle } from './types';

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
  onLocateDesktop: () => void;
  onLocateMobile: () => void;
  canLocate: boolean;
  onResetHistory: () => void;
}

export default function SACrmWorkModeBar({
  allChecked, someChecked, toggleAll, selectMode, onToggleSelectMode,
  workModeEnabled, onWorkModeToggle,
  onUndo, onRedo, canUndo, canRedo, historyPosition, historyLength,
  onLocateDesktop, onLocateMobile, canLocate,
  onResetHistory,
}: Props) {
  const t = useThemeTokens();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 1500);
    return () => clearTimeout(timer);
  }, [showToast]);

  const handleReset = () => {
    onResetHistory();
    setShowToast(true);
  };

  const inactiveBtn: React.CSSProperties = {
    background: t.surface.hover,
    border: `1px solid ${t.surface.borderLight}`,
    color: t.text.secondary,
  };

  const activeSelectBtn: React.CSSProperties = {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: '#ef4444',
  };

  const activeWorkBtn: React.CSSProperties = {
    background: 'rgba(249,115,22,0.08)',
    border: '1px solid rgba(249,115,22,0.2)',
    color: '#f97316',
  };

  return (
    <div className="px-3 md:px-4 py-2.5 md:py-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
      {/* ── Desktop ── */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={onToggleSelectMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={selectMode ? activeSelectBtn : inactiveBtn}
        >
          {selectMode ? <><X className="w-3.5 h-3.5" />Annuler</> : <><CheckSquare className="w-3.5 h-3.5" />Selectionner</>}
        </button>

        {selectMode && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1.5 rounded-lg" style={{ background: t.surface.hover, border: `1px solid ${t.surface.borderLight}` }}>
            <div style={checkboxStyle(allChecked, t.surface.border)} onClick={toggleAll}>
              {(allChecked || someChecked) && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="text-[11px] font-medium" style={{ color: t.text.secondary }}>Tout</span>
          </label>
        )}

        <div className="w-px h-5 mx-0.5" style={{ background: t.surface.border }} />

        <button
          onClick={onWorkModeToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={workModeEnabled ? activeWorkBtn : inactiveBtn}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Mode travail
        </button>

        {workModeEnabled && (
          <HistoryControls
            onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo}
            historyPosition={historyPosition} historyLength={historyLength}
            onLocate={onLocateDesktop} canLocate={canLocate}
            onReset={handleReset} showToast={showToast} t={t}
            size="sm"
          />
        )}
      </div>

      {/* ── Mobile ── */}
      <div className="flex md:hidden flex-col gap-2.5">
        {/* Row 1: Select + Work mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSelectMode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
            style={selectMode ? activeSelectBtn : inactiveBtn}
          >
            {selectMode ? <><X className="w-3.5 h-3.5" />Annuler</> : <><CheckSquare className="w-3.5 h-3.5" />Selectionner</>}
          </button>

          {selectMode && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-2 rounded-lg" style={{ background: t.surface.hover, border: `1px solid ${t.surface.borderLight}` }}>
              <div style={checkboxStyle(allChecked, t.surface.border)} onClick={toggleAll}>
                {(allChecked || someChecked) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-[11px] font-medium" style={{ color: t.text.secondary }}>Tout</span>
            </label>
          )}

          <button
            onClick={onWorkModeToggle}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ml-auto"
            style={workModeEnabled ? activeWorkBtn : inactiveBtn}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Travail
          </button>
        </div>

        {/* Row 2: History controls (when work mode is active) */}
        {workModeEnabled && (
          <HistoryControls
            onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo}
            historyPosition={historyPosition} historyLength={historyLength}
            onLocate={onLocateMobile} canLocate={canLocate}
            onReset={handleReset} showToast={showToast} t={t}
            size="lg"
          />
        )}
      </div>
    </div>
  );
}

/* ── Shared history controls strip ── */

function HistoryControls({ onUndo, onRedo, canUndo, canRedo, historyPosition, historyLength, onLocate, canLocate, onReset, showToast, t, size }: {
  onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean;
  historyPosition: number; historyLength: number;
  onLocate: () => void; canLocate: boolean;
  onReset: () => void; showToast: boolean;
  t: ReturnType<typeof useThemeTokens>;
  size: 'sm' | 'lg';
}) {
  const btnSz = size === 'lg' ? 'w-9 h-9' : 'w-7 h-7';
  const iconSz = size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const counterTxt = size === 'lg' ? 'text-[12px]' : 'text-[11px]';
  const counterPx = size === 'lg' ? 'px-3' : 'px-2';

  return (
    <div className="flex items-center gap-2 relative">
      <div
        className="flex items-center rounded-lg overflow-hidden flex-shrink-0"
        style={{ border: '1px solid rgba(249,115,22,0.2)' }}
      >
        <button
          onClick={onUndo} disabled={!canUndo}
          className={`${btnSz} flex items-center justify-center transition-colors disabled:opacity-25`}
          style={{ color: '#f97316' }}
        >
          <Undo2 className={iconSz} />
        </button>
        <span
          className={`${counterTxt} font-bold tabular-nums ${counterPx} ${size === 'lg' ? 'h-9' : 'h-7'} flex items-center border-x`}
          style={{ color: '#f97316', background: 'rgba(249,115,22,0.04)', borderColor: 'rgba(249,115,22,0.15)' }}
        >
          {historyPosition}/{historyLength}
        </span>
        <button
          onClick={onRedo} disabled={!canRedo}
          className={`${btnSz} flex items-center justify-center transition-colors disabled:opacity-25`}
          style={{ color: '#f97316' }}
        >
          <Redo2 className={iconSz} />
        </button>
      </div>

      <button
        onClick={onLocate} disabled={!canLocate}
        className={`${btnSz} rounded-lg flex items-center justify-center transition-all disabled:opacity-25 flex-shrink-0`}
        style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
      >
        <LocateFixed className={iconSz} />
      </button>

      {historyLength > 0 && (
        <button
          onClick={onReset}
          className={`flex items-center gap-1.5 ${size === 'lg' ? 'h-9 px-3' : 'h-7 px-2.5'} rounded-lg transition-all active:scale-95 ml-auto flex-shrink-0`}
          style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
          title="Reinitialiser le compteur"
        >
          <RotateCcw className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
          <span className={`${size === 'lg' ? 'text-[11px]' : 'text-[10px]'} font-semibold`}>Reset</span>
        </button>
      )}

      {showToast && (
        <div
          className="absolute -bottom-8 left-0 z-50 rounded-md px-2.5 py-1 shadow-lg text-[10px] font-medium whitespace-nowrap"
          style={{ background: t.card.bg, border: `1px solid ${t.surface.border}`, color: '#f97316' }}
        >
          Historique reinitialise
        </div>
      )}
    </div>
  );
}
