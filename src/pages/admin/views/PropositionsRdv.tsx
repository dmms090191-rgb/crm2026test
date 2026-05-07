import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Plus, Clock, Phone, Mail, Users, Pencil, CheckCircle, XCircle, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { RdvProposal, statusConfig, filterToStatus, formatDate } from '../../vendor/views/rdvPropositionsConstants';
import RdvEditModal from '../../vendor/views/RdvEditModal';
import RdvAddForm from '../../vendor/views/RdvAddForm';
import CheckBox from './crm/CheckBox';
import { useTimezone } from '../../../hooks/useTimezone';
import { localToUTC, getRdvLocalTime, getRdvLocalDate } from '../../../lib/timezoneUtils';
import { AdminRdvFilters, AdminRdvRow, AdminRdvBulkBar, AdminRdvDeleteModal } from './propositions-rdv';
import DualScrollWrapper from '../../../components/DualScrollWrapper';

interface RdvLeadRef { id: string; nom: string; prenom: string; email: string; tel?: string; }
interface PropositionsRdvProps { initialLead?: RdvLeadRef | null; onInitialLeadConsumed?: () => void; onNavigateToCrm?: () => void; }
interface VendorOption { id: string; first_name: string; last_name: string; }

const emptyForm = () => ({
  proposed_date: new Date().toISOString().split('T')[0],
  proposed_time: '10:00', motif: '', description: '', notes: '',
});

export default function PropositionsRdv({ initialLead, onInitialLeadConsumed, onNavigateToCrm }: PropositionsRdvProps) {
  const tokens = useThemeTokens();
  const { timezone, userName } = useTimezone();
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tous');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [editRdv, setEditRdv] = useState<RdvProposal | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm());
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [pendingLeadName, setPendingLeadName] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailRdv, setDetailRdv] = useState<RdvProposal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rdvData }, { data: vendorData }] = await Promise.all([
      supabase.from('rdv_proposals').select('*').order('proposed_date', { ascending: true }).order('proposed_time', { ascending: true }),
      supabase.from('vendors').select('id, first_name, last_name').order('first_name'),
    ]);
    if (rdvData) setRdvs(rdvData as RdvProposal[]);
    if (vendorData) setVendors(vendorData as VendorOption[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (initialLead) {
      const fullName = [initialLead.prenom, initialLead.nom].filter(Boolean).join(' ');
      setPendingLeadName(fullName);
      setPendingLeadId(initialLead.id);
      setShowAdd(true);
      onInitialLeadConsumed?.();
    }
  }, [initialLead, onInitialLeadConsumed]);

  const filtered = rdvs.filter(r => {
    if (filter !== 'Tous' && r.status !== filterToStatus[filter]) return false;
    if (vendorFilter !== 'all') return vendorFilter === 'none' ? !r.vendor_id : r.vendor_id === vendorFilter;
    return true;
  });
  const todayStr = new Date().toISOString().split('T')[0];
  const statusCounts = rdvs.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  async function handleAccept(id: string) {
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({ status: 'confirmed', responded_at: now, responded_by: 'admin' }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed', responded_at: now, responded_by: 'admin' } : r));
  }

  async function handleRefuse(id: string) {
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({ status: 'cancelled', responded_at: now, responded_by: 'admin' }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', responded_at: now, responded_by: 'admin' } : r));
  }

  async function handleAdd() {
    if (!newForm.proposed_date) return;
    setSaving(true);
    let leadName = '';
    let leadEmail = '';
    let leadPhone = '';
    let leadVendorId: string | null = null;
    if (pendingLeadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('prenom, nom, email, telephone, vendor_id, data')
        .eq('id', pendingLeadId)
        .maybeSingle();
      if (lead) {
        const d = (lead.data && typeof lead.data === 'object') ? lead.data as Record<string, string> : {};
        leadName = [lead.prenom || d.Prenom || d.prenom, lead.nom || d.Nom || d.nom].filter(Boolean).join(' ');
        leadEmail = lead.email || d.Email || d.email || '';
        leadPhone = lead.telephone || d.Telephone || d.telephone || '';
        leadVendorId = lead.vendor_id || null;
      }
    }
    const appointmentUtc = localToUTC(newForm.proposed_date, newForm.proposed_time, timezone);
    await supabase.from('rdv_proposals').insert({
      lead_name: leadName,
      lead_phone: leadPhone,
      lead_email: leadEmail,
      proposed_date: newForm.proposed_date,
      proposed_time: newForm.proposed_time,
      motif: newForm.motif.trim(),
      description: newForm.description.trim(),
      notes: newForm.notes.trim(),
      status: 'pending',
      created_by_role: 'admin',
      created_by_name: userName,
      appointment_utc: appointmentUtc,
      source_timezone: timezone,
      ...(pendingLeadId ? { lead_id: pendingLeadId } : {}),
      ...(leadVendorId ? { vendor_id: leadVendorId } : {}),
    });
    setSaving(false);
    setShowAdd(false);
    setNewForm(emptyForm());
    setPendingLeadId(null);
    setPendingLeadName('');
    load();
  }

  function vendorName(vendorId: string | null) {
    if (!vendorId) return null;
    const v = vendors.find(vn => vn.id === vendorId);
    return v ? `${v.first_name} ${v.last_name}` : null;
  }
  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)));
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);
    await supabase.from('rdv_proposals').delete().in('id', ids);
    setSelected(new Set());
    setConfirmDelete(false);
    setDeleting(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.heading.primary }}>Propositions RDV</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>
            {rdvs.length} proposition{rdvs.length !== 1 ? 's' : ''} au total
          </p>
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
          onPickContact={onNavigateToCrm}
          saving={saving}
        />
      )}

      {selected.size > 0 && (
        <AdminRdvBulkBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onDelete={() => setConfirmDelete(true)}
          tokens={tokens}
        />
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        <AdminRdvFilters
          filter={filter}
          setFilter={setFilter}
          vendorFilter={vendorFilter}
          setVendorFilter={setVendorFilter}
          vendors={vendors}
          tokens={tokens}
        />

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
            {/* Desktop table */}
            <div className="hidden md:block">
              <DualScrollWrapper deps={[loading, filtered.length]}>
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
                      {['Contact', 'Vendeur', 'Date & Heure', 'Coordonnees', 'Motif', 'Statut', 'Actions'].map(col => (
                        <th key={col} className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.table.headerText }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((rdv, idx) => (
                      <AdminRdvRow
                        key={rdv.id}
                        rdv={rdv}
                        idx={idx}
                        filteredLength={filtered.length}
                        tokens={tokens}
                        timezone={timezone}
                        todayStr={todayStr}
                        selected={selected.has(rdv.id)}
                        vendorName={vendorName(rdv.vendor_id)}
                        onToggleSelect={() => toggleSelect(rdv.id)}
                        onAccept={() => handleAccept(rdv.id)}
                        onRefuse={() => handleRefuse(rdv.id)}
                        onEdit={() => setEditRdv(rdv)}
                      />
                    ))}
                  </tbody>
                </table>
              </DualScrollWrapper>
            </div>

            {/* Mobile select-all */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>
              <CheckBox
                checked={filtered.length > 0 && selected.size === filtered.length}
                indeterminate={selected.size > 0 && selected.size < filtered.length}
                onChange={toggleAll}
              />
              <span className="text-[11px] font-medium" style={{ color: tokens.text.quaternary }}>Tout ({filtered.length})</span>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {filtered.map(rdv => {
                const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
                const isPending = rdv.status === 'pending';
                const vName = vendorName(rdv.vendor_id);
                return (
                  <div key={rdv.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckBox checked={selected.has(rdv.id)} onChange={() => toggleSelect(rdv.id)} />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailRdv(rdv)}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', color: '#fff' }}>
                              {rdv.lead_name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold truncate" style={{ color: tokens.table.cellText }}>{rdv.lead_name}</span>
                          </div>
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-x-3 text-[11px]" style={{ color: tokens.table.cellTextMuted }}>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                            {formatDate(getRdvLocalDate(rdv, timezone))}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                            {getRdvLocalTime(rdv, timezone)}
                          </span>
                          {vName && (
                            <span className="flex items-center gap-1 truncate">
                              <Users className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                              <span className="truncate">{vName}</span>
                            </span>
                          )}
                        </div>
                        {(rdv.lead_phone || rdv.lead_email) && (
                          <div className="mt-1 flex items-center gap-x-3 text-[11px]" style={{ color: tokens.table.cellTextMuted }}>
                            {rdv.lead_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                                {rdv.lead_phone}
                              </span>
                            )}
                            {rdv.lead_email && (
                              <span className="flex items-center gap-1 min-w-0">
                                <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                                <span className="truncate">{rdv.lead_email}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pl-6">
                      {isPending && (
                        <>
                          <button onClick={() => handleAccept(rdv.id)} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                            <CheckCircle className="w-3 h-3" />Accepter
                          </button>
                          <button onClick={() => handleRefuse(rdv.id)} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                            <XCircle className="w-3 h-3" />Refuser
                          </button>
                        </>
                      )}
                      <button onClick={() => setEditRdv(rdv)} className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold ${!isPending ? 'col-span-2' : ''}`} style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                        <Pencil className="w-3 h-3" />Modifier
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: `1px solid ${tokens.table.rowBorder}` }}>
            <p className="text-xs" style={{ color: tokens.table.footerText }}>
              {filtered.length} proposition{filtered.length !== 1 ? 's' : ''} affichee{filtered.length !== 1 ? 's' : ''}
              {vendorFilter !== 'all' && ` (filtre vendeur actif)`}
            </p>
          </div>
        )}
      </div>

      {editRdv && (
        <RdvEditModal rdv={editRdv} onClose={() => setEditRdv(null)} onSaved={load} />
      )}

      {confirmDelete && (
        <AdminRdvDeleteModal
          count={selected.size}
          deleting={deleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmDelete(false)}
          tokens={tokens}
        />
      )}

      {detailRdv && (() => {
        const cfg = statusConfig[detailRdv.status] ?? statusConfig.pending;
        const vName = vendorName(detailRdv.vendor_id);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3"
            style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(6px)' }}
            onClick={e => { if (e.target === e.currentTarget) setDetailRdv(null); }}
          >
            <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: 'min(28rem, calc(100vw - 24px))', maxHeight: 'calc(100vh - 32px)', background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${tokens.card.border}` }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', color: '#fff' }}>
                    {detailRdv.lead_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: tokens.modal.title }}>{detailRdv.lead_name}</p>
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold mt-0.5" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                  </div>
                </div>
                <button onClick={() => setDetailRdv(null)} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Date</p>
                    <p className="text-sm font-medium" style={{ color: tokens.modal.fieldValue }}>{formatDate(getRdvLocalDate(detailRdv, timezone))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Heure</p>
                    <p className="text-sm font-medium" style={{ color: tokens.modal.fieldValue }}>{getRdvLocalTime(detailRdv, timezone)}</p>
                  </div>
                </div>
                {vName && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Vendeur</p>
                    <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{vName}</p>
                  </div>
                )}
                {detailRdv.lead_phone && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Telephone</p>
                    <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{detailRdv.lead_phone}</p>
                  </div>
                )}
                {detailRdv.lead_email && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Email</p>
                    <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{detailRdv.lead_email}</p>
                  </div>
                )}
                {detailRdv.motif && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Motif</p>
                    <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{detailRdv.motif}</p>
                  </div>
                )}
                {detailRdv.description && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Description</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: tokens.modal.fieldValue }}>{detailRdv.description}</p>
                  </div>
                )}
                {detailRdv.notes && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Notes</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: tokens.modal.fieldValue }}>{detailRdv.notes}</p>
                  </div>
                )}
                {detailRdv.created_by_name && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Cree par</p>
                    <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{detailRdv.created_by_name} ({detailRdv.created_by_role})</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${tokens.card.border}` }}>
                {detailRdv.status === 'pending' && (
                  <>
                    <button onClick={() => { handleAccept(detailRdv.id); setDetailRdv(null); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                      <CheckCircle className="w-3 h-3" />Accepter
                    </button>
                    <button onClick={() => { handleRefuse(detailRdv.id); setDetailRdv(null); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                      <XCircle className="w-3 h-3" />Refuser
                    </button>
                  </>
                )}
                <button onClick={() => { setEditRdv(detailRdv); setDetailRdv(null); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                  <Pencil className="w-3 h-3" />Modifier
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
