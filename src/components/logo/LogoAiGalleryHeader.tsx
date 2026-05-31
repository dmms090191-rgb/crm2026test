import {
  Sparkles, Search, SlidersHorizontal,
  Heart, LayoutGrid, MousePointerClick,
  ArrowLeftRight, BookmarkCheck,
  Type, Smartphone, Layers,
} from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import type { SavedLogo, GalleryFilter, LogoTypeFilter } from './logoAiTypes';

interface Props {
  t: ReturnType<typeof useThemeTokens>;
  savedLoading: boolean;
  savedLogos: SavedLogo[];
  galleryFilter: GalleryFilter;
  setGalleryFilter: (f: GalleryFilter) => void;
  gallerySearch: string;
  setGallerySearch: (s: string) => void;
  checkedIds: Set<string>;
  setCheckedIds: (ids: Set<string>) => void;
  setConfirmBulkDelete: (v: boolean) => void;
  favCount: number;
  isSelectionMode: boolean;
  reordering: boolean;
  enterReorderMode: () => void;
  variant: 'desktop' | 'mobile' | 'mobile-page1';
  logoTypeFilter: LogoTypeFilter;
  setLogoTypeFilter: (f: LogoTypeFilter) => void;
}

export default function LogoAiGalleryHeader({
  t, savedLoading, savedLogos, galleryFilter, setGalleryFilter,
  gallerySearch, setGallerySearch, checkedIds, setCheckedIds,
  setConfirmBulkDelete, favCount, isSelectionMode, reordering, enterReorderMode, variant,
  logoTypeFilter, setLogoTypeFilter,
}: Props) {
  const isDesktop = variant === 'desktop';
  const isMobilePage1 = variant === 'mobile-page1';

  const filterTabs = (
    <div className={`flex gap-0.5 ${isDesktop ? '' : 'flex-1'} rounded-lg p-0.5`}
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, boxShadow: isDesktop ? '0 1px 4px rgba(0,0,0,0.03)' : undefined }}>
      <button onClick={() => { setGalleryFilter('all'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
        className={`flex items-center ${isDesktop ? '' : 'justify-center'} gap-1 ${isDesktop ? 'px-2.5 py-1' : 'flex-1 px-2 py-1.5'} rounded-md text-[9px] font-bold transition-all`}
        style={galleryFilter === 'all' ? {
          background: t.surface.primary, color: t.text.primary,
          boxShadow: `0 1px ${isDesktop ? '4' : '3'}px rgba(0,0,0,0.06)`,
        } : { color: t.text.quaternary }}>
        <LayoutGrid className={`${isDesktop ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} /> Tous
      </button>
      <button onClick={() => { setGalleryFilter('favorites'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
        className={`flex items-center ${isDesktop ? '' : 'justify-center'} gap-1 ${isDesktop ? 'px-2.5 py-1' : 'flex-1 px-2 py-1.5'} rounded-md text-[9px] font-bold transition-all`}
        style={galleryFilter === 'favorites' ? {
          background: 'rgba(239,68,68,0.06)', color: '#ef4444',
          boxShadow: `0 1px ${isDesktop ? '4' : '3'}px rgba(0,0,0,0.06)`,
          border: '1px solid rgba(239,68,68,0.12)',
        } : { color: t.text.quaternary }}>
        <Heart className={`${isDesktop ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} fill={galleryFilter === 'favorites' ? '#ef4444' : 'none'} />
        {isDesktop && 'Favoris'}
        {favCount > 0 && (
          <span className={`text-[${isDesktop ? '7' : '8'}px] font-bold px-1 rounded-full`}
            style={{ background: galleryFilter === 'favorites' ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.04)', color: galleryFilter === 'favorites' ? '#ef4444' : t.text.quaternary }}>
            {favCount}
          </span>
        )}
      </button>
      <button onClick={() => setGalleryFilter('selection')}
        className={`flex items-center ${isDesktop ? '' : 'justify-center'} gap-1 ${isDesktop ? 'px-2.5 py-1' : 'flex-1 px-2 py-1.5'} rounded-md text-[9px] font-bold transition-all`}
        style={isSelectionMode ? {
          background: 'rgba(14,165,233,0.06)', color: '#0284c7',
          boxShadow: `0 1px ${isDesktop ? '4' : '3'}px rgba(0,0,0,0.06)`,
          border: '1px solid rgba(14,165,233,0.12)',
        } : { color: t.text.quaternary }}>
        <MousePointerClick className={`${isDesktop ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
        {isDesktop && 'Selection'}
      </button>
    </div>
  );

  const typeTabs = (
    <div className={`flex gap-0.5 rounded-lg p-0.5`}
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, boxShadow: isDesktop ? '0 1px 4px rgba(0,0,0,0.03)' : undefined }}>
      {([
        { id: 'both' as const, label: 'Les 2', icon: <Layers className={`${isDesktop ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} /> },
        { id: 'logo' as const, label: 'Logo', icon: <Type className={`${isDesktop ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} /> },
        { id: 'icon' as const, label: 'Icone', icon: <Smartphone className={`${isDesktop ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} /> },
      ] as const).map(tab => {
        const active = logoTypeFilter === tab.id;
        return (
          <button key={tab.id} onClick={() => setLogoTypeFilter(tab.id)}
            className={`flex items-center ${isDesktop ? '' : 'justify-center'} gap-1 ${isDesktop ? 'px-2.5 py-1' : 'flex-1 px-2 py-1.5'} rounded-md text-[9px] font-bold transition-all`}
            style={active ? {
              background: 'rgba(245,158,11,0.08)', color: '#d97706',
              boxShadow: `0 1px ${isDesktop ? '4' : '3'}px rgba(0,0,0,0.06)`,
              border: '1px solid rgba(245,158,11,0.15)',
            } : { color: t.text.quaternary }}>
            {tab.icon}
            {(isDesktop || tab.id === logoTypeFilter) && tab.label}
          </button>
        );
      })}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="hidden lg:flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.15))', border: '1px solid rgba(245,158,11,0.10)' }}>
            <Sparkles className="w-2.5 h-2.5" style={{ color: '#d97706' }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.text.tertiary }}>Logos sauvegardes</span>
          {!savedLoading && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.12)' }}>
              {savedLogos.length}
            </span>
          )}
          {!savedLoading && savedLogos.length > 0 && (
            <div className="ml-2">{filterTabs}</div>
          )}
          {!savedLoading && savedLogos.length > 0 && (
            <div className="ml-1">{typeTabs}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: t.text.quaternary }} />
            <input type="text" value={gallerySearch} onChange={e => setGallerySearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-[130px] pl-7 pr-2.5 py-1.5 rounded-lg text-[9px] font-medium focus:outline-none transition-all"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = t.surface.border; }}
            />
          </div>
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:brightness-105"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.quaternary, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <SlidersHorizontal className="w-2.5 h-2.5" /> Style
          </button>
          {!savedLoading && savedLogos.length > 1 && !reordering && !isSelectionMode && (
            <button onClick={enterReorderMode}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:brightness-110"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)', color: '#d97706', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <ArrowLeftRight className="w-2.5 h-2.5" /> Reorganiser
            </button>
          )}
        </div>
      </div>
    );
  }

  const icon = isMobilePage1 ? <BookmarkCheck className="w-3 h-3" style={{ color: '#d97706' }} /> : <Sparkles className="w-3 h-3" style={{ color: '#d97706' }} />;
  const title = isMobilePage1 ? 'Sauvegardes' : 'Logos sauvegardes';

  return (
    <div className="lg:hidden space-y-2.5 mb-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.15))', border: '1px solid rgba(245,158,11,0.10)' }}>
            {icon}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: t.text.tertiary }}>{title}</span>
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
        <div className="flex items-center gap-1.5">{filterTabs}{typeTabs}</div>
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
  );
}
