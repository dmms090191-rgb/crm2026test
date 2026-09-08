import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { CompanySuperAdmin } from './superAdminTypes';

export function useSuperAdminsData() {
  const [list, setList] = useState<CompanySuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Affectations company_id -> nom de statut. La bibliotheque reste sa_statuts.
  const [statuts, setStatuts] = useState<Record<string, string>>({});

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Non authentifie'); setLoading(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-company-super-admins`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Erreur de chargement'); setLoading(false); return; }
      setList(json.company_super_admins ?? []);

      const { data: rows } = await supabase.from('sa_group_statuts').select('company_id, statut');
      const map: Record<string, string> = {};
      (rows ?? []).forEach((r: { company_id: string; statut: string }) => {
        if (r.company_id) map[r.company_id] = r.statut;
      });
      setStatuts(map);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }, []);

  const setGroupStatut = useCallback(async (companyId: string, nom: string) => {
    if (!companyId) return;
    setStatuts(prev => ({ ...prev, [companyId]: nom }));
    await supabase
      .from('sa_group_statuts')
      .upsert({ company_id: companyId, statut: nom, updated_at: new Date().toISOString() }, { onConflict: 'company_id' });
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { list, loading, error, refresh: fetch_, statuts, setGroupStatut };
}
