import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useTimezone } from '../../../../hooks/useTimezone';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { localToUTC } from '../../../../lib/timezoneUtils';
import { getVisibleRdvProposals } from '../../../vendor/views/rdvChainFilter';
import type { RdvProposal } from './clientRdvConstants';
import { filterToStatus } from './clientRdvConstants';

interface UseClientRdvDataOptions {
  clientEmail: string;
  onMount?: () => void;
}

export function useClientRdvData({ clientEmail, onMount }: UseClientRdvDataOptions) {
  const { timezone: CLIENT_TZ, userName } = useTimezone();
  const companyId = useCompanyId();
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tous');
  const [counterTarget, setCounterTarget] = useState<RdvProposal | null>(null);
  const [counterSaving, setCounterSaving] = useState(false);
  const [counterError, setCounterError] = useState('');
  const [showNewRdv, setShowNewRdv] = useState(false);
  const [newRdvSaving, setNewRdvSaving] = useState(false);
  const [newRdvError, setNewRdvError] = useState('');

  useEffect(() => {
    onMount?.();
  }, [onMount]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: byCol } = await supabase
      .from('leads')
      .select('id')
      .eq('email', clientEmail);
    const { data: byJson } = await supabase
      .from('leads')
      .select('id')
      .is('email', null)
      .eq('data->>Email', clientEmail);
    const allLeads = [...(byCol ?? []), ...(byJson ?? [])];
    const seenIds = new Set<string>();
    const leadIds = allLeads.filter(l => { if (seenIds.has(l.id)) return false; seenIds.add(l.id); return true; }).map(l => l.id);

    let results: RdvProposal[] = [];
    const { data: byEmail } = await supabase
      .from('rdv_proposals')
      .select('*')
      .eq('lead_email', clientEmail)
      .order('created_at', { ascending: false });
    if (byEmail) results = byEmail as RdvProposal[];

    if (leadIds.length > 0) {
      const { data: byLeadId } = await supabase
        .from('rdv_proposals')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });
      if (byLeadId) {
        const existingIds = new Set(results.map(r => r.id));
        for (const r of byLeadId as RdvProposal[]) {
          if (!existingIds.has(r.id)) results.push(r);
        }
      }
    }
    results.sort((a, b) => b.created_at.localeCompare(a.created_at));
    setRdvs(results);
    setLoading(false);
  }, [clientEmail]);

  useEffect(() => { load(); }, [load]);

  const visibleRdvs = useMemo(() => getVisibleRdvProposals(rdvs), [rdvs]);
  const filtered = visibleRdvs.filter(r => {
    if (filter === 'Tous') return true;
    return r.status === filterToStatus[filter];
  });

  const todayStr = new Date().toISOString().split('T')[0];

  async function handleAccept(id: string) {
    const now = new Date().toISOString();
    const rdv = rdvs.find(r => r.id === id);
    let vendorId: string | null = null;
    if (rdv && !rdv.vendor_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('vendor_id')
        .eq('email', clientEmail)
        .maybeSingle();
      if (lead?.vendor_id) vendorId = lead.vendor_id;
    }
    const updatePayload: Record<string, unknown> = {
      status: 'confirmed',
      responded_at: now,
      responded_by: 'client',
      seen_by_admin: false,
      seen_by_vendor: false,
    };
    if (vendorId) updatePayload.vendor_id = vendorId;
    await supabase.from('rdv_proposals').update(updatePayload).eq('id', id);

    if (rdv?.parent_proposal_id) {
      await supabase.from('rdv_proposals').update({
        status: 'counter_proposed',
        responded_at: now,
        responded_by: 'client',
      }).eq('id', rdv.parent_proposal_id).in('status', ['pending', 'counter_proposed']);

      await supabase.from('rdv_proposals').update({
        status: 'counter_proposed',
        responded_at: now,
        responded_by: 'client',
      }).eq('parent_proposal_id', rdv.parent_proposal_id).neq('id', id).in('status', ['pending']);
    }

    load();
  }

  async function handleRefuse(id: string) {
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({
      status: 'cancelled',
      responded_at: now,
      responded_by: 'client',
      seen_by_admin: false,
      seen_by_vendor: false,
    }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', responded_at: now, responded_by: 'client' } : r));
  }

  function handleOpenCounter(id: string) {
    const rdv = rdvs.find(r => r.id === id);
    if (rdv && rdv.status === 'pending') {
      setCounterTarget(rdv);
      setCounterError('');
    }
  }

  async function handleCancelOwn(id: string) {
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({
      status: 'cancelled',
      responded_at: now,
      responded_by: 'client',
      seen_by_admin: false,
      seen_by_vendor: false,
    }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', responded_at: now, responded_by: 'client' } : r));
  }

  async function handleCounterSubmit(date: string, time: string, message: string) {
    if (!counterTarget) return;
    const appointmentCheck = new Date(localToUTC(date, time, CLIENT_TZ));
    if (appointmentCheck.getTime() <= Date.now()) {
      setCounterError('Veuillez choisir une date et une heure futures.');
      return;
    }
    setCounterError('');
    setCounterSaving(true);

    await supabase.from('rdv_proposals').update({
      status: 'counter_proposed',
      responded_at: new Date().toISOString(),
      responded_by: 'client',
    }).eq('id', counterTarget.id);

    const appointmentUtc = localToUTC(date, time, CLIENT_TZ);
    await supabase.from('rdv_proposals').insert({
      lead_name: counterTarget.lead_name,
      lead_phone: counterTarget.lead_phone,
      lead_email: counterTarget.lead_email,
      lead_id: counterTarget.lead_id || null,
      vendor_id: counterTarget.vendor_id || null,
      proposed_date: date,
      proposed_time: time,
      motif: counterTarget.motif,
      description: counterTarget.description,
      notes: '',
      status: 'pending',
      created_by_role: 'client',
      created_by_name: userName || counterTarget.lead_name,
      target_role: 'admin',
      appointment_utc: appointmentUtc,
      source_timezone: CLIENT_TZ,
      parent_proposal_id: counterTarget.id,
      counter_message: message,
      seen_by_client: true,
      seen_by_admin: false,
      seen_by_vendor: false,
      ...(companyId ? { company_id: companyId } : {}),
    });

    setCounterSaving(false);
    setCounterTarget(null);
    load();
  }

  async function handleNewRdvSubmit(date: string, time: string, description: string) {
    const appointmentCheck = new Date(localToUTC(date, time, CLIENT_TZ));
    if (appointmentCheck.getTime() <= Date.now()) {
      setNewRdvError('Veuillez choisir une date et une heure futures.');
      return;
    }
    setNewRdvError('');
    setNewRdvSaving(true);

    const { data: leadByCol } = await supabase
      .from('leads')
      .select('id, prenom, nom, email, telephone, vendor_id, data')
      .eq('email', clientEmail)
      .limit(1)
      .maybeSingle();
    const { data: leadByJson } = !leadByCol
      ? await supabase
          .from('leads')
          .select('id, prenom, nom, email, telephone, vendor_id, data')
          .is('email', null)
          .eq('data->>Email', clientEmail)
          .limit(1)
          .maybeSingle()
      : { data: null };

    const lead = leadByCol || leadByJson;
    if (!lead) {
      setNewRdvError('Impossible de trouver vos informations.');
      setNewRdvSaving(false);
      return;
    }

    const d = (lead.data && typeof lead.data === 'object') ? lead.data as Record<string, string> : {};
    const leadName = [lead.prenom || d.Prenom || d.prenom, lead.nom || d.Nom || d.nom].filter(Boolean).join(' ') || clientEmail;
    const leadPhone = lead.telephone || d.Telephone || d.telephone || '';
    const leadEmail = lead.email || d.Email || d.email || clientEmail;
    const leadVendorId = lead.vendor_id || null;

    const appointmentUtc = localToUTC(date, time, CLIENT_TZ);

    await supabase.from('rdv_proposals').insert({
      lead_name: leadName,
      lead_phone: leadPhone,
      lead_email: leadEmail,
      lead_id: lead.id,
      vendor_id: leadVendorId,
      proposed_date: date,
      proposed_time: time,
      motif: '',
      description,
      notes: '',
      status: 'pending',
      created_by_role: 'client',
      created_by_name: userName || leadName,
      target_role: leadVendorId ? 'vendor' : 'admin',
      appointment_utc: appointmentUtc,
      source_timezone: CLIENT_TZ,
      seen_by_client: true,
      seen_by_admin: false,
      seen_by_vendor: false,
      ...(companyId ? { company_id: companyId } : {}),
    });

    setNewRdvSaving(false);
    setShowNewRdv(false);
    load();
  }

  return {
    rdvs, loading, filter, setFilter, filtered, todayStr,
    counterTarget, setCounterTarget, counterSaving, counterError,
    showNewRdv, setShowNewRdv, newRdvSaving, newRdvError, setNewRdvError,
    handleAccept, handleRefuse, handleOpenCounter, handleCancelOwn,
    handleCounterSubmit, handleNewRdvSubmit,
    CLIENT_TZ,
  };
}
