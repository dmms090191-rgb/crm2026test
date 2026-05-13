import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import AgendaView from '../../../components/agenda/AgendaView';
import type { RdvProposal } from '../../../components/agenda/agendaTypes';
import { useTimezone } from '../../../hooks/useTimezone';

interface VendorRow {
  id: string;
  first_name: string;
  last_name: string;
}

export default function AgendaEquipe() {
  const { timezone } = useTimezone();
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);

  const load = useCallback(async () => {
    const [rdvRes, vendorRes] = await Promise.all([
      supabase
        .from('rdv_proposals')
        .select('*')
        .eq('status', 'confirmed')
        .order('proposed_date', { ascending: true })
        .order('proposed_time', { ascending: true }),
      supabase
        .from('vendors')
        .select('id, first_name, last_name'),
    ]);

    const vendorMap = new Map<string, string>();
    if (vendorRes.data) {
      (vendorRes.data as VendorRow[]).forEach(v => {
        vendorMap.set(v.id, [v.first_name, v.last_name].filter(Boolean).join(' '));
      });
    }

    if (rdvRes.data) {
      const enriched = (rdvRes.data as RdvProposal[]).map(r => ({
        ...r,
        vendor_name: r.vendor_id ? vendorMap.get(r.vendor_id) || 'Vendeur inconnu' : 'Non attribué',
      }));
      setRdvs(enriched);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('rdv-admin-equipe')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return <AgendaView rdvs={rdvs} onReload={load} canAdd={false} canDelete={true} canTreat={true} accentColor="#3b82f6" accentRgb="59,130,246" userTimezone={timezone} title="Agenda équipe" />;
}
