import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { CompanySuperAdmin } from './superAdminTypes';

export function useSuperAdminsData() {
  const [list, setList] = useState<CompanySuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { list, loading, error, refresh: fetch_ };
}
