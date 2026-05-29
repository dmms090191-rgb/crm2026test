import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles, Loader2, AlertTriangle,
  Download, Maximize2, Wand2, Star,
  Search, SlidersHorizontal,
  Check, Shield, X, Palette,
  ZoomIn, ZoomOut, RotateCcw,
  Heart, LayoutGrid, MousePointerClick, Trash2, CheckSquare, ArrowLeftRight, GripVertical, Layers,
  Type, Smartphone,
} from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { notifyLogoChanged } from '../../hooks/useActiveLogo';
import { supabase } from '../../lib/supabase';
import { extractStoragePath } from './logoListHelpers';
import {
  PRESETS, UNIT_COST_PER_IMAGE, TRANSPARENT_COST_PER_IMAGE, COST_WARNING_THRESHOLD,
  type Preset, type NumProposals, type ColorPaletteId,
} from './logoAiConstants';
import { hexToRgb, rasterizeSvgUrl } from './logoAiHelpers';
import LogoAiV4Controls from './LogoAiV4Controls';
import LogoAiOptionsBar from './LogoAiOptionsBar';
import LogoAiResultsGrid, { type ResultGroup } from './LogoAiResultsGrid';

interface Props { companyId: string | null; }

interface SavedLogo { id: string; url: string; file_name: string; is_active: boolean; is_favorite: boolean; position: number; created_at: string; generation_group_id?: string | null; }

export default function LogoAiTab({ companyId }: Props) {
  const t = useThemeTokens();
  const [selectedPresets, setSelectedPresets] = useState<Preset[]>(['typographic', 'app_icon']);
  const [colorPalette, setColorPalette] = useState<ColorPaletteId>('custom');
  const [customPrimary, setCustomPrimary] = useState('#001F3F');
  const [customSecondary, setCustomSecondary] = useState('#00BCD4');
  const [brandName, setBrandName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [numProposals, setNumProposals] = useState<NumProposals>(1);
  const [transparentBg, setTransparentBg] = useState(true);
  const [loading, setLoading] = useState(false);
  const [postProcessing, setPostProcessing] = useState(false);
  const [postProcessStatus, setPostProcessStatus] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingPack, setSavingPack] = useState<number | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [resultGroups, setResultGroups] = useState<ResultGroup[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [gallerySearch, setGallerySearch] = useState('');
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'favorites' | 'selection'>('all');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [selectingActive, setSelectingActive] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderLogos, setReorderLogos] = useState<SavedLogo[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const numTypes = Math.max(selectedPresets.length, 1);
  const totalImages = numTypes * numProposals;
  const genCost = totalImages * UNIT_COST_PER_IMAGE;
  const transpCost = transparentBg ? totalImages * TRANSPARENT_COST_PER_IMAGE : 0;
  const estimatedCost = genCost + transpCost;
  const needsBrand = selectedPresets.some(id => PRESETS.find(p => p.id === id)?.needsBrand ?? false);
  const canGenerate = selectedPresets.length > 0 && (!needsBrand || brandName.trim().length > 0);

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

  type ReorderEntry = { type: 'single'; logo: SavedLogo } | { type: 'group'; logos: SavedLogo[]; groupId: string };
  const [reorderEntries, setReorderEntries] = useState<ReorderEntry[]>([]);

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

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDropIdx(null); return; }
    setReorderEntries(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setDropIdx(null);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDropIdx(null);
  }, []);

  const removeBackground = useCallback(async (pngBase64: string, cId: string, token: string): Promise<string> => {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-logo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove-background', image_base64: pngBase64, company_id: cId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur removeBackground');
    return data.image_url;
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate || selectedPresets.length === 0) return;
    setLoading(true); setError(null); setResultGroups([]); setSavedSet(new Set()); setCurrentGroupId(null);
    setPostProcessing(false); setPostProcessStatus(null); setProgressLabel(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Vous devez etre connecte.'); return; }
      const payload: Record<string, unknown> = {
        engine: 'v4_1', presets: selectedPresets, n: numProposals,
        brand_name: brandName.trim(), company_id: companyId ?? '',
      };
      if (colorPalette === 'custom') payload.colors = [Array.from(hexToRgb(customPrimary)), Array.from(hexToRgb(customSecondary))];
      else if (colorPalette === 'black_white') payload.colors = [[0, 0, 0], [255, 255, 255]];
      if (prompt.trim()) payload.prompt = prompt.trim();
      if (selectedPresets.length > 1) setProgressLabel(`Generation type 1/${selectedPresets.length}...`);
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Erreur lors de la generation.'); return; }
      setCurrentGroupId(data.generation_group_id ?? null);
      let groups: ResultGroup[];
      if (data.groups && Array.isArray(data.groups)) groups = data.groups as ResultGroup[];
      else {
        const urls: string[] = data.image_urls ?? (data.image_url ? [data.image_url] : []);
        groups = [{ preset: selectedPresets[0], urls }];
      }
      if (transparentBg) {
        setLoading(false); setPostProcessing(true); setProgressLabel(null);
        const allUrls = groups.flatMap(g => g.urls);
        const transparentUrls: string[] = [];
        for (let i = 0; i < allUrls.length; i++) {
          setPostProcessStatus(`Conversion transparente ${i + 1}/${allUrls.length}...`);
          try {
            const pngDataUrl = await rasterizeSvgUrl(allUrls[i]);
            transparentUrls.push(await removeBackground(pngDataUrl, companyId ?? '', session.access_token));
          } catch (e) { transparentUrls.push(allUrls[i]); console.error(`[LogoAiTab] removeBackground ${i}:`, e); }
        }
        let urlIdx = 0;
        groups = groups.map(g => { const n = transparentUrls.slice(urlIdx, urlIdx + g.urls.length); urlIdx += g.urls.length; return { ...g, urls: n }; });
        setPostProcessing(false); setPostProcessStatus(null);
      }
      setResultGroups(groups);
    } catch { setError('Une erreur est survenue lors de la generation.'); }
    finally { setLoading(false); setPostProcessing(false); setPostProcessStatus(null); setProgressLabel(null); }
  };

  const handleSave = async (url: string, key: string) => {
    if (!companyId) { setError('Aucune societe associee.'); return; }
    setSavingKey(key); setError(null);
    try {
      const { data: existing } = await supabase.from('company_logos').select('position').eq('company_id', companyId).order('position', { ascending: false }).limit(1);
      const maxPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const presetId = key.split('-')[0] as Preset;
      const presetDef = PRESETS.find(p => p.id === presetId);
      const label = transparentBg ? `${presetDef?.label ?? 'Logo IA'} (transparent)` : presetDef?.label ?? 'Logo IA';
      const insertData: Record<string, unknown> = { company_id: companyId, url, file_name: `${label} - ${new Date().toLocaleDateString('fr-FR')}`, is_active: false, position: maxPos };
      if (currentGroupId) insertData.generation_group_id = currentGroupId;
      const { error: dbErr } = await supabase.from('company_logos').insert(insertData);
      if (dbErr) throw dbErr;
      setSavedSet(prev => new Set(prev).add(key));
      fetchSavedLogos();
    } catch (e: unknown) { setError(`Erreur sauvegarde : ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSavingKey(null); }
  };

  const handleSavePack = async (packIndex: number) => {
    if (!companyId) { setError('Aucune societe associee.'); return; }
    setSavingPack(packIndex); setError(null);
    try {
      const { data: existing } = await supabase.from('company_logos').select('position').eq('company_id', companyId).order('position', { ascending: false }).limit(1);
      let pos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const packGroupId = currentGroupId
        ? `${currentGroupId}-p${packIndex}`
        : `pack-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const dateStr = new Date().toLocaleDateString('fr-FR');
      const newKeys: string[] = [];
      for (const group of resultGroups) {
        const url = group.urls[packIndex];
        if (!url) continue;
        const presetDef = PRESETS.find(p => p.id === group.preset);
        const label = transparentBg ? `${presetDef?.label ?? 'Logo IA'} (transparent)` : presetDef?.label ?? 'Logo IA';
        const { error: dbErr } = await supabase.from('company_logos').insert({
          company_id: companyId, url, file_name: `${label} - ${dateStr}`,
          is_active: false, position: pos, generation_group_id: packGroupId,
        });
        if (dbErr) throw dbErr;
        newKeys.push(`${group.preset}-${packIndex}`);
        pos++;
      }
      setSavedSet(prev => { const next = new Set(prev); newKeys.forEach(k => next.add(k)); return next; });
      fetchSavedLogos();
    } catch (e: unknown) { setError(`Erreur sauvegarde : ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSavingPack(null); }
  };

  const baseLogos = reordering ? reorderLogos : savedLogos;
  const searchFiltered = gallerySearch.trim()
    ? baseLogos.filter(l => l.file_name?.toLowerCase().includes(gallerySearch.toLowerCase()))
    : baseLogos;
  const filteredSaved = galleryFilter === 'favorites' ? searchFiltered.filter(l => l.is_favorite) : searchFiltered;
  const favCount = savedLogos.filter(l => l.is_favorite).length;
  const isSelectionMode = galleryFilter === 'selection';

  type GalleryEntry = { type: 'single'; logo: SavedLogo; entryIdx: number } | { type: 'group'; logos: SavedLogo[]; groupId: string; entryIdx: number };
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

  return (
    <>
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 lg:items-stretch">
        {/* LEFT - Config (42%) */}
        <div className="w-full lg:w-[42%] lg:flex-shrink-0 flex flex-col"
          style={{ borderRight: `1px solid ${t.surface.borderLight}` }}>
          <div className="p-3 sm:p-3 flex flex-col flex-1 min-h-0 lg:overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3 h-3" style={{ color: '#d97706' }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: t.text.tertiary }}>Configuration du logo</span>
            </div>

            <div className="space-y-2.5 flex-1">
              <LogoAiV4Controls
                selectedPresets={selectedPresets} setSelectedPresets={setSelectedPresets}
                needsBrand={needsBrand} brandName={brandName} setBrandName={setBrandName}
                colorPalette={colorPalette} setColorPalette={setColorPalette}
                customPrimary={customPrimary} setCustomPrimary={setCustomPrimary}
                customSecondary={customSecondary} setCustomSecondary={setCustomSecondary}
                prompt={prompt} setPrompt={setPrompt}
                surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
                surfacePrimary={t.surface.primary} textPrimary={t.text.primary}
                textSecondary={t.text.secondary} textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
              />
              <div className="h-px flex-shrink-0" style={{ background: `linear-gradient(90deg, rgba(245,158,11,0.12), ${t.surface.borderLight}, transparent)` }} />
              <LogoAiOptionsBar
                transparentBg={transparentBg} setTransparentBg={setTransparentBg}
                numProposals={numProposals} setNumProposals={setNumProposals} numTypes={numTypes}
                surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
                textSecondary={t.text.secondary} textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
              />
            </div>

            {/* Cost + Generate */}
            <div className="pt-2.5 mt-auto space-y-1.5 flex-shrink-0" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold" style={{ color: t.text.tertiary }}>Cout estime</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[13px] font-black tabular-nums" style={{ color: '#f59e0b' }}>{estimatedCost}</span>
                  <span className="text-[8px] font-bold" style={{ color: t.text.quaternary }}>
                    credits ({totalImages} img)
                  </span>
                </div>
              </div>
              {estimatedCost > COST_WARNING_THRESHOLD && (
                <div className="flex items-center gap-1.5 text-[9px] font-medium" style={{ color: '#d97706' }}>
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Cout eleve.
                </div>
              )}
              <button onClick={handleGenerate} disabled={loading || postProcessing || !canGenerate}
                className="group relative w-full overflow-hidden flex items-center justify-center gap-2 py-3.5 lg:py-2.5 rounded-xl text-[13px] lg:text-[11px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                  color: '#fff',
                  boxShadow: canGenerate ? '0 4px 20px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
                }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }} />
                <span className="relative flex items-center gap-2">
                  {(loading || postProcessing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {(loading || postProcessing) ? 'Generation...' : `Generer ${totalImages} logo${totalImages > 1 ? 's' : ''}`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT - Preview + Gallery + Detail (58%) */}
        <div className="w-full lg:w-[58%] flex flex-col min-h-0 lg:overflow-hidden">

          {/* ZONE 1 - Generated logo preview */}
          <div className="flex-shrink flex flex-col min-h-0" style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}>
            <div className="flex items-center gap-2 px-3 pt-2 pb-1 flex-shrink-0">
              <Star className="w-3 h-3" style={{ color: '#d97706' }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: t.text.tertiary }}>Apercu du logo cree</span>
            </div>
            <div className="px-3 pb-2 flex-1 min-h-0 overflow-y-auto">
              <div className="rounded-lg overflow-hidden" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                <div className="min-h-[160px]">
                  <LogoAiResultsGrid
                    groups={resultGroups} transparentBg={transparentBg}
                    savedSet={savedSet} savingKey={savingKey} companyId={companyId}
                    loading={loading} postProcessing={postProcessing} postProcessStatus={postProcessStatus}
                    numProposals={numProposals} totalImages={totalImages} genCost={genCost}
                    progressLabel={progressLabel}
                    onSave={handleSave} onSavePack={handleSavePack} savingPack={savingPack}
                    onClear={() => { setResultGroups([]); setSavedSet(new Set()); }}
                    onFullscreen={setFullscreenUrl}
                    textPrimary={t.text.primary} textSecondary={t.text.secondary}
                    textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
                    surfacePrimary={t.surface.primary} surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
                  />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold" style={{ color: '#ef4444' }}>
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {error}
                </div>
              )}
            </div>
          </div>

          {/* ZONE 2 - Saved logos gallery */}
          <div className="flex-shrink-0 px-3 pt-2 pb-1.5" style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}>
            {/* Gallery header - desktop */}
            <div className="hidden lg:flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3" style={{ color: '#d97706' }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: t.text.tertiary }}>Logos sauvegardes</span>
                {!savedLoading && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.12)' }}>
                    {savedLogos.length}
                  </span>
                )}
                {!savedLoading && savedLogos.length > 0 && (
                  <div className="flex gap-0.5 ml-2 rounded-md p-0.5" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                    <button onClick={() => { setGalleryFilter('all'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-bold transition-all"
                      style={galleryFilter === 'all' ? {
                        background: t.surface.primary,
                        color: t.text.primary,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      } : { color: t.text.quaternary }}>
                      <LayoutGrid className="w-2.5 h-2.5" /> Tous
                    </button>
                    <button onClick={() => { setGalleryFilter('favorites'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-bold transition-all"
                      style={galleryFilter === 'favorites' ? {
                        background: 'rgba(239,68,68,0.06)',
                        color: '#ef4444',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(239,68,68,0.12)',
                      } : { color: t.text.quaternary }}>
                      <Heart className="w-2.5 h-2.5" fill={galleryFilter === 'favorites' ? '#ef4444' : 'none'} />
                      Favoris
                      {favCount > 0 && (
                        <span className="text-[7px] font-bold px-1 rounded-full"
                          style={{ background: galleryFilter === 'favorites' ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.04)', color: galleryFilter === 'favorites' ? '#ef4444' : t.text.quaternary }}>
                          {favCount}
                        </span>
                      )}
                    </button>
                    <button onClick={() => setGalleryFilter('selection')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-bold transition-all"
                      style={isSelectionMode ? {
                        background: 'rgba(14,165,233,0.06)',
                        color: '#0284c7',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(14,165,233,0.12)',
                      } : { color: t.text.quaternary }}>
                      <MousePointerClick className="w-2.5 h-2.5" />
                      Selection
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5" style={{ color: t.text.quaternary }} />
                  <input type="text" value={gallerySearch} onChange={e => setGallerySearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-[120px] pl-6 pr-2 py-1 rounded-md text-[9px] font-medium focus:outline-none"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}
                  />
                </div>
                <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-bold"
                  style={{ border: `1px solid ${t.surface.border}`, color: t.text.quaternary }}>
                  <SlidersHorizontal className="w-2.5 h-2.5" /> Style
                </button>
                {!savedLoading && savedLogos.length > 1 && !reordering && !isSelectionMode && (
                  <button onClick={enterReorderMode}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-bold transition-all hover:brightness-110"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706' }}>
                    <ArrowLeftRight className="w-2.5 h-2.5" /> Reorganiser
                  </button>
                )}
              </div>
            </div>

            {/* Gallery header - mobile */}
            <div className="lg:hidden space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: '#d97706' }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.text.tertiary }}>Logos sauvegardes</span>
                  {!savedLoading && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.12)' }}>
                      {savedLogos.length}
                    </span>
                  )}
                </div>
                {!savedLoading && savedLogos.length > 1 && !reordering && !isSelectionMode && (
                  <button onClick={enterReorderMode}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706' }}>
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {!savedLoading && savedLogos.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5 flex-1 rounded-lg p-0.5" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                    <button onClick={() => { setGalleryFilter('all'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
                      className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-md text-[9px] font-bold transition-all"
                      style={galleryFilter === 'all' ? {
                        background: t.surface.primary,
                        color: t.text.primary,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      } : { color: t.text.quaternary }}>
                      <LayoutGrid className="w-3 h-3" /> Tous
                    </button>
                    <button onClick={() => { setGalleryFilter('favorites'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
                      className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-md text-[9px] font-bold transition-all"
                      style={galleryFilter === 'favorites' ? {
                        background: 'rgba(239,68,68,0.06)',
                        color: '#ef4444',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(239,68,68,0.12)',
                      } : { color: t.text.quaternary }}>
                      <Heart className="w-3 h-3" fill={galleryFilter === 'favorites' ? '#ef4444' : 'none'} />
                      {favCount > 0 && (
                        <span className="text-[8px] font-bold px-1 rounded-full"
                          style={{ background: galleryFilter === 'favorites' ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.04)', color: galleryFilter === 'favorites' ? '#ef4444' : t.text.quaternary }}>
                          {favCount}
                        </span>
                      )}
                    </button>
                    <button onClick={() => setGalleryFilter('selection')}
                      className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-md text-[9px] font-bold transition-all"
                      style={isSelectionMode ? {
                        background: 'rgba(14,165,233,0.06)',
                        color: '#0284c7',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(14,165,233,0.12)',
                      } : { color: t.text.quaternary }}>
                      <MousePointerClick className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: t.text.quaternary }} />
                <input type="text" value={gallerySearch} onChange={e => setGallerySearch(e.target.value)}
                  placeholder="Rechercher un logo..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-[11px] font-medium focus:outline-none"
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}
                />
              </div>
            </div>

            {/* Selection action bar */}
            {isSelectionMode && filteredSaved.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <button onClick={() => {
                  if (checkedIds.size === filteredSaved.length) setCheckedIds(new Set());
                  else setCheckedIds(new Set(filteredSaved.map(l => l.id)));
                  setConfirmBulkDelete(false);
                }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                  style={{
                    background: checkedIds.size === filteredSaved.length ? 'rgba(14,165,233,0.08)' : t.surface.secondary,
                    border: `1px solid ${checkedIds.size === filteredSaved.length ? 'rgba(14,165,233,0.2)' : t.surface.border}`,
                    color: checkedIds.size === filteredSaved.length ? '#0284c7' : t.text.tertiary,
                  }}>
                  <CheckSquare className="w-3 h-3" />
                  {checkedIds.size === filteredSaved.length ? 'Tout decocher' : 'Tout selectionner'}
                </button>
                {checkedIds.size > 0 && (
                  <>
                    <span className="text-[8px] font-bold px-2 py-1 rounded-full"
                      style={{ background: 'rgba(14,165,233,0.06)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.12)' }}>
                      {checkedIds.size} selectionne{checkedIds.size > 1 ? 's' : ''}
                    </span>
                    {!confirmBulkDelete ? (
                      <button onClick={() => setConfirmBulkDelete(true)}
                        disabled={bulkDeleting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
                        <Trash2 className="w-3 h-3" />
                        Supprimer
                      </button>
                    ) : (
                      <button onClick={handleBulkDeleteGallery}
                        disabled={bulkDeleting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-50"
                        style={{ background: '#ef4444', color: '#fff', boxShadow: '0 2px 8px rgba(239,68,68,0.25)' }}>
                        {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Confirmer
                      </button>
                    )}
                  </>
                )}
                <button onClick={exitSelectionMode}
                  className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                  style={{ border: `1px solid ${t.surface.border}`, color: t.text.quaternary }}>
                  <X className="w-2.5 h-2.5" /> Quitter
                </button>
              </div>
            )}

            {/* Reorder action bar */}
            {reordering && (
              <div className="flex items-center gap-1.5 mb-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <GripVertical className="w-3 h-3 flex-shrink-0" style={{ color: '#d97706' }} />
                <span className="text-[9px] font-medium flex-1" style={{ color: '#d97706' }}>
                  Glissez-deposez les logos pour les reorganiser.
                </span>
                <button onClick={saveReorder}
                  disabled={savingOrder}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-50 hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(22,163,106,0.2)',
                  }}>
                  {savingOrder ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Valider
                </button>
                <button onClick={cancelReorder}
                  disabled={savingOrder}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-50"
                  style={{ border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}>
                  <X className="w-2.5 h-2.5" /> Annuler
                </button>
              </div>
            )}

            {savedLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#d97706' }} />
              </div>
            ) : filteredSaved.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4">
                {galleryFilter === 'favorites' ? (
                  <>
                    <Heart className="w-3.5 h-3.5" style={{ color: '#ef4444', opacity: 0.4 }} />
                    <p className="text-[10px] font-medium" style={{ color: t.text.quaternary }}>
                      Aucun logo favori. Survolez un logo et cliquez sur le coeur.
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-medium" style={{ color: t.text.quaternary }}>
                    {gallerySearch ? 'Aucun logo correspondant.' : 'Aucun logo sauvegarde.'}
                  </p>
                )}
              </div>
            ) : (
              <>
                <style>{`.logo-sq-scroll::-webkit-scrollbar{height:5px}.logo-sq-scroll::-webkit-scrollbar-track{background:rgba(255,255,255,0.02);border-radius:3px}.logo-sq-scroll::-webkit-scrollbar-thumb{background:${t.surface.border};border-radius:3px}.logo-sq-scroll::-webkit-scrollbar-thumb:hover{background:${t.text.quaternary}}`}</style>
                {/* Desktop: horizontal scroll */}
                <div className="hidden lg:block overflow-x-auto pb-1.5 logo-sq-scroll"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.surface.border} transparent` }}>
                  <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
                    {galleryEntries.map((entry) => {
                      const ei = entry.entryIdx;
                      const isEntryDragTarget = reordering && dropIdx === ei && dragIdx !== ei;
                      if (entry.type === 'single') {
                        const logo = entry.logo;
                        return (
                          <GalleryThumb key={logo.id} logo={logo} t={t}
                            isSelected={selectedGalleryId === logo.id}
                            onToggleFavorite={handleToggleFavorite}
                            selectionMode={isSelectionMode}
                            checked={checkedIds.has(logo.id)}
                            onToggleCheck={toggleCheck}
                            reordering={reordering}
                            idx={ei}
                            isDragTarget={isEntryDragTarget}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
                              setSelectedGalleryId(selectedGalleryId === logo.id ? null : logo.id);
                              requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
                            }}
                          />
                        );
                      }
                      const anySelected = entry.logos.some(l => l.id === selectedGalleryId);
                      const anyChecked = entry.logos.some(l => checkedIds.has(l.id));
                      const d = new Date(entry.logos[0].created_at);
                      const groupDate = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                      const groupCard = (
                        <div key={entry.groupId}
                          className={`flex-shrink-0 w-[180px] rounded-xl overflow-hidden transition-all group/family ${reordering ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          draggable={reordering}
                          onDragStart={reordering ? () => handleDragStart(ei) : undefined}
                          onDragEnd={reordering ? handleDragEnd : undefined}
                          style={{
                            border: reordering
                              ? '1px dashed rgba(245,158,11,0.4)'
                              : anySelected ? '2px solid #f59e0b'
                              : anyChecked && isSelectionMode ? '2px solid #0ea5e9'
                              : `1px solid rgba(245,158,11,0.25)`,
                            boxShadow: anySelected && !reordering ? '0 0 0 2px rgba(245,158,11,0.15), 0 3px 12px rgba(245,158,11,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
                            background: `linear-gradient(135deg, rgba(245,158,11,0.02), rgba(217,119,6,0.02))`,
                          }}>
                          <button onClick={reordering ? undefined : () => {
                              const firstId = entry.logos[0].id;
                              setSelectedGalleryId(selectedGalleryId === firstId ? null : firstId);
                              requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
                            }}
                            className="w-full focus:outline-none" disabled={reordering}>
                            <div className="flex relative">
                              {reordering && (
                                <span className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-md flex items-center justify-center"
                                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(4px)' }}>
                                  <GripVertical className="w-3 h-3" style={{ color: '#d97706' }} />
                                </span>
                              )}
                              {entry.logos.map((logo, li) => {
                                const isPng = logo.url?.toLowerCase().includes('.png');
                                return (
                                  <div key={logo.id} className="flex-1 aspect-square flex items-center justify-center p-2"
                                    style={{
                                      background: isPng ? CHECKER_BG : `linear-gradient(160deg, ${t.surface.primary}, ${t.surface.secondary})`,
                                      backgroundSize: isPng ? '14px 14px' : undefined,
                                      backgroundPosition: isPng ? '0 0,0 7px,7px -7px,-7px 0px' : undefined,
                                      borderRight: li < entry.logos.length - 1 ? `1px solid rgba(245,158,11,0.1)` : undefined,
                                    }}>
                                    <img src={logo.url} alt={logo.file_name}
                                      className={`max-h-[56px] max-w-[72px] object-contain transition-transform ${reordering ? '' : 'group-hover/family:scale-105'}`}
                                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                                  </div>
                                );
                              })}
                            </div>
                          </button>
                          <div className="px-2 py-1.5 flex items-center gap-1" style={{ background: t.surface.secondary, borderTop: `1px solid rgba(245,158,11,0.1)` }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <Layers className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#d97706' }} />
                                <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#d97706' }}>Pack</span>
                              </div>
                              <p className="text-[7px]" style={{ color: t.text.quaternary }}>{groupDate}</p>
                            </div>
                            {!isSelectionMode && !reordering && (
                              <button
                                onClick={(e) => { e.stopPropagation(); entry.logos.forEach(l => handleToggleFavorite(l.id, !entry.logos.every(ll => ll.is_favorite))); }}
                                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${entry.logos.every(l => l.is_favorite) ? '' : 'opacity-0 group-hover/family:opacity-100'}`}
                                style={entry.logos.every(l => l.is_favorite) ? { background: 'rgba(239,68,68,0.1)' } : {}}>
                                <Heart className="w-3 h-3 transition-all"
                                  style={{ color: entry.logos.every(l => l.is_favorite) ? '#ef4444' : t.text.quaternary }}
                                  fill={entry.logos.every(l => l.is_favorite) ? '#ef4444' : 'none'} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                      if (reordering) {
                        return (
                          <div key={entry.groupId} className="flex-shrink-0 flex items-stretch"
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropIdx(ei); }}
                            onDrop={(e) => { e.preventDefault(); handleDrop(e, ei); }}>
                            {isEntryDragTarget && (
                              <div className="w-[3px] flex-shrink-0 rounded-full self-stretch -mr-0.5 z-10"
                                style={{ background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
                            )}
                            {groupCard}
                          </div>
                        );
                      }
                      return groupCard;
                    })}
                  </div>
                </div>
                {/* Mobile: vertical grid */}
                <div className="lg:hidden grid grid-cols-2 gap-2 pb-1.5">
                  {galleryEntries.map((entry) => {
                    if (entry.type === 'single') {
                      const logo = entry.logo;
                      return (
                        <MobileGalleryThumb key={logo.id} logo={logo} t={t}
                          isSelected={selectedGalleryId === logo.id}
                          onToggleFavorite={handleToggleFavorite}
                          selectionMode={isSelectionMode}
                          checked={checkedIds.has(logo.id)}
                          onToggleCheck={toggleCheck}
                          onClick={() => {
                            setSelectedGalleryId(selectedGalleryId === logo.id ? null : logo.id);
                            requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
                          }}
                        />
                      );
                    }
                    const anySelected = entry.logos.some(l => l.id === selectedGalleryId);
                    const anyChecked = entry.logos.some(l => checkedIds.has(l.id));
                    const d = new Date(entry.logos[0].created_at);
                    const groupDate = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                    return (
                      <div key={entry.groupId}
                        className="col-span-2 rounded-xl overflow-hidden transition-all"
                        style={{
                          border: anySelected ? '2px solid #f59e0b'
                            : anyChecked && isSelectionMode ? '2px solid #0ea5e9'
                            : `1px solid rgba(245,158,11,0.25)`,
                          boxShadow: anySelected ? '0 0 0 2px rgba(245,158,11,0.15), 0 3px 12px rgba(245,158,11,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
                          background: `linear-gradient(135deg, rgba(245,158,11,0.02), rgba(217,119,6,0.02))`,
                        }}>
                        <button onClick={() => {
                            const firstId = entry.logos[0].id;
                            setSelectedGalleryId(selectedGalleryId === firstId ? null : firstId);
                            requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
                          }}
                          className="w-full focus:outline-none">
                          <div className="flex relative">
                            {entry.logos.map((logo, li) => {
                              const isPng = logo.url?.toLowerCase().includes('.png');
                              return (
                                <div key={logo.id} className="flex-1 aspect-square flex items-center justify-center p-3"
                                  style={{
                                    background: isPng ? CHECKER_BG : `linear-gradient(160deg, ${t.surface.primary}, ${t.surface.secondary})`,
                                    backgroundSize: isPng ? '14px 14px' : undefined,
                                    backgroundPosition: isPng ? '0 0,0 7px,7px -7px,-7px 0px' : undefined,
                                    borderRight: li < entry.logos.length - 1 ? `1px solid rgba(245,158,11,0.1)` : undefined,
                                  }}>
                                  <img src={logo.url} alt={logo.file_name}
                                    className="max-h-[64px] max-w-[80px] object-contain"
                                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                                </div>
                              );
                            })}
                          </div>
                        </button>
                        <div className="px-2.5 py-2 flex items-center gap-1.5" style={{ background: t.surface.secondary, borderTop: `1px solid rgba(245,158,11,0.1)` }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <Layers className="w-3 h-3 flex-shrink-0" style={{ color: '#d97706' }} />
                              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#d97706' }}>Pack</span>
                            </div>
                            <p className="text-[8px]" style={{ color: t.text.quaternary }}>{groupDate}</p>
                          </div>
                          {!isSelectionMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); entry.logos.forEach(l => handleToggleFavorite(l.id, !entry.logos.every(ll => ll.is_favorite))); }}
                              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                              style={entry.logos.every(l => l.is_favorite) ? { background: 'rgba(239,68,68,0.1)' } : {}}>
                              <Heart className="w-3.5 h-3.5 transition-all"
                                style={{ color: entry.logos.every(l => l.is_favorite) ? '#ef4444' : t.text.quaternary }}
                                fill={entry.logos.every(l => l.is_favorite) ? '#ef4444' : 'none'} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ZONE 3 - Selected logo detail */}
          <div ref={detailRef} className="flex-1 min-h-0 p-2 sm:p-3 overflow-y-auto">
            <SelectedLogoDetail
              logo={selectedLogo}
              family={selectedFamily}
              t={t}
              onFullscreen={(url) => setFullscreenUrl(url)}
              onDeselect={() => setSelectedGalleryId(null)}
              onSelectAsActive={handleSelectAsActive}
              selectingActive={selectingActive}
              companyId={companyId}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreenUrl && (
        <FullscreenOverlay url={fullscreenUrl} onClose={() => setFullscreenUrl(null)} />
      )}
    </>
  );
}

const CHECKER_BG = `linear-gradient(45deg,rgba(255,255,255,0.03) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.03) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,0.03) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,0.03) 75%)`;

function GalleryThumb({ logo, t, isSelected, onToggleFavorite, onClick, selectionMode, checked, onToggleCheck,
  reordering, idx, isDragTarget, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  logo: SavedLogo; t: ReturnType<typeof useThemeTokens>;
  isSelected: boolean; onToggleFavorite: (id: string, fav: boolean) => void; onClick: () => void;
  selectionMode?: boolean; checked?: boolean; onToggleCheck?: (id: string) => void;
  reordering?: boolean; idx?: number; isDragTarget?: boolean;
  onDragStart?: (idx: number) => void; onDragOver?: (e: React.DragEvent, idx: number) => void;
  onDrop?: (e: React.DragEvent, idx: number) => void; onDragEnd?: () => void;
}) {
  const isPng = logo.url?.toLowerCase().includes('.png');
  const displayName = logo.file_name || 'Logo';
  const d = new Date(logo.created_at);
  const dateStr = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  const handleClick = selectionMode && onToggleCheck ? () => onToggleCheck(logo.id) : reordering ? undefined : onClick;

  const card = (
    <div className={`flex-shrink-0 w-[120px] rounded-lg overflow-hidden transition-all group/thumb ${reordering ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={reordering}
      onDragStart={reordering && idx !== undefined && onDragStart ? () => onDragStart(idx) : undefined}
      onDragEnd={reordering && onDragEnd ? onDragEnd : undefined}
      style={{
        border: selectionMode && checked
          ? '2px solid #0ea5e9'
          : isSelected && !reordering
            ? '2px solid #f59e0b'
            : reordering
              ? '1px dashed rgba(245,158,11,0.4)'
              : `1px solid ${logo.is_active ? 'rgba(22,163,106,0.3)' : t.surface.border}`,
        boxShadow: selectionMode && checked
          ? '0 0 0 2px rgba(14,165,233,0.2), 0 3px 12px rgba(14,165,233,0.1)'
          : isSelected && !reordering
            ? '0 0 0 2px rgba(245,158,11,0.15), 0 3px 12px rgba(245,158,11,0.1)'
            : '0 1px 3px rgba(0,0,0,0.05)',
        cursor: selectionMode ? 'pointer' : reordering ? 'grab' : undefined,
      }}>
      <button onClick={handleClick} className="w-full focus:outline-none" disabled={reordering}>
        <div className="relative aspect-square flex items-center justify-center p-3"
          style={{
            background: isPng ? CHECKER_BG : `linear-gradient(160deg, ${t.surface.primary}, ${t.surface.secondary})`,
            backgroundSize: isPng ? '14px 14px' : undefined,
            backgroundPosition: isPng ? '0 0,0 7px,7px -7px,-7px 0px' : undefined,
          }}>
          <img src={logo.url} alt={displayName}
            className={`max-h-[72px] max-w-[90px] object-contain transition-transform ${reordering ? '' : 'group-hover/thumb:scale-110'}`}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
          {reordering && (
            <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(4px)' }}>
              <GripVertical className="w-3 h-3" style={{ color: '#d97706' }} />
            </span>
          )}
          {logo.is_active && !selectionMode && !reordering && (
            <span className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[7px] font-bold"
              style={{ background: 'rgba(22,163,106,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,106,0.25)' }}>
              Actif
            </span>
          )}
          {selectionMode && (
            <span className="absolute top-1.5 left-1.5 w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all"
              style={checked ? {
                background: '#0ea5e9',
                border: '2px solid #0ea5e9',
                boxShadow: '0 1px 4px rgba(14,165,233,0.3)',
              } : {
                background: 'rgba(255,255,255,0.9)',
                border: `2px solid ${t.surface.border}`,
                backdropFilter: 'blur(4px)',
              }}>
              {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </span>
          )}
          {!selectionMode && !reordering && isSelected && (
            <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: '#f59e0b', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <Check className="w-2 h-2 text-white" strokeWidth={3} />
            </span>
          )}
        </div>
      </button>
      <div className="px-2 py-1.5 flex items-center gap-1" style={{ background: t.surface.secondary, borderTop: `1px solid ${t.surface.border}` }}>
        <button onClick={handleClick} className="flex-1 min-w-0 text-left focus:outline-none" disabled={reordering}>
          <p className="text-[9px] font-semibold truncate" style={{ color: selectionMode && checked ? '#0284c7' : isSelected && !reordering ? '#f59e0b' : t.text.primary }}>{displayName}</p>
          <p className="text-[7px] mt-0.5" style={{ color: t.text.quaternary }}>{dateStr}</p>
        </button>
        {!selectionMode && !reordering && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(logo.id, !logo.is_favorite); }}
            className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${logo.is_favorite ? '' : 'opacity-0 group-hover/thumb:opacity-100'}`}
            style={logo.is_favorite ? { background: 'rgba(239,68,68,0.1)' } : {}}
            title={logo.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className="w-3 h-3 transition-all"
              style={{ color: logo.is_favorite ? '#ef4444' : t.text.quaternary }}
              fill={logo.is_favorite ? '#ef4444' : 'none'} />
          </button>
        )}
      </div>
    </div>
  );

  if (reordering) {
    return (
      <div className="flex-shrink-0 flex items-stretch"
        onDragOver={idx !== undefined && onDragOver ? (e) => onDragOver(e, idx) : undefined}
        onDrop={idx !== undefined && onDrop ? (e) => onDrop(e, idx) : undefined}
      >
        {isDragTarget && (
          <div className="w-[3px] flex-shrink-0 rounded-full self-stretch -mr-0.5 z-10"
            style={{ background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
        )}
        {card}
      </div>
    );
  }

  return card;
}

function MobileGalleryThumb({ logo, t, isSelected, onToggleFavorite, onClick, selectionMode, checked, onToggleCheck }: {
  logo: SavedLogo; t: ReturnType<typeof useThemeTokens>;
  isSelected: boolean; onToggleFavorite: (id: string, fav: boolean) => void; onClick: () => void;
  selectionMode?: boolean; checked?: boolean; onToggleCheck?: (id: string) => void;
}) {
  const isPng = logo.url?.toLowerCase().includes('.png');
  const displayName = logo.file_name || 'Logo';
  const handleClick = selectionMode && onToggleCheck ? () => onToggleCheck(logo.id) : onClick;

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        border: selectionMode && checked
          ? '2px solid #0ea5e9'
          : isSelected
            ? '2px solid #f59e0b'
            : `1px solid ${logo.is_active ? 'rgba(22,163,106,0.3)' : t.surface.border}`,
        boxShadow: selectionMode && checked
          ? '0 0 0 2px rgba(14,165,233,0.2)'
          : isSelected ? '0 0 0 2px rgba(245,158,11,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}>
      <button onClick={handleClick} className="w-full focus:outline-none">
        <div className="relative aspect-square flex items-center justify-center p-4"
          style={{
            background: isPng ? CHECKER_BG : `linear-gradient(160deg, ${t.surface.primary}, ${t.surface.secondary})`,
            backgroundSize: isPng ? '14px 14px' : undefined,
            backgroundPosition: isPng ? '0 0,0 7px,7px -7px,-7px 0px' : undefined,
          }}>
          <img src={logo.url} alt={displayName}
            className="max-h-full max-w-full object-contain"
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
          {logo.is_active && !selectionMode && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold"
              style={{ background: 'rgba(22,163,106,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,106,0.25)' }}>
              Actif
            </span>
          )}
          {selectionMode && (
            <span className="absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center transition-all"
              style={checked ? {
                background: '#0ea5e9', border: '2px solid #0ea5e9',
                boxShadow: '0 1px 4px rgba(14,165,233,0.3)',
              } : {
                background: 'rgba(255,255,255,0.9)', border: `2px solid ${t.surface.border}`,
                backdropFilter: 'blur(4px)',
              }}>
              {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </span>
          )}
          {!selectionMode && isSelected && (
            <span className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#f59e0b', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </span>
          )}
        </div>
      </button>
      <div className="px-2.5 py-2 flex items-center gap-1.5" style={{ background: t.surface.secondary, borderTop: `1px solid ${t.surface.border}` }}>
        <button onClick={handleClick} className="flex-1 min-w-0 text-left focus:outline-none">
          <p className="text-[10px] font-semibold truncate" style={{ color: selectionMode && checked ? '#0284c7' : isSelected ? '#f59e0b' : t.text.primary }}>{displayName}</p>
        </button>
        {!selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(logo.id, !logo.is_favorite); }}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={logo.is_favorite ? { background: 'rgba(239,68,68,0.1)' } : {}}>
            <Heart className="w-3.5 h-3.5 transition-all"
              style={{ color: logo.is_favorite ? '#ef4444' : t.text.quaternary }}
              fill={logo.is_favorite ? '#ef4444' : 'none'} />
          </button>
        )}
      </div>
    </div>
  );
}

const ZOOM_MIN = 25;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;
const ZOOM_DEFAULT = 100;

function ZoomControls({ zoom, onZoom, variant }: {
  zoom: number; onZoom: (z: number) => void; variant: 'overlay' | 'inline';
}) {
  const isOverlay = variant === 'overlay';
  const bg = isOverlay ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
  const border = isOverlay ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)';
  const color = isOverlay ? '#fff' : 'rgba(255,255,255,0.85)';
  const shadow = isOverlay ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)';

  return (
    <div className="flex items-center gap-1 rounded-lg px-1 py-0.5"
      style={{ background: bg, border, backdropFilter: 'blur(12px)', boxShadow: shadow }}
      onClick={e => e.stopPropagation()}>
      <button onClick={() => onZoom(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
        disabled={zoom <= ZOOM_MIN}
        className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-white/10 disabled:opacity-30"
        style={{ color }}>
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onZoom(ZOOM_DEFAULT)}
        className="px-1.5 h-6 rounded-md flex items-center justify-center gap-1 transition-all hover:bg-white/10"
        style={{ color, minWidth: 44 }}
        title="Reset zoom">
        {zoom === ZOOM_DEFAULT ? (
          <RotateCcw className="w-3 h-3" style={{ opacity: 0.5 }} />
        ) : (
          <span className="text-[10px] font-bold tabular-nums">{zoom}%</span>
        )}
      </button>
      <button onClick={() => onZoom(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
        disabled={zoom >= ZOOM_MAX}
        className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-white/10 disabled:opacity-30"
        style={{ color }}>
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const PREVIEW_BG_KEY = 'talvex_logo_preview_bg';
const CUSTOM_COLORS_KEY = 'talvex_logo_custom_colors';
const PREVIEW_BG_PRESETS: { label: string; value: string; border?: string }[] = [
  { label: 'Blanc', value: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)' },
  { label: 'Gris clair', value: '#F3F4F6' },
  { label: 'Gris', value: '#9CA3AF' },
  { label: 'Noir', value: '#111111' },
  { label: 'Bleu nuit', value: '#0F172A' },
  { label: 'Dore', value: '#D4A843' },
];

function loadCustomColors(): string[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_COLORS_KEY) ?? '[]'); } catch { return []; }
}
function saveCustomColors(colors: string[]) {
  try { localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors.slice(0, 12))); } catch { /* no-op */ }
}

function SelectedLogoDetail({ logo, family, t, onFullscreen, onDeselect, onSelectAsActive, selectingActive, companyId }: {
  logo: SavedLogo | null; family: SavedLogo[]; t: ReturnType<typeof useThemeTokens>;
  onFullscreen: (url: string) => void; onDeselect: () => void;
  onSelectAsActive: (id: string) => void; selectingActive: boolean;
  companyId: string | null;
}) {
  const [previewBg, setPreviewBg] = useState<string | null>(() => {
    try { return localStorage.getItem(PREVIEW_BG_KEY); } catch { return null; }
  });
  const [customColors, setCustomColors] = useState<string[]>(loadCustomColors);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [showScaleSlider, setShowScaleSlider] = useState(false);
  const [sidebarScale, setSidebarScale] = useState(1);
  const [savedScale, setSavedScale] = useState(1);
  const scaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(0);

  const isFamily = family.length > 1;

  useEffect(() => { setPreviewPage(0); }, [logo?.id]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase.from('company_home_pages').select('logo_scale')
        .eq('company_id', companyId).limit(1).maybeSingle();
      const s = data?.logo_scale ?? 1;
      setSidebarScale(s);
      setSavedScale(s);
    })();
  }, [companyId]);

  const handleScaleInput = (value: number) => {
    setSidebarScale(value);
    if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
    scaleTimerRef.current = setTimeout(async () => {
      if (!companyId) return;
      await supabase.from('company_home_pages')
        .update({ logo_scale: value, updated_at: new Date().toISOString() })
        .eq('company_id', companyId);
      notifyLogoChanged();
    }, 300);
  };

  const validateScale = () => {
    setSavedScale(sidebarScale);
    setShowScaleSlider(false);
  };

  const cancelScale = () => {
    setSidebarScale(savedScale);
    setShowScaleSlider(false);
    if (!companyId) return;
    supabase.from('company_home_pages')
      .update({ logo_scale: savedScale, updated_at: new Date().toISOString() })
      .eq('company_id', companyId).then(() => notifyLogoChanged());
  };

  const applyBg = (color: string | null) => {
    setPreviewBg(color);
    try {
      if (color) localStorage.setItem(PREVIEW_BG_KEY, color);
      else localStorage.removeItem(PREVIEW_BG_KEY);
    } catch { /* no-op */ }
  };

  const saveCurrentColor = () => {
    if (!previewBg) return;
    const upper = previewBg.toUpperCase();
    if (PREVIEW_BG_PRESETS.some(p => p.value.toUpperCase() === upper)) return;
    if (customColors.some(c => c.toUpperCase() === upper)) return;
    const next = [upper, ...customColors].slice(0, 12);
    setCustomColors(next);
    saveCustomColors(next);
  };

  const removeCustomColor = (color: string) => {
    const next = customColors.filter(c => c !== color);
    setCustomColors(next);
    saveCustomColors(next);
    if (previewBg?.toUpperCase() === color.toUpperCase()) applyBg(null);
  };

  if (!logo) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 rounded-lg"
        style={{ background: t.surface.secondary, border: `1px dashed ${t.surface.border}`, minHeight: 100 }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)' }}>
          <Wand2 className="w-4 h-4" style={{ color: '#d97706', opacity: 0.35 }} />
        </div>
        <div className="text-center">
          <p className="text-[9px] font-semibold mb-0.5" style={{ color: t.text.tertiary }}>Apercu du logo selectionne</p>
          <p className="text-[8px]" style={{ color: t.text.quaternary }}>
            Cliquez sur un logo ci-dessus
          </p>
        </div>
      </div>
    );
  }

  const dSel = new Date(logo.created_at);
  const dateStr = `${dSel.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} ${dSel.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  const displayName = logo.file_name || dateStr;

  const previewTabs = isFamily
    ? [
        { label: family[0].file_name?.includes('Icone') ? 'Icone' : 'Logo', icon: <Type className="w-2.5 h-2.5" />, logos: [family[0]] },
        { label: family[1].file_name?.includes('Icone') ? 'Icone' : 'Logo', icon: <Smartphone className="w-2.5 h-2.5" />, logos: [family[1]] },
        { label: 'Pack complet', icon: <Layers className="w-2.5 h-2.5" />, logos: family },
      ]
    : null;

  const displayedLogos = previewTabs ? previewTabs[previewPage]?.logos ?? [logo] : [logo];

  const makeBgStyle = (url: string): React.CSSProperties => {
    const isPng = url?.toLowerCase().includes('.png');
    const hasBgOverride = previewBg !== null;
    return hasBgOverride
      ? { background: previewBg! }
      : {
          background: isPng ? CHECKER_BG : `linear-gradient(160deg, ${t.surface.primary}, ${t.surface.secondary})`,
          backgroundSize: isPng ? '20px 20px' : undefined,
          backgroundPosition: isPng ? '0 0,0 10px,10px -10px,-10px 0px' : undefined,
        };
  };

  const hasBgOverride = previewBg !== null;
  const isCustomUnsaved = hasBgOverride
    && !PREVIEW_BG_PRESETS.some(p => p.value.toUpperCase() === previewBg!.toUpperCase())
    && !customColors.some(c => c.toUpperCase() === previewBg!.toUpperCase());

  const downloadLogo = async (l: SavedLogo) => {
    try {
      const res = await fetch(l.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = l.file_name || 'logo';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch { /* silent */ }
  };

  return (
    <div className="h-full rounded-xl overflow-hidden flex flex-col"
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-2">
          <Star className="w-3 h-3" style={{ color: '#d97706' }} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: t.text.tertiary }}>
            {isFamily ? 'Apercu du pack' : 'Apercu'}
          </span>
          {isFamily && (
            <span className="px-1.5 py-0.5 rounded text-[7px] font-bold uppercase"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.12)' }}>
              Famille
            </span>
          )}
        </div>
        <button onClick={onDeselect}
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors hover:brightness-110"
          style={{ color: t.text.quaternary, border: `1px solid ${t.surface.border}` }}>
          <X className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Preview page tabs */}
      {previewTabs && (
        <div className="flex gap-0.5 px-3 py-1.5 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          {previewTabs.map((tab, i) => (
            <button key={i} onClick={() => setPreviewPage(i)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-bold transition-all"
              style={previewPage === i ? {
                background: 'rgba(245,158,11,0.08)', color: '#d97706',
                border: '1px solid rgba(245,158,11,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              } : { color: t.text.quaternary, border: '1px solid transparent' }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Body: preview left + actions right */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Large centered preview */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden transition-colors duration-300"
          style={{ ...makeBgStyle(displayedLogos[0].url), minHeight: 140 }}>
          {displayedLogos.length === 1 ? (
            <img src={displayedLogos[0].url} alt={displayedLogos[0].file_name}
              className="object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})`, maxHeight: '100%', maxWidth: '100%', padding: 16 }}
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
          ) : (
            <div className="flex items-center gap-4 lg:gap-6 px-4" style={{ transform: `scale(${zoom / 100})` }}>
              {displayedLogos.map((l) => (
                <img key={l.id} src={l.url} alt={l.file_name}
                  className="object-contain transition-transform duration-200"
                  style={{ maxHeight: 120, maxWidth: '45%' }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
              ))}
            </div>
          )}
          {logo.is_active && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold"
              style={{ background: 'rgba(22,163,106,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,106,0.25)', backdropFilter: 'blur(6px)' }}>
              <Shield className="w-3 h-3" /> Actif
            </span>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <ZoomControls zoom={zoom} onZoom={setZoom} variant="inline" />
          </div>
        </div>

        {/* Actions panel - separator */}
        <div className="hidden lg:block w-px flex-shrink-0" style={{ background: t.surface.border }} />
        <div className="block lg:hidden h-px flex-shrink-0" style={{ background: t.surface.border }} />
        {/* Actions panel */}
        <div className="lg:w-[240px] flex-shrink-0 flex flex-col p-3.5 gap-3">
          {/* Info */}
          <div className="flex-shrink-0">
            <h4 className="text-[12px] font-bold leading-tight mb-1" style={{ color: t.text.primary }}>{displayName}</h4>
            <p className="text-[9px] font-medium" style={{ color: t.text.quaternary }}>{dateStr}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {logo.is_active && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
                  style={{ background: 'rgba(22,163,106,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,106,0.2)' }}>
                  <Shield className="w-2.5 h-2.5" /> Actif
                </span>
              )}
              {isFamily && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
                  style={{ background: 'rgba(245,158,11,0.06)', color: '#d97706', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <Layers className="w-2.5 h-2.5" /> {family.length} elements
                </span>
              )}
            </div>
          </div>

          {/* Inline background swatches */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] lg:text-[8px] font-bold uppercase tracking-widest" style={{ color: t.text.quaternary }}>Fond apercu</span>
              {hasBgOverride && (
                <button onClick={() => applyBg(null)} className="text-[9px] lg:text-[8px] font-bold transition-colors hover:brightness-110 active:scale-95"
                  style={{ color: t.text.quaternary }}>Reset</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 lg:gap-1.5">
              {PREVIEW_BG_PRESETS.map(p => {
                const active = previewBg?.toUpperCase() === p.value.toUpperCase();
                return (
                  <button key={p.value} onClick={() => applyBg(p.value)} title={p.label}
                    className="w-8 h-8 lg:w-6 lg:h-6 rounded-lg lg:rounded-md flex-shrink-0 transition-all active:scale-95 hover:scale-110"
                    style={{
                      background: p.value,
                      border: active ? '2px solid #f59e0b' : (p.border ?? `1px solid ${t.surface.border}`),
                      boxShadow: active ? '0 0 0 2px rgba(245,158,11,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                    }} />
                );
              })}
              {customColors.map(c => {
                const active = previewBg?.toUpperCase() === c.toUpperCase();
                return (
                  <div key={c} className="relative group/swatch">
                    <button onClick={() => applyBg(c)} title={c}
                      className="w-8 h-8 lg:w-6 lg:h-6 rounded-lg lg:rounded-md flex-shrink-0 transition-all active:scale-95 hover:scale-110"
                      style={{
                        background: c,
                        border: active ? '2px solid #f59e0b' : `1px solid ${t.surface.border}`,
                        boxShadow: active ? '0 0 0 2px rgba(245,158,11,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                      }} />
                    <button onClick={() => removeCustomColor(c)}
                      className="absolute -top-1 -right-1 w-4 h-4 lg:w-3 lg:h-3 rounded-full items-center justify-center text-white hidden group-hover/swatch:flex"
                      style={{ background: '#ef4444', fontSize: 7, lineHeight: 1 }}>
                      <X className="w-2.5 h-2.5 lg:w-2 lg:h-2" />
                    </button>
                  </div>
                );
              })}
              <button onClick={() => colorInputRef.current?.click()} title="Couleur personnalisee"
                className="w-8 h-8 lg:w-6 lg:h-6 rounded-lg lg:rounded-md flex-shrink-0 flex items-center justify-center transition-all active:scale-95 hover:scale-110"
                style={{ border: `1px dashed ${t.surface.border}` }}>
                <Palette className="w-3.5 h-3.5 lg:w-3 lg:h-3" style={{ color: t.text.quaternary }} />
              </button>
              <input ref={colorInputRef} type="color" value={previewBg ?? '#FFFFFF'}
                onChange={e => applyBg(e.target.value)}
                className="w-0 h-0 opacity-0 absolute" tabIndex={-1} />
            </div>
            {isCustomUnsaved && (
              <button onClick={saveCurrentColor}
                className="mt-1.5 flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-bold transition-all hover:brightness-110"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706' }}>
                <Check className="w-2.5 h-2.5" /> Enregistrer cette couleur
              </button>
            )}
          </div>

          <div className="flex-1 min-h-1" />

          {/* Action buttons */}
          <div className="flex-shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
              <button onClick={() => onFullscreen(displayedLogos[0].url)}
                className="flex items-center justify-center gap-1.5 py-2.5 lg:py-2 rounded-lg text-[10px] lg:text-[9px] font-bold transition-all active:scale-95 hover:brightness-105"
                style={{ border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                <Maximize2 className="w-3.5 h-3.5 lg:w-3 lg:h-3" /> Plein ecran
              </button>
              <button onClick={() => setShowScaleSlider(!showScaleSlider)}
                className="flex items-center justify-center gap-1.5 py-2.5 lg:py-2 rounded-lg text-[10px] lg:text-[9px] font-bold transition-all active:scale-95 hover:brightness-105"
                style={showScaleSlider ? {
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#d97706',
                } : {
                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706',
                }}>
                <SlidersHorizontal className="w-3.5 h-3.5 lg:w-3 lg:h-3" /> Taille
              </button>
            </div>
            {showScaleSlider && (
              <div className="rounded-lg p-2.5 space-y-2"
                style={{ background: t.surface.primary, border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3 h-3 flex-shrink-0" style={{ color: '#d97706' }} />
                  <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: t.text.quaternary }}>
                    Taille sidebar
                  </span>
                  <span className="ml-auto text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                    style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706' }}>
                    {Math.round(sidebarScale * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-medium flex-shrink-0" style={{ color: t.text.quaternary }}>30%</span>
                  <input type="range" min={0.3} max={4} step={0.05} value={sidebarScale}
                    onChange={e => handleScaleInput(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((sidebarScale - 0.3) / 3.7) * 100}%, ${t.surface.border} ${((sidebarScale - 0.3) / 3.7) * 100}%, ${t.surface.border} 100%)`,
                      accentColor: '#f59e0b',
                    }} />
                  <span className="text-[8px] font-medium flex-shrink-0" style={{ color: t.text.quaternary }}>400%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={validateScale}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', boxShadow: '0 2px 8px rgba(22,163,106,0.2)' }}>
                    <Check className="w-3 h-3" /> Valider
                  </button>
                  {sidebarScale !== 1 && (
                    <button onClick={() => handleScaleInput(1)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-bold transition-all"
                      style={{ border: `1px solid ${t.surface.border}`, color: t.text.quaternary }}>
                      <RotateCcw className="w-2.5 h-2.5" /> Reset
                    </button>
                  )}
                  <button onClick={cancelScale}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-bold transition-all"
                    style={{ border: `1px solid ${t.surface.border}`, color: t.text.quaternary }}>
                    <X className="w-2.5 h-2.5" /> Annuler
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => displayedLogos.forEach(l => downloadLogo(l))}
              className="w-full flex items-center justify-center gap-2 py-3 lg:py-2.5 rounded-xl lg:rounded-lg text-[12px] lg:text-[11px] font-bold transition-all active:scale-[0.98] hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 3px 12px rgba(14,165,233,0.2)' }}>
              <Download className="w-4 h-4 lg:w-3.5 lg:h-3.5" /> Telecharger{displayedLogos.length > 1 ? ` (${displayedLogos.length})` : ''}
            </button>
            {!logo.is_active && (
              <button onClick={() => onSelectAsActive(logo.id)}
                disabled={selectingActive}
                className="w-full flex items-center justify-center gap-2 py-3 lg:py-2.5 rounded-xl lg:rounded-lg text-[12px] lg:text-[11px] font-bold transition-all disabled:opacity-50 active:scale-[0.98] hover:brightness-110"
                style={{
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#fff',
                  boxShadow: '0 3px 12px rgba(22,163,106,0.2)',
                }}>
                {selectingActive ? <Loader2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 animate-spin" /> : <Shield className="w-4 h-4 lg:w-3.5 lg:h-3.5" />}
                {selectingActive ? 'Selection...' : 'Selectionner comme actif'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FullscreenOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP));
      if (e.key === '-') setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP));
      if (e.key === '0') setZoom(ZOOM_DEFAULT);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>

      {/* Close button */}
      <button onClick={onClose}
        className="absolute top-3 right-3 lg:top-5 lg:right-5 z-[10000] flex items-center gap-2 px-3 py-2 lg:px-3.5 rounded-xl text-[12px] font-bold transition-all active:scale-95 hover:scale-105"
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
        <X className="w-5 h-5 lg:w-4 lg:h-4" />
        <span className="hidden sm:inline">Fermer</span>
      </button>

      {/* Zoom controls - bottom center */}
      <div className="absolute bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 z-[10000]">
        <ZoomControls zoom={zoom} onZoom={setZoom} variant="overlay" />
      </div>

      {/* Logo */}
      <img src={url} alt="Logo plein ecran"
        className="object-contain transition-transform duration-200"
        style={{ transform: `scale(${zoom / 100})`, maxWidth: '92vw', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()} />
    </div>
  );
}
