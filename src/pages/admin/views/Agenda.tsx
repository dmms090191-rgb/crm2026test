import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import AgendaView, { RdvProposal } from '../../../components/agenda/AgendaView';
import { useTimezone } from '../../../hooks/useTimezone';
import { useCompanyId } from '../../../hooks/useCompanyId';

export default function Agenda() {
  const { timezone } = useTimezone();
  const companyId = useCompanyId();
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);

  const load = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('rdv_proposals')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'confirmed')
      .order('proposed_date', { ascending: true })
      .order('proposed_time', { ascending: true });
    if (data) setRdvs(data as RdvProposal[]);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('rdv-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return <AgendaView rdvs={rdvs} onReload={load} canAdd={false} canDelete={true} canTreat={true} accentColor="#22d3ee" accentRgb="34,211,238" userTimezone={timezone} title="Agenda perso" />;
}
