import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { AdminUser } from './views/SAAdmins';

export function useAdminsCache() {
  const [cachedAdmins, setCachedAdmins] = useState<AdminUser[]>([]);
  const [adminsRefreshing, setAdminsRefreshing] = useState(false);
  const [adminsError, setAdminsError] = useState('');
  const adminsLoadedRef = useRef(false);

  const fetchAdminsCache = useCallback(async () => {
    setAdminsRefreshing(true);
    setAdminsError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAdminsError('Non authentifie'); setAdminsRefreshing(false); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-admins`,
        { headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY } }
      );
      const json = await res.json();
      if (!res.ok) { setAdminsError(json.error || 'Erreur inconnue'); setAdminsRefreshing(false); return; }
      setCachedAdmins(json.admins || []);
      adminsLoadedRef.current = true;
    } catch (e) { setAdminsError(String(e)); }
    finally { setAdminsRefreshing(false); }
  }, []);

  useEffect(() => { fetchAdminsCache(); }, [fetchAdminsCache]);

  return { cachedAdmins, adminsRefreshing, adminsError, fetchAdminsCache };
}
