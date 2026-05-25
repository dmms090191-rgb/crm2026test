import { Briefcase, LocateFixed, CheckSquare, X, RotateCcw, Bot, ChevronLeft, ChevronRight, Columns3, SlidersHorizontal } from 'lucide-react';
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
  onOpenColumns: () => void;
  onOpenOrganize: () => void;
}

export default function CrmWorkModeBarMobile({
  allChecked, someChecked, toggleAll, selectMode, onToggleSelectMode,
  workModeEnabled, onWorkModeToggle,
  onUndo, onRedo, canUndo, canRedo, historyPosition, historyLength, onLocate, canLocate,
  onReset, showToast, allAiEnabled, onGlobalAiClick,
  onOpenColumns, onOpenOrganize,
}: Props) {
  const t = useThemeTokens();

  const inactiveBtn: React.CSSProperties = {
    background: t.surface.primary, border: `1px solid ${t.surface.border}`, color: t.text.secondary,
  };

  return (
    <div className="flex md:hidden flex-col gap-2.5" style={{ background: t.card.bg, borderRadius: 12, padding: '10px 12px' }}>
      {/* Row 1: Selection + IA + Work mode */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onToggleSelectMode}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={selectMode ? { background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text } : inactiveBtn}
        >
          {selectMode ? <><X className="w-3.5 h-3.5" />Annuler</> : <><CheckSquare className="w-3.5 h-3.5" />Select.</>}
        </button>

        {selectMode && (
          <label className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg cursor-pointer select-none" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
            <span className="text-xs font-medium" style={{ color: t.text.secondary }}>Tout</span>
          </label>
        )}

        {onGlobalAiClick && (
          <button
            onClick={onGlobalAiClick}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={allAiEnabled
              ? { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.22)', color: '#3b82f6' }
              : inactiveBtn
            }
          >
            <Bot className="w-3.5 h-3.5" />
            {allAiEnabled ? 'IA' : 'IA'}
          </button>
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
          {/* Navigation controller */}
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

          {/* Locate */}
          <button onClick={onLocate} disabled={!canLocate}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 flex-shrink-0"
            style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
          >
            <LocateFixed className="w-4 h-4" />
          </button>

          {/* Reset */}
          {historyLength > 0 && (
            <button onClick={onReset}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95 ml-auto flex-shrink-0"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}
            >
              <RotateCcw className="w-3.5 h-3.5" />Reset
            </button>
          )}

          {/* Toast */}
          {showToast && (
            <div className="absolute -bottom-8 left-0 z-50 rounded-full px-3 py-1 shadow-lg text-[10px] font-semibold whitespace-nowrap animate-pulse"
              style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}
            >
              Historique reinitialise
            </div>
          )}
        </div>
      )}

      {/* Row 3: Colonnes + Organiser */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenColumns}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={inactiveBtn}
        >
          <Columns3 className="w-3.5 h-3.5" />Colonnes
        </button>
        <button
          onClick={onOpenOrganize}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={inactiveBtn}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />Organiser
        </button>
      </div>
    </div>
  );
}
