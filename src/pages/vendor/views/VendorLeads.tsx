import { useState, useCallback } from 'react';
import { Users, Phone, Mail, ChevronDown, Filter, SlidersHorizontal } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTimezone } from '../../../hooks/useTimezone';
import DualScrollWrapper from '../../../components/DualScrollWrapper';
import VendorLeadDetailModal from './VendorLeadDetailModal';
import VendorLeadDesktopRow from './leads/VendorLeadDesktopRow';
import VendorLeadMobileCard from './leads/VendorLeadMobileCard';
import VendorLeadWorkModeBar from './leads/VendorLeadWorkModeBar';
import { useVendorLeadsData } from './leads/useVendorLeadsData';
import type { VendorLeadsProps } from './vendorLeadsTypes';

export type { VendorChatLeadRef } from './vendorLeadsTypes';

export default function VendorLeads({ vendorId, onOpenChat, onConnectAsClient, onOpenRdv }: VendorLeadsProps) {
  const tokens = useThemeTokens();
  const { timezone } = useTimezone();
  const d = useVendorLeadsData(vendorId);
  const colSep = { borderRight: `1px solid ${tokens.table.colSep}` };
  const showLoading = d.loading || !vendorId;

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

      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        {/* Desktop filters */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>
            <Filter className="w-3.5 h-3.5" style={{ color: tokens.text.tertiary }} />
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>Filtres de recherche</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par email..." value={d.filterEmail} onChange={e => d.setFilterEmail(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all placeholder-slate-600" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par numero..." value={d.filterTel} onChange={e => d.setFilterTel(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all placeholder-slate-600" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
              <div className="relative">
                <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par prenom..." value={d.filterPrenom} onChange={e => d.setFilterPrenom(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all placeholder-slate-600" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="relative">
                <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par nom..." value={d.filterNom} onChange={e => d.setFilterNom(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all placeholder-slate-600" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
              <div className="relative">
                <select value={d.statutFilter} onChange={e => d.setStatutFilter(e.target.value)} className="w-full pl-3 pr-7 py-2 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}>
                  <option value="Tous" style={{ background: tokens.selectBg }}>Tous les statuts</option>
                  {d.statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}
                  <option value="sans_statut" style={{ background: tokens.selectBg }}>Sans statut</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.text.quaternary }} />
              </div>
              <div className="relative">
                <select value={d.sortOrder} onChange={e => d.setSortOrder(e.target.value as 'recent' | 'ancien')} className="w-full pl-3 pr-7 py-2 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}>
                  <option value="recent" style={{ background: tokens.selectBg }}>Plus recent</option>
                  <option value="ancien" style={{ background: tokens.selectBg }}>Plus ancien</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.text.quaternary }} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile filters */}
        <div className="md:hidden px-3 py-3 space-y-2">
          <div className="relative">
            <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
            <input type="text" placeholder="Rechercher par email..." value={d.filterEmail} onChange={e => d.setFilterEmail(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
          </div>
          <button
            onClick={() => d.setMobileFiltersOpen(!d.mobileFiltersOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: (d.filterTel || d.filterPrenom || d.filterNom || d.statutFilter !== 'Tous' || d.sortOrder !== 'recent') ? tokens.accent.bg : tokens.input.bg,
              border: `1px solid ${(d.filterTel || d.filterPrenom || d.filterNom || d.statutFilter !== 'Tous' || d.sortOrder !== 'recent') ? tokens.accent.border : tokens.input.border}`,
              color: (d.filterTel || d.filterPrenom || d.filterNom || d.statutFilter !== 'Tous' || d.sortOrder !== 'recent') ? tokens.accent.text : tokens.text.secondary,
            }}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {(() => {
                const count = [d.filterTel ? 1 : 0, d.filterPrenom ? 1 : 0, d.filterNom ? 1 : 0, d.statutFilter !== 'Tous' ? 1 : 0, d.sortOrder !== 'recent' ? 1 : 0].reduce((a, b) => a + b, 0);
                return count > 0 ? `${count} filtre${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''}` : 'Filtres';
              })()}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${d.mobileFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
          {d.mobileFiltersOpen && (
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par numero..." value={d.filterTel} onChange={e => d.setFilterTel(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                  <input type="text" placeholder="Prenom..." value={d.filterPrenom} onChange={e => d.setFilterPrenom(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
                </div>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                  <input type="text" placeholder="Nom..." value={d.filterNom} onChange={e => d.setFilterNom(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select value={d.statutFilter} onChange={e => d.setStatutFilter(e.target.value)} className="w-full pl-3 pr-7 py-2.5 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}>
                    <option value="Tous" style={{ background: tokens.selectBg }}>Tous les statuts</option>
                    {d.statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}
                    <option value="sans_statut" style={{ background: tokens.selectBg }}>Sans statut</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.text.quaternary }} />
                </div>
                <div className="relative">
                  <select value={d.sortOrder} onChange={e => d.setSortOrder(e.target.value as 'recent' | 'ancien')} className="w-full pl-3 pr-7 py-2.5 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}>
                    <option value="recent" style={{ background: tokens.selectBg }}>Plus recent</option>
                    <option value="ancien" style={{ background: tokens.selectBg }}>Plus ancien</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.text.quaternary }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
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
              />
              <DualScrollWrapper deps={[d.filtered.length]}>
                <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 'max-content' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.table.headerBorder}`, background: tokens.table.headerBg }}>
                      {(selectMode || d.workMode.enabled) && <th className="px-2 py-3 w-11" style={colSep}></th>}
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase w-12" style={{ color: tokens.table.headerText, ...colSep }}>#</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Nom</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Prenom</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Email</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Telephone</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Date d'ajout</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Statut</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Actions</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText }}>Acces</th>
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
                        onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif}
                        onDetail={(l, idx) => d.setDetailLead({ lead: l, index: idx })}
                        onOpenChat={onOpenChat} onOpenRdv={onOpenRdv} onConnectAsClient={onConnectAsClient}
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
                    onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif}
                    onDetail={(l, idx) => d.setDetailLead({ lead: l, index: idx })}
                    onOpenChat={onOpenChat} onOpenRdv={onOpenRdv} onConnectAsClient={onConnectAsClient}
                    cardRef={el => { if (el) d.cardRefsMap.current.set(lead.id, el); else d.cardRefsMap.current.delete(lead.id); }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${tokens.table.rowBorder}` }}>
              <p className="text-xs" style={{ color: tokens.table.footerText }}>{d.filtered.length} lead{d.filtered.length !== 1 ? 's' : ''} affiche{d.filtered.length !== 1 ? 's' : ''}</p>
              {d.selected.size > 0 && (<p className="text-xs" style={{ color: tokens.danger.text }}>{d.selected.size} selectionne{d.selected.size > 1 ? 's' : ''}</p>)}
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
    </div>
  );
}
