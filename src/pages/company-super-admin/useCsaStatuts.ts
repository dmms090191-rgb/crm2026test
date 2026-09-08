import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { SAStatut } from '../superadmin/views/crm-societe/types';

/**
 * Bibliotheque de statuts du panel GROUPE : la table csa_statuts, bornee au groupe courant.
 *
 * Bibliotheques strictement separees :
 *   Talvex  -> sa_statuts    Groupe -> csa_statuts    Societe -> statuts
 * Ce hook ne doit etre importe que depuis pages/company-super-admin/.
 */
export function useCsaStatuts(groupCompanyId: string) {
  const [statuts, setStatuts] = useState<SAStatut[]>([]);

  const load = useCallback(async () => {
    if (!groupCompanyId) { setStatuts([]); return; }
    const { data } = await supabase
      .from('csa_statuts')
      .select('id, nom, couleur')
      .eq('group_company_id', groupCompanyId)
      .order('created_at', { ascending: true });
    setStatuts(data ?? []);
  }, [groupCompanyId]);

  useEffect(() => { load(); }, [load]);

  // Creation, renommage, recoloration, suppression : reflete sans refresh.
  useEffect(() => {
    if (!groupCompanyId) return;
    const ch = supabase
      .channel(`csa-statuts-${groupCompanyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'csa_statuts' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupCompanyId, load]);

  return { statuts, reload: load };
}
