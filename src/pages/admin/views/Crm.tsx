import { useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTimezone } from '../../../hooks/useTimezone';
import type { ImpersonatedClient, ChatLead } from './crm/types';
import CrmTableRow from './crm/CrmTableRow';
import CrmActionBar from './crm/CrmActionBar';
import CrmFilters from './crm/CrmFilters';
import CrmWorkModeBar from './crm/CrmWorkModeBar';
import CrmMobileLeadCard from './crm/CrmMobileLeadCard';
import DetailModal from './crm/DetailModal';
import TransferModal from './crm/TransferModal';
import { useCrmData } from './crm/useCrmData';

export type { ImpersonatedClient, ChatLead } from './crm/types';

interface CrmProps {
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  onOpenChat?: (lead: ChatLead) => void;
  onOpenRdv?: (lead: ChatLead) => void;
}

export default function Crm({ onConnectAsClient, onOpenChat, onOpenRdv }: CrmProps) {
  const tokens = useThemeTokens();
  const { timezone } = useTimezone();
  const d = useCrmData();
  const colSep = { borderRight: `1px solid ${tokens.table.colSep}` };
  const cardStyle = { background: tokens.card.bg, border: tokens.card.border };

  const [selectMode, setSelectMode] = useState(false);
  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) d.setSelected(new Set());
      return !prev;
    });
  }, [d]);

  return (
    <div className="space-y-5">
      <CrmActionBar
        totalLeads={d.leads.length}
        selectedCount={selectMode ? d.selected.size : 0}
        deleting={d.deleting}
        tokens={tokens}
        onTransfer={() => d.setShowTransfer(true)}
        onDelete={d.handleDeleteSelected}
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

      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
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
            {/* Desktop table */}
            <div className="hidden md:block">
              <CrmWorkModeBar
                allChecked={d.allChecked} someChecked={d.someChecked} toggleAll={d.toggleAll}
                selectMode={selectMode} onToggleSelectMode={handleToggleSelectMode}
                workModeEnabled={d.workMode.enabled} onWorkModeToggle={() => d.workMode.enabled ? d.workMode.deactivate() : d.workMode.activate()}
                onUndo={d.workMode.undo} onRedo={d.workMode.redo} canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                historyPosition={d.workMode.historyPosition} historyLength={d.workMode.historyLength}
                onLocate={() => { if (d.workMode.activeId) d.rowRefsMap.current.get(d.workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                canLocate={!!d.workMode.activeId && d.filtered.some(l => l.id === d.workMode.activeId)}
                onResetHistory={d.workMode.resetHistory}
              />
              <div ref={d.topScrollRef} onScroll={d.handleTopScroll} className="dual-scroll-top">
                <div ref={d.topInnerRef} className="dual-scroll-top-inner" />
              </div>
              <div ref={d.bottomScrollRef} onScroll={d.handleBottomScroll} className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: tokens.table.headerBorder, background: tokens.table.headerBg }}>
                      {(selectMode || d.workMode.enabled) && <th className="px-2 py-3 w-11" style={colSep}></th>}
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase w-12" style={{ ...colSep, color: tokens.table.headerText }}>#</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Nom</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Prenom</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Email</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Telephone</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Date d'ajout</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Statut</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Actions</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Acces</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Vendeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.filtered.map((lead, i) => (
                      <CrmTableRow
                        key={lead.id}
                        ref={el => { if (el) d.rowRefsMap.current.set(lead.id, el); else d.rowRefsMap.current.delete(lead.id); }}
                        lead={lead} index={i} isSelected={d.selected.has(lead.id)}
                        statutDefs={d.statutDefs} vendors={d.vendors} tokens={tokens} timezone={timezone} colSep={colSep}
                        onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif}
                        onDetail={(l, idx) => d.setDetailLead({ lead: l, index: idx })}
                        onConnectAsClient={onConnectAsClient} onOpenChat={onOpenChat} onOpenRdv={onOpenRdv}
                        selectMode={selectMode}
                        workModeEnabled={d.workMode.enabled} isWorkActive={d.workMode.activeId === lead.id}
                        onWorkSelect={d.workMode.select} onWorkUndo={d.workMode.undo} onWorkRedo={d.workMode.redo}
                        canWorkUndo={d.workMode.canUndo} canWorkRedo={d.workMode.canRedo}
                        workHistoryPosition={d.workMode.historyPosition} workHistoryLength={d.workMode.historyLength}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden">
              <CrmWorkModeBar
                allChecked={d.allChecked} someChecked={d.someChecked} toggleAll={d.toggleAll}
                selectMode={selectMode} onToggleSelectMode={handleToggleSelectMode}
                workModeEnabled={d.workMode.enabled} onWorkModeToggle={() => d.workMode.enabled ? d.workMode.deactivate() : d.workMode.activate()}
                onUndo={d.workMode.undo} onRedo={d.workMode.redo} canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                historyPosition={d.workMode.historyPosition} historyLength={d.workMode.historyLength}
                onLocate={() => { if (d.workMode.activeId) d.cardRefsMap.current.get(d.workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                canLocate={!!d.workMode.activeId && d.filtered.some(l => l.id === d.workMode.activeId)}
                onResetHistory={d.workMode.resetHistory}
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
                    onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif}
                    onDetail={(l, idx) => d.setDetailLead({ lead: l, index: idx })}
                    onOpenChat={onOpenChat} onOpenRdv={onOpenRdv} onConnectAsClient={onConnectAsClient}
                    selectMode={selectMode}
                    cardRef={el => { if (el) d.cardRefsMap.current.set(lead.id, el); else d.cardRefsMap.current.delete(lead.id); }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${tokens.table.rowBorder}` }}>
              <p className="text-xs" style={{ color: tokens.table.footerText }}>{d.filtered.length} lead{d.filtered.length !== 1 ? 's' : ''} affiche{d.filtered.length !== 1 ? 's' : ''}</p>
              {d.selected.size > 0 && (
                <p className="text-xs" style={{ color: tokens.danger.text }}>{d.selected.size} selectionne{d.selected.size > 1 ? 's' : ''}</p>
              )}
              {d.filtered.length === 0 && (d.filterNom || d.filterPrenom || d.filterEmail || d.filterTel) && (
                <p className="text-xs" style={{ color: tokens.table.footerText }}>Aucun resultat pour ces filtres</p>
              )}
            </div>
          </>
        )}
      </div>

      {d.detailLead && (
        <DetailModal lead={d.detailLead.lead} gradIndex={d.detailLead.index} onClose={() => d.setDetailLead(null)} statutDefs={d.statutDefs} />
      )}

      {d.showTransfer && (
        <TransferModal count={d.selected.size} onClose={() => d.setShowTransfer(false)} onConfirm={d.handleTransfer} />
      )}
    </div>
  );
}
