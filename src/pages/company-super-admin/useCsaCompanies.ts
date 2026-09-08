import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Une Societe rattachee a un Groupe.
 * Le type vit ici parce que ce fichier est la SOURCE UNIQUE de l'annuaire :
 * CSAAdminsList le re-exporte pour ne pas casser les imports existants.
 */
export interface CSAAdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
  company_id: string;
  role: string;
  pin: string;
  created_at: string;
  last_sign_in_at: string | null;
  access_enabled: boolean;
}

/**
 * Annuaire des Societes d'un Groupe — source UNIQUE.
 *
 * Consomme par :
 *   · CSAAdminsList              (le tableau « Gestion des societes »)
 *   · CompanySuperAdminDashboard (les contacts du chat, pour pouvoir ecrire
 *     a une Societe qui n'a encore jamais repondu)
 *
 * Deux consommateurs, un seul appel reseau et une seule verite : aucune
 * divergence possible entre la liste affichee et la liste joignable.
 */
export function useCsaCompanies(companyId: string | null) {
  const [admins, setAdmins] = useState<CSAAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!companyId) { setAdmins([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expiree'); setLoading(false); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-admins-for-super-admin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ target_company_id: companyId }),
      });
      if (!res.ok) { setError('Erreur lors du chargement'); setLoading(false); return; }
      const data = await res.json();
      setAdmins(data.admins ?? []);
    } catch {
      setError('Erreur reseau');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { admins, loading, error, refresh };
}
