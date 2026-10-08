import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import type { Cabinet } from './cabinetTypes';

/**
 * Couche de donnees du module Cabinet — SEUL endroit qui parle a Supabase.
 *
 * Toute l'interface passe par ce hook : si la persistance change un jour, aucun
 * composant d'affichage n'a besoin d'etre touche.
 */
export function useCabinets() {
  const companyId = useCompanyId();
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!companyId) { setCabinets([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('cabinets')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else { setCabinets((data ?? []) as Cabinet[]); setError(''); }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Cree un cabinet. `created_at` et `status` sont poses par la base.
   * `templateKey` vaut null pour un cabinet cree de zero.
   */
  const create = useCallback(async (name: string, templateKey: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: 'Le nom est obligatoire.' };
    if (!companyId) return { error: 'Société introuvable.' };

    const { data, error: err } = await supabase
      .from('cabinets')
      .insert({ company_id: companyId, name: trimmed, template_key: templateKey })
      .select('*')
      .single();

    if (err) return { error: err.message };
    setCabinets(prev => [data as Cabinet, ...prev]);
    return { error: null };
  }, [companyId]);

  /**
   * Supprime definitivement des cabinets, et AVEC EUX tout ce qui leur appartient.
   *
   * UNE seule instruction : la base se charge du reste. Chaque table enfant declarera a sa
   * creation `cabinet_id uuid REFERENCES cabinets(id) ON DELETE CASCADE`. Les futures
   * donnees legales ou financieres declareront au contraire `RESTRICT` ou `SET NULL` :
   * leur conservation est une propriete de LEUR table, decidee a sa creation.
   *
   * NE JAMAIS ecrire ici une cascade a la main. Une liste de tables enfants tenue cote
   * application oublierait, tot ou tard, une table ajoutee plus tard — en silence. La
   * cascade declarative, elle, ne peut pas oublier.
   *
   * La Societe proprietaire n'est jamais touchee : la cle etrangere va de `cabinets` VERS
   * `companies`, jamais l'inverse.
   *
   * `select('id')` apres le delete rend les lignes REELLEMENT supprimees : la RLS peut en
   * refuser, et on prefere un compte exact a un compte espere.
   */
  const supprimer = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return { error: null, supprimees: 0 };

    const { data, error: err } = await supabase
      .from('cabinets')
      .delete()
      .in('id', ids)
      .select('id');

    if (err) return { error: err.message, supprimees: 0 };

    const partis = new Set((data ?? []).map(l => (l as { id: string }).id));
    setCabinets(prev => prev.filter(c => !partis.has(c.id)));
    return { error: null, supprimees: partis.size };
  }, []);

  return { cabinets, loading, error, reload: load, create, supprimer, companyId };
}
