import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

export type ProposalEntry = {
  id: string;
  lead_name: string;
  created_at: string;
  created_by_role: string;
  parent_proposal_id?: string | null;
  status?: string;
  reschedule_status?: string | null;
};

export function useClientUnseenProposals(clientEmail: string) {
  const [unseenProposals, setUnseenProposals] = useState<ProposalEntry[]>([]);
  const unseenProposalsRef = useRef<ProposalEntry[]>([]);

  useEffect(() => {
    if (!clientEmail) return;
    const fetchUnseen = async () => {
      const { data: byCol } = await supabase
        .from('leads')
        .select('id, vendor_id')
        .eq('email', clientEmail);
      const { data: byJson } = await supabase
        .from('leads')
        .select('id, vendor_id')
        .is('email', null)
        .eq('data->>Email', clientEmail);
      const merged = [...(byCol ?? []), ...(byJson ?? [])];
      const seen = new Set<string>();
      const leads = merged.filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
      if (leads.length === 0) {
        setUnseenProposals([]);
        unseenProposalsRef.current = [];
        return;
      }
      const leadIds = leads.map(l => l.id);
      const cols = 'id, vendor_id, lead_id, lead_name, created_at, status, created_by_role, parent_proposal_id, reschedule_status';
      const base = () => supabase.from('rdv_proposals').select(cols).in('lead_id', leadIds).eq('seen_by_client', false);
      const [{ data: d1 }, { data: d2 }, { data: d3 }, { data: d4 }] = await Promise.all([
        base().eq('status', 'pending').neq('created_by_role', 'client'),
        base().in('status', ['confirmed', 'cancelled']).eq('created_by_role', 'client'),
        base().eq('status', 'confirmed').eq('reschedule_status', 'pending'),
        base().eq('status', 'confirmed').in('reschedule_status', ['accepted', 'refused']),
      ]);
      const proposals = [...(d1 ?? []), ...(d2 ?? []), ...(d3 ?? []), ...(d4 ?? [])];
      if (proposals.length === 0) {
        setUnseenProposals([]);
        unseenProposalsRef.current = [];
        return;
      }
      const leadMap = new Map(leads.map(l => [l.id, l.vendor_id]));
      const valid = proposals.filter(p => {
        if (!p.lead_id) return false;
        const leadVendorId = leadMap.get(p.lead_id);
        if (!leadVendorId) return !p.vendor_id;
        return p.vendor_id === leadVendorId;
      });
      const dedupIds = new Set<string>();
      const deduped = valid.filter(p => { if (dedupIds.has(p.id)) return false; dedupIds.add(p.id); return true; });
      const entries = deduped.map(p => ({ id: p.id, lead_name: p.lead_name || '', created_at: p.created_at, created_by_role: p.created_by_role || '', parent_proposal_id: p.parent_proposal_id || null, status: p.status || '', reschedule_status: p.reschedule_status || null }));
      setUnseenProposals(entries);
      unseenProposalsRef.current = entries;
    };
    fetchUnseen();
    const ch = supabase
      .channel(`client-proposals-unseen-${clientEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, fetchUnseen)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientEmail]);

  const handleProposalNotifClick = useCallback((proposalId: string) => {
    const entry = unseenProposalsRef.current.find(p => p.id === proposalId);
    const isRescheduleResponse = entry?.reschedule_status === 'accepted' || entry?.reschedule_status === 'refused';
    const updatePayload: Record<string, unknown> = { seen_by_client: true };
    if (isRescheduleResponse) updatePayload.reschedule_status = null;
    supabase
      .from('rdv_proposals')
      .update(updatePayload)
      .eq('id', proposalId)
      .then(() => {
        setUnseenProposals(prev => prev.filter(p => p.id !== proposalId));
        unseenProposalsRef.current = unseenProposalsRef.current.filter(p => p.id !== proposalId);
      });
  }, []);

  const markProposalsSeen = useCallback(() => {
    const ids = unseenProposalsRef.current.map(p => p.id);
    if (ids.length > 0) {
      supabase
        .from('rdv_proposals')
        .update({ seen_by_client: true })
        .in('id', ids)
        .then(() => {
          setUnseenProposals([]);
          unseenProposalsRef.current = [];
        });
    }
  }, []);

  return { unseenProposals, handleProposalNotifClick, markProposalsSeen };
}
