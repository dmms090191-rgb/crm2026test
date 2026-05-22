import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useTimezone } from '../../../../hooks/useTimezone';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { getVisibleRdvProposals } from '../../../vendor/views/rdvChainFilter';
import type { RdvProposal } from './clientRdvConstants';
import { filterToStatus } from './clientRdvConstants';
import { acceptRdv, refuseRdv, cancelOwnRdv, acceptReschedule, refuseReschedule } from './clientRdvActions';
import { submitCounter, submitNewRdv } from './clientRdvSubmit';

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

  useEffect(() => { onMount?.(); }, [onMount]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: byCol } = await supabase
      .from('leads').select('id').eq('email', clientEmail);
    const { data: byJson } = await supabase
      .from('leads').select('id').is('email', null).eq('data->>Email', clientEmail);
    const allLeads = [...(byCol ?? []), ...(byJson ?? [])];
    const seenIds = new Set<string>();
    const leadIds = allLeads.filter(l => { if (seenIds.has(l.id)) return false; seenIds.add(l.id); return true; }).map(l => l.id);

    let results: RdvProposal[] = [];
    const { data: byEmail } = await supabase
      .from('rdv_proposals').select('*').eq('lead_email', clientEmail).order('created_at', { ascending: false });
    if (byEmail) results = byEmail as RdvProposal[];

    if (leadIds.length > 0) {
      const { data: byLeadId } = await supabase
        .from('rdv_proposals').select('*').in('lead_id', leadIds).order('created_at', { ascending: false });
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

  const handleAccept = (id: string) => acceptRdv(id, rdvs, clientEmail, load);
  const handleRefuse = (id: string) => refuseRdv(id, setRdvs);
  const handleCancelOwn = (id: string) => cancelOwnRdv(id, setRdvs);
  const handleAcceptReschedule = (id: string) => acceptReschedule(id, rdvs, load);
  const handleRefuseReschedule = (id: string) => refuseReschedule(id, rdvs, load);

  function handleOpenCounter(id: string) {
    const rdv = rdvs.find(r => r.id === id);
    if (rdv && rdv.status === 'pending') { setCounterTarget(rdv); setCounterError(''); }
  }

  function handleOpenCounterReschedule(id: string) {
    const rdv = rdvs.find(r => r.id === id);
    if (rdv && rdv.reschedule_status === 'pending' && rdv.reschedule_date && rdv.reschedule_time) {
      setCounterTarget({ ...rdv, proposed_date: rdv.reschedule_date, proposed_time: rdv.reschedule_time, appointment_utc: rdv.reschedule_utc ?? null } as typeof rdv);
      setCounterError('');
    }
  }

  function handleRequestReschedule(id: string) {
    const rdv = rdvs.find(r => r.id === id);
    if (rdv && rdv.status === 'confirmed' && !rdv.reschedule_status) { setCounterTarget(rdv); setCounterError(''); }
  }

  async function handleCounterSubmit(date: string, time: string, message: string) {
    if (!counterTarget) return;
    setCounterError('');
    setCounterSaving(true);
    const err = await submitCounter(counterTarget, rdvs, date, time, message, CLIENT_TZ, userName, companyId, load);
    setCounterSaving(false);
    if (err) { setCounterError(err); return; }
    setCounterTarget(null);
  }

  async function handleNewRdvSubmit(date: string, time: string, description: string) {
    setNewRdvError('');
    setNewRdvSaving(true);
    const err = await submitNewRdv(clientEmail, date, time, description, CLIENT_TZ, userName, companyId, load);
    setNewRdvSaving(false);
    if (err) { setNewRdvError(err); return; }
    setShowNewRdv(false);
  }

  return {
    rdvs, loading, filter, setFilter, filtered, todayStr,
    counterTarget, setCounterTarget, counterSaving, counterError,
    showNewRdv, setShowNewRdv, newRdvSaving, newRdvError, setNewRdvError,
    handleAccept, handleRefuse, handleOpenCounter, handleCancelOwn,
    handleAcceptReschedule, handleRefuseReschedule, handleOpenCounterReschedule,
    handleRequestReschedule, handleCounterSubmit, handleNewRdvSubmit,
    CLIENT_TZ,
  };
}
