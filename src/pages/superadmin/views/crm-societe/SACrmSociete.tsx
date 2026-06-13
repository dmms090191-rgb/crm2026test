import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Building2, FileText } from 'lucide-react';
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
import SiteManagerModal from '../site-builder/SiteManagerModal';
import useColumnOrder from '../../../../components/table/useColumnOrder';
import useColumnOrderMobile from '../../../../components/table/useColumnOrderMobile';
import ColumnOrganizerModal from '../../../../components/table/ColumnOrganizerModal';
import { useCustomColumns } from '../../../../hooks/useCustomColumns';
import type { Argumentaire } from './types';

const SA_CRM_COLUMNS = [
  { key: 'prenom', label: 'Prenom' },
  { key: 'nom', label: 'Nom' },
  { key: 'societe', label: 'Societe' },
  { key: 'secteur', label: 'Secteur' },
  { key: 'site', label: 'Site' },
  { key: 'maps', label: 'Maps' },
  { key: 'telephone', label: 'Telephone' },
  { key: 'statut', label: 'Statut', required: true },
  { key: 'actions', label: 'Actions', required: true },
];

type Tab = 'prospects' | 'argumentaires';

export default function SACrmSociete() {
  const t = useThemeTokens();
  const {
    args, prospects, saStatuts, loadingArgs, loadingProspects,
    filteredProspects, filterStatut, setFilterStatut, filterPhone, setFilterPhone,
    saveArg, deleteArgs,
    saveProspect, deleteProspects, updateProspectStatut,
  } = useCrmSocieteData();

  const [siteProspect, setSiteProspect] = useState<Prospect | null>(null);
  const cc = useCustomColumns('sa_crm_societe');
  const allColumns = useMemo(() => [...SA_CRM_COLUMNS, ...cc.customDefs], [cc.customDefs]);
  const colOrder = useColumnOrder('talvex_columns_sa_crm_societe', allColumns);
  const colMobile = useColumnOrderMobile('talvex_columns_sa_crm_societe', allColumns);
  const [showColModal, setShowColModal] = useState(false);
  const displayColumns = useMemo(() => allColumns.map(c => colOrder.labelOverrides[c.key] ? { ...c, label: colOrder.labelOverrides[c.key] } : c), [allColumns, colOrder.labelOverrides]);

  const workMode = useWorkMode('sa_crm_societe_workmode');
  const [activeTab, setActiveTab] = useState<Tab>('prospects');

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

  const tabs: { key: Tab; label: string; icon: typeof Building2; count: number }[] = [
    { key: 'prospects', label: 'Societes prospects', icon: Building2, count: prospects.length },
    { key: 'argumentaires', label: 'Argumentaires', icon: FileText, count: args.length },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 h-full overflow-auto">
      <div className="mb-4 md:mb-5">
        <h1 className="text-lg sm:text-xl font-bold" style={{ color: t.text.primary }}>CRM Societe</h1>
        <p className="text-[11px] sm:text-xs mt-0.5 sm:mt-1" style={{ color: t.text.tertiary }}>Prospection manuelle de societes</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 mb-4 md:mb-5 overflow-x-auto pb-0.5 scrollbar-none">
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 active:scale-[0.97]"
              style={active ? {
                background: 'rgba(14,165,233,0.1)',
                border: '1px solid rgba(14,165,233,0.2)',
                color: '#0ea5e9',
                boxShadow: '0 1px 4px rgba(14,165,233,0.1)',
              } : {
                background: t.surface.primary,
                border: `1px solid ${t.surface.border}`,
                color: t.text.secondary,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.key === 'prospects' ? 'Societes' : 'Arguments'}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5"
                style={active
                  ? { background: 'rgba(14,165,233,0.15)', color: '#0ea5e9' }
                  : { background: t.surface.hover, color: t.text.tertiary }
                }
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'prospects' && (
        <SACrmProspectsPanel
          prospects={prospects} filteredProspects={filteredProspects} loadingProspects={loadingProspects}
          saStatuts={saStatuts} filterStatut={filterStatut} filterPhone={filterPhone} onFilterPhoneChange={setFilterPhone} selectedProspects={selectedProspects}
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
          onSiteProspect={setSiteProspect}
          filterBtnRef={filterBtnRef}
          rowRefCallback={(id, el) => { if (el) rowRefsMap.current.set(id, el); else rowRefsMap.current.delete(id); }}
          cardRefCallback={(id, el) => { if (el) cardRefsMap.current.set(id, el); else cardRefsMap.current.delete(id); }}
          columnOrder={colOrder.visibleOrderedKeys}
          onOpenColumnOrganizer={() => setShowColModal(true)}
          labelOverrides={colOrder.labelOverrides}
          t={t}
        />
      )}

      {activeTab === 'argumentaires' && (
        <SAArgumentairesPanel
          args={args} loading={loadingArgs} selectedArgs={selectedArgs}
          onToggleSel={toggleArgSel} onToggleAll={toggleAllArgs}
          onAdd={() => setArgModal({ open: true, existing: null })}
          onEdit={arg => setArgModal({ open: true, existing: arg })}
          onDelete={handleDeleteArgs} onFloat={setFloatingArg} t={t}
        />
      )}

      {/* Modals & dropdowns (always mounted regardless of tab) */}
      {argModal.open && <SAArgumentaireModal existing={argModal.existing} onSave={handleSaveArg} onClose={() => setArgModal({ open: false })} />}
      {prospectModal.open && <SAProspectModal existing={prospectModal.existing} onSave={handleSaveProspect} onClose={() => setProspectModal({ open: false })} />}
      {floatingArg && <SAArgumentaireFloatingWindow title={floatingArg.title} content={floatingArg.content} onClose={() => setFloatingArg(null)} />}
      {detailProspect && <SASocieteDetailModal prospect={detailProspect} saStatuts={saStatuts} onClose={() => setDetailProspect(null)} />}
      {siteProspect && <SiteManagerModal ownerType="crm_societe" title={`Site de ${siteProspect.nom}`} subtitle={`Gestion du site pour ${siteProspect.nom}`} societeId={siteProspect.id} onClose={() => setSiteProspect(null)} />}

      {showColModal && (
        <ColumnOrganizerModal columns={displayColumns} orderedKeys={colOrder.orderedKeys} hiddenDesktopKeys={colOrder.hiddenDesktopKeys} tableKey="sa_crm_societe" onSave={colOrder.saveAll} onReset={colOrder.resetAll} onClose={() => setShowColModal(false)} onCreateCustomColumn={cc.createColumn} onDeleteCustomColumn={cc.deleteColumn} onRenameCustomColumn={cc.renameColumn} onRenameLabel={colOrder.renameLabel} mobileOrder={colMobile.mobileOrder} mobileCardStyle={colMobile.cardStyle} onSaveMobile={colMobile.saveMobile} onResetMobile={colMobile.resetMobile} />
      )}

      {filterDropdownOpen && filterDropdownRect && (
        <SAStatutFilterDropdown rect={filterDropdownRect} filterStatut={filterStatut} saStatuts={saStatuts} prospects={prospects} onSelect={handleFilterSelect} onClose={() => { setFilterDropdownOpen(false); setFilterDropdownRect(null); }} t={t} />
      )}
      {statutDropdownId && statutDropdownRect && activeProspect && (
        <SAStatutRowDropdown rect={statutDropdownRect} currentStatut={activeProspect.statut} saStatuts={saStatuts} onSelect={handleStatutSelect} onClose={closeStatutDropdown} t={t} />
      )}
    </div>
  );
}
