import { useState, useMemo, useCallback } from 'react';
import { Search, Palette, Eye, EyeOff, Wrench, Crown, Settings2, Share2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useThemeConfig, type ThemeConfigRow, type ThemeStatus } from '../../../../hooks/useThemeConfig';
import { useThemeCategories } from '../../../../hooks/useThemeCategories';
import { useEditorModeSafe, type EditorZone, type ZoneBackground } from '../../../../contexts/EditorModeContext';
import { useVisualCustomizeSafe } from '../../../../components/visualCustomize/VisualCustomizeContext';
import SAThemeCard from './SAThemeCard';
import SAThemeDetailPanel from './SAThemeDetailPanel';
import SAThemeFilters from './SAThemeFilters';
import { BulkActionBar, DeleteConfirmModal } from './SAThemeBulkBar';
import CategoryManagerModal from './CategoryManagerModal';
import MoveThemeModal from './MoveThemeModal';

export default function SAThemes() {
  const t = useThemeTokens();
  const editorCtx = useEditorModeSafe();
  const vc = useVisualCustomizeSafe();
  const { configs, loading: configsLoading, updateConfig, moveToCategory, swapOrder, fetchConfigs, bulkUpdateStatus, bulkDelete } = useThemeConfig();
  const { categories, loading: catsLoading, renameCategory, createCategory, deleteCategory, bulkDeleteCategories, swapCategoryOrder, fetchCategories } = useThemeCategories();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ThemeStatus>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [movingThemeKey, setMovingThemeKey] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const catNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.slug, c.name);
    return map;
  }, [categories]);

  const getCategoryName = useCallback((slug: string) => catNameMap.get(slug) || slug, [catNameMap]);

  const filtered = useMemo(() => {
    let list = [...configs];
    if (activeTab === 'hidden') list = list.filter(c => c.status === 'hidden');
    else if (activeTab === 'recommended') list = list.filter(c => c.is_recommended && c.status !== 'hidden');
    else if (activeTab === 'rework') list = list.filter(c => c.status === 'rework');
    else if (activeTab !== 'all') list = list.filter(c => c.category === activeTab && c.status !== 'hidden');
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.label.toLowerCase().includes(q) || c.theme_key.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || getCategoryName(c.category).toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.display_order - b.display_order);
  }, [configs, activeTab, statusFilter, search, getCategoryName]);

  const selectedConfig = useMemo(() => configs.find(c => c.theme_key === selected), [configs, selected]);
  const movingConfig = useMemo(() => configs.find(c => c.theme_key === movingThemeKey), [configs, movingThemeKey]);

  const stats = useMemo(() => ({
    total: configs.length,
    visible: configs.filter(c => c.status === 'visible').length,
    hidden: configs.filter(c => c.status === 'hidden').length,
    rework: configs.filter(c => c.status === 'rework').length,
    premium: configs.filter(c => c.status === 'premium').length,
    shared: configs.filter(c => c.is_shared).length,
  }), [configs]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: configs.length };
    counts.hidden = configs.filter(c => c.status === 'hidden').length;
    counts.rework = configs.filter(c => c.status === 'rework').length;
    counts.recommended = configs.filter(c => c.is_recommended && c.status !== 'hidden').length;
    const reserved = new Set(['all', 'hidden', 'rework', 'recommended']);
    for (const c of configs) { if (c.status === 'hidden') continue; if (reserved.has(c.category)) continue; counts[c.category] = (counts[c.category] || 0) + 1; }
    return counts;
  }, [configs]);

  const handleStatusChange = useCallback(async (key: string, status: ThemeStatus) => { await updateConfig(key, { status }); }, [updateConfig]);
  const handleToggleRecommended = useCallback(async (key: string) => { const c = configs.find(x => x.theme_key === key); if (c) await updateConfig(key, { is_recommended: !c.is_recommended }); }, [configs, updateConfig]);
  const handleToggleFavorite = useCallback(async (key: string) => { const c = configs.find(x => x.theme_key === key); if (c) await updateConfig(key, { is_favorite: !c.is_favorite }); }, [configs, updateConfig]);
  const handleToggleShared = useCallback(async (key: string) => { const c = configs.find(x => x.theme_key === key); if (c) await updateConfig(key, { is_shared: !c.is_shared } as Partial<ThemeConfigRow>); }, [configs, updateConfig]);
  const handleMoveUp = useCallback(async (key: string) => { const idx = filtered.findIndex(c => c.theme_key === key); if (idx > 0) await swapOrder(key, filtered[idx - 1].theme_key); }, [filtered, swapOrder]);
  const handleMoveDown = useCallback(async (key: string) => { const idx = filtered.findIndex(c => c.theme_key === key); if (idx < filtered.length - 1) await swapOrder(key, filtered[idx + 1].theme_key); }, [filtered, swapOrder]);

  const handleRename = useCallback(async () => {
    if (!renaming || !renameValue.trim()) return;
    await updateConfig(renaming, { label: renameValue.trim() });
    setRenaming(null);
    setRenameValue('');
  }, [renaming, renameValue, updateConfig]);

  const startRename = useCallback((key: string) => { const c = configs.find(x => x.theme_key === key); if (c) { setRenaming(key); setRenameValue(c.label); } }, [configs]);
  const handleMoveTheme = useCallback(async (categoryId: string, categorySlug: string) => { if (!movingThemeKey) return; await moveToCategory(movingThemeKey, categoryId, categorySlug); setMovingThemeKey(null); }, [movingThemeKey, moveToCategory]);
  const handleCatRenamed = useCallback(async (id: string, name: string) => { await renameCategory(id, name); }, [renameCategory]);
  const handleCatSwap = useCallback(async (idA: string, idB: string) => { await swapCategoryOrder(idA, idB); }, [swapCategoryOrder]);
  const handleCatCreate = useCallback(async (name: string, slug: string) => { return await createCategory(name, slug); }, [createCategory]);
  const handleCatDelete = useCallback(async (id: string) => { const result = await deleteCategory(id); if (!result.error) fetchConfigs(); return result; }, [deleteCategory, fetchConfigs]);
  const handleCatBulkDelete = useCallback(async (ids: string[]) => { const result = await bulkDeleteCategories(ids); if (!result.error) fetchConfigs(); return result; }, [bulkDeleteCategories, fetchConfigs]);

  const handleEditInEditor = useCallback((config: ThemeConfigRow) => {
    if (!editorCtx || !config.theme_tokens) return;
    const tokens = config.theme_tokens;
    const zones = (tokens.zone_overrides ?? {}) as Record<EditorZone, ZoneBackground | null>;
    const texts = (tokens.text_overrides ?? {}) as Record<string, string>;
    const fullZones: Record<EditorZone, ZoneBackground | null> = { zone1: zones.zone1 ?? null, zone2: zones.zone2 ?? null, zone3: zones.zone3 ?? null, zone4: zones.zone4 ?? null };
    const bgImage = (tokens.background_image as string) || null;
    const bgImageZoom = typeof tokens.background_image_zoom === 'number' ? tokens.background_image_zoom : null;
    const bgImagePosX = typeof tokens.background_image_position_x === 'number' ? tokens.background_image_position_x : null;
    const bgImagePosY = typeof tokens.background_image_position_y === 'number' ? tokens.background_image_position_y : null;
    const typo = (tokens.typography_overrides as Record<string, string | null> | null) || null;
    const palette = (tokens.panel_palette as { background: string; surface: string; accent: string } | null) || null;
    const btnOverrides = (tokens.button_overrides as Record<string, import('../../../../contexts/editorModeTypes').ButtonOverride> | null) || null;
    const cardOvr = (tokens.card_overrides as Record<string, import('../../../../contexts/editorModeTypes').CardOverride> | null) || null;
    const bgImageFit = (tokens.background_image_fit as import('../../../../contexts/editorModeTypes').BgImageFitMode) || null;
    editorCtx.loadCustomTheme(config.theme_key, fullZones, texts, bgImage, typo, palette, btnOverrides, bgImageZoom, bgImagePosX, bgImagePosY, cardOvr, bgImageFit);
    const vcOvr = tokens.vc_overrides as Record<string, { type: string; config: unknown }> | null;
    if (vc) {
      if (vcOvr && Object.keys(vcOvr).length > 0) {
        vc.replaceAllConfigs(vcOvr as Parameters<typeof vc.replaceAllConfigs>[0]);
      } else {
        vc.clearAllConfigs();
      }
    }
    setSelected(null);
  }, [editorCtx, vc]);

  const toggleSelectionMode = useCallback(() => { setSelectionMode(prev => { if (prev) setSelectedKeys(new Set()); return !prev; }); setSelected(null); }, []);
  const toggleSelectKey = useCallback((key: string) => { setSelectedKeys(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }, []);
  const selectAll = useCallback(() => { setSelectedKeys(new Set(filtered.map(c => c.theme_key))); }, [filtered]);
  const clearSelection = useCallback(() => { setSelectedKeys(new Set()); }, []);
  const handleBulkStatus = useCallback(async (status: ThemeStatus) => { if (selectedKeys.size === 0) return; await bulkUpdateStatus(Array.from(selectedKeys), status); setSelectedKeys(new Set()); setSelectionMode(false); }, [selectedKeys, bulkUpdateStatus]);
  const handleBulkDelete = useCallback(async () => { if (selectedKeys.size === 0) return; await bulkDelete(Array.from(selectedKeys)); setSelectedKeys(new Set()); setSelectionMode(false); setDeleteConfirmOpen(false); }, [selectedKeys, bulkDelete]);

  if (configsLoading || catsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasDetail = !!selectedConfig;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-5 sm:px-6 lg:px-8 pt-5 sm:pt-6 lg:pt-8 pb-0 flex flex-col gap-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: t.main.textPrimary }}>Gestion des themes</h1>
          <p className="text-xs mt-1 font-medium" style={{ color: t.main.textMuted }}>Organisez et gerez tous les themes de la plateforme</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map(cat => {
              const isActive = activeTab === cat.slug;
              const count = tabCounts[cat.slug] || 0;
              const isSaOnly = cat.slug === 'rework' || cat.slug === 'hidden';
              return (
                <button key={cat.id} onClick={() => setActiveTab(cat.slug)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap flex-shrink-0" style={{ background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent', border: isActive ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent', color: isActive ? '#60a5fa' : isSaOnly ? 'rgba(245,158,11,0.60)' : 'rgba(255,255,255,0.40)' }}>
                  {cat.name}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: isActive ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.05)', color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.25)' }}>{count}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setCatManagerOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap flex-shrink-0 hover:bg-white/[0.04]" style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.40)' }}>
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Organiser</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          <StatCard label="Themes totaux" value={stats.total} color="#3b82f6" icon={<Palette className="w-5 h-5" />} />
          <StatCard label="Themes visibles" value={stats.visible} color="#34d399" icon={<Eye className="w-5 h-5" />} />
          <StatCard label="Themes masques" value={stats.hidden} color="#f87171" icon={<EyeOff className="w-5 h-5" />} />
          <StatCard label="A retravailler" value={stats.rework} color="#fbbf24" icon={<Wrench className="w-5 h-5" />} />
          <StatCard label="Themes premium" value={stats.premium} color="#a78bfa" icon={<Crown className="w-5 h-5" />} />
          <StatCard label="Themes partages" value={stats.shared} color="#22d3ee" icon={<Share2 className="w-5 h-5" />} />
        </div>

        <SAThemeFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          selectionMode={selectionMode}
          selectedCount={selectedKeys.size}
          onToggleSelectionMode={toggleSelectionMode}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onReset={() => { setSearch(''); setStatusFilter('all'); setActiveTab('all'); fetchConfigs(); fetchCategories(); }}
        />
      </div>

      <div className="mx-5 sm:mx-6 lg:mx-8 mt-5 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex h-full">
          <div className="flex-1 min-w-0 px-5 sm:px-6 lg:px-8 py-5 sm:py-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Search className="w-9 h-9 text-white/10" />
                <p className="text-sm font-medium text-white/25">Aucun theme trouve</p>
                <p className="text-[11px] text-white/15">Essayez de modifier vos filtres</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${hasDetail ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}`}>
                {filtered.map((config, idx) => (
                  <div key={config.theme_key} onClick={() => selectionMode ? toggleSelectKey(config.theme_key) : setSelected(config.theme_key)} className="cursor-pointer">
                    <SAThemeCard config={config} categoryName={getCategoryName(config.category)} onStatusChange={status => handleStatusChange(config.theme_key, status)} onToggleRecommended={() => handleToggleRecommended(config.theme_key)} onToggleFavorite={() => handleToggleFavorite(config.theme_key)} onToggleShared={() => handleToggleShared(config.theme_key)} onMoveUp={() => handleMoveUp(config.theme_key)} onMoveDown={() => handleMoveDown(config.theme_key)} onRename={() => startRename(config.theme_key)} onMove={() => setMovingThemeKey(config.theme_key)} isFirst={idx === 0} isLast={idx === filtered.length - 1} selectionMode={selectionMode} isSelected={selectedKeys.has(config.theme_key)} onToggleSelect={() => toggleSelectKey(config.theme_key)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedConfig && (
            <div className="hidden lg:block flex-shrink-0 w-[340px] xl:w-[360px] border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="sticky top-0 h-full overflow-y-auto">
                <SAThemeDetailPanel config={selectedConfig} categoryName={getCategoryName(selectedConfig.category)} onStatusChange={s => handleStatusChange(selectedConfig.theme_key, s)} onToggleRecommended={() => handleToggleRecommended(selectedConfig.theme_key)} onToggleFavorite={() => handleToggleFavorite(selectedConfig.theme_key)} onToggleShared={() => handleToggleShared(selectedConfig.theme_key)} onRename={() => startRename(selectedConfig.theme_key)} onMove={() => setMovingThemeKey(selectedConfig.theme_key)} onMoveUp={() => handleMoveUp(selectedConfig.theme_key)} onMoveDown={() => handleMoveDown(selectedConfig.theme_key)} onClose={() => setSelected(null)} displayOrder={selectedConfig.display_order} onEditInEditor={selectedConfig.theme_tokens ? () => handleEditInEditor(selectedConfig) : undefined} />
              </div>
            </div>
          )}
        </div>

        {selectedConfig && (
          <div className="lg:hidden px-5 sm:px-6 pb-6">
            <SAThemeDetailPanel config={selectedConfig} categoryName={getCategoryName(selectedConfig.category)} onStatusChange={s => handleStatusChange(selectedConfig.theme_key, s)} onToggleRecommended={() => handleToggleRecommended(selectedConfig.theme_key)} onToggleFavorite={() => handleToggleFavorite(selectedConfig.theme_key)} onToggleShared={() => handleToggleShared(selectedConfig.theme_key)} onRename={() => startRename(selectedConfig.theme_key)} onMove={() => setMovingThemeKey(selectedConfig.theme_key)} onMoveUp={() => handleMoveUp(selectedConfig.theme_key)} onMoveDown={() => handleMoveDown(selectedConfig.theme_key)} onClose={() => setSelected(null)} displayOrder={selectedConfig.display_order} />
          </div>
        )}
      </div>

      {renaming && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setRenaming(null)}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#141824', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white/90">Renommer le theme</h3>
            <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(null); }} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] text-sm text-white/90 outline-none focus:border-blue-500/40 transition-colors" autoFocus />
            <div className="flex justify-end gap-2 mt-1">
              <button onClick={() => setRenaming(null)} className="px-4 py-2.5 rounded-xl text-xs font-medium text-white/50 hover:text-white/70 transition-colors">Annuler</button>
              <button onClick={handleRename} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      <CategoryManagerModal open={catManagerOpen} onClose={() => setCatManagerOpen(false)} categories={categories} themeCounts={tabCounts} onRename={handleCatRenamed} onSwap={handleCatSwap} onCreate={handleCatCreate} onDelete={handleCatDelete} onBulkDelete={handleCatBulkDelete} />

      {movingConfig && (
        <MoveThemeModal open={!!movingThemeKey} onClose={() => setMovingThemeKey(null)} themeLabel={movingConfig.label} currentCategorySlug={movingConfig.category} categories={categories} onMove={handleMoveTheme} />
      )}

      {selectionMode && selectedKeys.size > 0 && (
        <BulkActionBar count={selectedKeys.size} onStatus={handleBulkStatus} onDelete={() => setDeleteConfirmOpen(true)} />
      )}

      {deleteConfirmOpen && (
        <DeleteConfirmModal count={selectedKeys.size} onConfirm={handleBulkDelete} onCancel={() => setDeleteConfirmOpen(false)} />
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const t = useThemeTokens();
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5"
      style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color }}>{value}</span>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, color }}>{icon}</div>
      </div>
      <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</span>
    </div>
  );
}
