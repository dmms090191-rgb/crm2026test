import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { RdvProposal, filterToStatus } from '../rdvPropositionsConstants';
import { useTimezone } from '../../../../hooks/useTimezone';
import { localToUTC } from '../../../../lib/timezoneUtils';

interface RdvLeadRef { id: string; nom: string; prenom: string; email: string; tel?: string; }

const emptyForm = () => ({
  proposed_date: new Date().toISOString().split('T')[0],
  proposed_time: '10:00', motif: '', description: '', notes: '',
});

export function useVendorRdvData(vendorDbId?: string | null, initialLead?: RdvLeadRef | null, onInitialLeadConsumed?: () => void) {
  const { timezone, userName } = useTimezone();
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tous');
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
    const { data } = await supabase
      .from('rdv_proposals')
      .select('*')
      .order('proposed_date', { ascending: true })
      .order('proposed_time', { ascending: true });
    if (data) setRdvs(data as RdvProposal[]);
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
    if (filter === 'Tous') return true;
    return r.status === filterToStatus[filter];
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const statusCounts = rdvs.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  async function handleAccept(id: string) {
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({ status: 'confirmed', responded_at: now, responded_by: 'vendor' }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed', responded_at: now, responded_by: 'vendor' } : r));
  }

  async function handleRefuse(id: string) {
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({ status: 'cancelled', responded_at: now, responded_by: 'vendor' }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', responded_at: now, responded_by: 'vendor' } : r));
  }

  async function handleAdd() {
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
    if (pendingLeadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('prenom, nom, email, telephone, data')
        .eq('id', pendingLeadId)
        .maybeSingle();
      if (lead) {
        const d = (lead.data && typeof lead.data === 'object') ? lead.data as Record<string, string> : {};
        leadName = [lead.prenom || d.Prenom || d.prenom, lead.nom || d.Nom || d.nom].filter(Boolean).join(' ');
        leadEmail = lead.email || d.Email || d.email || '';
        leadPhone = lead.telephone || d.Telephone || d.telephone || '';
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
      created_by_role: 'vendor',
      created_by_name: userName,
      appointment_utc: appointmentUtc,
      source_timezone: timezone,
      ...(vendorDbId ? { vendor_id: vendorDbId } : {}),
      ...(pendingLeadId ? { lead_id: pendingLeadId } : {}),
    });
    setSaving(false);
    setShowAdd(false);
    setNewForm(emptyForm());
    setPendingLeadId(null);
    setPendingLeadName('');
    load();
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
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

  return {
    rdvs, loading, filter, setFilter,
    editRdv, setEditRdv, showAdd, setShowAdd, newForm, setNewForm,
    pendingLeadId, setPendingLeadId, pendingLeadName, setPendingLeadName,
    saving, addError, selected, setSelected, deleting, confirmDelete, setConfirmDelete,
    detailRdv, setDetailRdv, filtered, todayStr, statusCounts, timezone,
    handleAccept, handleRefuse, handleAdd, handleBulkDelete,
    toggleSelect, toggleAll, load,
  };
}
