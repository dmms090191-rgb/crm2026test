import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { VCConfig, VCElementType } from './visualCustomizeTypes';

export type VCModalKind = 'A' | 'B' | 'C' | 'D' | 'E';

export interface VCPreset {
  id: string;
  element_type: VCElementType;
  modal_kind: VCModalKind | null;
  name: string;
  config: VCConfig;
  created_at: string;
}

export function useVCPresets(elementType: VCElementType | null, modalKind: VCModalKind | null) {
  const [presets, setPresets] = useState<VCPreset[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!userId) { setPresets([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('sa_visual_presets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPresets((data ?? []) as VCPreset[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const savePreset = useCallback(async (name: string, config: VCConfig) => {
    if (!userId || !elementType || !modalKind || !name.trim()) return;
    const prefixed = `${modalKind} - ${name.trim()}`;
    const { data } = await supabase
      .from('sa_visual_presets')
      .insert({ user_id: userId, element_type: elementType, modal_kind: modalKind, name: prefixed, config })
      .select('*')
      .maybeSingle();
    if (data) setPresets(prev => [data as VCPreset, ...prev]);
  }, [userId, elementType, modalKind]);

  const deletePreset = useCallback(async (id: string) => {
    if (!userId) return;
    await supabase.from('sa_visual_presets').delete().eq('id', id).eq('user_id', userId);
    setPresets(prev => prev.filter(p => p.id !== id));
  }, [userId]);

  return { presets, loading, savePreset, deletePreset, reload: load, modalKind };
}
