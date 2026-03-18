import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import AgendaView, { RdvProposal } from '../../../components/agenda/AgendaView';

export default function VendorAgenda() {
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (!vendor) return;
    const { data } = await supabase
      .from('rdv_proposals')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('proposed_date', { ascending: true })
      .order('proposed_time', { ascending: true });
    if (data) setRdvs(data as RdvProposal[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('rdv-vendor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return <AgendaView rdvs={rdvs} onReload={load} canAdd accentColor="#22d3ee" accentRgb="34,211,238" />;
}
