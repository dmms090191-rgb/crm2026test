import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ConseillerInfo {
  firstName: string;
  lastName: string;
  role: 'vendeur' | 'admin';
  roleLabel: string;
}

export function useClientConseiller(leadId: string | null) {
  const [conseiller, setConseiller] = useState<ConseillerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) { setLoading(false); return; }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const { data: lead } = await supabase
        .from('leads')
        .select('vendor_id, company_id, vendors:vendor_id(first_name, last_name)')
        .eq('id', leadId)
        .eq('actif', true)
        .maybeSingle();

      if (cancelled) return;

      if (lead?.vendors && lead.vendor_id) {
        const v = lead.vendors as unknown as { first_name: string; last_name: string };
        setConseiller({
          firstName: v.first_name || '',
          lastName: v.last_name || '',
          role: 'vendeur',
          roleLabel: 'Conseiller client',
        });
        setLoading(false);
        return;
      }

      if (lead?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('admin_first_name, admin_last_name')
          .eq('id', lead.company_id)
          .maybeSingle();

        if (cancelled) return;

        if (company && (company.admin_first_name || company.admin_last_name)) {
          setConseiller({
            firstName: company.admin_first_name || '',
            lastName: company.admin_last_name || '',
            role: 'admin',
            roleLabel: 'Responsable',
          });
          setLoading(false);
          return;
        }
      }

      setConseiller(null);
      setLoading(false);
    }

    fetch();

    const ch = supabase
      .channel(`conseiller-${leadId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads', filter: `id=eq.${leadId}` }, () => {
        fetch();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [leadId]);

  return { conseiller, loading };
}
