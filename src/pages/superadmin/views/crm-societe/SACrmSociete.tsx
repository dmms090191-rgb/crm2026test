import { useState, useRef, useCallback, useEffect } from 'react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useWorkMode } from '../../../../hooks/useWorkMode';
import SAArgumentaireModal from './SAArgumentaireModal';
import SAProspectModal, { type Prospect } from './SAProspectModal';
import SAArgumentaireFloatingWindow from './SAArgumentaireFloatingWindow';
import SAArgumentairesPanel from './SAArgumentairesPanel';
import SAStatutFilterDropdown from './SAStatutFilterDropdown';
import SAStatutRowDropdown from './SAStatutRowDropdown';
import SASocieteDetailModal from './SASocieteDetailModal';
import SACrmProspectsPanel from './SACrmProspectsPanel';
import useCrmSocieteData from './useCrmSocieteData';
import type { Argumentaire } from './types';

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

  const toggleArgSel = (id: string) => setSelectedArgs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllArgs = () => setSelectedArgs(prev => prev.size === args.length ? new Set() : new Set(args.map(a => a.id)));

  const toggleProspectSel = (id: string) => setSelectedProspects(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllProspects = () => setSelectedProspects(prev =>
    prev.size === filteredProspects.length && filteredProspects.length > 0 ? new Set() : new Set(filteredProspects.map(p => p.id))
  );

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => { if (prev) setSelectedProspects(new Set()); else workMode.deactivate(); return !prev; });
  }, [workMode]);

  const handleToggleWorkMode = useCallback(() => {
    if (workMode.enabled) { workMode.deactivate(); } else { workMode.activate(); setSelectMode(false); setSelectedProspects(new Set()); }
  }, [workMode]);

  const handleDeleteArgs = async (ids: string[]) => { await deleteArgs(ids); setSelectedArgs(new Set()); };
  const handleDeleteProspects = async (ids: string[]) => { await deleteProspects(ids); setSelectedProspects(new Set()); };
  const handleSaveArg = async (title: string, content: string) => { await saveArg(title, content, argModal.existing?.id); setArgModal({ open: false }); };
  const handleSaveProspect = async (data: Omit<Prospect, 'id' | 'created_at'>) => { await saveProspect(data, prospectModal.existing?.id); setProspectModal({ open: false }); };

  const handleStatutClick = (id: string, rect: { top: number; left: number }) => {
    if (statutDropdownId === id) { setStatutDropdownId(null); setStatutDropdownRect(null); }
    else { setStatutDropdownRect(rect); setStatutDropdownId(id); }
  };
  const handleStatutSelect = async (nom: string) => { if (!statutDropdownId) return; await updateProspectStatut(statutDropdownId, nom); setStatutDropdownId(null); setStatutDropdownRect(null); };
  const closeStatutDropdown = () => { setStatutDropdownId(null); setStatutDropdownRect(null); };

  const handleFilterToggle = () => {
    if (filterDropdownOpen) { setFilterDropdownOpen(false); setFilterDropdownRect(null); }
    else { const rect = filterBtnRef.current?.getBoundingClientRect(); if (rect) setFilterDropdownRect({ top: rect.bottom + 4, right: window.innerWidth - rect.right }); setFilterDropdownOpen(true); }
  };
  const handleFilterSelect = (nom: string | null) => { setFilterStatut(nom); setFilterDropdownOpen(false); setFilterDropdownRect(null); };

  const handleLocateDesktop = () => { if (workMode.activeId) rowRefsMap.current.get(workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  const handleLocateMobile = () => { if (workMode.activeId) cardRefsMap.current.get(workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  const canLocate = !!workMode.activeId && filteredProspects.some(p => p.id === workMode.activeId);

  useEffect(() => {
    if (!workMode.activeId || !workMode.enabled) return;
    const el = (window.innerWidth < 768 ? cardRefsMap : rowRefsMap).current.get(workMode.activeId);
    if (el) requestAnimationFrame(() => { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  }, [workMode.activeId, workMode.enabled]);

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
          args={args} loading={loadingArgs} selectedArgs={selectedArgs}
          onToggleSel={toggleArgSel} onToggleAll={toggleAllArgs}
          onAdd={() => setArgModal({ open: true, existing: null })}
          onEdit={arg => setArgModal({ open: true, existing: arg })}
          onDelete={handleDeleteArgs} onFloat={setFloatingArg} t={t}
        />
        <SACrmProspectsPanel
          prospects={prospects} filteredProspects={filteredProspects} loadingProspects={loadingProspects}
          saStatuts={saStatuts} filterStatut={filterStatut} selectedProspects={selectedProspects}
          selectMode={selectMode} workMode={workMode}
          allProspectsChecked={allProspectsChecked} someProspectsChecked={someProspectsChecked} canLocate={canLocate}
          onToggleProspectSel={toggleProspectSel} onToggleAllProspects={toggleAllProspects}
          onToggleSelectMode={handleToggleSelectMode} onToggleWorkMode={handleToggleWorkMode}
          onDeleteProspects={handleDeleteProspects}
          onAddProspect={() => setProspectModal({ open: true, existing: null })}
          onEditProspect={p => setProspectModal({ open: true, existing: p })}
          onDetailProspect={setDetailProspect}
          onStatutClick={handleStatutClick} onFilterToggle={handleFilterToggle} onFilterSelect={handleFilterSelect}
          onLocateDesktop={handleLocateDesktop} onLocateMobile={handleLocateMobile}
          filterBtnRef={filterBtnRef}
          rowRefCallback={(id, el) => { if (el) rowRefsMap.current.set(id, el); else rowRefsMap.current.delete(id); }}
          cardRefCallback={(id, el) => { if (el) cardRefsMap.current.set(id, el); else cardRefsMap.current.delete(id); }}
          t={t}
        />
      </div>

      {argModal.open && <SAArgumentaireModal existing={argModal.existing} onSave={handleSaveArg} onClose={() => setArgModal({ open: false })} />}
      {prospectModal.open && <SAProspectModal existing={prospectModal.existing} onSave={handleSaveProspect} onClose={() => setProspectModal({ open: false })} />}
      {floatingArg && <SAArgumentaireFloatingWindow title={floatingArg.title} content={floatingArg.content} onClose={() => setFloatingArg(null)} />}
      {detailProspect && <SASocieteDetailModal prospect={detailProspect} saStatuts={saStatuts} onClose={() => setDetailProspect(null)} />}

      {filterDropdownOpen && filterDropdownRect && (
        <SAStatutFilterDropdown rect={filterDropdownRect} filterStatut={filterStatut} saStatuts={saStatuts} prospects={prospects} onSelect={handleFilterSelect} onClose={() => { setFilterDropdownOpen(false); setFilterDropdownRect(null); }} t={t} />
      )}
      {statutDropdownId && statutDropdownRect && activeProspect && (
        <SAStatutRowDropdown rect={statutDropdownRect} currentStatut={activeProspect.statut} saStatuts={saStatuts} onSelect={handleStatutSelect} onClose={closeStatutDropdown} t={t} />
      )}
    </div>
  );
}
