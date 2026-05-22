import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Filter, ChevronDown, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useWorkMode } from '../../../../hooks/useWorkMode';
import SAArgumentaireModal from './SAArgumentaireModal';
import SAProspectModal, { type Prospect } from './SAProspectModal';
import SAArgumentaireFloatingWindow from './SAArgumentaireFloatingWindow';
import SAArgumentairesPanel from './SAArgumentairesPanel';
import SAProspectsTable from './SAProspectsTable';
import SAProspectMobileCard from './SAProspectMobileCard';
import SAStatutFilterDropdown from './SAStatutFilterDropdown';
import SAStatutRowDropdown from './SAStatutRowDropdown';
import SASocieteDetailModal from './SASocieteDetailModal';
import SACrmWorkModeBar from './SACrmWorkModeBar';
import useCrmSocieteData from './useCrmSocieteData';
import type { Argumentaire } from './types';
import { getStatutColor } from './types';

export default function SACrmSociete() {
  const t = useThemeTokens();
  const {
    args, prospects, saStatuts, loadingArgs, loadingProspects,
    filteredProspects, filterStatut, setFilterStatut,
    saveArg, deleteArgs,
    saveProspect, deleteProspects, updateProspectStatut,
  } = useCrmSocieteData();

  const workMode = useWorkMode('sa_crm_societe_workmode');

  const [argModal, setArgModal] = useState<{ open: boolean; existing?: Argumentaire | null }>({ open: false });
  const [prospectModal, setProspectModal] = useState<{ open: boolean; existing?: Prospect | null }>({ open: false });
  const [selectedArgs, setSelectedArgs] = useState<Set<string>>(new Set());
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [floatingArg, setFloatingArg] = useState<Argumentaire | null>(null);
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);

  const [selectMode, setSelectMode] = useState(false);

  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filterDropdownRect, setFilterDropdownRect] = useState<{ top: number; right: number } | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const [statutDropdownId, setStatutDropdownId] = useState<string | null>(null);
  const [statutDropdownRect, setStatutDropdownRect] = useState<{ top: number; left: number } | null>(null);

  const rowRefsMap = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Selection helpers ──
  const toggleArgSel = (id: string) => setSelectedArgs(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAllArgs = () => setSelectedArgs(prev => prev.size === args.length ? new Set() : new Set(args.map(a => a.id)));

  const toggleProspectSel = (id: string) => setSelectedProspects(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAllProspects = () => setSelectedProspects(prev =>
    prev.size === filteredProspects.length && filteredProspects.length > 0
      ? new Set()
      : new Set(filteredProspects.map(p => p.id))
  );

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) {
        setSelectedProspects(new Set());
      } else {
        workMode.deactivate();
      }
      return !prev;
    });
  }, [workMode]);

  const handleToggleWorkMode = useCallback(() => {
    if (workMode.enabled) {
      workMode.deactivate();
    } else {
      workMode.activate();
      setSelectMode(false);
      setSelectedProspects(new Set());
    }
  }, [workMode]);

  const handleDeleteArgs = async (ids: string[]) => {
    await deleteArgs(ids);
    setSelectedArgs(new Set());
  };

  const handleDeleteProspects = async (ids: string[]) => {
    await deleteProspects(ids);
    setSelectedProspects(new Set());
  };

  const handleSaveArg = async (title: string, content: string) => {
    await saveArg(title, content, argModal.existing?.id);
    setArgModal({ open: false });
  };

  const handleSaveProspect = async (data: Omit<Prospect, 'id' | 'created_at'>) => {
    await saveProspect(data, prospectModal.existing?.id);
    setProspectModal({ open: false });
  };

  const handleStatutClick = (id: string, rect: { top: number; left: number }) => {
    if (statutDropdownId === id) {
      setStatutDropdownId(null);
      setStatutDropdownRect(null);
    } else {
      setStatutDropdownRect(rect);
      setStatutDropdownId(id);
    }
  };

  const handleStatutSelect = async (nom: string) => {
    if (!statutDropdownId) return;
    await updateProspectStatut(statutDropdownId, nom);
    setStatutDropdownId(null);
    setStatutDropdownRect(null);
  };

  const closeStatutDropdown = () => { setStatutDropdownId(null); setStatutDropdownRect(null); };

  const handleFilterToggle = () => {
    if (filterDropdownOpen) {
      setFilterDropdownOpen(false);
      setFilterDropdownRect(null);
    } else {
      const rect = filterBtnRef.current?.getBoundingClientRect();
      if (rect) setFilterDropdownRect({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      setFilterDropdownOpen(true);
    }
  };

  const handleFilterSelect = (nom: string | null) => {
    setFilterStatut(nom);
    setFilterDropdownOpen(false);
    setFilterDropdownRect(null);
  };

  const handleLocateDesktop = () => {
    if (workMode.activeId) rowRefsMap.current.get(workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handleLocateMobile = () => {
    if (workMode.activeId) cardRefsMap.current.get(workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const canLocate = !!workMode.activeId && filteredProspects.some(p => p.id === workMode.activeId);

  const allProspectsChecked = selectedProspects.size === filteredProspects.length && filteredProspects.length > 0;
  const someProspectsChecked = selectedProspects.size > 0 && !allProspectsChecked;

  const activeProspect = statutDropdownId ? prospects.find(p => p.id === statutDropdownId) : null;

  return (
    <div className="p-4 md:p-6 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: t.text.primary }}>CRM Societe</h1>
        <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>Prospection manuelle de societes</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <SAArgumentairesPanel
          args={args}
          loading={loadingArgs}
          selectedArgs={selectedArgs}
          onToggleSel={toggleArgSel}
          onToggleAll={toggleAllArgs}
          onAdd={() => setArgModal({ open: true, existing: null })}
          onEdit={arg => setArgModal({ open: true, existing: arg })}
          onDelete={handleDeleteArgs}
          onFloat={setFloatingArg}
          t={t}
        />

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl overflow-hidden" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold" style={{ color: t.text.primary }}>Societes prospects</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all" style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9' }}>
                  {filterStatut ? `${filteredProspects.length} / ${prospects.length}` : prospects.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <button
                    ref={filterBtnRef}
                    type="button"
                    onClick={handleFilterToggle}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: filterStatut ? `${getStatutColor(filterStatut, saStatuts).color}18` : t.surface.primary,
                      border: `1px solid ${filterStatut ? getStatutColor(filterStatut, saStatuts).border : t.surface.border}`,
                      color: filterStatut ? getStatutColor(filterStatut, saStatuts).color : t.text.secondary,
                    }}
                  >
                    <Filter className="w-3 h-3" />
                    {filterStatut ?? 'Tous les statuts'}
                    {filterStatut ? (
                      <span className="ml-1 flex items-center" onClick={e => { e.stopPropagation(); handleFilterSelect(null); }}>
                        <X className="w-3 h-3" />
                      </span>
                    ) : <ChevronDown className="w-3 h-3 ml-0.5" />}
                  </button>
                </div>
                <button
                  onClick={() => setProspectModal({ open: true, existing: null })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>
            </div>

            {/* Work mode bar */}
            {filteredProspects.length > 0 && (
              <>
                {/* Desktop work mode bar */}
                <div className="hidden md:block">
                  <SACrmWorkModeBar
                    allChecked={allProspectsChecked}
                    someChecked={someProspectsChecked}
                    toggleAll={toggleAllProspects}
                    selectMode={selectMode}
                    onToggleSelectMode={handleToggleSelectMode}
                    workModeEnabled={workMode.enabled}
                    onWorkModeToggle={handleToggleWorkMode}
                    onUndo={workMode.undo}
                    onRedo={workMode.redo}
                    canUndo={workMode.canUndo}
                    canRedo={workMode.canRedo}
                    historyPosition={workMode.historyPosition}
                    historyLength={workMode.historyLength}
                    onLocate={handleLocateDesktop}
                    canLocate={canLocate}
                    onResetHistory={workMode.resetHistory}
                  />
                </div>
                {/* Mobile work mode bar */}
                <div className="md:hidden">
                  <SACrmWorkModeBar
                    allChecked={allProspectsChecked}
                    someChecked={someProspectsChecked}
                    toggleAll={toggleAllProspects}
                    selectMode={selectMode}
                    onToggleSelectMode={handleToggleSelectMode}
                    workModeEnabled={workMode.enabled}
                    onWorkModeToggle={handleToggleWorkMode}
                    onUndo={workMode.undo}
                    onRedo={workMode.redo}
                    canUndo={workMode.canUndo}
                    canRedo={workMode.canRedo}
                    historyPosition={workMode.historyPosition}
                    historyLength={workMode.historyLength}
                    onLocate={handleLocateMobile}
                    canLocate={canLocate}
                    onResetHistory={workMode.resetHistory}
                  />
                </div>
              </>
            )}

            {/* Bulk bar */}
            {selectedProspects.size > 0 && (
              <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(239,68,68,0.06)', borderBottom: `1px solid ${t.surface.border}` }}>
                <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
                  {selectedProspects.size} selectionne{selectedProspects.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => handleDeleteProspects([...selectedProspects])}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                >
                  <Trash2 className="w-3 h-3" />
                  Supprimer
                </button>
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
              <SAProspectsTable
                prospects={filteredProspects}
                loading={loadingProspects}
                allEmpty={prospects.length === 0}
                selectedProspects={selectedProspects}
                onToggleSel={toggleProspectSel}
                onToggleAll={toggleAllProspects}
                onEdit={p => setProspectModal({ open: true, existing: p })}
                onDelete={handleDeleteProspects}
                onDetail={setDetailProspect}
                onStatutClick={handleStatutClick}
                onClearFilter={() => setFilterStatut(null)}
                saStatuts={saStatuts}
                t={t}
                selectMode={selectMode}
                workModeEnabled={workMode.enabled}
                workActiveId={workMode.activeId}
                onWorkSelect={workMode.select}
                onWorkUndo={workMode.undo}
                onWorkRedo={workMode.redo}
                canWorkUndo={workMode.canUndo}
                canWorkRedo={workMode.canRedo}
                workHistoryPosition={workMode.historyPosition}
                workHistoryLength={workMode.historyLength}
                rowRefCallback={(id, el) => { if (el) rowRefsMap.current.set(id, el); else rowRefsMap.current.delete(id); }}
              />
            </div>

            {/* Mobile cards */}
            <div className="md:hidden max-h-[calc(100vh-280px)] overflow-y-auto">
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
                      <button onClick={() => setFilterStatut(null)} className="text-xs underline transition-colors" style={{ color: '#0ea5e9' }}>
                        Voir toutes les societes
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredProspects.map(p => (
                  <SAProspectMobileCard
                    key={p.id}
                    prospect={p}
                    selected={selectedProspects.has(p.id)}
                    onToggleSel={() => toggleProspectSel(p.id)}
                    onDetail={() => setDetailProspect(p)}
                    onEdit={() => setProspectModal({ open: true, existing: p })}
                    onDelete={() => handleDeleteProspects([p.id])}
                    onStatutClick={handleStatutClick}
                    saStatuts={saStatuts}
                    t={t}
                    selectMode={selectMode}
                    workModeEnabled={workMode.enabled}
                    isWorkActive={workMode.activeId === p.id}
                    onWorkSelect={workMode.select}
                    onWorkUndo={workMode.undo}
                    onWorkRedo={workMode.redo}
                    onWorkReset={workMode.resetHistory}
                    canWorkUndo={workMode.canUndo}
                    canWorkRedo={workMode.canRedo}
                    workHistoryPosition={workMode.historyPosition}
                    workHistoryLength={workMode.historyLength}
                    cardRef={el => { if (el) cardRefsMap.current.set(p.id, el); else cardRefsMap.current.delete(p.id); }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {argModal.open && (
        <SAArgumentaireModal existing={argModal.existing} onSave={handleSaveArg} onClose={() => setArgModal({ open: false })} />
      )}
      {prospectModal.open && (
        <SAProspectModal existing={prospectModal.existing} onSave={handleSaveProspect} onClose={() => setProspectModal({ open: false })} />
      )}
      {floatingArg && (
        <SAArgumentaireFloatingWindow title={floatingArg.title} content={floatingArg.content} onClose={() => setFloatingArg(null)} />
      )}
      {detailProspect && (
        <SASocieteDetailModal prospect={detailProspect} saStatuts={saStatuts} onClose={() => setDetailProspect(null)} />
      )}

      {/* Fixed dropdowns */}
      {filterDropdownOpen && filterDropdownRect && (
        <SAStatutFilterDropdown
          rect={filterDropdownRect}
          filterStatut={filterStatut}
          saStatuts={saStatuts}
          prospects={prospects}
          onSelect={handleFilterSelect}
          onClose={() => { setFilterDropdownOpen(false); setFilterDropdownRect(null); }}
          t={t}
        />
      )}
      {statutDropdownId && statutDropdownRect && activeProspect && (
        <SAStatutRowDropdown
          rect={statutDropdownRect}
          currentStatut={activeProspect.statut}
          saStatuts={saStatuts}
          onSelect={handleStatutSelect}
          onClose={closeStatutDropdown}
          t={t}
        />
      )}
    </div>
  );
}
