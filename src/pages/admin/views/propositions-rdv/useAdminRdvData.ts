import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { RdvProposal, filterToStatus } from '../../../vendor/views/rdvPropositionsConstants';
import { useTimezone } from '../../../../hooks/useTimezone';
import { localToUTC } from '../../../../lib/timezoneUtils';
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
    if (isSimulating) return;
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({ status: 'confirmed', responded_at: now, responded_by: 'admin' }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed', responded_at: now, responded_by: 'admin' } : r));
  }

  async function handleRefuse(id: string) {
    if (isSimulating) return;
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({ status: 'cancelled', responded_at: now, responded_by: 'admin' }).eq('id', id);
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
    if (isSimulating) return;
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);
    await supabase.from('rdv_proposals').delete().in('id', ids);
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
    vendorName, toggleSelect, toggleAll, load,
  };
}
