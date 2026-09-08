import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { SAStatut } from '../crm-societe/types';

/**
 * Bibliotheque de statuts du panel TALVEX ADMINISTRATEUR : la table sa_statuts.
 *
 * Volontairement place dans le panel Talvex et non dans src/hooks/ :
 * les statuts Groupe et les statuts Societe sont des bibliotheques distinctes
 * (respectivement inexistante a ce jour, et la table `statuts`).
 * Ce hook ne doit etre importe que depuis pages/superadmin/.
 */
export function useSaStatuts() {
  const [saStatuts, setSaStatuts] = useState<SAStatut[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('sa_statuts')
      .select('id, nom, couleur')
      .order('created_at', { ascending: true });
    setSaStatuts(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Creation, renommage, recoloration, suppression : reflete sans refresh.
  useEffect(() => {
    const ch = supabase
      .channel('sa-statuts-shared')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sa_statuts' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { saStatuts, reload: load };
}
