import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTimezone } from '../../../hooks/useTimezone';
import AgendaView, { RdvProposal } from '../../../components/agenda/AgendaView';
interface ClientAgendaProps {
  clientEmail: string;
}

export default function ClientAgenda({ clientEmail }: ClientAgendaProps) {
  const { timezone } = useTimezone();
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);

  const load = useCallback(async () => {
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
      .eq('status', 'confirmed')
      .order('proposed_date', { ascending: true })
      .order('proposed_time', { ascending: true });
    if (byEmail) results = byEmail as RdvProposal[];

    if (leadIds.length > 0) {
      const { data: byLeadId } = await supabase
        .from('rdv_proposals')
        .select('*')
        .in('lead_id', leadIds)
        .eq('status', 'confirmed')
        .order('proposed_date', { ascending: true })
        .order('proposed_time', { ascending: true });
      if (byLeadId) {
        const existingIds = new Set(results.map(r => r.id));
        for (const r of byLeadId as RdvProposal[]) {
          if (!existingIds.has(r.id)) results.push(r);
        }
      }
    }
    results.sort((a, b) => a.proposed_date.localeCompare(b.proposed_date) || a.proposed_time.localeCompare(b.proposed_time));
    setRdvs(results);
  }, [clientEmail]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('rdv-client')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return <AgendaView rdvs={rdvs} onReload={load} canAdd={false} canTreat={false} accentColor="#34d399" accentRgb="52,211,153" userTimezone={timezone} />;
}
