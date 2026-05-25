import { useState, useEffect } from 'react';
import { Briefcase, LocateFixed, CheckSquare, X, RotateCcw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
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

  const handleReset = () => { onResetHistory(); setShowToast(true); };

  const inactiveBtn: React.CSSProperties = {
    background: t.surface.primary, border: `1px solid ${t.surface.border}`, color: t.text.secondary,
  };
  const inactiveBtnHover: React.CSSProperties = {
    background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary,
  };

  return (
    <div className="px-3 md:px-4 py-2.5 md:py-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-0 py-3 px-2 flex-wrap"
        style={{ background: t.card.bg, borderRadius: 12 }}
      >
        {/* Group 1: Selection */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSelectMode}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold transition-all duration-200"
            style={selectMode ? { background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text } : inactiveBtn}
            onMouseEnter={e => { if (!selectMode) Object.assign(e.currentTarget.style, inactiveBtnHover); }}
            onMouseLeave={e => { if (!selectMode) Object.assign(e.currentTarget.style, inactiveBtn); }}
          >
            {selectMode ? <><X className="w-3.5 h-3.5" />Annuler</> : <><CheckSquare className="w-3.5 h-3.5" />Selectionner</>}
          </button>
          {selectMode && (
            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg cursor-pointer select-none" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <div style={checkboxStyle(allChecked, t.surface.border)} onClick={toggleAll}>
                {(allChecked || someChecked) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-xs font-medium" style={{ color: t.text.secondary }}>Tout</span>
            </label>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-6 mx-3 rounded-full" style={{ background: t.surface.border }} />

        {/* Group 2: Work mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={onWorkModeToggle}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold transition-all duration-200"
            style={workModeEnabled
              ? { background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text, boxShadow: `0 0 12px ${t.accent.bg}` }
              : inactiveBtn
            }
            onMouseEnter={e => { if (!workModeEnabled) Object.assign(e.currentTarget.style, inactiveBtnHover); }}
            onMouseLeave={e => { if (!workModeEnabled) Object.assign(e.currentTarget.style, inactiveBtn); }}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Mode travail
          </button>

          {workModeEnabled && (
            <>
              {/* Navigation controller */}
              <div className="inline-flex items-center h-9 rounded-lg overflow-hidden" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
                <button onClick={onUndo} disabled={!canUndo}
                  className="w-9 h-full flex items-center justify-center transition-all duration-200 disabled:opacity-25"
                  style={{ color: t.accent.text }}
                  onMouseEnter={e => { if (canUndo) e.currentTarget.style.background = t.accent.bgHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="h-full flex items-center px-3 border-x" style={{ borderColor: t.accent.border }}>
                  <span className="text-xs font-bold tabular-nums" style={{ color: t.accent.text }}>{historyPosition} / {historyLength}</span>
                </div>
                <button onClick={onRedo} disabled={!canRedo}
                  className="w-9 h-full flex items-center justify-center transition-all duration-200 disabled:opacity-25"
                  style={{ color: t.accent.text }}
                  onMouseEnter={e => { if (canRedo) e.currentTarget.style.background = t.accent.bgHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Locate - Desktop */}
              <button onClick={onLocateDesktop} disabled={!canLocate}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-25"
                style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
                title="Centrer la ligne"
                onMouseEnter={e => { if (canLocate) e.currentTarget.style.background = t.accent.bgHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.accent.bg; }}
              >
                <LocateFixed className="w-4 h-4" />
              </button>

              {/* Reset */}
              {historyLength > 0 && (
                <button onClick={handleReset}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}
                  title="Reinitialiser le compteur"
                >
                  <RotateCcw className="w-3.5 h-3.5" />Reset
                </button>
              )}
            </>
          )}
        </div>

        {/* Toast */}
        {showToast && (
          <div className="ml-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[10px] font-semibold animate-pulse"
            style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}
          >
            Historique reinitialise
          </div>
        )}
      </div>

      {/* Mobile */}
      <div className="flex md:hidden flex-col gap-2.5" style={{ background: t.card.bg, borderRadius: 12, padding: '10px 12px' }}>
        {/* Row 1: Selection + Work mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSelectMode}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={selectMode ? { background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text } : inactiveBtn}
          >
            {selectMode ? <><X className="w-3.5 h-3.5" />Annuler</> : <><CheckSquare className="w-3.5 h-3.5" />Selectionner</>}
          </button>

          {selectMode && (
            <label className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg cursor-pointer select-none" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <div style={checkboxStyle(allChecked, t.surface.border)} onClick={toggleAll}>
                {(allChecked || someChecked) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-xs font-medium" style={{ color: t.text.secondary }}>Tout</span>
            </label>
          )}

          <button
            onClick={onWorkModeToggle}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95 ml-auto"
            style={workModeEnabled
              ? { background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text, boxShadow: `0 0 12px ${t.accent.bg}` }
              : inactiveBtn
            }
          >
            <Briefcase className="w-3.5 h-3.5" />
            Travail
          </button>
        </div>

        {/* Row 2: Work mode controls */}
        {workModeEnabled && (
          <div className="flex items-center gap-2 relative">
            <div className="inline-flex items-center h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
              <button onClick={onUndo} disabled={!canUndo}
                className="w-9 h-full flex items-center justify-center transition-all disabled:opacity-25"
                style={{ color: t.accent.text }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="h-full flex items-center px-2.5 border-x" style={{ borderColor: t.accent.border }}>
                <span className="text-xs font-bold tabular-nums" style={{ color: t.accent.text }}>{historyPosition} / {historyLength}</span>
              </div>
              <button onClick={onRedo} disabled={!canRedo}
                className="w-9 h-full flex items-center justify-center transition-all disabled:opacity-25"
                style={{ color: t.accent.text }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Locate - Mobile */}
            <button onClick={onLocateMobile} disabled={!canLocate}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 flex-shrink-0"
              style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
            >
              <LocateFixed className="w-4 h-4" />
            </button>

            {historyLength > 0 && (
              <button onClick={handleReset}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95 ml-auto flex-shrink-0"
                style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}
              >
                <RotateCcw className="w-3.5 h-3.5" />Reset
              </button>
            )}

            {showToast && (
              <div className="absolute -bottom-8 left-0 z-50 rounded-full px-3 py-1 shadow-lg text-[10px] font-semibold whitespace-nowrap animate-pulse"
                style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}
              >
                Historique reinitialise
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
