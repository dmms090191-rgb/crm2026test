import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Briefcase, LocateFixed, CheckSquare, X, RotateCcw, ChevronLeft, ChevronRight, Columns3, SlidersHorizontal, Lock } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CheckBox from '../../../admin/views/crm/CheckBox';
import VendorLeadWorkModeBarMobile from './VendorLeadWorkModeBarMobile';

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
  onOpenColumns: () => void;
  onOpenOrganize: () => void;
  toolbarOrder: string[];
  columnsLocked?: boolean;
}

type ToolId = 'select' | 'workmode' | 'columns' | 'organize';

export default function VendorLeadWorkModeBar({
  allChecked, someChecked, toggleAll, selectMode, onToggleSelectMode,
  workModeEnabled, onWorkModeToggle,
  onUndo, onRedo, canUndo, canRedo, historyPosition, historyLength, onLocate, canLocate,
  onResetHistory, onOpenColumns, onOpenOrganize, toolbarOrder, columnsLocked,
}: Props) {
  const t = useThemeTokens();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const id = setTimeout(() => setShowToast(false), 1500);
    return () => clearTimeout(id);
  }, [showToast]);

  const handleReset = () => { onResetHistory(); setShowToast(true); };

  const inactiveBtn: React.CSSProperties = {
    background: t.surface.primary, border: `1px solid ${t.surface.border}`, color: t.text.secondary,
  };
  const inactiveBtnHover: React.CSSProperties = {
    background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary,
  };

  const toolRenderers: Record<ToolId, () => ReactNode> = useMemo(() => ({
    select: () => (
      <div key="select" className="flex items-center gap-2">
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
            <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
            <span className="text-xs font-medium" style={{ color: t.text.secondary }}>Tout</span>
          </label>
        )}
      </div>
    ),

    workmode: () => (
      <div key="workmode" className="flex items-center gap-2">
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
          <Briefcase className="w-3.5 h-3.5" />Mode travail
        </button>
        {workModeEnabled && (
          <>
            <div className="inline-flex items-center h-9 rounded-lg overflow-hidden" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
              <button onClick={onUndo} disabled={!canUndo} className="w-9 h-full flex items-center justify-center transition-all duration-200 disabled:opacity-25" style={{ color: t.accent.text }} onMouseEnter={e => { if (canUndo) e.currentTarget.style.background = t.accent.bgHover; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="h-full flex items-center px-3 border-x" style={{ borderColor: t.accent.border }}>
                <span className="text-xs font-bold tabular-nums" style={{ color: t.accent.text }}>{historyPosition} / {historyLength}</span>
              </div>
              <button onClick={onRedo} disabled={!canRedo} className="w-9 h-full flex items-center justify-center transition-all duration-200 disabled:opacity-25" style={{ color: t.accent.text }} onMouseEnter={e => { if (canRedo) e.currentTarget.style.background = t.accent.bgHover; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button onClick={onLocate} disabled={!canLocate} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-25" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }} title="Centrer la ligne" onMouseEnter={e => { if (canLocate) e.currentTarget.style.background = t.accent.bgHover; }} onMouseLeave={e => { e.currentTarget.style.background = t.accent.bg; }}>
              <LocateFixed className="w-4 h-4" />
            </button>
            {historyLength > 0 && (
              <button onClick={handleReset} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold transition-all duration-200" style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }} title="Reinitialiser le compteur">
                <RotateCcw className="w-3.5 h-3.5" />Reset
              </button>
            )}
          </>
        )}
      </div>
    ),

    columns: () => columnsLocked ? (
      <div key="columns" className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.quaternary, opacity: 0.6 }} title="Votre admin a verrouille la personnalisation des colonnes.">
        <Lock className="w-3.5 h-3.5" />Colonnes
      </div>
    ) : (
      <button key="columns" onClick={onOpenColumns} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold transition-all duration-200" style={inactiveBtn} onMouseEnter={e => Object.assign(e.currentTarget.style, inactiveBtnHover)} onMouseLeave={e => Object.assign(e.currentTarget.style, inactiveBtn)}>
        <Columns3 className="w-3.5 h-3.5" />Colonnes
      </button>
    ),

    organize: () => (
      <button key="organize" onClick={onOpenOrganize} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold transition-all duration-200" style={inactiveBtn} onMouseEnter={e => Object.assign(e.currentTarget.style, inactiveBtnHover)} onMouseLeave={e => Object.assign(e.currentTarget.style, inactiveBtn)}>
        <SlidersHorizontal className="w-3.5 h-3.5" />Organiser
      </button>
    ),
  }), [
    selectMode, allChecked, someChecked, toggleAll, onToggleSelectMode,
    workModeEnabled, onWorkModeToggle, canUndo, canRedo, historyPosition, historyLength, canLocate,
    onUndo, onRedo, onLocate, onResetHistory,
    onOpenColumns, onOpenOrganize, columnsLocked, t,
  ]);

  const orderedTools = toolbarOrder.filter(id => id in toolRenderers) as ToolId[];

  return (
    <div className="px-3 md:px-4 py-2.5 md:py-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-0 py-3 px-2 flex-wrap" style={{ background: t.card.bg, borderRadius: 12 }}>
        {orderedTools.map((id, idx) => {
          const node = toolRenderers[id]();
          if (!node) return null;
          return (
            <div key={id} className="flex items-center">
              {idx > 0 && <div className="w-px h-6 mx-3 rounded-full" style={{ background: t.surface.border }} />}
              {node}
            </div>
          );
        })}
        {showToast && (
          <div className="ml-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[10px] font-semibold animate-pulse" style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}>
            Historique reinitialise
          </div>
        )}
      </div>

      {/* Mobile */}
      <VendorLeadWorkModeBarMobile
        allChecked={allChecked} someChecked={someChecked} toggleAll={toggleAll}
        selectMode={selectMode} onToggleSelectMode={onToggleSelectMode}
        workModeEnabled={workModeEnabled} onWorkModeToggle={onWorkModeToggle}
        onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo}
        historyPosition={historyPosition} historyLength={historyLength}
        onLocate={onLocate} canLocate={canLocate} onReset={handleReset}
        onOpenColumns={onOpenColumns} onOpenOrganize={onOpenOrganize}
        columnsLocked={columnsLocked} showToast={showToast} inactiveBtn={inactiveBtn} t={t}
      />

      {columnsLocked && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mt-2 md:mt-0 md:mb-2 md:mx-2"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ef4444' }} />
          <span className="text-[11px] font-medium" style={{ color: '#ef4444' }}>
            Votre admin a verrouille la personnalisation des colonnes.
          </span>
        </div>
      )}
    </div>
  );
}
