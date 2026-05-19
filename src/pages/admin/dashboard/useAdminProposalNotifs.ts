import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCompanyId } from '../../../hooks/useCompanyId';
import type { ActiveView } from '../AdminDashboard';

export interface ProposalNotifEntry {
  id: string;
  lead_name: string;
  created_at: string;
  created_by_role?: string;
  parent_proposal_id?: string | null;
}

export function useAdminProposalNotifs(setActiveView: (v: ActiveView) => void) {
  const companyId = useCompanyId();
  const [proposalUnseen, setProposalUnseen] = useState<ProposalNotifEntry[]>([]);
  const [confirmedUnseen, setConfirmedUnseen] = useState<ProposalNotifEntry[]>([]);

  useEffect(() => {
    if (!companyId) return;
    const fetchUnseen = async () => {
      const { data: proposals } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at, created_by_role, parent_proposal_id')
        .eq('company_id', companyId)
        .eq('seen_by_admin', false)
        .eq('status', 'pending')
        .eq('created_by_role', 'client')
        .order('created_at', { ascending: false });
      const { data: confirmed } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at, created_by_role, parent_proposal_id')
        .eq('company_id', companyId)
        .eq('status', 'confirmed')
        .eq('seen_by_admin', false)
        .is('vendor_id', null)
        .order('created_at', { ascending: false });
      setProposalUnseen(proposals ?? []);
      setConfirmedUnseen(confirmed ?? []);
    };
    fetchUnseen();
    const ch = supabase
      .channel('admin-confirmed-unseen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, fetchUnseen)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId]);

  const handleProposalEntryClick = useCallback((proposalId: string) => {
    supabase
      .from('rdv_proposals')
      .update({ seen_by_admin: true })
      .eq('id', proposalId)
      .then(() => {
        setProposalUnseen(prev => prev.filter(p => p.id !== proposalId));
      });
    setActiveView('propositions-rdv');
  }, [setActiveView]);

  const handleConfirmedEntryClick = useCallback((proposalId: string) => {
    supabase
      .from('rdv_proposals')
      .update({ seen_by_admin: true })
      .eq('id', proposalId)
      .then(() => {
        setConfirmedUnseen(prev => prev.filter(p => p.id !== proposalId));
      });
    setActiveView('propositions-rdv');
  }, [setActiveView]);

  return {
    proposalUnseen,
    confirmedUnseen,
    handleProposalEntryClick,
    handleConfirmedEntryClick,
  };
}
