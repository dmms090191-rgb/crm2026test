import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { SystemItem, SystemCategory, SystemStatus } from './types';

interface Params {
  items: SystemItem[];
  categories: SystemCategory[];
  statuses: SystemStatus[];
  onItemsChange: (items: SystemItem[]) => void;
  onCategoriesChange: (categories: SystemCategory[]) => void;
  onStatusesChange: (statuses: SystemStatus[]) => void;
}

export function useSystemActions({ items, categories, statuses, onItemsChange, onCategoriesChange, onStatusesChange }: Params) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);

  // ─── Category Actions ───

  const handleCreateCategory = useCallback(async (name: string, parentId: string | null) => {
    if (!name) return null;
    const siblings = categories.filter((c) => c.parent_id === parentId);
    const maxPos = siblings.reduce((m, c) => Math.max(m, c.position), -1);
    const { data, error } = await supabase
      .from('crm_system_categories')
      .insert({ name, position: maxPos + 1, parent_id: parentId })
      .select()
      .single();
    if (!error && data) {
      onCategoriesChange([...categories, data as SystemCategory]);
      return data.id as string;
    }
    return null;
  }, [categories, onCategoriesChange]);

  const handleRenameCategory = useCallback(async (id: string, name: string) => {
    if (!name) return;
    const { error } = await supabase
      .from('crm_system_categories')
      .update({ name })
      .eq('id', id);
    if (!error) {
      onCategoriesChange(categories.map((c) => c.id === id ? { ...c, name } : c));
    }
  }, [categories, onCategoriesChange]);

  const handleSetCategoryColor = useCallback(async (id: string, color: string | null) => {
    const { error } = await supabase
      .from('crm_system_categories')
      .update({ color })
      .eq('id', id);
    if (!error) {
      onCategoriesChange(categories.map((c) => c.id === id ? { ...c, color } : c));
    }
  }, [categories, onCategoriesChange]);

  const handleDeleteCategory = useCallback(async (id: string): Promise<{ blocked?: boolean; message?: string }> => {
    const hasChildren = categories.some((c) => c.parent_id === id);
    const hasItems = items.some((i) => i.category_id === id);
    if (hasChildren || hasItems) {
      setConfirmDeleteCatId(null);
      return { blocked: true, message: 'Impossible de supprimer : cette categorie contient encore des elements.' };
    }
    const { error } = await supabase.from('crm_system_categories').delete().eq('id', id);
    if (error) {
      console.error('Delete category failed:', error);
      setConfirmDeleteCatId(null);
      return { blocked: true, message: 'Erreur lors de la suppression.' };
    }
    onCategoriesChange(categories.filter((c) => c.id !== id));
    setConfirmDeleteCatId(null);
    return {};
  }, [categories, items, onCategoriesChange]);

  const handleMoveCategoryUp = useCallback(async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const siblings = categories
      .filter((c) => c.parent_id === cat.parent_id)
      .sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex((c) => c.id === id);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    await Promise.all([
      supabase.from('crm_system_categories').update({ position: prev.position }).eq('id', id),
      supabase.from('crm_system_categories').update({ position: cat.position }).eq('id', prev.id),
    ]);
    onCategoriesChange(categories.map((c) => {
      if (c.id === id) return { ...c, position: prev.position };
      if (c.id === prev.id) return { ...c, position: cat.position };
      return c;
    }));
  }, [categories, onCategoriesChange]);

  const handleMoveCategoryDown = useCallback(async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const siblings = categories
      .filter((c) => c.parent_id === cat.parent_id)
      .sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex((c) => c.id === id);
    if (idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    await Promise.all([
      supabase.from('crm_system_categories').update({ position: next.position }).eq('id', id),
      supabase.from('crm_system_categories').update({ position: cat.position }).eq('id', next.id),
    ]);
    onCategoriesChange(categories.map((c) => {
      if (c.id === id) return { ...c, position: next.position };
      if (c.id === next.id) return { ...c, position: cat.position };
      return c;
    }));
  }, [categories, onCategoriesChange]);

  // ─── Item Actions ───

  const handleCreateItem = useCallback(async (title: string, categoryId: string) => {
    if (!title) return;
    const catItems = items.filter((a) => a.category_id === categoryId);
    const maxPos = catItems.length > 0 ? Math.max(...catItems.map((a) => a.position)) + 1 : 0;
    const { data, error } = await supabase
      .from('crm_system_items')
      .insert({ title, category_id: categoryId, position: maxPos })
      .select()
      .single();
    if (!error && data) {
      onItemsChange([...items, data as SystemItem]);
    }
  }, [items, onItemsChange]);

  const handleUpdateItemTitle = useCallback(async (id: string, title: string) => {
    if (!title) return;
    const { error } = await supabase
      .from('crm_system_items')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      onItemsChange(items.map((i) => i.id === id ? { ...i, title } : i));
    }
  }, [items, onItemsChange]);

  const handleSetItemStatus = useCallback(async (itemId: string, statusId: string | null) => {
    const statusName = statusId ? (statuses.find((s) => s.id === statusId)?.name ?? 'todo') : 'todo';
    const { error } = await supabase
      .from('crm_system_items')
      .update({ status_id: statusId, status: statusName, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (!error) {
      onItemsChange(items.map((i) => i.id === itemId ? { ...i, status_id: statusId, status: statusName } : i));
    }
  }, [items, statuses, onItemsChange]);

  const handleDeleteItem = useCallback(async (id: string) => {
    await supabase.from('crm_system_items').delete().eq('id', id);
    onItemsChange(items.filter((a) => a.id !== id));
    setConfirmDeleteId(null);
  }, [items, onItemsChange]);

  const handleMoveItemUp = useCallback(async (id: string) => {
    const item = items.find((a) => a.id === id);
    if (!item) return;
    const siblings = items
      .filter((a) => a.category_id === item.category_id)
      .sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex((a) => a.id === id);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    await Promise.all([
      supabase.from('crm_system_items').update({ position: prev.position }).eq('id', id),
      supabase.from('crm_system_items').update({ position: item.position }).eq('id', prev.id),
    ]);
    onItemsChange(items.map((a) => {
      if (a.id === id) return { ...a, position: prev.position };
      if (a.id === prev.id) return { ...a, position: item.position };
      return a;
    }));
  }, [items, onItemsChange]);

  const handleMoveItemDown = useCallback(async (id: string) => {
    const item = items.find((a) => a.id === id);
    if (!item) return;
    const siblings = items
      .filter((a) => a.category_id === item.category_id)
      .sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex((a) => a.id === id);
    if (idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    await Promise.all([
      supabase.from('crm_system_items').update({ position: next.position }).eq('id', id),
      supabase.from('crm_system_items').update({ position: item.position }).eq('id', next.id),
    ]);
    onItemsChange(items.map((a) => {
      if (a.id === id) return { ...a, position: next.position };
      if (a.id === next.id) return { ...a, position: item.position };
      return a;
    }));
  }, [items, onItemsChange]);

  // ─── Reset History ───

  const handleResetHistory = useCallback(async () => {
    const { error } = await supabase
      .from('crm_system_items')
      .update({ status_id: null, status: 'todo', updated_at: new Date().toISOString() })
      .not('status_id', 'is', null);
    if (!error) {
      onItemsChange(items.map((i) => ({ ...i, status_id: null, status: 'todo' })));
    }
  }, [items, onItemsChange]);

  // ─── Status Actions ───

  const handleCreateStatus = useCallback(async (name: string, color: string, icon: string) => {
    if (!name) return;
    const maxPos = statuses.reduce((m, s) => Math.max(m, s.position), -1);
    const { data, error } = await supabase
      .from('crm_system_statuses')
      .insert({ name, color, icon, position: maxPos + 1 })
      .select()
      .single();
    if (!error && data) {
      onStatusesChange([...statuses, data as SystemStatus]);
    }
  }, [statuses, onStatusesChange]);

  const handleUpdateStatus = useCallback(async (id: string, updates: Partial<Pick<SystemStatus, 'name' | 'color' | 'icon' | 'is_active'>>) => {
    const { error } = await supabase
      .from('crm_system_statuses')
      .update(updates)
      .eq('id', id);
    if (!error) {
      onStatusesChange(statuses.map((s) => s.id === id ? { ...s, ...updates } : s));
    }
  }, [statuses, onStatusesChange]);

  const handleDeleteStatus = useCallback(async (id: string) => {
    await supabase.from('crm_system_statuses').delete().eq('id', id);
    onStatusesChange(statuses.filter((s) => s.id !== id));
    onItemsChange(items.map((i) => i.status_id === id ? { ...i, status_id: null, status: 'todo' } : i));
  }, [statuses, items, onStatusesChange, onItemsChange]);

  return {
    confirmDeleteId,
    setConfirmDeleteId,
    confirmDeleteCatId,
    setConfirmDeleteCatId,
    handleCreateCategory,
    handleRenameCategory,
    handleSetCategoryColor,
    handleDeleteCategory,
    handleMoveCategoryUp,
    handleMoveCategoryDown,
    handleCreateItem,
    handleUpdateItemTitle,
    handleSetItemStatus,
    handleDeleteItem,
    handleMoveItemUp,
    handleMoveItemDown,
    handleResetHistory,
    handleCreateStatus,
    handleUpdateStatus,
    handleDeleteStatus,
  };
}

