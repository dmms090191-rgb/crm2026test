import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import AgendaView, { RdvProposal } from '../../../components/agenda/AgendaView';

interface ClientAgendaProps {
  clientEmail: string;
}

export default function ClientAgenda({ clientEmail }: ClientAgendaProps) {
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rdv_proposals')
      .select('*')
      .eq('lead_email', clientEmail)
      .order('proposed_date', { ascending: true })
      .order('proposed_time', { ascending: true });
    if (data) setRdvs(data as RdvProposal[]);
  }, [clientEmail]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('rdv-client')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return <AgendaView rdvs={rdvs} onReload={load} canAdd={false} accentColor="#34d399" accentRgb="52,211,153" />;
}
