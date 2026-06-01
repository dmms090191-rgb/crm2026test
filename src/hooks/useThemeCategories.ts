import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ThemeCategoryRow {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function useThemeCategories() {
  const [categories, setCategories] = useState<ThemeCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('theme_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) setCategories(data as ThemeCategoryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const renameCategory = useCallback(async (id: string, name: string) => {
    const { error } = await supabase
      .from('theme_categories')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    }
    return { error };
  }, []);

  const createCategory = useCallback(async (name: string, slug: string) => {
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { data, error } = await supabase
      .from('theme_categories')
      .insert({ name, slug, sort_order: maxOrder + 1, is_system: false })
      .select()
      .maybeSingle();
    if (!error && data) {
      setCategories(prev => [...prev, data as ThemeCategoryRow].sort((a, b) => a.sort_order - b.sort_order));
    }
    return { data, error };
  }, [categories]);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('theme_categories')
      .delete()
      .eq('id', id);
    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id));
    }
    return { error };
  }, []);

  const reorderCategories = useCallback(async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, idx) => ({ id, sort_order: idx, updated_at: new Date().toISOString() }));
    for (const u of updates) {
      await supabase.from('theme_categories').update({ sort_order: u.sort_order, updated_at: u.updated_at }).eq('id', u.id);
    }
    setCategories(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      return orderedIds.map((id, idx) => {
        const c = map.get(id);
        return c ? { ...c, sort_order: idx } : c!;
      }).filter(Boolean);
    });
  }, []);

  const swapCategoryOrder = useCallback(async (idA: string, idB: string) => {
    const a = categories.find(c => c.id === idA);
    const b = categories.find(c => c.id === idB);
    if (!a || !b) return;
    const now = new Date().toISOString();
    await supabase.from('theme_categories').update({ sort_order: b.sort_order, updated_at: now }).eq('id', idA);
    await supabase.from('theme_categories').update({ sort_order: a.sort_order, updated_at: now }).eq('id', idB);
    setCategories(prev =>
      prev.map(c => {
        if (c.id === idA) return { ...c, sort_order: b.sort_order };
        if (c.id === idB) return { ...c, sort_order: a.sort_order };
        return c;
      }).sort((x, y) => x.sort_order - y.sort_order)
    );
  }, [categories]);

  return { categories, loading, fetchCategories, renameCategory, createCategory, deleteCategory, reorderCategories, swapCategoryOrder };
}
