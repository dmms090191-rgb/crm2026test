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
  reschedule_status?: string | null;
}

/**
 * Marque une proposition vue, et dit si l ecriture a VRAIMENT eu lieu.
 *
 * Pourquoi cette fonction existe : un UPDATE refuse par la RLS ne leve pas d erreur
 * cote supabase-js. Il rend { error: null } et ZERO ligne. Les quatre gestionnaires
 * retiraient donc l entree de l ecran en se fiant a un succes qui n en etait pas un :
 * la notification disparaissait a l affichage et revenait au rechargement suivant.
 *
 * .select() est ce qui transforme le silence en preuve — on compte les lignes rendues.
 * C est le meme controle que celui pose sur les commentaires CRM Immo le 20 octobre.
 */
async function marquerVue(proposalId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('rdv_proposals')
    .update({ seen_by_admin: true })
    .eq('id', proposalId)
    .select('id');

  if (error) {
    console.error('rdv_proposals : marquage vu refuse', error.message);
    return false;
  }
  if (!data || data.length === 0) {
    console.error('rdv_proposals : marquage vu sans effet (0 ligne) pour', proposalId);
    return false;
  }
  return true;
}

export function useAdminProposalNotifs(setActiveView: (v: ActiveView) => void) {
  const companyId = useCompanyId();
  const [proposalUnseen, setProposalUnseen] = useState<ProposalNotifEntry[]>([]);
  const [confirmedUnseen, setConfirmedUnseen] = useState<ProposalNotifEntry[]>([]);
  const [rescheduleUnseen, setRescheduleUnseen] = useState<ProposalNotifEntry[]>([]);
  const [rescheduleRequestUnseen, setRescheduleRequestUnseen] = useState<ProposalNotifEntry[]>([]);

  useEffect(() => {
    if (!companyId) return;
    const fetchUnseen = async () => {
      const { data: proposals } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at, created_by_role, parent_proposal_id, reschedule_status')
        .eq('company_id', companyId)
        .eq('seen_by_admin', false)
        .eq('status', 'pending')
        .eq('created_by_role', 'client')
        .order('created_at', { ascending: false });
      const { data: confirmed } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at, created_by_role, parent_proposal_id, reschedule_status')
        .eq('company_id', companyId)
        .eq('status', 'confirmed')
        .eq('seen_by_admin', false)
        .is('vendor_id', null)
        .is('reschedule_status', null)
        .order('created_at', { ascending: false });
      const { data: reschedule } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at, created_by_role, parent_proposal_id, reschedule_status')
        .eq('company_id', companyId)
        .eq('status', 'confirmed')
        .eq('seen_by_admin', false)
        .in('reschedule_status', ['accepted', 'refused'])
        .order('created_at', { ascending: false });
      const { data: rescheduleReq } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, created_at, created_by_role, parent_proposal_id, reschedule_status')
        .eq('company_id', companyId)
        .eq('status', 'confirmed')
        .eq('seen_by_admin', false)
        .eq('reschedule_status', 'pending')
        .eq('reschedule_requested_by', 'client')
        .order('created_at', { ascending: false });
      setProposalUnseen(proposals ?? []);
      setConfirmedUnseen(confirmed ?? []);
      setRescheduleUnseen(reschedule ?? []);
      setRescheduleRequestUnseen(rescheduleReq ?? []);
    };
    fetchUnseen();
    const ch = supabase
      .channel('admin-confirmed-unseen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, fetchUnseen)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId]);

  const handleProposalEntryClick = useCallback((proposalId: string) => {
    void marquerVue(proposalId).then(ecrit => {
      if (ecrit) setProposalUnseen(prev => prev.filter(p => p.id !== proposalId));
    });
    setActiveView('propositions-rdv');
  }, [setActiveView]);

  const handleConfirmedEntryClick = useCallback((proposalId: string) => {
    void marquerVue(proposalId).then(ecrit => {
      if (ecrit) setConfirmedUnseen(prev => prev.filter(p => p.id !== proposalId));
    });
    setActiveView('propositions-rdv');
  }, [setActiveView]);

  const handleRescheduleEntryClick = useCallback((proposalId: string) => {
    /*
     * Ce gestionnaire posait aussi `reschedule_status: null`.
     *
     * Lire une notification n est pas un acte metier : ce null effacait la REPONSE du
     * client — accepte ou refuse — pour la seule raison que l admin avait clique. La
     * trace de ce qui avait ete decide disparaissait, et l historique du decalage avec.
     *
     * Et c etait inutile : les quatre requetes de ce hook filtrent toutes
     * `seen_by_admin = false`. `seen_by_admin: true` suffit a faire sortir l entree de
     * la cloche. Le null n apportait rien et detruisait une donnee.
     */
    void marquerVue(proposalId).then(ecrit => {
      if (ecrit) setRescheduleUnseen(prev => prev.filter(p => p.id !== proposalId));
    });
    setActiveView('propositions-rdv');
  }, [setActiveView]);

  const handleRescheduleRequestEntryClick = useCallback((proposalId: string) => {
    void marquerVue(proposalId).then(ecrit => {
      if (ecrit) setRescheduleRequestUnseen(prev => prev.filter(p => p.id !== proposalId));
    });
    setActiveView('propositions-rdv');
  }, [setActiveView]);

  return {
    proposalUnseen,
    confirmedUnseen,
    rescheduleUnseen,
    rescheduleRequestUnseen,
    handleProposalEntryClick,
    handleConfirmedEntryClick,
    handleRescheduleEntryClick,
    handleRescheduleRequestEntryClick,
  };
}
