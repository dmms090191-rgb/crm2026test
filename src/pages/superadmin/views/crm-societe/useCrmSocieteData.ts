import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { Argumentaire, SAStatut } from './types';
import type { Prospect } from './SAProspectModal';

export default function useCrmSocieteData() {
  const [args, setArgs] = useState<Argumentaire[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [saStatuts, setSaStatuts] = useState<SAStatut[]>([]);
  const [loadingArgs, setLoadingArgs] = useState(true);
  const [loadingProspects, setLoadingProspects] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string | null>(null);
  const [filterPhone, setFilterPhone] = useState('');

  const loadArgs = useCallback(async () => {
    const { data } = await supabase
      .from('sa_argumentaires')
      .select('*')
      .order('position', { ascending: true });
    setArgs((data ?? []) as Argumentaire[]);
    setLoadingArgs(false);
  }, []);

  const loadProspects = useCallback(async () => {
    const { data } = await supabase
      .from('sa_company_prospects')
      .select('*')
      .order('created_at', { ascending: false });
    setProspects((data ?? []) as Prospect[]);
    setLoadingProspects(false);
  }, []);

  const loadSaStatuts = useCallback(async () => {
    const { data } = await supabase.from('sa_statuts').select('id, nom, couleur').order('created_at', { ascending: true });
    setSaStatuts((data ?? []) as SAStatut[]);
  }, []);

  useEffect(() => { loadArgs(); loadProspects(); loadSaStatuts(); }, [loadArgs, loadProspects, loadSaStatuts]);

  const filteredProspects = useMemo(() => {
    let result = prospects;
    if (filterStatut) result = result.filter(p => p.statut === filterStatut);
    if (filterPhone.trim()) {
      const digits = filterPhone.replace(/\D/g, '');
      result = result.filter(p => p.telephone.replace(/\D/g, '').includes(digits));
    }
    return result;
  }, [prospects, filterStatut, filterPhone]);

  const saveArg = async (title: string, content: string, existingId?: string) => {
    if (existingId) {
      await supabase.from('sa_argumentaires').update({ title, content }).eq('id', existingId);
    } else {
      await supabase.from('sa_argumentaires').insert({ title, content, position: args.length });
    }
    loadArgs();
  };

  const deleteArgs = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from('sa_argumentaires').delete().in('id', ids);
    loadArgs();
  };

  const saveProspect = async (data: Omit<Prospect, 'id' | 'created_at'>, existingId?: string) => {
    if (existingId) {
      await supabase.from('sa_company_prospects').update(data).eq('id', existingId);
    } else {
      await supabase.from('sa_company_prospects').insert(data);
    }
    loadProspects();
  };

  const deleteProspects = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from('sa_company_prospects').delete().in('id', ids);
    loadProspects();
  };

  const updateProspectStatut = async (id: string, statut: string) => {
    await supabase.from('sa_company_prospects').update({ statut }).eq('id', id);
    loadProspects();
  };

  return {
    args, prospects, saStatuts, loadingArgs, loadingProspects,
    filteredProspects, filterStatut, setFilterStatut, filterPhone, setFilterPhone,
    saveArg, deleteArgs,
    saveProspect, deleteProspects, updateProspectStatut,
  };
}
