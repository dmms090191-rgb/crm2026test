import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { notifyLogoChanged } from '../../hooks/useActiveLogo';
import { extractStoragePath } from './logoListHelpers';
import type { SavedLogo, ReorderEntry, GalleryEntry, GalleryFilter, LogoTypeFilter } from './logoAiTypes';
import { isIconFileName } from './logoAiTypes';

export default function useLogoAiGallery(companyId: string | null) {
  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [gallerySearch, setGallerySearch] = useState('');
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');
  const [logoTypeFilter, setLogoTypeFilter] = useState<LogoTypeFilter>('both');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [selectingActive, setSelectingActive] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderLogos, setReorderLogos] = useState<SavedLogo[]>([]);
  const [reorderEntries, setReorderEntries] = useState<ReorderEntry[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchSavedLogos = useCallback(async () => {
    if (!companyId) { setSavedLoading(false); return; }
    const { data } = await supabase.from('company_logos').select('id,url,file_name,is_active,is_favorite,position,created_at,generation_group_id')
      .eq('company_id', companyId).order('position', { ascending: true }).order('created_at', { ascending: false });
    setSavedLogos((data ?? []) as SavedLogo[]);
    setSavedLoading(false);
  }, [companyId]);

  useEffect(() => { fetchSavedLogos(); }, [fetchSavedLogos]);

  const handleToggleFavorite = useCallback(async (id: string, favorite: boolean) => {
    setSavedLogos(prev => prev.map(l => l.id === id ? { ...l, is_favorite: favorite } : l));
    try {
      const { error } = await supabase.from('company_logos').update({ is_favorite: favorite }).eq('id', id);
      if (error) throw error;
    } catch {
      setSavedLogos(prev => prev.map(l => l.id === id ? { ...l, is_favorite: !favorite } : l));
    }
  }, []);

  const handleSelectAsActive = useCallback(async (id: string) => {
    if (!companyId) return;
    setSelectingActive(true);
    try {
      await supabase.from('company_logos').update({ is_active: false }).eq('company_id', companyId);
      const { error } = await supabase.from('company_logos').update({ is_active: true }).eq('id', id);
      if (error) throw error;
      const selected = savedLogos.find(l => l.id === id);
      if (selected) {
        await supabase.from('company_home_pages')
          .update({ logo_url: selected.url, updated_at: new Date().toISOString() }).eq('company_id', companyId);
      }
      notifyLogoChanged();
      await fetchSavedLogos();
    } catch { /* silent */ }
    finally { setSelectingActive(false); }
  }, [companyId, savedLogos, fetchSavedLogos]);

  const handleBulkDeleteGallery = useCallback(async () => {
    if (checkedIds.size === 0 || !companyId) return;
    setBulkDeleting(true);
    try {
      const toDelete = savedLogos.filter(l => checkedIds.has(l.id));
      const storagePaths = toDelete.map(l => extractStoragePath(l.url)).filter((p): p is string => !!p);
      if (storagePaths.length > 0) {
        await supabase.storage.from('company-logos').remove(storagePaths);
      }
      for (const logo of toDelete) {
        const { error } = await supabase.from('company_logos').delete().eq('id', logo.id);
        if (error) throw error;
      }
      const hadActive = toDelete.some(l => l.is_active);
      if (hadActive) {
        const remaining = savedLogos.filter(l => !checkedIds.has(l.id));
        if (remaining.length > 0) {
          await supabase.from('company_logos').update({ is_active: true }).eq('id', remaining[0].id);
          await supabase.from('company_home_pages')
            .update({ logo_url: remaining[0].url, updated_at: new Date().toISOString() }).eq('company_id', companyId);
        } else {
          await supabase.from('company_home_pages')
            .update({ logo_url: null, updated_at: new Date().toISOString() }).eq('company_id', companyId);
        }
      }
      notifyLogoChanged();
      setCheckedIds(new Set());
      setConfirmBulkDelete(false);
      if (selectedGalleryId && checkedIds.has(selectedGalleryId)) setSelectedGalleryId(null);
      await fetchSavedLogos();
    } catch { /* silent */ }
    finally { setBulkDeleting(false); }
  }, [checkedIds, companyId, savedLogos, selectedGalleryId, fetchSavedLogos]);

  const toggleCheck = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setConfirmBulkDelete(false);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setGalleryFilter('all');
    setCheckedIds(new Set());
    setConfirmBulkDelete(false);
  }, []);

  const enterReorderMode = useCallback(() => {
    setReordering(true);
    setReorderLogos([...savedLogos]);
    const entries: ReorderEntry[] = [];
    const seen = new Set<string>();
    for (const logo of savedLogos) {
      if (seen.has(logo.id)) continue;
      if (logo.generation_group_id) {
        const siblings = savedLogos.filter(l => l.generation_group_id === logo.generation_group_id);
        if (siblings.length > 1 && !seen.has(siblings[0].id)) {
          siblings.forEach(s => seen.add(s.id));
          entries.push({ type: 'group', logos: siblings, groupId: logo.generation_group_id });
          continue;
        }
      }
      seen.add(logo.id);
      entries.push({ type: 'single', logo });
    }
    setReorderEntries(entries);
    setGalleryFilter('all');
    setCheckedIds(new Set());
    setConfirmBulkDelete(false);
  }, [savedLogos]);

  const cancelReorder = useCallback(() => {
    setReordering(false);
    setReorderLogos([]);
    setReorderEntries([]);
    setDragIdx(null);
    setDropIdx(null);
  }, []);

  const saveReorder = useCallback(async () => {
    if (!companyId) return;
    setSavingOrder(true);
    try {
      const flat: SavedLogo[] = [];
      for (const entry of reorderEntries) {
        if (entry.type === 'single') flat.push(entry.logo);
        else entry.logos.forEach(l => flat.push(l));
      }
      await Promise.all(flat.map((l, i) =>
        supabase.from('company_logos').update({ position: i }).eq('id', l.id)
      ));
      setSavedLogos(flat.map((l, i) => ({ ...l, position: i })));
      setReordering(false);
      setReorderLogos([]);
      setReorderEntries([]);
    } catch { /* silent */ }
    finally { setSavingOrder(false); setDragIdx(null); setDropIdx(null); }
  }, [companyId, reorderEntries]);

  const handleDragStart = useCallback((idx: number) => { setDragIdx(idx); }, []);
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropIdx(idx); }, []);
  const handleDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDropIdx(null); return; }
    setReorderEntries(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null); setDropIdx(null);
  }, [dragIdx]);
  const handleDragEnd = useCallback(() => { setDragIdx(null); setDropIdx(null); }, []);

  const isSelectionMode = galleryFilter === 'selection';
  const favCount = savedLogos.filter(l => l.is_favorite).length;
  const baseLogos = reordering ? reorderLogos : savedLogos;
  const searchFiltered = gallerySearch.trim()
    ? baseLogos.filter(l => l.file_name?.toLowerCase().includes(gallerySearch.toLowerCase()))
    : baseLogos;
  const favFiltered = galleryFilter === 'favorites' ? searchFiltered.filter(l => l.is_favorite) : searchFiltered;
  const filteredSaved = logoTypeFilter === 'both'
    ? favFiltered
    : logoTypeFilter === 'icon'
      ? favFiltered.filter(l => isIconFileName(l.file_name))
      : favFiltered.filter(l => !isIconFileName(l.file_name));

  const galleryEntries: GalleryEntry[] = (() => {
    if (reordering) {
      return reorderEntries.map((e, i) =>
        e.type === 'single'
          ? { type: 'single' as const, logo: e.logo, entryIdx: i }
          : { type: 'group' as const, logos: e.logos, groupId: e.groupId, entryIdx: i }
      );
    }
    const seen = new Set<string>();
    const entries: GalleryEntry[] = [];
    let idx = 0;
    for (const logo of filteredSaved) {
      if (seen.has(logo.id)) continue;
      if (logo.generation_group_id) {
        const siblings = filteredSaved.filter(l => l.generation_group_id === logo.generation_group_id);
        if (siblings.length > 1 && !seen.has(siblings[0].id)) {
          siblings.forEach(s => seen.add(s.id));
          entries.push({ type: 'group', logos: siblings, groupId: logo.generation_group_id, entryIdx: idx });
          idx++;
          continue;
        }
      }
      seen.add(logo.id);
      entries.push({ type: 'single', logo, entryIdx: idx });
      idx++;
    }
    return entries;
  })();

  const selectedLogo = filteredSaved.find(l => l.id === selectedGalleryId) ?? null;
  const selectedFamily: SavedLogo[] = selectedLogo?.generation_group_id
    ? savedLogos.filter(l => l.generation_group_id === selectedLogo.generation_group_id)
    : selectedLogo ? [selectedLogo] : [];

  return {
    savedLogos, savedLoading, gallerySearch, setGallerySearch,
    selectedGalleryId, setSelectedGalleryId,
    galleryFilter, setGalleryFilter, logoTypeFilter, setLogoTypeFilter,
    checkedIds, setCheckedIds, bulkDeleting, confirmBulkDelete, setConfirmBulkDelete,
    selectingActive, reordering, reorderEntries, dragIdx, dropIdx, savingOrder,
    isSelectionMode, favCount, filteredSaved, galleryEntries,
    selectedLogo, selectedFamily,
    fetchSavedLogos, handleToggleFavorite, handleSelectAsActive,
    handleBulkDeleteGallery, toggleCheck, exitSelectionMode,
    enterReorderMode, cancelReorder, saveReorder,
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
  };
}
