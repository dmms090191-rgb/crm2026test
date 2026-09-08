import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { ConfirmedProposalEntry } from '../VendorTopBar';

/**
 * Propositions de RDV et RDV confirmes non vus par le Commercial.
 *
 * Extrait de VendorDashboard sans aucun changement de requete ni de filtre :
 * memes deux SELECT sur `rdv_proposals`, meme abonnement Realtime, meme
 * marquage `seen_by_vendor`. Deplacer ce bloc ne change pas ce qui est compte.
 */
export function useVendorProposalNotifs(vendorDbId: string | null) {
  const [proposalUnseen, setProposalUnseen] = useState<ConfirmedProposalEntry[]>([]);
  const [confirmedUnseen, setConfirmedUnseen] = useState<ConfirmedProposalEntry[]>([]);

  useEffect(() => {
    if (!vendorDbId) return;
    const fetchUnseen = async () => {
      const { data: proposals } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at, created_by_role, parent_proposal_id')
        .eq('vendor_id', vendorDbId)
        .eq('seen_by_vendor', false)
        .eq('status', 'pending')
        .eq('created_by_role', 'client')
        .order('created_at', { ascending: false });
      const { data: confirmed } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at, created_by_role, parent_proposal_id')
        .eq('vendor_id', vendorDbId)
        .eq('status', 'confirmed')
        .eq('seen_by_vendor', false)
        .order('created_at', { ascending: false });
      setProposalUnseen(proposals ?? []);
      setConfirmedUnseen(confirmed ?? []);
    };
    fetchUnseen();
    const ch = supabase
      .channel(`vendor-confirmed-unseen-${vendorDbId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, fetchUnseen)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vendorDbId]);

  const markProposalSeen = useCallback((proposalId: string) => {
    supabase
      .from('rdv_proposals')
      .update({ seen_by_vendor: true })
      .eq('id', proposalId)
      .then(() => setProposalUnseen(prev => prev.filter(p => p.id !== proposalId)));
  }, []);

  const markConfirmedSeen = useCallback((proposalId: string) => {
    supabase
      .from('rdv_proposals')
      .update({ seen_by_vendor: true })
      .eq('id', proposalId)
      .then(() => setConfirmedUnseen(prev => prev.filter(p => p.id !== proposalId)));
  }, []);

  return { proposalUnseen, confirmedUnseen, markProposalSeen, markConfirmedSeen };
}
