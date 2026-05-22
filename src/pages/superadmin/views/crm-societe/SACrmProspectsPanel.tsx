import { useRef } from 'react';
import { Plus, Trash2, Filter, ChevronDown, X } from 'lucide-react';
import SAProspectsTable from './SAProspectsTable';
import SAProspectMobileCard from './SAProspectMobileCard';
import SACrmWorkModeBar from './SACrmWorkModeBar';
import type { Prospect } from './SAProspectModal';
import type { SAStatut } from './types';
import { getStatutColor } from './types';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface WorkModeState {
  enabled: boolean;
  activeId: string | null;
  select: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyPosition: number;
  historyLength: number;
  resetHistory: () => void;
}

interface Props {
  prospects: Prospect[];
  filteredProspects: Prospect[];
  loadingProspects: boolean;
  saStatuts: SAStatut[];
  filterStatut: string | null;
  selectedProspects: Set<string>;
  selectMode: boolean;
  workMode: WorkModeState;
  allProspectsChecked: boolean;
  someProspectsChecked: boolean;
  canLocate: boolean;
  onToggleProspectSel: (id: string) => void;
  onToggleAllProspects: () => void;
  onToggleSelectMode: () => void;
  onToggleWorkMode: () => void;
  onDeleteProspects: (ids: string[]) => void;
  onAddProspect: () => void;
  onEditProspect: (p: Prospect) => void;
  onDetailProspect: (p: Prospect) => void;
  onStatutClick: (id: string, rect: { top: number; left: number }) => void;
  onFilterToggle: () => void;
  onFilterSelect: (nom: string | null) => void;
  onLocateDesktop: () => void;
  onLocateMobile: () => void;
  filterBtnRef: React.RefObject<HTMLButtonElement>;
  rowRefCallback: (id: string, el: HTMLTableRowElement | null) => void;
  cardRefCallback: (id: string, el: HTMLDivElement | null) => void;
  t: ReturnType<typeof useThemeTokens>;
}

export default function SACrmProspectsPanel({
  prospects, filteredProspects, loadingProspects, saStatuts, filterStatut,
  selectedProspects, selectMode, workMode,
  allProspectsChecked, someProspectsChecked, canLocate,
  onToggleProspectSel, onToggleAllProspects, onToggleSelectMode, onToggleWorkMode,
  onDeleteProspects, onAddProspect, onEditProspect, onDetailProspect,
  onStatutClick, onFilterToggle, onFilterSelect, onLocateDesktop, onLocateMobile,
  filterBtnRef, rowRefCallback, cardRefCallback, t,
}: Props) {
  return (
    <div className="flex-1 min-w-0">
      <div className="rounded-2xl overflow-hidden" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
        {/* Header */}
        <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="text-sm font-bold truncate" style={{ color: t.text.primary }}>Societes prospects</h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>
                {filterStatut ? `${filteredProspects.length} / ${prospects.length}` : prospects.length}
              </span>
            </div>
            <button
              onClick={onAddProspect}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ajouter</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
          <div className="flex items-center">
            <button
              ref={filterBtnRef}
              type="button"
              onClick={onFilterToggle}
              className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-lg text-xs font-medium transition-all w-full sm:w-auto"
              style={{
                background: filterStatut ? `${getStatutColor(filterStatut, saStatuts).color}18` : t.surface.primary,
                border: `1px solid ${filterStatut ? getStatutColor(filterStatut, saStatuts).border : t.surface.border}`,
                color: filterStatut ? getStatutColor(filterStatut, saStatuts).color : t.text.secondary,
              }}
            >
              <Filter className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{filterStatut ?? 'Tous les statuts'}</span>
              {filterStatut ? (
                <span className="ml-auto flex items-center flex-shrink-0" onClick={e => { e.stopPropagation(); onFilterSelect(null); }}>
                  <X className="w-3.5 h-3.5" />
                </span>
              ) : <ChevronDown className="w-3 h-3 ml-auto flex-shrink-0" />}
            </button>
          </div>
        </div>

        {/* Work mode bar */}
        {filteredProspects.length > 0 && (
          <SACrmWorkModeBar
            allChecked={allProspectsChecked} someChecked={someProspectsChecked} toggleAll={onToggleAllProspects}
            selectMode={selectMode} onToggleSelectMode={onToggleSelectMode}
            workModeEnabled={workMode.enabled} onWorkModeToggle={onToggleWorkMode}
            onUndo={workMode.undo} onRedo={workMode.redo} canUndo={workMode.canUndo} canRedo={workMode.canRedo}
            historyPosition={workMode.historyPosition} historyLength={workMode.historyLength}
            onLocateDesktop={onLocateDesktop} onLocateMobile={onLocateMobile}
            canLocate={canLocate} onResetHistory={workMode.resetHistory}
          />
        )}

        {/* Bulk bar */}
        {selectedProspects.size > 0 && (
          <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(239,68,68,0.06)', borderBottom: `1px solid ${t.surface.border}` }}>
            <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
              {selectedProspects.size} selectionne{selectedProspects.size > 1 ? 's' : ''}
            </span>
            <button onClick={() => onDeleteProspects([...selectedProspects])} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
              <Trash2 className="w-3 h-3" />Supprimer
            </button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <SAProspectsTable
            prospects={filteredProspects} loading={loadingProspects} allEmpty={prospects.length === 0}
            selectedProspects={selectedProspects} onToggleSel={onToggleProspectSel} onToggleAll={onToggleAllProspects}
            onEdit={onEditProspect} onDelete={onDeleteProspects} onDetail={onDetailProspect}
            onStatutClick={onStatutClick} onClearFilter={() => onFilterSelect(null)} saStatuts={saStatuts} t={t}
            selectMode={selectMode} workModeEnabled={workMode.enabled} workActiveId={workMode.activeId}
            onWorkSelect={workMode.select} onWorkUndo={workMode.undo} onWorkRedo={workMode.redo}
            canWorkUndo={workMode.canUndo} canWorkRedo={workMode.canRedo}
            workHistoryPosition={workMode.historyPosition} workHistoryLength={workMode.historyLength}
            rowRefCallback={rowRefCallback}
          />
        </div>

        {/* Mobile cards */}
        <div className="md:hidden max-h-[calc(100vh-280px)] overflow-y-auto py-1">
          {loadingProspects ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-12 px-4">
              {prospects.length === 0 ? (
                <p className="text-xs" style={{ color: t.text.tertiary }}>Aucune societe prospect. Cliquez sur "Ajouter" pour commencer.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: t.text.secondary }}>Aucun resultat pour ce statut.</p>
                  <button onClick={() => onFilterSelect(null)} className="text-xs underline transition-colors" style={{ color: '#0ea5e9' }}>Voir toutes les societes</button>
                </div>
              )}
            </div>
          ) : (
            filteredProspects.map(p => (
              <SAProspectMobileCard
                key={p.id} prospect={p} selected={selectedProspects.has(p.id)}
                onToggleSel={() => onToggleProspectSel(p.id)} onDetail={() => onDetailProspect(p)}
                onEdit={() => onEditProspect(p)} onDelete={() => onDeleteProspects([p.id])}
                onStatutClick={onStatutClick} saStatuts={saStatuts} t={t}
                selectMode={selectMode} workModeEnabled={workMode.enabled} isWorkActive={workMode.activeId === p.id}
                onWorkSelect={workMode.select} onWorkUndo={workMode.undo} onWorkRedo={workMode.redo}
                onWorkReset={workMode.resetHistory} canWorkUndo={workMode.canUndo} canWorkRedo={workMode.canRedo}
                workHistoryPosition={workMode.historyPosition} workHistoryLength={workMode.historyLength}
                cardRef={el => cardRefCallback(p.id, el)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
