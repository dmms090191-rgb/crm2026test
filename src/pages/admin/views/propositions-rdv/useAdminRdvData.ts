import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { RdvProposal, filterToStatus } from '../../../vendor/views/rdvPropositionsConstants';
import { getVisibleRdvProposals, getChainIdsForSelected } from '../../../vendor/views/rdvChainFilter';
import { useTimezone } from '../../../../hooks/useTimezone';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { localToUTC, utcToLocal } from '../../../../lib/timezoneUtils';
import { useSimulation } from '../../../../contexts/SimulationContext';

interface RdvLeadRef { id: string; nom: string; prenom: string; email: string; tel?: string; }
interface VendorOption { id: string; first_name: string; last_name: string; }

const emptyForm = () => ({
  proposed_date: new Date().toISOString().split('T')[0],
  proposed_time: '10:00', motif: '', description: '', notes: '',
});

export function useAdminRdvData(initialLead?: RdvLeadRef | null, onInitialLeadConsumed?: () => void) {
  const { isSimulating } = useSimulation();
  const { timezone, userName } = useTimezone();
  const companyId = useCompanyId();
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
  const [addError, setAddError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailRdv, setDetailRdv] = useState<RdvProposal | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<RdvProposal | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: rdvData }, { data: vendorData }] = await Promise.all([
      supabase.from('rdv_proposals').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('vendors').select('id, first_name, last_name').eq('company_id', companyId).order('first_name'),
    ]);
    if (rdvData) setRdvs(rdvData as RdvProposal[]);
    if (vendorData) setVendors(vendorData as VendorOption[]);
    setLoading(false);
  }, [companyId]);

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

  const visibleRdvs = useMemo(() => getVisibleRdvProposals(rdvs), [rdvs]);
  const filtered = visibleRdvs.filter(r => {
    if (filter !== 'Tous' && r.status !== filterToStatus[filter]) return false;
    if (vendorFilter !== 'all') return vendorFilter === 'none' ? !r.vendor_id : r.vendor_id === vendorFilter;
    return true;
  });
  const todayStr = new Date().toISOString().split('T')[0];
  const statusCounts = visibleRdvs.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  async function handleAccept(id: string) {
    if (isSimulating) return;
    const now = new Date().toISOString();
    const rdv = rdvs.find(r => r.id === id);
    await supabase.from('rdv_proposals').update({ status: 'confirmed', responded_at: now, responded_by: 'admin', seen_by_client: false }).eq('id', id);
    if (rdv?.parent_proposal_id) {
      await supabase.from('rdv_proposals').update({ status: 'cancelled', responded_at: now, responded_by: 'admin' }).eq('id', rdv.parent_proposal_id).in('status', ['pending', 'counter_proposed']);
    }
    if (rdv?.parent_proposal_id) {
      await supabase.from('rdv_proposals').update({ status: 'cancelled', responded_at: now, responded_by: 'admin' }).eq('parent_proposal_id', rdv.parent_proposal_id).neq('id', id).eq('status', 'pending');
    }
    load();
  }

  async function handleRefuse(id: string) {
    if (isSimulating) return;
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({ status: 'cancelled', responded_at: now, responded_by: 'admin', seen_by_client: false }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', responded_at: now, responded_by: 'admin' } : r));
  }

  async function handleAdd() {
    if (isSimulating) return;
    if (!newForm.proposed_date) return;
    const appointmentCheck = new Date(localToUTC(newForm.proposed_date, newForm.proposed_time, timezone));
    if (appointmentCheck.getTime() <= Date.now()) {
      setAddError('Impossible de proposer un rendez-vous dans le passe. Veuillez choisir une date et une heure futures.');
      return;
    }
    setAddError('');
    setSaving(true);
    let leadName = '';
    let leadEmail = '';
    let leadPhone = '';
    let leadVendorId: string | null = null;
    if (pendingLeadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('prenom, nom, email, telephone, vendor_id, data')
        .eq('company_id', companyId)
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
      ...(companyId ? { company_id: companyId } : {}),
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

  async function handleAcceptReschedule(id: string) {
    if (isSimulating) return;
    const rdv = rdvs.find(r => r.id === id);
    if (!rdv || rdv.reschedule_status !== 'pending') return;
    await supabase.from('rdv_proposals').update({
      proposed_date: rdv.reschedule_date,
      proposed_time: rdv.reschedule_time,
      appointment_utc: rdv.reschedule_utc,
      reschedule_status: 'accepted',
      reschedule_date: null,
      reschedule_time: null,
      reschedule_utc: null,
      reschedule_reason: null,
      reschedule_requested_at: null,
      reschedule_requested_by: null,
      seen_by_client: false,
      seen_by_vendor: false,
    }).eq('id', id);
    load();
  }

  async function handleRefuseReschedule(id: string) {
    if (isSimulating) return;
    const rdv = rdvs.find(r => r.id === id);
    if (!rdv || rdv.reschedule_status !== 'pending') return;
    await supabase.from('rdv_proposals').update({
      reschedule_status: 'refused',
      reschedule_date: null,
      reschedule_time: null,
      reschedule_utc: null,
      reschedule_reason: null,
      reschedule_requested_at: null,
      reschedule_requested_by: null,
      seen_by_client: false,
      seen_by_vendor: false,
    }).eq('id', id);
    load();
  }

  async function handleCounterReschedule(id: string, date: string, time: string) {
    if (isSimulating) return;
    const rdv = rdvs.find(r => r.id === id);
    if (!rdv || rdv.reschedule_status !== 'pending') return;
    const appointmentUtc = localToUTC(date, time, timezone);
    await supabase.from('rdv_proposals').update({
      proposed_date: date,
      proposed_time: time,
      appointment_utc: appointmentUtc,
      source_timezone: timezone,
      reschedule_status: null,
      reschedule_date: null,
      reschedule_time: null,
      reschedule_utc: null,
      reschedule_reason: null,
      reschedule_requested_at: null,
      reschedule_requested_by: null,
      seen_by_client: false,
      seen_by_vendor: false,
    }).eq('id', id);
    load();
  }

  async function handleBulkDelete() {
    if (isSimulating) return;
    if (selected.size === 0) return;
    setDeleting(true);
    const selectedIds = Array.from(selected);
    const allChainIds = getChainIdsForSelected(rdvs, selectedIds);
    await supabase.from('rdv_proposals').delete().in('id', allChainIds);
    setSelected(new Set());
    setConfirmDelete(false);
    setDeleting(false);
    load();
  }

  return {
    rdvs, vendors, loading, filter, setFilter, vendorFilter, setVendorFilter,
    editRdv, setEditRdv, showAdd, setShowAdd, newForm, setNewForm,
    pendingLeadId, setPendingLeadId, pendingLeadName, setPendingLeadName,
    saving, addError, selected, setSelected, deleting, confirmDelete, setConfirmDelete,
    detailRdv, setDetailRdv, filtered, todayStr, statusCounts, timezone,
    handleAccept, handleRefuse, handleAdd, handleBulkDelete,
    handleAcceptReschedule, handleRefuseReschedule, handleCounterReschedule,
    vendorName, toggleSelect, toggleAll, load,
    rescheduleTarget, setRescheduleTarget,
  };
}
