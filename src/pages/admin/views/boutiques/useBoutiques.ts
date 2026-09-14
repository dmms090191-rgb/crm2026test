import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import type { Boutique } from './boutiqueTypes';

/**
 * Couche de donnees du module Boutique — SEUL endroit qui parle a Supabase.
 *
 * Toute l'interface passe par ce hook : si la persistance change un jour, aucun
 * composant d'affichage n'a besoin d'etre touche.
 */
export function useBoutiques() {
  const companyId = useCompanyId();
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!companyId) { setBoutiques([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('boutiques')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else { setBoutiques((data ?? []) as Boutique[]); setError(''); }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Cree une boutique. `created_at` et `status` sont poses par la base.
   * `templateKey` vaut null pour une boutique creee de zero.
   */
  const create = useCallback(async (name: string, templateKey: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: 'Le nom est obligatoire.' };
    if (!companyId) return { error: 'Société introuvable.' };

    const { data, error: err } = await supabase
      .from('boutiques')
      .insert({ company_id: companyId, name: trimmed, template_key: templateKey })
      .select('*')
      .single();

    if (err) return { error: err.message };
    setBoutiques(prev => [data as Boutique, ...prev]);
    return { error: null };
  }, [companyId]);

  return { boutiques, loading, error, reload: load, create, companyId };
}
