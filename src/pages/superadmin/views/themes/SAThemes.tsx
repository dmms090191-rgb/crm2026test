import { useState, useMemo, useCallback } from 'react';
import { Search, Palette, Eye, EyeOff, Wrench, Crown, RotateCcw, ChevronUp, ChevronDown, Award, Star, Pencil, X, Check, Settings2, FolderInput, CheckSquare, Trash2, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useThemeConfig, type ThemeConfigRow, type ThemeStatus } from '../../../../hooks/useThemeConfig';
import { useThemeCategories } from '../../../../hooks/useThemeCategories';
import { ALL_THEMES } from '../../../../components/theme/themeData';
import { ThemePreview } from '../../../../components/theme/ThemeCard';
import SAThemeCard from './SAThemeCard';
import CategoryManagerModal from './CategoryManagerModal';
import MoveThemeModal from './MoveThemeModal';
import { STATUS_META } from './saThemesConstants';

export default function SAThemes() {
  const t = useThemeTokens();
  const { configs, loading: configsLoading, updateConfig, moveToCategory, swapOrder, fetchConfigs, bulkUpdateStatus, bulkDelete } = useThemeConfig();
  const { categories, loading: catsLoading, renameCategory, createCategory, deleteCategory, swapCategoryOrder, fetchCategories } = useThemeCategories();
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
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const catNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.slug, c.name);
    return map;
  }, [categories]);

  const getCategoryName = useCallback((slug: string) => catNameMap.get(slug) || slug, [catNameMap]);

  const filtered = useMemo(() => {
    let list = [...configs];
    if (activeTab === 'recommended') list = list.filter(c => c.is_recommended);
    else if (activeTab === 'rework') list = list.filter(c => c.status === 'rework');
    else if (activeTab === 'hidden') list = list.filter(c => c.status === 'hidden');
    else if (activeTab !== 'all') list = list.filter(c => c.category === activeTab);

    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.theme_key.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        getCategoryName(c.category).toLowerCase().includes(q)
      );
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
  }), [configs]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: configs.length };
    for (const c of configs) {
      counts[c.category] = (counts[c.category] || 0) + 1;
    }
    counts.recommended = configs.filter(c => c.is_recommended).length;
    counts.rework = configs.filter(c => c.status === 'rework').length;
    counts.hidden = configs.filter(c => c.status === 'hidden').length;
    return counts;
  }, [configs]);

  const handleStatusChange = useCallback(async (key: string, status: ThemeStatus) => {
    await updateConfig(key, { status });
  }, [updateConfig]);

  const handleToggleRecommended = useCallback(async (key: string) => {
    const c = configs.find(x => x.theme_key === key);
    if (c) await updateConfig(key, { is_recommended: !c.is_recommended });
  }, [configs, updateConfig]);

  const handleToggleFavorite = useCallback(async (key: string) => {
    const c = configs.find(x => x.theme_key === key);
    if (c) await updateConfig(key, { is_favorite: !c.is_favorite });
  }, [configs, updateConfig]);

  const handleMoveUp = useCallback(async (key: string) => {
    const idx = filtered.findIndex(c => c.theme_key === key);
    if (idx > 0) await swapOrder(key, filtered[idx - 1].theme_key);
  }, [filtered, swapOrder]);

  const handleMoveDown = useCallback(async (key: string) => {
    const idx = filtered.findIndex(c => c.theme_key === key);
    if (idx < filtered.length - 1) await swapOrder(key, filtered[idx + 1].theme_key);
  }, [filtered, swapOrder]);

  const handleRename = useCallback(async () => {
    if (!renaming || !renameValue.trim()) return;
    await updateConfig(renaming, { label: renameValue.trim() });
    setRenaming(null);
    setRenameValue('');
  }, [renaming, renameValue, updateConfig]);

  const startRename = useCallback((key: string) => {
    const c = configs.find(x => x.theme_key === key);
    if (c) { setRenaming(key); setRenameValue(c.label); }
  }, [configs]);

  const handleMoveTheme = useCallback(async (categoryId: string, categorySlug: string) => {
    if (!movingThemeKey) return;
    await moveToCategory(movingThemeKey, categoryId, categorySlug);
    setMovingThemeKey(null);
  }, [movingThemeKey, moveToCategory]);

  const handleCatRenamed = useCallback(async (id: string, name: string) => {
    await renameCategory(id, name);
  }, [renameCategory]);

  const handleCatSwap = useCallback(async (idA: string, idB: string) => {
    await swapCategoryOrder(idA, idB);
  }, [swapCategoryOrder]);

  const handleCatCreate = useCallback(async (name: string, slug: string) => {
    return await createCategory(name, slug);
  }, [createCategory]);

  const handleCatDelete = useCallback(async (id: string) => {
    return await deleteCategory(id);
  }, [deleteCategory]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) setSelectedKeys(new Set());
      return !prev;
    });
    setSelected(null);
  }, []);

  const toggleSelectKey = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(filtered.map(c => c.theme_key)));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const handleBulkStatus = useCallback(async (status: ThemeStatus) => {
    if (selectedKeys.size === 0) return;
    await bulkUpdateStatus(Array.from(selectedKeys), status);
    setSelectedKeys(new Set());
    setSelectionMode(false);
  }, [selectedKeys, bulkUpdateStatus]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    await bulkDelete(Array.from(selectedKeys));
    setSelectedKeys(new Set());
    setSelectionMode(false);
    setDeleteConfirmOpen(false);
  }, [selectedKeys, bulkDelete]);

  const loading = configsLoading || catsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasDetail = !!selectedConfig;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top section */}
      <div className="flex-shrink-0 px-5 sm:px-6 lg:px-8 pt-5 sm:pt-6 lg:pt-8 pb-0 flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: t.main.textPrimary }}>
            Gestion des themes
          </h1>
          <p className="text-xs mt-1 font-medium" style={{ color: t.main.textMuted }}>
            Organisez et gerez tous les themes de la plateforme
          </p>
        </div>

        {/* Tabs row */}
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <StatCard label="Themes totaux" value={stats.total} color="#3b82f6" icon={<Palette className="w-5 h-5" />} />
          <StatCard label="Themes visibles" value={stats.visible} color="#34d399" icon={<Eye className="w-5 h-5" />} />
          <StatCard label="Themes masques" value={stats.hidden} color="#f87171" icon={<EyeOff className="w-5 h-5" />} />
          <StatCard label="A retravailler" value={stats.rework} color="#fbbf24" icon={<Wrench className="w-5 h-5" />} />
          <StatCard label="Themes premium" value={stats.premium} color="#a78bfa" icon={<Crown className="w-5 h-5" />} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl flex-1 min-w-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Search className="w-4 h-4 text-white/25 flex-shrink-0" />
            <input type="text" placeholder="Rechercher un theme..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-xs text-white/90 placeholder-white/25 outline-none flex-1 font-medium w-full" />
            {search && (
              <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/50 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={toggleSelectionMode} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap" style={{
              background: selectionMode ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
              border: selectionMode ? '1px solid rgba(59,130,246,0.30)' : '1px solid rgba(255,255,255,0.08)',
              color: selectionMode ? '#60a5fa' : 'rgba(255,255,255,0.50)',
            }}>
              <CheckSquare className="w-3.5 h-3.5" />
              {selectionMode ? 'Annuler' : 'Selectionner'}
            </button>
            {!selectionMode && (
              <>
                <div className="flex items-center gap-2 relative">
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline" style={{ color: 'rgba(255,255,255,0.30)' }}>Statut</span>
                  <button
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    className="flex items-center gap-2 text-[11px] font-medium px-3 py-2.5 rounded-xl outline-none cursor-pointer transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: statusDropdownOpen ? '1px solid rgba(59,130,246,0.30)' : '1px solid rgba(255,255,255,0.08)',
                      color: statusFilter !== 'all' ? STATUS_META[statusFilter].color : 'rgba(255,255,255,0.70)',
                    }}
                  >
                    {statusFilter !== 'all' && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_META[statusFilter].color }} />
                    )}
                    <span>{statusFilter === 'all' ? 'Tous les statuts' : STATUS_META[statusFilter].label}</span>
                    <ChevronDown className="w-3 h-3 flex-shrink-0 transition-transform" style={{ opacity: 0.5, transform: statusDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {statusDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setStatusDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-xl py-1.5 shadow-2xl" style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <StatusDropdownItem label="Tous les statuts" active={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setStatusDropdownOpen(false); }} />
                        <div className="mx-2 my-1 h-px bg-white/[0.06]" />
                        <StatusDropdownItem label="Visible" icon={<Eye className="w-3.5 h-3.5" />} color="#34d399" active={statusFilter === 'visible'} onClick={() => { setStatusFilter('visible'); setStatusDropdownOpen(false); }} />
                        <StatusDropdownItem label="Masque" icon={<EyeOff className="w-3.5 h-3.5" />} color="#f87171" active={statusFilter === 'hidden'} onClick={() => { setStatusFilter('hidden'); setStatusDropdownOpen(false); }} />
                        <StatusDropdownItem label="A retravailler" icon={<Wrench className="w-3.5 h-3.5" />} color="#fbbf24" active={statusFilter === 'rework'} onClick={() => { setStatusFilter('rework'); setStatusDropdownOpen(false); }} />
                        <StatusDropdownItem label="Premium" icon={<Crown className="w-3.5 h-3.5" />} color="#a78bfa" active={statusFilter === 'premium'} onClick={() => { setStatusFilter('premium'); setStatusDropdownOpen(false); }} />
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => { setSearch(''); setStatusFilter('all'); setActiveTab('all'); fetchConfigs(); fetchCategories(); }} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-colors hover:bg-white/[0.06]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)' }}>
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reinitialiser</span>
                </button>
              </>
            )}
            {selectionMode && (
              <div className="flex items-center gap-2">
                <button onClick={selectAll} className="px-3 py-2 rounded-xl text-[11px] font-bold transition-colors hover:bg-white/[0.06]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)' }}>
                  Tout selectionner
                </button>
                {selectedKeys.size > 0 && (
                  <button onClick={clearSelection} className="px-3 py-2 rounded-xl text-[11px] font-bold transition-colors hover:bg-white/[0.06] text-white/40">
                    Deselectionner
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-5 sm:mx-6 lg:mx-8 mt-5 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex h-full">
          {/* Grid */}
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
                    <SAThemeCard
                      config={config}
                      categoryName={getCategoryName(config.category)}
                      onStatusChange={status => handleStatusChange(config.theme_key, status)}
                      onToggleRecommended={() => handleToggleRecommended(config.theme_key)}
                      onToggleFavorite={() => handleToggleFavorite(config.theme_key)}
                      onMoveUp={() => handleMoveUp(config.theme_key)}
                      onMoveDown={() => handleMoveDown(config.theme_key)}
                      onRename={() => startRename(config.theme_key)}
                      onMove={() => setMovingThemeKey(config.theme_key)}
                      isFirst={idx === 0}
                      isLast={idx === filtered.length - 1}
                      selectionMode={selectionMode}
                      isSelected={selectedKeys.has(config.theme_key)}
                      onToggleSelect={() => toggleSelectKey(config.theme_key)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel desktop */}
          {selectedConfig && (
            <div className="hidden lg:block flex-shrink-0 w-[340px] xl:w-[360px] border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="sticky top-0 h-full overflow-y-auto">
                <DetailPanel
                  config={selectedConfig}
                  categoryName={getCategoryName(selectedConfig.category)}
                  onStatusChange={s => handleStatusChange(selectedConfig.theme_key, s)}
                  onToggleRecommended={() => handleToggleRecommended(selectedConfig.theme_key)}
                  onToggleFavorite={() => handleToggleFavorite(selectedConfig.theme_key)}
                  onRename={() => startRename(selectedConfig.theme_key)}
                  onMove={() => setMovingThemeKey(selectedConfig.theme_key)}
                  onMoveUp={() => handleMoveUp(selectedConfig.theme_key)}
                  onMoveDown={() => handleMoveDown(selectedConfig.theme_key)}
                  onClose={() => setSelected(null)}
                  displayOrder={selectedConfig.display_order}
                />
              </div>
            </div>
          )}
        </div>

        {/* Detail panel mobile */}
        {selectedConfig && (
          <div className="lg:hidden px-5 sm:px-6 pb-6">
            <DetailPanel
              config={selectedConfig}
              categoryName={getCategoryName(selectedConfig.category)}
              onStatusChange={s => handleStatusChange(selectedConfig.theme_key, s)}
              onToggleRecommended={() => handleToggleRecommended(selectedConfig.theme_key)}
              onToggleFavorite={() => handleToggleFavorite(selectedConfig.theme_key)}
              onRename={() => startRename(selectedConfig.theme_key)}
              onMove={() => setMovingThemeKey(selectedConfig.theme_key)}
              onMoveUp={() => handleMoveUp(selectedConfig.theme_key)}
              onMoveDown={() => handleMoveDown(selectedConfig.theme_key)}
              onClose={() => setSelected(null)}
              displayOrder={selectedConfig.display_order}
            />
          </div>
        )}
      </div>

      {/* Rename Modal */}
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

      {/* Category Manager Modal */}
      <CategoryManagerModal
        open={catManagerOpen}
        onClose={() => setCatManagerOpen(false)}
        categories={categories}
        themeCounts={tabCounts}
        onRename={handleCatRenamed}
        onSwap={handleCatSwap}
        onCreate={handleCatCreate}
        onDelete={handleCatDelete}
      />

      {/* Move Theme Modal */}
      {movingConfig && (
        <MoveThemeModal
          open={!!movingThemeKey}
          onClose={() => setMovingThemeKey(null)}
          themeLabel={movingConfig.label}
          currentCategorySlug={movingConfig.category}
          categories={categories}
          onMove={handleMoveTheme}
        />
      )}

      {/* Bulk action bar */}
      {selectionMode && selectedKeys.size > 0 && (
        <BulkActionBar
          count={selectedKeys.size}
          onStatus={handleBulkStatus}
          onDelete={() => setDeleteConfirmOpen(true)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmOpen && (
        <DeleteConfirmModal
          count={selectedKeys.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color }}>{value}</span>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, color }}>
          {icon}
        </div>
      </div>
      <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</span>
    </div>
  );
}

function DetailPanel({ config, categoryName, onStatusChange, onToggleRecommended, onToggleFavorite, onRename, onMove, onMoveUp, onMoveDown, onClose, displayOrder }: {
  config: ThemeConfigRow;
  categoryName: string;
  onStatusChange: (s: ThemeStatus) => void;
  onToggleRecommended: () => void;
  onToggleFavorite: () => void;
  onRename: () => void;
  onMove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClose: () => void;
  displayOrder: number;
}) {
  const themeEntry = ALL_THEMES.find(t => t.value === config.theme_key);
  const colors: [string, string, string] = themeEntry?.colors ?? ['#1a1a2e', '#16213e', '#0f3460'];
  const meta = STATUS_META[config.status];

  return (
    <div className="flex flex-col rounded-2xl lg:rounded-none overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
      <div className="p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-white/35 uppercase tracking-[0.15em]">Apercu du theme</span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden shadow-lg">
          <ThemePreview colors={colors} />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white/90 truncate">{config.label}</h3>
            <p className="text-[10px] font-medium mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {categoryName}{themeEntry?.description ? ` \u00b7 ${themeEntry.description}` : ''}
            </p>
          </div>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold flex-shrink-0" style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
            {meta.label}
          </span>
        </div>

        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Category */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Categorie</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.06] text-white/50">{categoryName}</span>
            <button onClick={onMove} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-blue-400/70 hover:text-blue-400 bg-blue-500/[0.06] hover:bg-blue-500/[0.10] border border-blue-500/10 hover:border-blue-500/20 transition-all flex items-center gap-1">
              <FolderInput className="w-3 h-3" />
              Deplacer
            </button>
          </div>
        </div>

        {/* Status */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Statut</span>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {(['visible', 'hidden', 'rework', 'premium'] as ThemeStatus[]).map(s => {
              const m = STATUS_META[s];
              const isActive = config.status === s;
              return (
                <button key={s} onClick={() => onStatusChange(s)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all" style={{ background: isActive ? `${m.color}12` : 'rgba(255,255,255,0.02)', border: isActive ? `1px solid ${m.border}` : '1px solid rgba(255,255,255,0.04)', color: isActive ? m.color : 'rgba(255,255,255,0.40)' }}>
                  {s === 'visible' && <Eye className="w-3.5 h-3.5 flex-shrink-0" />}
                  {s === 'hidden' && <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />}
                  {s === 'rework' && <Wrench className="w-3.5 h-3.5 flex-shrink-0" />}
                  {s === 'premium' && <Crown className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="truncate">{m.label}</span>
                  {isActive && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Order */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Ordre d'affichage</span>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={onMoveUp} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70">
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white/60 px-4 py-2 rounded-xl bg-white/[0.04] min-w-[48px] text-center tabular-nums">{displayOrder}</span>
            <button onClick={onMoveDown} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <ActionBtn icon={<Pencil className="w-3.5 h-3.5" />} label="Renommer" onClick={onRename} />
          <ActionBtn icon={<FolderInput className="w-3.5 h-3.5" />} label="Deplacer vers..." onClick={onMove} />
          <ActionBtn icon={<Award className="w-3.5 h-3.5" />} label={config.is_recommended ? 'Retirer recommande' : 'Recommander'} onClick={onToggleRecommended} accent={config.is_recommended} />
          <ActionBtn icon={<Star className="w-3.5 h-3.5" />} label={config.is_favorite ? 'Retirer favori' : 'Marquer favori'} onClick={onToggleFavorite} accent={config.is_favorite} />
          {config.status !== 'hidden' ? (
            <ActionBtn icon={<EyeOff className="w-3.5 h-3.5" />} label="Masquer le theme" onClick={() => onStatusChange('hidden')} danger />
          ) : (
            <ActionBtn icon={<Eye className="w-3.5 h-3.5" />} label="Rendre visible" onClick={() => onStatusChange('visible')} />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger, accent }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; accent?: boolean }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.01] active:scale-[0.99]" style={{
      background: danger ? 'rgba(239,68,68,0.08)' : accent ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
      border: danger ? '1px solid rgba(239,68,68,0.20)' : accent ? '1px solid rgba(59,130,246,0.20)' : '1px solid rgba(255,255,255,0.06)',
      color: danger ? '#f87171' : accent ? '#60a5fa' : 'rgba(255,255,255,0.55)',
    }}>
      {icon}
      {label}
    </button>
  );
}

function BulkActionBar({ count, onStatus, onDelete }: { count: number; onStatus: (s: ThemeStatus) => void; onDelete: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9000] animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 rounded-2xl shadow-2xl" style={{
        background: 'rgba(15,18,30,0.95)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.06)',
      }}>
        <span className="text-[11px] sm:text-xs font-bold text-white/80 whitespace-nowrap mr-1">
          {count} theme{count > 1 ? 's' : ''} selectionne{count > 1 ? 's' : ''}
        </span>

        <div className="w-px h-6 bg-white/[0.08]" />

        <button onClick={() => onStatus('visible')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Visible</span>
        </button>

        <button onClick={() => onStatus('hidden')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
          <EyeOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Masquer</span>
        </button>

        <button onClick={() => onStatus('rework')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
          <Wrench className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">A retravailler</span>
        </button>

        <button onClick={() => onStatus('premium')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>
          <Crown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Premium</span>
        </button>

        <div className="w-px h-6 bg-white/[0.08]" />

        <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', color: '#ef4444' }}>
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Supprimer</span>
        </button>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ count, onConfirm, onCancel }: { count: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} onClick={onCancel}>
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: '#121620', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Supprimer {count} theme{count > 1 ? 's' : ''} ?</h3>
            <p className="text-xs mt-2 font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Cette action est irreversible. Les themes selectionnes seront definitivement supprimes de la configuration.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-center gap-3">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/50 hover:text-white/70 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Annuler
          </button>
          <button onClick={onConfirm} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110" style={{ background: 'rgba(239,68,68,0.80)', border: '1px solid rgba(239,68,68,0.60)' }}>
            Supprimer {count} theme{count > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusDropdownItem({ label, icon, color, active, onClick }: { label: string; icon?: React.ReactNode; color?: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-medium transition-colors"
      style={{
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? (color || '#60a5fa') : 'rgba(255,255,255,0.65)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(255,255,255,0.06)' : 'transparent'; }}
    >
      {icon && <span style={{ color: color || 'rgba(255,255,255,0.40)' }}>{icon}</span>}
      {!icon && <span className="w-3.5" />}
      <span className="flex-1 text-left">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color || '#60a5fa' }} />}
    </button>
  );
}
