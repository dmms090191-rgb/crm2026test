import { CalendarDays, Plus, Globe } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { getTzLabel } from '../../../lib/timezoneUtils';
import { statusConfig } from './rdvPropositionsConstants';
import RdvEditModal from './RdvEditModal';
import RdvAddForm from './RdvAddForm';
import CheckBox from '../../admin/views/crm/CheckBox';
import { VendorRdvFilters, VendorRdvRow, VendorRdvBulkBar, VendorRdvDeleteModal } from './propositions-rdv';
import VendorRdvMobileCard from './propositions-rdv/VendorRdvMobileCard';
import VendorRdvDetailModal from './propositions-rdv/VendorRdvDetailModal';
import { useVendorRdvData } from './propositions-rdv/useVendorRdvData';

interface RdvLeadRef { id: string; nom: string; prenom: string; email: string; tel?: string; }
interface VendorPropositionsRdvProps {
  vendorDbId?: string | null;
  initialLead?: RdvLeadRef | null;
  onInitialLeadConsumed?: () => void;
  onNavigateToLeads?: (leadId?: string) => void;
}

export default function VendorPropositionsRdv({ vendorDbId, initialLead, onInitialLeadConsumed, onNavigateToLeads }: VendorPropositionsRdvProps) {
  const tokens = useThemeTokens();
  const {
    rdvs, loading, filter, setFilter,
    editRdv, setEditRdv, showAdd, setShowAdd, newForm, setNewForm,
    pendingLeadName, setPendingLeadId, setPendingLeadName,
    saving, addError, selected, setSelected, deleting, confirmDelete, setConfirmDelete,
    detailRdv, setDetailRdv, filtered, todayStr, statusCounts, timezone,
    handleAccept, handleRefuse, handleAdd, handleBulkDelete,
    toggleSelect, toggleAll, load,
  } = useVendorRdvData(vendorDbId, initialLead, onInitialLeadConsumed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.heading.primary }}>Propositions RDV</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs" style={{ color: tokens.text.quaternary }}>{rdvs.length} proposition{rdvs.length !== 1 ? 's' : ''} au total</p>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }}>
              <Globe className="w-2.5 h-2.5" />
              {getTzLabel(timezone)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
          style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle proposition
        </button>
      </div>

      <div className="flex items-center gap-3 md:gap-6 flex-wrap">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
            <span className="text-[11px] md:text-xs font-medium" style={{ color: tokens.text.tertiary }}>{cfg.label}</span>
            <span className="text-[11px] md:text-xs font-bold" style={{ color: cfg.color }}>{statusCounts[key] || 0}</span>
          </div>
        ))}
      </div>

      {showAdd && (
        <RdvAddForm
          form={newForm}
          leadName={pendingLeadName || undefined}
          onChange={(k, v) => setNewForm(f => ({ ...f, [k]: v }))}
          onSubmit={handleAdd}
          onCancel={() => { setShowAdd(false); setPendingLeadId(null); setPendingLeadName(''); }}
          onPickContact={onNavigateToLeads}
          saving={saving}
          error={addError}
        />
      )}

      {selected.size > 0 && (
        <VendorRdvBulkBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onDelete={() => setConfirmDelete(true)}
          tokens={tokens}
        />
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        <VendorRdvFilters filter={filter} setFilter={setFilter} tokens={tokens} />

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: tokens.accent.text }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.surface.hover }}>
              <CalendarDays className="w-5 h-5" style={{ color: tokens.table.footerText }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune proposition de RDV</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tokens.table.headerBorder}`, background: tokens.table.headerBg }}>
                    <th className="pl-5 pr-1 py-3 w-8">
                      <CheckBox
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        indeterminate={selected.size > 0 && selected.size < filtered.length}
                        onChange={toggleAll}
                      />
                    </th>
                    {['Contact', 'Date & Heure', 'Coordonnees', 'Motif', 'Statut', 'Actions'].map(col => (
                      <th key={col} className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.table.headerText }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rdv, idx) => (
                    <VendorRdvRow
                      key={rdv.id}
                      rdv={rdv}
                      idx={idx}
                      filteredLength={filtered.length}
                      tokens={tokens}
                      timezone={timezone}
                      todayStr={todayStr}
                      selected={selected.has(rdv.id)}
                      onToggleSelect={() => toggleSelect(rdv.id)}
                      onAccept={() => handleAccept(rdv.id)}
                      onCancel={() => handleRefuse(rdv.id)}
                      onEdit={() => setEditRdv(rdv)}
                      onGoToLead={rdv.lead_id ? () => onNavigateToLeads?.(rdv.lead_id!) : undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>
              <CheckBox
                checked={filtered.length > 0 && selected.size === filtered.length}
                indeterminate={selected.size > 0 && selected.size < filtered.length}
                onChange={toggleAll}
              />
              <span className="text-[11px] font-medium" style={{ color: tokens.text.quaternary }}>Tout ({filtered.length})</span>
            </div>

            <div className="md:hidden">
              {filtered.map((rdv, idx) => (
                <div key={rdv.id} style={{ borderTop: idx > 0 ? `1px solid ${tokens.table.rowBorder}` : 'none' }}>
                  <VendorRdvMobileCard
                    rdv={rdv}
                    timezone={timezone}
                    selected={selected.has(rdv.id)}
                    onToggleSelect={() => toggleSelect(rdv.id)}
                    onAccept={() => handleAccept(rdv.id)}
                    onCancel={() => handleRefuse(rdv.id)}
                    onEdit={() => setEditRdv(rdv)}
                    onDetail={() => setDetailRdv(rdv)}
                    onGoToLead={rdv.lead_id ? () => onNavigateToLeads?.(rdv.lead_id!) : undefined}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: `1px solid ${tokens.table.rowBorder}` }}>
            <p className="text-xs" style={{ color: tokens.table.footerText }}>{filtered.length} proposition{filtered.length !== 1 ? 's' : ''} affichee{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {editRdv && (
        <RdvEditModal rdv={editRdv} onClose={() => setEditRdv(null)} onSaved={load} callerRole="vendor" />
      )}

      {confirmDelete && (
        <VendorRdvDeleteModal
          count={selected.size}
          deleting={deleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmDelete(false)}
          tokens={tokens}
        />
      )}

      {detailRdv && (
        <VendorRdvDetailModal
          rdv={detailRdv}
          timezone={timezone}
          onClose={() => setDetailRdv(null)}
          onAccept={() => { handleAccept(detailRdv.id); setDetailRdv(null); }}
          onCancel={() => { handleRefuse(detailRdv.id); setDetailRdv(null); }}
          onEdit={() => { setEditRdv(detailRdv); setDetailRdv(null); }}
          onGoToLead={detailRdv.lead_id ? () => { setDetailRdv(null); onNavigateToLeads?.(detailRdv.lead_id!); } : undefined}
        />
      )}
    </div>
  );
}
