import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCompanyId } from '../../../hooks/useCompanyId';

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

/**
 * Compteurs de la vue d'ensemble Societe.
 *
 * Tout est filtre sur la company_id EFFECTIVE du panel : en Visu, les chiffres
 * sont donc ceux de la Societe visualisee.
 * `leadsCount` = nombre total de leads du CRM de la Societe. La table `leads`
 * n'a ni archivage ni drapeau actif/inactif : aucun filtre n'est invente ici.
 */
export function useSocieteOverviewCounts() {
  const companyId = useCompanyId();
  const [pendingCount, setPendingCount] = useState(0);
  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  const fetchPending = useCallback(async () => {
    if (!companyId) return;
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, [companyId]);

  const fetchLeads = useCallback(async () => {
    if (!companyId) return;
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    // En cas d'erreur on laisse null : la carte affiche « — » plutot qu'un faux 0.
    setLeadsCount(error ? null : count ?? 0);
  }, [companyId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('admin_announcements')
      .select('id, title, message, created_at')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setAnnouncements(data.filter(a => a.title || a.message));
      });
  }, [companyId]);

  useEffect(() => {
    const ts = Date.now();

    const regChannel = supabase
      .channel(`vue-ensemble-reg-${ts}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations' }, (payload) => {
        if ((payload.new as { status: string }).status === 'pending') {
          setPendingCount(prev => prev + 1);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registrations' }, (payload) => {
        const oldPending = (payload.old as { status: string }).status === 'pending';
        const newPending = (payload.new as { status: string }).status === 'pending';
        if (oldPending && !newPending) setPendingCount(prev => Math.max(0, prev - 1));
        else if (!oldPending && newPending) setPendingCount(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'registrations' }, (payload) => {
        if ((payload.old as { status: string }).status === 'pending') {
          setPendingCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(regChannel); };
  }, []);

  useEffect(() => {
    if (!companyId) return;
    const ts = Date.now();
    const leadsChannel = supabase
      .channel(`vue-ensemble-leads-${ts}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => { fetchLeads(); })
      .subscribe();
    return () => { supabase.removeChannel(leadsChannel); };
  }, [companyId, fetchLeads]);

  return { pendingCount, leadsCount, announcements };
}
