import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Hash, User, Mail, Phone, CalendarDays, Signal, Settings, Lock, Bot, Columns3, CheckSquare, Briefcase, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTimezone } from '../../../hooks/useTimezone';
import { useCompanyId } from '../../../hooks/useCompanyId';
import DualScrollWrapper from '../../../components/DualScrollWrapper';
import VendorLeadDetailModal from './VendorLeadDetailModal';
import VendorLeadDesktopRow from './leads/VendorLeadDesktopRow';
import VendorLeadMobileCard from './leads/VendorLeadMobileCard';
import VendorLeadWorkModeBar from './leads/VendorLeadWorkModeBar';
import VendorLeadsFilters from './leads/VendorLeadsFilters';
import { useVendorLeadsData } from './leads/useVendorLeadsData';
import useColumnOrder from '../../../components/table/useColumnOrder';
import useColumnOrderMobile from '../../../components/table/useColumnOrderMobile';
import ColumnOrganizerModal from '../../../components/table/ColumnOrganizerModal';
import { useCustomColumns } from '../../../hooks/useCustomColumns';
import { useActionMenuOrder } from '../../../components/action-menu/useActionMenuOrder';
import ToolbarOrganizerModal from '../../../components/toolbar/ToolbarOrganizerModal';
import type { ToolbarItem } from '../../../components/toolbar/ToolbarOrganizerModal';
import type { VendorLeadsProps } from './vendorLeadsTypes';

const VENDOR_LEADS_COLUMNS = [
  { key: 'hash', label: '#' },
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prenom' },
  { key: 'email', label: 'Email' },
  { key: 'telephone', label: 'Telephone' },
  { key: 'date_ajout', label: "Date d'ajout" },
  { key: 'statut', label: 'Statut', required: true },
  { key: 'actions', label: 'Actions', required: true },
  { key: 'acces', label: 'Acces', required: true },
  { key: 'ia', label: 'IA', required: true },
];

const VENDOR_HEADER_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  hash: Hash, nom: User, prenom: User, email: Mail, telephone: Phone,
  date_ajout: CalendarDays, statut: Signal, actions: Settings, acces: Lock, ia: Bot,
};

export type { VendorChatLeadRef } from './vendorLeadsTypes';

const SYNC_TS_KEY = 'talvex_columns_vendor_leads_sync_ts';

export default function VendorLeads({ vendorId, onOpenChat, onConnectAsClient, onOpenRdv }: VendorLeadsProps) {
  const tokens = useThemeTokens();
  const { timezone } = useTimezone();
  const companyId = useCompanyId();
  const d = useVendorLeadsData(vendorId);
  const colSep = { borderRight: `1px solid ${tokens.table.colSep}` };
  const showLoading = d.loading || !vendorId;
  const cc = useCustomColumns('vendor_leads');
  const allColumns = useMemo(() => [...VENDOR_LEADS_COLUMNS, ...cc.customDefs], [cc.customDefs]);
  const colOrder = useColumnOrder('talvex_columns_vendor_leads', allColumns);
  const colMobile = useColumnOrderMobile('talvex_columns_vendor_leads', allColumns);
  const [showColModal, setShowColModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [canCustomizeColumns, setCanCustomizeColumns] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('company_column_config')
      .select('desktop_order, desktop_hidden, mobile_order, mobile_card_style, pushed_at')
      .eq('company_id', companyId)
      .eq('table_key', 'vendor_leads')
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.pushed_at) return;
        const localTs = localStorage.getItem(SYNC_TS_KEY) || '';
        if (localTs >= data.pushed_at) return;
        const validKeys = new Set(VENDOR_LEADS_COLUMNS.map(c => c.key));
        const desktopOrder = (data.desktop_order as string[] || []).filter(k => validKeys.has(k));
        const desktopHidden = (data.desktop_hidden as string[] || []).filter(k => validKeys.has(k));
        if (desktopOrder.length > 0) {
          const missing = VENDOR_LEADS_COLUMNS.map(c => c.key).filter(k => !desktopOrder.includes(k));
          colOrder.saveAll({ order: [...desktopOrder, ...missing], hiddenDesktop: desktopHidden });
        }
        const mobileOrder = data.mobile_order as { key: string; role: string; visible: boolean }[] | null;
        if (mobileOrder && mobileOrder.length > 0) {
          const filteredMobile = mobileOrder.filter(e => validKeys.has(e.key));
          colMobile.saveMobile({ order: filteredMobile, cardStyle: (data.mobile_card_style as 'comfort') || 'comfort' });
        }
        try { localStorage.setItem(SYNC_TS_KEY, data.pushed_at); } catch {}
      });
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!vendorId) return;
    supabase.from('vendors').select('can_customize_columns').eq('id', vendorId).maybeSingle().then(({ data }) => {
      if (data) setCanCustomizeColumns(data.can_customize_columns !== false);
    });
  }, [vendorId]);
  const displayColumns = useMemo(() => allColumns.map(c => colOrder.labelOverrides[c.key] ? { ...c, label: colOrder.labelOverrides[c.key] } : c), [allColumns, colOrder.labelOverrides]);
  const colMap = useMemo(() => new Map(displayColumns.map(c => [c.key, c])), [displayColumns]);

  const VENDOR_TOOLBAR_DEFAULT = ['select', 'workmode', 'columns', 'organize'];
  const tbOrder = useActionMenuOrder('talvex_toolbar_order_vendor_leads', VENDOR_TOOLBAR_DEFAULT);
  const toolbarItems: ToolbarItem[] = useMemo(() => [
    { id: 'select', label: 'Selectionner', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'workmode', label: 'Mode travail', icon: <Briefcase className="w-3.5 h-3.5" />, pinned: true },
    { id: 'columns', label: 'Colonnes', icon: <Columns3 className="w-3.5 h-3.5" />, pinned: true },
    { id: 'organize', label: 'Organiser', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, pinned: true },
  ], []);

  const [selectMode, setSelectMode] = useState(false);
  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) d.setSelected(new Set());
      return !prev;
    });
  }, [d]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.heading.primary }}>Leads</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Leads qui vous sont attribues</p>
        </div>
        <div className="flex items-center gap-3">
          {!showLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
              <Users className="w-3.5 h-3.5" />
              {d.leads.length} lead{d.leads.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <VendorLeadsFilters
        filterEmail={d.filterEmail} setFilterEmail={d.setFilterEmail}
        filterTel={d.filterTel} setFilterTel={d.setFilterTel}
        filterPrenom={d.filterPrenom} setFilterPrenom={d.setFilterPrenom}
        filterNom={d.filterNom} setFilterNom={d.setFilterNom}
        statutFilter={d.statutFilter} setStatutFilter={d.setStatutFilter}
        sortOrder={d.sortOrder} setSortOrder={d.setSortOrder}
        statutDefs={d.statutDefs}
        mobileFiltersOpen={d.mobileFiltersOpen} setMobileFiltersOpen={d.setMobileFiltersOpen}
        tokens={tokens}
      />

      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}`, boxShadow: tokens.card.shadow }}>
        {showLoading ? (
          <div className="px-4 md:px-5 py-4 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: tokens.surface.hover }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-full w-1/3" style={{ background: tokens.surface.hover }} />
                  <div className="h-2.5 rounded-full w-2/3" style={{ background: tokens.surface.hover, opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : d.leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.surface.hover }}>
              <Users className="w-5 h-5" style={{ color: tokens.table.footerText }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucun lead attribue</p>
            <p className="text-xs" style={{ color: tokens.table.footerText }}>L'administrateur peut vous attribuer des leads depuis le CRM</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <VendorLeadWorkModeBar
                allChecked={d.allChecked} someChecked={d.someChecked} toggleAll={d.toggleAll}
                selectMode={selectMode} onToggleSelectMode={handleToggleSelectMode}
                workModeEnabled={d.workMode.enabled} onWorkModeToggle={() => d.workMode.enabled ? d.workMode.deactivate() : d.workMode.activate()}
                onUndo={d.workMode.undo} onRedo={d.workMode.redo} canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                historyPosition={d.workMode.historyPosition} historyLength={d.workMode.historyLength}
                onLocate={() => { if (d.workMode.activeId) d.rowRefsMap.current.get(d.workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                canLocate={!!d.workMode.activeId && d.filtered.some(l => l.id === d.workMode.activeId)}
                onResetHistory={d.workMode.resetHistory}
                onOpenColumns={() => { if (canCustomizeColumns) setShowColModal(true); }}
                onOpenOrganize={() => setShowOrgModal(true)}
                toolbarOrder={tbOrder.order}
                columnsLocked={!canCustomizeColumns}
              />
              <DualScrollWrapper deps={[d.filtered.length]}>
                <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content' }}>
                  <thead>
                    <tr className="sticky top-0 z-10" style={{ background: tokens.table.headerBg }}>
                      {(selectMode || d.workMode.enabled) && <th className="px-3 py-4 w-12" style={{ borderBottom: `2px solid ${tokens.accent.solid}` }}></th>}
                      {colOrder.visibleOrderedKeys.map(key => {
                        const col = colMap.get(key);
                        const Icon = VENDOR_HEADER_ICONS[key];
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
                      <VendorLeadDesktopRow
                        key={lead.id}
                        ref={el => { if (el) d.rowRefsMap.current.set(lead.id, el); else d.rowRefsMap.current.delete(lead.id); }}
                        lead={lead} index={i} statutDefs={d.statutDefs} isSelected={d.selected.has(lead.id)} timezone={timezone} colSep={colSep}
                        selectMode={selectMode}
                        workModeEnabled={d.workMode.enabled} isWorkActive={d.workMode.activeId === lead.id}
                        workHistoryLength={d.workMode.historyLength} workHistoryPosition={d.workMode.historyPosition}
                        canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                        onWorkSelect={d.workMode.select} onWorkUndo={d.workMode.undo} onWorkRedo={d.workMode.redo}
                        onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif} onToggleAi={d.handleToggleAi}
                        onDetail={(l, idx) => d.setDetailLead({ lead: l, index: idx })}
                        onOpenChat={onOpenChat} onOpenRdv={onOpenRdv} onConnectAsClient={onConnectAsClient}
                        columnOrder={colOrder.visibleOrderedKeys}
                        customColumnDefs={cc.customDefs}
                        customColumnValues={cc.getValuesForRow(lead.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </DualScrollWrapper>
            </div>

            {/* Mobile */}
            <div className="md:hidden">
              <VendorLeadWorkModeBar
                allChecked={d.allChecked} someChecked={d.someChecked} toggleAll={d.toggleAll}
                selectMode={selectMode} onToggleSelectMode={handleToggleSelectMode}
                workModeEnabled={d.workMode.enabled} onWorkModeToggle={() => d.workMode.enabled ? d.workMode.deactivate() : d.workMode.activate()}
                onUndo={d.workMode.undo} onRedo={d.workMode.redo} canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                historyPosition={d.workMode.historyPosition} historyLength={d.workMode.historyLength}
                onLocate={() => { if (d.workMode.activeId) d.cardRefsMap.current.get(d.workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                canLocate={!!d.workMode.activeId && d.filtered.some(l => l.id === d.workMode.activeId)}
                onResetHistory={d.workMode.resetHistory}
                onOpenColumns={() => { if (canCustomizeColumns) setShowColModal(true); }}
                onOpenOrganize={() => setShowOrgModal(true)}
                toolbarOrder={tbOrder.order}
                columnsLocked={!canCustomizeColumns}
              />
              <div className="divide-y" style={{ borderColor: tokens.table.rowBorder }}>
                {d.filtered.map((lead, i) => (
                  <VendorLeadMobileCard
                    key={lead.id}
                    lead={lead} index={i} statutDefs={d.statutDefs} timezone={timezone} isSelected={d.selected.has(lead.id)}
                    selectMode={selectMode}
                    workModeEnabled={d.workMode.enabled} workModeActiveId={d.workMode.activeId}
                    workHistoryLength={d.workMode.historyLength} workHistoryPosition={d.workMode.historyPosition}
                    canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                    onWorkSelect={d.workMode.select} onWorkUndo={d.workMode.undo} onWorkRedo={d.workMode.redo} onWorkReset={d.workMode.resetHistory}
                    onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif} onToggleAi={d.handleToggleAi}
                    onDetail={(l, idx) => d.setDetailLead({ lead: l, index: idx })}
                    onOpenChat={onOpenChat} onOpenRdv={onOpenRdv} onConnectAsClient={onConnectAsClient}
                    cardRef={el => { if (el) d.cardRefsMap.current.set(lead.id, el); else d.cardRefsMap.current.delete(lead.id); }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3.5" style={{ borderTop: `1px solid ${tokens.surface.border}`, background: tokens.table.headerBg }}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
                  <Users className="w-3 h-3" />{d.filtered.length}
                </span>
                <span className="text-xs" style={{ color: tokens.table.footerText }}>lead{d.filtered.length !== 1 ? 's' : ''} affiche{d.filtered.length !== 1 ? 's' : ''}</span>
              </div>
              {d.selected.size > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}>{d.selected.size} selectionne{d.selected.size > 1 ? 's' : ''}</span>
              )}
            </div>
          </>
        )}
      </div>

      {d.detailLead && (
        <VendorLeadDetailModal
          lead={d.detailLead.lead}
          gradIndex={d.detailLead.index}
          onClose={() => d.setDetailLead(null)}
          statutDefs={d.statutDefs}
          onConnect={(client) => { d.setDetailLead(null); onConnectAsClient?.(client); }}
        />
      )}

      {showColModal && <ColumnOrganizerModal columns={displayColumns} orderedKeys={colOrder.orderedKeys} hiddenDesktopKeys={colOrder.hiddenDesktopKeys} tableKey="vendor_leads" onSave={colOrder.saveAll} onReset={colOrder.resetAll} onClose={() => setShowColModal(false)} onCreateCustomColumn={cc.createColumn} onDeleteCustomColumn={cc.deleteColumn} onRenameCustomColumn={cc.renameColumn} onRenameLabel={colOrder.renameLabel} mobileOrder={colMobile.mobileOrder} mobileCardStyle={colMobile.cardStyle} onSaveMobile={colMobile.saveMobile} onResetMobile={colMobile.resetMobile} />}

      {showOrgModal && <ToolbarOrganizerModal items={toolbarItems} order={tbOrder.order} onSave={tbOrder.save} onClose={() => setShowOrgModal(false)} t={tokens} />}
    </div>
  );
}
