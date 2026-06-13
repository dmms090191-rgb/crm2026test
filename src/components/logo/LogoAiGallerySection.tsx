import { Loader2, Heart } from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import type { SavedLogo, GalleryEntry, GalleryFilter, LogoTypeFilter } from './logoAiTypes';
import { GalleryThumb, MobileGalleryThumb } from './LogoAiGalleryThumbs';
import LogoAiGalleryPackCard from './LogoAiGalleryPackCard';
import LogoAiGalleryHeader from './LogoAiGalleryHeader';
import { SelectionActionBar, ReorderActionBar } from './LogoAiGalleryActionBars';

export interface LogoAiGallerySectionProps {
  t: ReturnType<typeof useThemeTokens>;
  savedLoading: boolean;
  savedLogos: SavedLogo[];
  filteredSaved: SavedLogo[];
  galleryEntries: GalleryEntry[];
  galleryFilter: GalleryFilter;
  setGalleryFilter: (f: GalleryFilter) => void;
  gallerySearch: string;
  setGallerySearch: (s: string) => void;
  selectedGalleryId: string | null;
  setSelectedGalleryId: (id: string | null) => void;
  checkedIds: Set<string>;
  setCheckedIds: (ids: Set<string>) => void;
  confirmBulkDelete: boolean;
  setConfirmBulkDelete: (v: boolean) => void;
  bulkDeleting: boolean;
  handleBulkDeleteGallery: () => void;
  handleToggleFavorite: (id: string, fav: boolean) => void;
  toggleCheck: (id: string) => void;
  exitSelectionMode: () => void;
  isSelectionMode: boolean;
  favCount: number;
  reordering: boolean;
  enterReorderMode: () => void;
  cancelReorder: () => void;
  saveReorder: () => void;
  savingOrder: boolean;
  dragIdx: number | null;
  dropIdx: number | null;
  handleDragStart: (idx: number) => void;
  handleDragOver: (e: React.DragEvent, idx: number) => void;
  handleDrop: (e: React.DragEvent, idx: number) => void;
  handleDragEnd: () => void;
  detailRef: React.RefObject<HTMLDivElement>;
  headerVariant: 'desktop' | 'mobile' | 'mobile-page1';
  compact?: boolean;
  logoTypeFilter: LogoTypeFilter;
  setLogoTypeFilter: (f: LogoTypeFilter) => void;
  appIconSelectionMode?: boolean;
  savingAppIcon?: boolean;
  onSelectAppIcon?: (id: string, url: string) => void;
  hideBg?: boolean;
  setHideBg?: (v: boolean) => void;
}

export default function LogoAiGallerySection(props: LogoAiGallerySectionProps) {
  const {
    t, savedLoading, savedLogos, filteredSaved, galleryEntries,
    galleryFilter, setGalleryFilter, gallerySearch, setGallerySearch,
    selectedGalleryId, setSelectedGalleryId,
    checkedIds, setCheckedIds, confirmBulkDelete, setConfirmBulkDelete,
    bulkDeleting, handleBulkDeleteGallery, handleToggleFavorite, toggleCheck,
    exitSelectionMode, isSelectionMode, favCount,
    reordering, enterReorderMode, cancelReorder, saveReorder, savingOrder,
    dragIdx, dropIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    detailRef, headerVariant, compact, logoTypeFilter, setLogoTypeFilter,
    appIconSelectionMode, savingAppIcon, onSelectAppIcon,
    hideBg, setHideBg,
  } = props;

  const scrollToDetail = () => {
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const selectLogo = (id: string) => {
    if (appIconSelectionMode && onSelectAppIcon && !savingAppIcon) {
      const logo = filteredSaved.find(l => l.id === id);
      if (logo) onSelectAppIcon(logo.id, logo.url);
      return;
    }
    setSelectedGalleryId(selectedGalleryId === id ? null : id);
    scrollToDetail();
  };

  return (
    <>
      <LogoAiGalleryHeader
        t={t} savedLoading={savedLoading} savedLogos={savedLogos}
        galleryFilter={galleryFilter} setGalleryFilter={setGalleryFilter}
        gallerySearch={gallerySearch} setGallerySearch={setGallerySearch}
        checkedIds={checkedIds} setCheckedIds={setCheckedIds}
        setConfirmBulkDelete={setConfirmBulkDelete} favCount={favCount}
        isSelectionMode={isSelectionMode} reordering={reordering}
        enterReorderMode={enterReorderMode} variant={headerVariant}
        logoTypeFilter={logoTypeFilter} setLogoTypeFilter={setLogoTypeFilter}
        hideBg={hideBg} setHideBg={setHideBg}
      />

      {isSelectionMode && filteredSaved.length > 0 && (
        <SelectionActionBar
          t={t} filteredSaved={filteredSaved} checkedIds={checkedIds}
          setCheckedIds={setCheckedIds} confirmBulkDelete={confirmBulkDelete}
          setConfirmBulkDelete={setConfirmBulkDelete} bulkDeleting={bulkDeleting}
          handleBulkDeleteGallery={handleBulkDeleteGallery}
          exitSelectionMode={exitSelectionMode} compact={compact}
        />
      )}

      {reordering && (
        <ReorderActionBar
          t={t} savingOrder={savingOrder} saveReorder={saveReorder}
          cancelReorder={cancelReorder} compact={compact}
        />
      )}

      {savedLoading ? (
        <div className={`flex items-center justify-center ${compact ? 'py-6' : 'py-4'}`}>
          <Loader2 className={`${compact ? 'w-5 h-5' : 'w-4 h-4'} animate-spin`} style={{ color: '#d97706' }} />
        </div>
      ) : filteredSaved.length === 0 ? (
        <div className={`flex items-center justify-center gap-2 ${compact ? 'py-6' : 'py-4'}`}>
          {galleryFilter === 'favorites' ? (
            <>
              <Heart className={`${compact ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} style={{ color: '#ef4444', opacity: 0.4 }} />
              <p className={`text-[${compact ? '11' : '10'}px] font-medium`} style={{ color: t.text.quaternary }}>
                {compact ? 'Aucun favori.' : 'Aucun logo favori. Survolez un logo et cliquez sur le coeur.'}
              </p>
            </>
          ) : (
            <p className={`text-[${compact ? '11' : '10'}px] font-medium`} style={{ color: t.text.quaternary }}>
              {gallerySearch ? (compact ? 'Aucun resultat.' : 'Aucun logo correspondant.') : 'Aucun logo sauvegarde.'}
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
                  return (
                    <GalleryThumb key={entry.logo.id} logo={entry.logo} t={t}
                      isSelected={selectedGalleryId === entry.logo.id}
                      onToggleFavorite={handleToggleFavorite}
                      selectionMode={isSelectionMode}
                      checked={checkedIds.has(entry.logo.id)}
                      onToggleCheck={toggleCheck}
                      reordering={reordering} idx={ei}
                      isDragTarget={isEntryDragTarget}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      onClick={() => selectLogo(entry.logo.id)}
                    />
                  );
                }
                const anySelected = entry.logos.some(l => l.id === selectedGalleryId);
                const anyChecked = entry.logos.some(l => checkedIds.has(l.id));
                const packCard = (
                  <LogoAiGalleryPackCard key={entry.groupId}
                    logos={entry.logos} groupId={entry.groupId} t={t}
                    anySelected={anySelected} anyChecked={anyChecked}
                    isSelectionMode={isSelectionMode}
                    onToggleFavorite={handleToggleFavorite}
                    onClick={() => selectLogo(entry.logos[0].id)}
                    variant="desktop" reordering={reordering}
                    entryIdx={ei} onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                );
                if (reordering) {
                  return (
                    <div key={entry.groupId} className="flex-shrink-0 flex items-stretch"
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; handleDragOver(e, ei); }}
                      onDrop={(e) => { e.preventDefault(); handleDrop(e, ei); }}>
                      {isEntryDragTarget && (
                        <div className="w-[3px] flex-shrink-0 rounded-full self-stretch -mr-0.5 z-10"
                          style={{ background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
                      )}
                      {packCard}
                    </div>
                  );
                }
                return packCard;
              })}
            </div>
          </div>
          {/* Mobile: vertical grid */}
          <div className="lg:hidden grid grid-cols-2 gap-2 pb-1.5">
            {galleryEntries.map((entry) => {
              if (entry.type === 'single') {
                return (
                  <MobileGalleryThumb key={entry.logo.id} logo={entry.logo} t={t}
                    isSelected={selectedGalleryId === entry.logo.id}
                    onToggleFavorite={handleToggleFavorite}
                    selectionMode={isSelectionMode}
                    checked={checkedIds.has(entry.logo.id)}
                    onToggleCheck={toggleCheck}
                    onClick={() => selectLogo(entry.logo.id)}
                  />
                );
              }
              return (
                <LogoAiGalleryPackCard key={entry.groupId}
                  logos={entry.logos} groupId={entry.groupId} t={t}
                  anySelected={entry.logos.some(l => l.id === selectedGalleryId)}
                  anyChecked={entry.logos.some(l => checkedIds.has(l.id))}
                  isSelectionMode={isSelectionMode}
                  onToggleFavorite={handleToggleFavorite}
                  onClick={() => selectLogo(entry.logos[0].id)}
                  variant="mobile"
                />
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
