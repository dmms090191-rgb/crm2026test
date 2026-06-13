import { useState, useCallback, useMemo } from 'react';
import { Users, CheckSquare, Briefcase, Columns3, SlidersHorizontal, Bot } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTimezone } from '../../../hooks/useTimezone';
import { useCompanyId } from '../../../hooks/useCompanyId';
import type { ImportedLead, ImpersonatedClient, ChatLead } from './crm/types';
import { CRM_COLUMNS, CRM_HEADER_ICONS } from './crm/types';
import CrmTableRow from './crm/CrmTableRow';
import CrmActionBar from './crm/CrmActionBar';
import CrmFilters from './crm/CrmFilters';
import CrmWorkModeBar from './crm/CrmWorkModeBar';
import CrmMobileLeadCard from './crm/CrmMobileLeadCard';
import CrmFooterBar from './crm/CrmFooterBar';
import DetailModal from './crm/DetailModal';
import CrmActionModal from './crm/CrmActionModal';
import TransferModal from './crm/TransferModal';
import { useCrmData } from './crm/useCrmData';
import useColumnOrder from '../../../components/table/useColumnOrder';
import useColumnOrderMobile from '../../../components/table/useColumnOrderMobile';
import ColumnOrganizerModal from '../../../components/table/ColumnOrganizerModal';
import { useCustomColumns } from '../../../hooks/useCustomColumns';
import { useActionMenuOrder } from '../../../components/action-menu/useActionMenuOrder';
import ToolbarOrganizerModal from '../../../components/toolbar/ToolbarOrganizerModal';
import type { ToolbarItem } from '../../../components/toolbar/ToolbarOrganizerModal';
import { useVendorColumnConfig } from './crm/useVendorColumnConfig';

export type { ImpersonatedClient, ChatLead } from './crm/types';

interface CrmProps {
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  onOpenChat?: (lead: ChatLead) => void;
  onOpenRdv?: (lead: ChatLead) => void;
}

export default function Crm({ onConnectAsClient, onOpenChat, onOpenRdv }: CrmProps) {
  const tokens = useThemeTokens();
  const { timezone } = useTimezone();
  const companyId = useCompanyId();
  const d = useCrmData();
  const colSep = { borderRight: `1px solid ${tokens.table.colSep}` };
  const cc = useCustomColumns('admin_crm');
  const allColumns = useMemo(() => [...CRM_COLUMNS, ...cc.customDefs], [cc.customDefs]);
  const colOrder = useColumnOrder('talvex_columns_admin_crm', allColumns);
  const colMobile = useColumnOrderMobile('talvex_columns_admin_crm', allColumns);
  const [showColModal, setShowColModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const displayColumns = useMemo(() => allColumns.map(c => colOrder.labelOverrides[c.key] ? { ...c, label: colOrder.labelOverrides[c.key] } : c), [allColumns, colOrder.labelOverrides]);
  const colMap = useMemo(() => new Map(displayColumns.map(c => [c.key, c])), [displayColumns]);
  const vendorTabConfig = useVendorColumnConfig(companyId);

  const CRM_TOOLBAR_DEFAULT = ['select', 'ia', 'workmode', 'columns', 'organize'];
  const tbOrder = useActionMenuOrder('talvex_toolbar_order_admin_crm', CRM_TOOLBAR_DEFAULT);
  const toolbarItems: ToolbarItem[] = useMemo(() => [
    { id: 'select', label: 'Selectionner', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'ia', label: 'IA', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'workmode', label: 'Mode travail', icon: <Briefcase className="w-3.5 h-3.5" />, pinned: true },
    { id: 'columns', label: 'Colonnes', icon: <Columns3 className="w-3.5 h-3.5" />, pinned: true },
    { id: 'organize', label: 'Organiser', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, pinned: true },
  ], []);

  const allAiEnabled = useMemo(() => d.leads.length > 0 && d.leads.every(l => l.ai_enabled === true), [d.leads]);

  const [actionLeadModal, setActionLeadModal] = useState<{ lead: ImportedLead; index: number } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) d.setSelected(new Set());
      return !prev;
    });
  }, [d]);

  function leadSummary(lead: ImportedLead) {
    const g = (k: string) => lead.data[k] ?? '';
    return { id: lead.id, nom: g('Nom'), prenom: g('Prenom'), email: g('Email'), tel: g('Telephone') };
  }

  return (
    <div className="space-y-5">
      <CrmActionBar
        totalLeads={d.leads.length} selectedCount={selectMode ? d.selected.size : 0} deleting={d.deleting} tokens={tokens}
        onTransfer={() => d.setShowTransfer(true)} onDelete={d.handleDeleteSelected}
      />

      <CrmFilters
        filterVendor={d.filterVendor} setFilterVendor={d.setFilterVendor}
        filterEmail={d.filterEmail} setFilterEmail={d.setFilterEmail}
        filterTel={d.filterTel} setFilterTel={d.setFilterTel}
        filterPrenom={d.filterPrenom} setFilterPrenom={d.setFilterPrenom}
        filterNom={d.filterNom} setFilterNom={d.setFilterNom}
        statutFilter={d.statutFilter} setStatutFilter={d.setStatutFilter}
        sortOrder={d.sortOrder} setSortOrder={d.setSortOrder}
        vendors={d.vendors} statutDefs={d.statutDefs} tokens={tokens}
      />

      <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${tokens.surface.secondary}, ${tokens.surface.secondary}80)`, border: `1px solid ${tokens.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        {d.loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-t-cyan-400 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: '#22d3ee' }} />
          </div>
        ) : d.leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.modal.fieldBg }}>
              <Users className="w-5 h-5" style={{ color: tokens.label.hint }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucun lead importe</p>
            <p className="text-xs" style={{ color: tokens.label.hint }}>Importez un fichier CSV depuis l'onglet Import de leads</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <CrmWorkModeBar
                allChecked={d.allChecked} someChecked={d.someChecked} toggleAll={d.toggleAll}
                selectMode={selectMode} onToggleSelectMode={handleToggleSelectMode}
                workModeEnabled={d.workMode.enabled} onWorkModeToggle={() => d.workMode.enabled ? d.workMode.deactivate() : d.workMode.activate()}
                onUndo={d.workMode.undo} onRedo={d.workMode.redo} canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                historyPosition={d.workMode.historyPosition} historyLength={d.workMode.historyLength}
                onLocate={() => { if (d.workMode.activeId) d.rowRefsMap.current.get(d.workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                canLocate={!!d.workMode.activeId && d.filtered.some(l => l.id === d.workMode.activeId)}
                onResetHistory={d.workMode.resetHistory} allAiEnabled={allAiEnabled} onGlobalAiToggle={d.handleGlobalAiToggle}
                onOpenColumns={() => setShowColModal(true)} onOpenOrganize={() => setShowOrgModal(true)} toolbarOrder={tbOrder.order}
              />
              <div ref={d.topScrollRef} onScroll={d.handleTopScroll} className="dual-scroll-top">
                <div ref={d.topInnerRef} className="dual-scroll-top-inner" />
              </div>
              <div ref={d.bottomScrollRef} onScroll={d.handleBottomScroll} className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr className="sticky top-0 z-10" style={{ background: tokens.table.headerBg }}>
                      {(selectMode || d.workMode.enabled) && <th className="px-3 py-4 w-12" style={{ borderBottom: `2px solid ${tokens.accent.solid}` }}></th>}
                      {colOrder.visibleOrderedKeys.map(key => {
                        const col = colMap.get(key);
                        const Icon = CRM_HEADER_ICONS[key];
                        return (
                          <th key={key} className={`text-left px-5 py-4 ${key === 'hash' ? 'w-12' : ''}`} style={{ borderBottom: `2px solid ${tokens.accent.solid}` }}>
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color: tokens.accent.text, opacity: 0.6 }} />}
                              <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: tokens.table.headerText }}>{col?.label ?? key}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {d.filtered.map((lead, i) => (
                      <CrmTableRow
                        key={lead.id}
                        ref={el => { if (el) d.rowRefsMap.current.set(lead.id, el); else d.rowRefsMap.current.delete(lead.id); }}
                        lead={lead} index={i} isSelected={d.selected.has(lead.id)}
                        statutDefs={d.statutDefs} vendors={d.vendors} tokens={tokens} timezone={timezone} colSep={colSep}
                        onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif} onToggleAi={d.handleToggleAi}
                        onDetail={(l, idx, fromActions) => d.setDetailLead({ lead: l, index: idx, fromActions })}
                        onConnectAsClient={onConnectAsClient} onOpenChat={onOpenChat} onOpenRdv={onOpenRdv}
                        selectMode={selectMode}
                        workModeEnabled={d.workMode.enabled} isWorkActive={d.workMode.activeId === lead.id}
                        onWorkSelect={d.workMode.select} onWorkUndo={d.workMode.undo} onWorkRedo={d.workMode.redo}
                        canWorkUndo={d.workMode.canUndo} canWorkRedo={d.workMode.canRedo}
                        workHistoryPosition={d.workMode.historyPosition} workHistoryLength={d.workMode.historyLength}
                        columnOrder={colOrder.visibleOrderedKeys}
                        customColumnDefs={cc.customDefs} customColumnValues={cc.getValuesForRow(lead.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden">
              <CrmWorkModeBar
                allChecked={d.allChecked} someChecked={d.someChecked} toggleAll={d.toggleAll}
                selectMode={selectMode} onToggleSelectMode={handleToggleSelectMode}
                workModeEnabled={d.workMode.enabled} onWorkModeToggle={() => d.workMode.enabled ? d.workMode.deactivate() : d.workMode.activate()}
                onUndo={d.workMode.undo} onRedo={d.workMode.redo} canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                historyPosition={d.workMode.historyPosition} historyLength={d.workMode.historyLength}
                onLocate={() => { if (d.workMode.activeId) d.cardRefsMap.current.get(d.workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                canLocate={!!d.workMode.activeId && d.filtered.some(l => l.id === d.workMode.activeId)}
                onResetHistory={d.workMode.resetHistory} allAiEnabled={allAiEnabled} onGlobalAiToggle={d.handleGlobalAiToggle}
                onOpenColumns={() => setShowColModal(true)} onOpenOrganize={() => setShowOrgModal(true)} toolbarOrder={tbOrder.order}
              />
              <div className="divide-y" style={{ borderColor: tokens.table.rowBorder }}>
                {d.filtered.map((lead, i) => (
                  <CrmMobileLeadCard
                    key={lead.id}
                    lead={lead} index={i} statutDefs={d.statutDefs} vendors={d.vendors} timezone={timezone}
                    isSelected={d.selected.has(lead.id)}
                    workModeEnabled={d.workMode.enabled} workModeActiveId={d.workMode.activeId}
                    workHistoryLength={d.workMode.historyLength} workHistoryPosition={d.workMode.historyPosition}
                    canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                    onWorkSelect={d.workMode.select} onWorkUndo={d.workMode.undo} onWorkRedo={d.workMode.redo} onWorkReset={d.workMode.resetHistory}
                    onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif} onToggleAi={d.handleToggleAi}
                    onDetail={(l, idx, fromActions) => d.setDetailLead({ lead: l, index: idx, fromActions })}
                    onOpenChat={onOpenChat} onOpenRdv={onOpenRdv} onConnectAsClient={onConnectAsClient}
                    selectMode={selectMode}
                    cardRef={el => { if (el) d.cardRefsMap.current.set(lead.id, el); else d.cardRefsMap.current.delete(lead.id); }}
                  />
                ))}
              </div>
            </div>

            <CrmFooterBar filteredCount={d.filtered.length} selectedCount={d.selected.size}
              hasActiveFilters={!!(d.filterNom || d.filterPrenom || d.filterEmail || d.filterTel)} tokens={tokens} />
          </>
        )}
      </div>

      {d.detailLead && (
        <DetailModal lead={d.detailLead.lead} gradIndex={d.detailLead.index} onClose={() => d.setDetailLead(null)} statutDefs={d.statutDefs}
          onBack={d.detailLead.fromActions ? () => {
            const { lead, index: idx } = d.detailLead!;
            d.setDetailLead(null);
            setActionLeadModal({ lead, index: idx });
          } : undefined}
        />
      )}

      {actionLeadModal && (() => {
        const s = leadSummary(actionLeadModal.lead);
        return (
          <CrmActionModal
            lead={{ nom: s.nom, prenom: s.prenom, email: s.email, tel: s.tel }} tokens={tokens}
            onClose={() => setActionLeadModal(null)}
            onDetail={() => { const m = actionLeadModal; setActionLeadModal(null); d.setDetailLead({ lead: m.lead, index: m.index, fromActions: true }); }}
            onConnect={() => { onConnectAsClient?.({ id: s.id, nom: s.nom, prenom: s.prenom, email: s.email }); setActionLeadModal(null); }}
            onChat={() => { onOpenChat?.(s); setActionLeadModal(null); }}
            onRdv={() => { onOpenRdv?.(s); setActionLeadModal(null); }}
          />
        );
      })()}

      {d.showTransfer && <TransferModal count={d.selected.size} onClose={() => d.setShowTransfer(false)} onConfirm={d.handleTransfer} />}

      {showColModal && (
        <ColumnOrganizerModal columns={displayColumns} orderedKeys={colOrder.orderedKeys} hiddenDesktopKeys={colOrder.hiddenDesktopKeys}
          tableKey="admin_crm" onSave={colOrder.saveAll} onReset={colOrder.resetAll} onClose={() => setShowColModal(false)}
          onCreateCustomColumn={cc.createColumn} onDeleteCustomColumn={cc.deleteColumn} onRenameCustomColumn={cc.renameColumn}
          onRenameLabel={colOrder.renameLabel} mobileOrder={colMobile.mobileOrder} mobileCardStyle={colMobile.cardStyle}
          onSaveMobile={colMobile.saveMobile} onResetMobile={colMobile.resetMobile} vendorTab={vendorTabConfig} />
      )}

      {showOrgModal && <ToolbarOrganizerModal items={toolbarItems} order={tbOrder.order} onSave={tbOrder.save} onClose={() => setShowOrgModal(false)} t={tokens} />}
    </div>
  );
}
