import {
  BookmarkCheck, Sparkles, Search,
  Heart, LayoutGrid, MousePointerClick,
  ArrowLeftRight,
  Type, Smartphone, Layers, Eye, EyeOff,
} from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import type { SavedLogo, GalleryFilter, LogoTypeFilter } from './logoAiTypes';
import { useEditorModeSafe } from '../../contexts/EditorModeContext';
import { resolveZoneBg } from '../../contexts/editorModeHelpers';
import { useVCElement } from '../visualCustomize/useVCElement';

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
  hideBg?: boolean;
  setHideBg?: (v: boolean) => void;
}

export default function LogoAiGalleryHeader({
  t, savedLoading, savedLogos, galleryFilter, setGalleryFilter,
  gallerySearch, setGallerySearch, checkedIds, setCheckedIds,
  setConfirmBulkDelete, favCount, isSelectionMode, reordering, enterReorderMode, variant,
  logoTypeFilter, setLogoTypeFilter, hideBg, setHideBg,
}: Props) {
  const isDesktop = variant === 'desktop';
  const isMobilePage1 = variant === 'mobile-page1';
  const editorCtx = useEditorModeSafe();
  const vcTous = useVCElement<HTMLButtonElement>(`hybrid-logo-btn-tous-${variant}`, 'button', 'Hybride Tous');
  const vcFav = useVCElement<HTMLButtonElement>(`hybrid-logo-btn-favoris-${variant}`, 'button', 'Hybride Favoris');
  const vcSel = useVCElement<HTMLButtonElement>(`hybrid-logo-btn-selection-${variant}`, 'button', 'Hybride Selection');
  const vcLes2 = useVCElement<HTMLButtonElement>(`hybrid-logo-btn-les2-${variant}`, 'button', 'Hybride Les 2');
  const vcLogo = useVCElement<HTMLButtonElement>(`hybrid-logo-btn-logo-${variant}`, 'button', 'Hybride Logo');
  const vcIcone = useVCElement<HTMLButtonElement>(`hybrid-logo-btn-icone-${variant}`, 'button', 'Hybride Icone');
  const vcReorg = useVCElement<HTMLButtonElement>(`hybrid-logo-btn-reorganiser-${variant}`, 'button', 'Hybride Reorganiser');
  const vcApercu = useVCElement<HTMLButtonElement>(`hybrid-logo-btn-apercu-fond-${variant}`, 'button', 'Hybride Apercu fond');
  const typeVc = { both: vcLes2, logo: vcLogo, icon: vcIcone } as const;
  const reorgOvr = editorCtx?.getButtonOverridesWithPreview()?.['btn_reorganize_logos'];
  const reorgBg = reorgOvr?.bg ? resolveZoneBg(reorgOvr.bg) : undefined;
  const reorgText = reorgOvr?.textColor ?? undefined;
  const reorgTransparent = reorgOvr?.opacityMode === 'transparent';

  const desktopBtnClass = 'h-7 inline-flex items-center gap-1 px-2.5 rounded-lg text-[10px] font-bold transition-all';
  const desktopBtnBase: React.CSSProperties = {
    background: t.surface.secondary,
    border: `1px solid ${t.surface.border}`,
    color: t.text.quaternary,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  };

  const desktopFilterTabs = (
    <>
      <button ref={vcTous.ref} onClick={() => { setGalleryFilter('all'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
        className={desktopBtnClass}
        style={{ ...(galleryFilter === 'all'
          ? { ...desktopBtnBase, background: t.surface.primary, color: t.text.primary, borderColor: t.surface.border }
          : desktopBtnBase), ...vcTous.style }}>
        <LayoutGrid className="w-2.5 h-2.5" /> Tous
      </button>
      <button ref={vcFav.ref} onClick={() => { setGalleryFilter('favorites'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
        className={desktopBtnClass}
        style={{ ...(galleryFilter === 'favorites'
          ? { ...desktopBtnBase, background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }
          : desktopBtnBase), ...vcFav.style }}>
        <Heart className="w-2.5 h-2.5" fill={galleryFilter === 'favorites' ? '#ef4444' : 'none'} /> Favoris
        {favCount > 0 && (
          <span className="text-[7px] font-bold px-1 rounded-full"
            style={{ background: galleryFilter === 'favorites' ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.04)', color: galleryFilter === 'favorites' ? '#ef4444' : t.text.quaternary }}>
            {favCount}
          </span>
        )}
      </button>
      <button ref={vcSel.ref} onClick={() => setGalleryFilter('selection')}
        className={desktopBtnClass}
        style={{ ...(isSelectionMode
          ? { ...desktopBtnBase, background: 'rgba(14,165,233,0.06)', borderColor: 'rgba(14,165,233,0.18)', color: '#0284c7' }
          : desktopBtnBase), ...vcSel.style }}>
        <MousePointerClick className="w-2.5 h-2.5" /> Selection
      </button>
    </>
  );

  const desktopTypeTabs = (
    <>
      {([
        { id: 'both' as const, label: 'Les 2', icon: <Layers className="w-2.5 h-2.5" /> },
        { id: 'logo' as const, label: 'Logo', icon: <Type className="w-2.5 h-2.5" /> },
        { id: 'icon' as const, label: 'Icone', icon: <Smartphone className="w-2.5 h-2.5" /> },
      ]).map(tab => {
        const active = logoTypeFilter === tab.id;
        const tvc = typeVc[tab.id];
        return (
          <button key={tab.id} ref={tvc.ref} onClick={() => setLogoTypeFilter(tab.id)}
            className={desktopBtnClass}
            style={{ ...(active
              ? { ...desktopBtnBase, background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.22)', color: '#d97706' }
              : desktopBtnBase), ...tvc.style }}>
            {tab.icon} {tab.label}
          </button>
        );
      })}
    </>
  );

  const filterTabs = (
    <div className="flex gap-0.5 flex-1 rounded-lg p-0.5"
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
      <button ref={vcTous.ref} onClick={() => { setGalleryFilter('all'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
        className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-md text-[9px] font-bold transition-all"
        style={{ ...(galleryFilter === 'all' ? {
          background: t.surface.primary, color: t.text.primary,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        } : { color: t.text.quaternary }), ...vcTous.style }}>
        <LayoutGrid className="w-3 h-3" /> Tous
      </button>
      <button ref={vcFav.ref} onClick={() => { setGalleryFilter('favorites'); setCheckedIds(new Set()); setConfirmBulkDelete(false); }}
        className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-md text-[9px] font-bold transition-all"
        style={{ ...(galleryFilter === 'favorites' ? {
          background: 'rgba(239,68,68,0.06)', color: '#ef4444',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid rgba(239,68,68,0.12)',
        } : { color: t.text.quaternary }), ...vcFav.style }}>
        <Heart className="w-3 h-3" fill={galleryFilter === 'favorites' ? '#ef4444' : 'none'} />
        {favCount > 0 && (
          <span className="text-[8px] font-bold px-1 rounded-full"
            style={{ background: galleryFilter === 'favorites' ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.04)', color: galleryFilter === 'favorites' ? '#ef4444' : t.text.quaternary }}>
            {favCount}
          </span>
        )}
      </button>
      <button ref={vcSel.ref} onClick={() => setGalleryFilter('selection')}
        className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-md text-[9px] font-bold transition-all"
        style={{ ...(isSelectionMode ? {
          background: 'rgba(14,165,233,0.06)', color: '#0284c7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid rgba(14,165,233,0.12)',
        } : { color: t.text.quaternary }), ...vcSel.style }}>
        <MousePointerClick className="w-3 h-3" />
        {logoTypeFilter === 'logo' && 'Selection'}
      </button>
    </div>
  );

  const typeTabs = (
    <div className="flex gap-0.5 rounded-lg p-0.5"
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
      {([
        { id: 'both' as const, label: 'Les 2', icon: <Layers className="w-3 h-3" /> },
        { id: 'logo' as const, label: 'Logo', icon: <Type className="w-3 h-3" /> },
        { id: 'icon' as const, label: 'Icone', icon: <Smartphone className="w-3 h-3" /> },
      ] as const).map(tab => {
        const active = logoTypeFilter === tab.id;
        const tvc = typeVc[tab.id];
        return (
          <button key={tab.id} ref={tvc.ref} onClick={() => setLogoTypeFilter(tab.id)}
            className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-md text-[9px] font-bold transition-all"
            style={{ ...(active ? {
              background: 'rgba(245,158,11,0.08)', color: '#d97706',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid rgba(245,158,11,0.15)',
            } : { color: t.text.quaternary }), ...tvc.style }}>
            {tab.icon}
            {tab.id === logoTypeFilter && tab.label}
          </button>
        );
      })}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="hidden lg:flex flex-col gap-2 mb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-extrabold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.14))', color: '#b45309', border: '1px solid rgba(245,158,11,0.10)' }}>
              8
            </span>
            <BookmarkCheck className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#d97706' }} />
            <span className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: t.text.tertiary }}>
              Logos sauvegardes
            </span>
          </div>
          {setHideBg && (
            <button ref={vcApercu.ref} onClick={() => setHideBg(!hideBg)}
              className="h-6 inline-flex items-center gap-1 px-2 rounded-md text-[9px] font-bold transition-all hover:brightness-110"
              style={{
                background: hideBg ? 'rgba(14,165,233,0.06)' : t.surface.secondary,
                border: `1px solid ${hideBg ? 'rgba(14,165,233,0.22)' : t.surface.border}`,
                color: hideBg ? '#0284c7' : t.text.quaternary,
                ...vcApercu.style,
              }}
              title={hideBg ? 'Afficher le fond' : 'Masquer le fond'}>
              {hideBg ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
              Apercu fond
            </button>
          )}
        </div>
        {!savedLoading && savedLogos.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {desktopFilterTabs}
            <span className="w-px h-4 mx-0.5" style={{ background: t.surface.border }} />
            {desktopTypeTabs}
            {savedLogos.length > 1 && !reordering && !isSelectionMode && (
              <>
                <span className="w-px h-4 mx-0.5" style={{ background: t.surface.border }} />
                <button ref={vcReorg.ref} data-editor-btn-id="btn_reorganize_logos" onClick={enterReorderMode}
                  className={`h-7 inline-flex items-center gap-1 px-2.5 rounded-lg text-[10px] font-bold transition-all hover:brightness-110${editorCtx?.highlightedButtonId === 'btn_reorganize_logos' ? ' editor-target-highlight' : ''}`}
                  style={{ background: reorgBg || 'rgba(245,158,11,0.06)', border: `1px solid ${reorgBg ? 'transparent' : 'rgba(245,158,11,0.18)'}`, color: reorgText || '#d97706', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', ...(reorgTransparent && reorgBg ? { opacity: 0.55 } : {}), ...vcReorg.style }}>
                  <ArrowLeftRight className="w-2.5 h-2.5" /> Reorganiser
                </button>
              </>
            )}
          </div>
        )}
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
          <button ref={vcReorg.ref} data-editor-btn-id="btn_reorganize_logos" onClick={enterReorderMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95${editorCtx?.highlightedButtonId === 'btn_reorganize_logos' ? ' editor-target-highlight' : ''}`}
            style={{ background: reorgBg || 'rgba(245,158,11,0.06)', border: `1px solid ${reorgBg ? 'transparent' : 'rgba(245,158,11,0.15)'}`, color: reorgText || '#d97706', ...(reorgTransparent && reorgBg ? { opacity: 0.55 } : {}), ...vcReorg.style }}>
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
