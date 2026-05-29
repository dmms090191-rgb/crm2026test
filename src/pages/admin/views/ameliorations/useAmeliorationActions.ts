import { useState, useCallback, useRef, DragEvent } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { Amelioration, AmeliorationCategory } from './types';
import type { AmeliorationFormData } from './AmeliorationModal';

interface Params {
  ameliorations: Amelioration[];
  categories: AmeliorationCategory[];
  onAmeliorationsChange: (ameliorations: Amelioration[]) => void;
  onCategoriesChange: (categories: AmeliorationCategory[]) => void;
}

export function useAmeliorationActions({ ameliorations, categories, onAmeliorationsChange, onCategoriesChange }: Params) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoryId, setModalCategoryId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Amelioration | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reorderingCatId, setReorderingCatId] = useState<string | null>(null);
  const [reorderItems, setReorderItems] = useState<Amelioration[]>([]);
  const [movedId, setMovedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const movedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const getItemsForCategory = (catId: string) =>
    ameliorations.filter((a) => a.category_id === catId).sort((a, b) => a.position - b.position);

  const handleCreateCategory = useCallback(async (name: string) => {
    if (!name) return;
    const maxPos = categories.reduce((m, c) => Math.max(m, c.position), -1);
    const { data, error } = await supabase
      .from('crm_amelioration_categories')
      .insert({ name, position: maxPos + 1 })
      .select()
      .single();
    if (!error && data) {
      onCategoriesChange([...categories, data as AmeliorationCategory]);
      return data.id as string;
    }
    return null;
  }, [categories, onCategoriesChange]);

  const handleRenameCategory = useCallback(async (id: string, name: string) => {
    if (!name) return;
    const { error } = await supabase
      .from('crm_amelioration_categories')
      .update({ name })
      .eq('id', id);
    if (!error) {
      onCategoriesChange(categories.map((c) => c.id === id ? { ...c, name } : c));
    }
  }, [categories, onCategoriesChange]);

  const handleDeleteCategory = useCallback(async (id: string) => {
    await supabase.from('crm_amelioration_categories').delete().eq('id', id);
    onCategoriesChange(categories.filter((c) => c.id !== id));
    onAmeliorationsChange(ameliorations.filter((a) => a.category_id !== id));
    setConfirmDeleteCatId(null);
  }, [categories, ameliorations, onCategoriesChange, onAmeliorationsChange]);

  const handleSaveAmelioration = useCallback(async (data: AmeliorationFormData) => {
    setSaveError(null);
    const timestamp = `${data.date}T${data.time}:00`;
    if (editingItem) {
      const payload: Record<string, string | number> = {
        title: data.title,
        description: data.description,
        status: data.status,
        updated_at: new Date().toISOString(),
      };
      if (data.useNewDate) {
        payload.created_at = timestamp;
      }
      const categoryChanged = data.categoryId !== undefined && data.categoryId !== editingItem.category_id;
      if (categoryChanged) {
        payload.category_id = data.categoryId as string;
        const targetItems = ameliorations.filter((a) => a.category_id === data.categoryId && a.id !== editingItem.id);
        payload.position = targetItems.length > 0 ? Math.max(...targetItems.map((a) => a.position)) + 1 : 0;
      }
      const { data: updated, error } = await supabase
        .from('crm_ameliorations')
        .update(payload)
        .eq('id', editingItem.id)
        .select()
        .single();
      if (error || !updated) {
        setSaveError(error?.message ?? 'Erreur lors de la modification');
        return;
      }
      onAmeliorationsChange(ameliorations.map((a) => a.id === editingItem.id ? (updated as Amelioration) : a));
    } else {
      const catItems = ameliorations.filter((a) => a.category_id === modalCategoryId);
      const maxPos = catItems.length > 0 ? Math.max(...catItems.map((a) => a.position)) + 1 : 0;
      const { data: inserted, error } = await supabase
        .from('crm_ameliorations')
        .insert({ title: data.title, description: data.description, status: data.status, category_id: modalCategoryId, created_at: timestamp, position: maxPos })
        .select()
        .single();
      if (error || !inserted) {
        setSaveError(error?.message ?? "Erreur lors de l'enregistrement");
        return;
      }
      onAmeliorationsChange([...ameliorations, inserted as Amelioration]);
    }
    setModalOpen(false);
    setEditingItem(null);
    setModalCategoryId(null);
  }, [editingItem, ameliorations, modalCategoryId, onAmeliorationsChange]);

  const handleDeleteAmelioration = useCallback(async (id: string) => {
    await supabase.from('crm_ameliorations').delete().eq('id', id);
    onAmeliorationsChange(ameliorations.filter((a) => a.id !== id));
    setConfirmDeleteId(null);
  }, [ameliorations, onAmeliorationsChange]);

  const handleTransfer = useCallback(async (itemId: string, targetCategoryId: string) => {
    const targetItems = ameliorations.filter((a) => a.category_id === targetCategoryId);
    const newPosition = targetItems.length > 0 ? Math.max(...targetItems.map((a) => a.position)) + 1 : 0;
    const { data: updated, error } = await supabase
      .from('crm_ameliorations')
      .update({ category_id: targetCategoryId, position: newPosition, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    if (!error && updated) {
      onAmeliorationsChange(ameliorations.map((a) => a.id === itemId ? (updated as Amelioration) : a));
    }
  }, [ameliorations, onAmeliorationsChange]);

  const startReorder = (catId: string) => {
    const items = getItemsForCategory(catId);
    setReorderItems(items);
    setReorderingCatId(catId);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    setReorderItems((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    setMovedId(reorderItems[idx].id);
    if (movedTimeout.current) clearTimeout(movedTimeout.current);
    movedTimeout.current = setTimeout(() => setMovedId(null), 400);
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= reorderItems.length - 1) return;
    setReorderItems((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    setMovedId(reorderItems[idx].id);
    if (movedTimeout.current) clearTimeout(movedTimeout.current);
    movedTimeout.current = setTimeout(() => setMovedId(null), 400);
  };

  const handleSaveOrder = useCallback(async () => {
    const updates = reorderItems.map((item, idx) => ({ id: item.id, position: idx }));
    await Promise.all(
      updates.map(({ id, position }) =>
        supabase.from('crm_ameliorations').update({ position }).eq('id', id)
      )
    );
    const updatedMap = new Map(updates.map((u) => [u.id, u.position]));
    onAmeliorationsChange(
      ameliorations.map((a) => updatedMap.has(a.id) ? { ...a, position: updatedMap.get(a.id)! } : a)
    );
    setReorderingCatId(null);
    setReorderItems([]);
  }, [reorderItems, ameliorations, onAmeliorationsChange]);

  const cancelReorder = () => {
    setReorderingCatId(null);
    setReorderItems([]);
  };

  const handleDragStart = (idx: number) => {
    dragIndexRef.current = idx;
    setDragIndex(idx);
  };

  const handleDragOver = (e: DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndexRef.current === null) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const targetIdx = e.clientY < midY ? idx : idx + 1;
    setDragOverIndex(targetIdx);
  };

  const handleDragDrop = () => {
    if (dragIndexRef.current === null || dragOverIndex === null) return;
    const from = dragIndexRef.current;
    let to = dragOverIndex;
    if (to > from) to -= 1;
    if (from !== to) {
      setReorderItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      setMovedId(reorderItems[from]?.id ?? null);
      if (movedTimeout.current) clearTimeout(movedTimeout.current);
      movedTimeout.current = setTimeout(() => setMovedId(null), 400);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragIndexRef.current = null;
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragIndexRef.current = null;
  };

  const openModal = (catId: string | null, item: Amelioration | null = null) => {
    setSaveError(null);
    setModalCategoryId(catId);
    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSaveError(null);
    setModalOpen(false);
    setEditingItem(null);
    setModalCategoryId(null);
  };

  return {
    modalOpen,
    editingItem,
    saveError,
    confirmDeleteId,
    setConfirmDeleteId,
    confirmDeleteCatId,
    setConfirmDeleteCatId,
    reorderingCatId,
    reorderItems,
    movedId,
    dragIndex,
    dragOverIndex,
    getItemsForCategory,
    handleCreateCategory,
    handleRenameCategory,
    handleDeleteCategory,
    handleSaveAmelioration,
    handleDeleteAmelioration,
    handleTransfer,
    startReorder,
    handleMoveUp,
    handleMoveDown,
    handleSaveOrder,
    cancelReorder,
    handleDragStart,
    handleDragOver,
    handleDragDrop,
    handleDragEnd,
    openModal,
    closeModal,
  };
}
