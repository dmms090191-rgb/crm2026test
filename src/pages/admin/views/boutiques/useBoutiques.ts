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

  /**
   * Supprime definitivement des boutiques, et AVEC ELLES tout ce qui leur appartient.
   *
   * UNE seule instruction : la base se charge du reste. Chaque table enfant declare a sa
   * creation `boutique_id uuid REFERENCES boutiques(id) ON DELETE CASCADE` — c'est deja le
   * cas de `boutique_reglages`. Les futures donnees legales ou financieres (factures,
   * paiements, historique de commandes) declareront au contraire `RESTRICT` ou `SET NULL` :
   * leur conservation est une propriete de LEUR table, decidee a sa creation.
   *
   * NE JAMAIS ecrire ici une cascade a la main. Une liste de tables enfants tenue cote
   * application oublierait, tot ou tard, une table ajoutee plus tard — en silence. La
   * cascade declarative, elle, ne peut pas oublier.
   *
   * La Societe proprietaire n'est jamais touchee : la cle etrangere va de `boutiques` VERS
   * `companies`, jamais l'inverse.
   *
   * `select('id')` apres le delete rend les lignes REELLEMENT supprimees : la RLS peut en
   * refuser, et on prefere un compte exact a un compte espere.
   */
  const supprimer = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return { error: null, supprimees: 0 };

    const { data, error: err } = await supabase
      .from('boutiques')
      .delete()
      .in('id', ids)
      .select('id');

    if (err) return { error: err.message, supprimees: 0 };

    const partis = new Set((data ?? []).map(l => (l as { id: string }).id));
    setBoutiques(prev => prev.filter(b => !partis.has(b.id)));
    return { error: null, supprimees: partis.size };
  }, []);

  return { boutiques, loading, error, reload: load, create, supprimer, companyId };
}
