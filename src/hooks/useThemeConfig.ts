import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type ThemeStatus = 'visible' | 'hidden' | 'rework' | 'premium';

export interface ThemeTokensData {
  zone_overrides: Record<string, unknown>;
  zone_css: Record<string, string | null>;
  text_overrides: Record<string, string>;
  background_image?: string | null;
  background_image_zoom?: number | null;
  background_image_position_x?: number | null;
  background_image_position_y?: number | null;
  background_image_fit?: string | null;
  typography_overrides?: Record<string, string | null> | null;
  panel_palette?: { background: string; surface: string; accent: string } | null;
  button_overrides?: Record<string, unknown> | null;
  card_overrides?: Record<string, unknown> | null;
  vc_overrides?: Record<string, unknown> | null;
}

export interface ThemeConfigRow {
  id: string;
  theme_key: string;
  label: string;
  status: ThemeStatus;
  is_recommended: boolean;
  is_favorite: boolean;
  category: string;
  category_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  theme_tokens: ThemeTokensData | null;
  description: string | null;
  created_from_theme: string | null;
  owner_user_id: string | null;
  owner_company_id: string | null;
  is_shared: boolean;
}

export function useThemeConfig() {
  const [configs, setConfigs] = useState<ThemeConfigRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('theme_config')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data) setConfigs(data as ThemeConfigRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const updateConfig = useCallback(async (themeKey: string, updates: Partial<Omit<ThemeConfigRow, 'id' | 'theme_key' | 'created_at'>>) => {
    const { error } = await supabase
      .from('theme_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('theme_key', themeKey);
    if (!error) {
      setConfigs(prev => prev.map(c => c.theme_key === themeKey ? { ...c, ...updates } : c));
    }
    return { error };
  }, []);

  const moveToCategory = useCallback(async (themeKey: string, categoryId: string, categorySlug: string) => {
    const { error } = await supabase
      .from('theme_config')
      .update({ category_id: categoryId, category: categorySlug, updated_at: new Date().toISOString() })
      .eq('theme_key', themeKey);
    if (!error) {
      setConfigs(prev => prev.map(c => c.theme_key === themeKey ? { ...c, category_id: categoryId, category: categorySlug } : c));
    }
    return { error };
  }, []);

  const swapOrder = useCallback(async (keyA: string, keyB: string) => {
    const a = configs.find(c => c.theme_key === keyA);
    const b = configs.find(c => c.theme_key === keyB);
    if (!a || !b) return;
    const orderA = a.display_order;
    const orderB = b.display_order;
    const now = new Date().toISOString();
    await supabase.from('theme_config').update({ display_order: orderB, updated_at: now }).eq('theme_key', keyA);
    await supabase.from('theme_config').update({ display_order: orderA, updated_at: now }).eq('theme_key', keyB);
    setConfigs(prev => prev.map(c => {
      if (c.theme_key === keyA) return { ...c, display_order: orderB };
      if (c.theme_key === keyB) return { ...c, display_order: orderA };
      return c;
    }).sort((x, y) => x.display_order - y.display_order));
  }, [configs]);

  const bulkUpdateStatus = useCallback(async (themeKeys: string[], status: ThemeStatus) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('theme_config')
      .update({ status, updated_at: now })
      .in('theme_key', themeKeys);
    if (!error) {
      setConfigs(prev => prev.map(c => themeKeys.includes(c.theme_key) ? { ...c, status } : c));
    }
    return { error };
  }, []);

  const bulkDelete = useCallback(async (themeKeys: string[]) => {
    const { error } = await supabase
      .from('theme_config')
      .delete()
      .in('theme_key', themeKeys);
    if (!error) {
      setConfigs(prev => prev.filter(c => !themeKeys.includes(c.theme_key)));
    }
    return { error };
  }, []);

  return { configs, loading, fetchConfigs, updateConfig, moveToCategory, swapOrder, bulkUpdateStatus, bulkDelete };
}
