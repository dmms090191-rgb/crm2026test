import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Loader2, AlertTriangle, Star,
  Eye, Home, ArrowRight, ArrowLeft, Smartphone, Check,
} from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';
import {
  COST_WARNING_THRESHOLD,
  type Preset, type NumProposals, type ColorPaletteId,
} from './logoAiConstants';
import LogoAiV4Controls from './LogoAiV4Controls';
import LogoAiOptionsBar from './LogoAiOptionsBar';
import LogoAiResultsGrid from './LogoAiResultsGrid';
import LogoAiSelectedDetail from './LogoAiSelectedDetail';
import { FullscreenOverlay } from './LogoAiFullscreen';
import LogoAiGallerySection from './LogoAiGallerySection';
import useLogoAiGenerate from './useLogoAiGenerate';
import useLogoAiGallery from './useLogoAiGallery';

interface Props {
  companyId: string | null;
  appIconSelectionMode?: boolean;
  onAppIconSelected?: () => void;
}

export default function LogoAiTab({ companyId, appIconSelectionMode, onAppIconSelected }: Props) {
  const t = useThemeTokens();
  const detailRef = useRef<HTMLDivElement>(null);

  const [selectedPresets, setSelectedPresets] = useState<Preset[]>(['typographic', 'app_icon']);
  const [colorPalette, setColorPalette] = useState<ColorPaletteId>('custom');
  const [customPrimary, setCustomPrimary] = useState('#001F3F');
  const [customSecondary, setCustomSecondary] = useState('#00BCD4');
  const [brandName, setBrandName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [numProposals, setNumProposals] = useState<NumProposals>(1);
  const [transparentBg, setTransparentBg] = useState(true);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [mobilePage, setMobilePage] = useState<0 | 1>(0);

  const gallery = useLogoAiGallery(companyId);
  const [savingAppIcon, setSavingAppIcon] = useState(false);

  useEffect(() => {
    if (appIconSelectionMode) {
      gallery.setLogoTypeFilter('icon');
      gallery.setGalleryFilter('all');
      setMobilePage(1);
    }
  }, [appIconSelectionMode]);

  const handleSelectAppIcon = useCallback(async (logoId: string, logoUrl: string) => {
    if (!companyId) return;
    setSavingAppIcon(true);
    try {
      await supabase.from('company_home_pages')
        .update({ app_icon_id: logoId, app_icon_url: logoUrl, updated_at: new Date().toISOString() })
        .eq('company_id', companyId);
      onAppIconSelected?.();
    } catch { /* silent */ }
    finally { setSavingAppIcon(false); }
  }, [companyId, onAppIconSelected]);

  const gen = useLogoAiGenerate({
    companyId, selectedPresets, numProposals, brandName,
    colorPalette, customPrimary, customSecondary, prompt,
    transparentBg, onLogosChanged: gallery.fetchSavedLogos,
  });

  const configPanel = (
    <>
      <LogoAiV4Controls
        selectedPresets={selectedPresets} setSelectedPresets={setSelectedPresets}
        needsBrand={gen.needsBrand} brandName={brandName} setBrandName={setBrandName}
        colorPalette={colorPalette} setColorPalette={setColorPalette}
        customPrimary={customPrimary} setCustomPrimary={setCustomPrimary}
        customSecondary={customSecondary} setCustomSecondary={setCustomSecondary}
        prompt={prompt} setPrompt={setPrompt}
        surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
        surfacePrimary={t.surface.primary} textPrimary={t.text.primary}
        textSecondary={t.text.secondary} textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
      />
      <div className="h-px my-1" style={{ background: `linear-gradient(90deg, ${t.surface.border}60, ${t.surface.border}20, transparent)` }} />
      <LogoAiOptionsBar
        transparentBg={transparentBg} setTransparentBg={setTransparentBg}
        numProposals={numProposals} setNumProposals={setNumProposals} numTypes={gen.numTypes}
        surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
        textSecondary={t.text.secondary} textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
      />
    </>
  );

  const costAndGenerate = (
    <div className="flex-shrink-0 pt-2 mt-auto space-y-2">
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(217,119,6,0.06))', border: '1px solid rgba(245,158,11,0.10)' }}>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: t.text.tertiary }}>Cout</span>
        <div className="flex items-baseline gap-1">
          <span className="text-[13px] font-black tabular-nums" style={{ color: '#d97706' }}>{gen.estimatedCost}</span>
          <span className="text-[8px] font-bold" style={{ color: t.text.quaternary }}>
            credits ({gen.totalImages} img)
          </span>
        </div>
      </div>
      {gen.estimatedCost > COST_WARNING_THRESHOLD && (
        <div className="flex items-center gap-1.5 text-[9px] font-medium px-1" style={{ color: '#d97706' }}>
          <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" /> Cout eleve.
        </div>
      )}
      <button onClick={gen.handleGenerate} disabled={gen.loading || gen.postProcessing || !gen.canGenerate}
        className="group relative w-full overflow-hidden flex items-center justify-center gap-2 py-3 lg:py-2.5 rounded-xl text-[13px] lg:text-[12px] font-extrabold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
          color: '#fff',
          boxShadow: gen.canGenerate ? '0 8px 32px rgba(245,158,11,0.30), 0 2px 8px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.20)' : 'none',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }} />
        <span className="relative flex items-center gap-2">
          {(gen.loading || gen.postProcessing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {(gen.loading || gen.postProcessing) ? 'Generation...' : `Generer ${gen.totalImages} logo${gen.totalImages > 1 ? 's' : ''}`}
        </span>
      </button>
    </div>
  );

  const resultsPreview = (
    <div className="flex-shrink flex flex-col min-h-0" style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}>
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2 flex-shrink-0">
        <div className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.15))', border: '1px solid rgba(245,158,11,0.10)' }}>
          <Star className="w-2.5 h-2.5" style={{ color: '#d97706' }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.text.tertiary }}>Apercu du logo cree</span>
      </div>
      <div className="px-4 pb-3 flex-1 min-h-0 overflow-y-auto">
        <div className="rounded-xl overflow-hidden" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="min-h-[160px]">
            <LogoAiResultsGrid
              groups={gen.resultGroups} transparentBg={transparentBg}
              savedSet={gen.savedSet} savingKey={gen.savingKey} companyId={companyId}
              loading={gen.loading} postProcessing={gen.postProcessing} postProcessStatus={gen.postProcessStatus}
              numProposals={numProposals} totalImages={gen.totalImages} genCost={gen.genCost}
              progressLabel={gen.progressLabel}
              onSave={gen.handleSave} onSavePack={gen.handleSavePack} savingPack={gen.savingPack}
              onClear={gen.clearResults}
              onFullscreen={setFullscreenUrl}
              textPrimary={t.text.primary} textSecondary={t.text.secondary}
              textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
              surfacePrimary={t.surface.primary} surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
            />
          </div>
        </div>
        {gen.error && (
          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold" style={{ color: '#ef4444' }}>
            <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {gen.error}
          </div>
        )}
      </div>
    </div>
  );

  const galleryProps = {
    t, savedLoading: gallery.savedLoading, savedLogos: gallery.savedLogos,
    filteredSaved: gallery.filteredSaved, galleryEntries: gallery.galleryEntries,
    galleryFilter: gallery.galleryFilter, setGalleryFilter: gallery.setGalleryFilter,
    gallerySearch: gallery.gallerySearch, setGallerySearch: gallery.setGallerySearch,
    selectedGalleryId: gallery.selectedGalleryId, setSelectedGalleryId: gallery.setSelectedGalleryId,
    checkedIds: gallery.checkedIds, setCheckedIds: gallery.setCheckedIds,
    confirmBulkDelete: gallery.confirmBulkDelete, setConfirmBulkDelete: gallery.setConfirmBulkDelete,
    bulkDeleting: gallery.bulkDeleting, handleBulkDeleteGallery: gallery.handleBulkDeleteGallery,
    handleToggleFavorite: gallery.handleToggleFavorite, toggleCheck: gallery.toggleCheck,
    exitSelectionMode: gallery.exitSelectionMode, isSelectionMode: gallery.isSelectionMode,
    favCount: gallery.favCount,
    reordering: gallery.reordering, enterReorderMode: gallery.enterReorderMode,
    cancelReorder: gallery.cancelReorder, saveReorder: gallery.saveReorder,
    savingOrder: gallery.savingOrder, dragIdx: gallery.dragIdx, dropIdx: gallery.dropIdx,
    handleDragStart: gallery.handleDragStart, handleDragOver: gallery.handleDragOver,
    handleDrop: gallery.handleDrop, handleDragEnd: gallery.handleDragEnd,
    detailRef: detailRef as React.RefObject<HTMLDivElement>,
    logoTypeFilter: gallery.logoTypeFilter, setLogoTypeFilter: gallery.setLogoTypeFilter,
    appIconSelectionMode: !!appIconSelectionMode,
    savingAppIcon,
    onSelectAppIcon: handleSelectAppIcon,
  };

  const detailPanel = (
    <LogoAiSelectedDetail
      logo={gallery.selectedLogo}
      family={gallery.selectedFamily}
      t={t}
      onFullscreen={(url) => setFullscreenUrl(url)}
      onDeselect={() => gallery.setSelectedGalleryId(null)}
      onSelectAsActive={gallery.handleSelectAsActive}
      selectingActive={gallery.selectingActive}
      companyId={companyId}
    />
  );

  const appIconBanner = appIconSelectionMode ? (
    <div className="flex items-center gap-2.5 px-4 py-2.5 mx-3 mt-2 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(6,182,212,0.08))',
        border: '1px solid rgba(14,165,233,0.2)',
        boxShadow: '0 2px 12px rgba(14,165,233,0.06)',
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
        <Smartphone className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold" style={{ color: '#0284c7' }}>Selection de l'icone application</p>
        <p className="text-[9px] font-medium" style={{ color: t.text.quaternary }}>Cliquez sur une icone sauvegardee pour la definir comme icone de l'application</p>
      </div>
      {savingAppIcon && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: '#0ea5e9' }} />}
    </div>
  ) : null;

  return (
    <>
      {/* Desktop layout (lg+) */}
      <div className="hidden lg:flex flex-col lg:flex-row flex-1 min-h-0 lg:items-stretch">
        <div className="w-full lg:w-[42%] lg:flex-shrink-0 flex flex-col"
          style={{ borderRight: `1px solid ${t.surface.borderLight}` }}>
          <div className="px-4 sm:px-5 py-3 flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0">{configPanel}</div>
            {costAndGenerate}
          </div>
        </div>
        <div className="w-full lg:w-[58%] flex flex-col min-h-0 lg:overflow-hidden">
          {!appIconSelectionMode && resultsPreview}
          {appIconBanner}
          <div className="flex-shrink-0 px-4 pt-3 pb-2" style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}>
            <LogoAiGallerySection {...galleryProps} headerVariant="desktop" />
          </div>
          <div ref={detailRef} className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto">
            {detailPanel}
          </div>
        </div>
      </div>

      {/* Mobile layout (below lg) */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <div className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${mobilePage * 100}%)` }}>
            {/* Page 0: Create + Results */}
            <div className="w-full flex-shrink-0 flex flex-col min-h-0 overflow-y-auto">
              <div className="px-4 py-3 flex flex-col">{configPanel}</div>
              <div className="px-4 pb-3">{costAndGenerate}</div>
              {(gen.resultGroups.length > 0 || gen.loading || gen.postProcessing) && (
                <div className="mt-1">{resultsPreview}</div>
              )}
              {gallery.savedLogos.length > 0 && (
                <div className="px-4 py-3">
                  <button onClick={() => setMobilePage(1)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(217,119,6,0.06))',
                      border: '1px solid rgba(245,158,11,0.15)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', boxShadow: '0 2px 8px rgba(245,158,11,0.20)' }}>
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="text-[12px] font-bold block" style={{ color: t.text.primary }}>Apercu & Sauvegardes</span>
                        <span className="text-[9px] font-medium" style={{ color: t.text.quaternary }}>
                          {gallery.savedLogos.length} logo{gallery.savedLogos.length > 1 ? 's' : ''} sauvegarde{gallery.savedLogos.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4" style={{ color: '#d97706' }} />
                  </button>
                </div>
              )}
            </div>

            {/* Page 1: Detail + Gallery */}
            <div className="w-full flex-shrink-0 flex flex-col min-h-0 overflow-y-auto">
              <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-shrink-0">
                {!appIconSelectionMode && (
                  <button onClick={() => setMobilePage(0)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Creer
                  </button>
                )}
                <div className="flex-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>
                  {appIconSelectionMode ? 'Selection icone' : gallery.selectedLogo ? 'Apercu' : 'Bibliotheque'}
                </span>
              </div>
              {appIconBanner}
              {!appIconSelectionMode && <div ref={detailRef} className="px-3 pb-2">{detailPanel}</div>}
              <div className="flex-shrink-0 px-4 pt-3 pb-2" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
                <LogoAiGallerySection {...galleryProps} headerVariant="mobile-page1" compact />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile bottom tab bar */}
        <div className="flex-shrink-0 flex items-center justify-around py-2 px-2"
          style={{ borderTop: `1px solid ${t.surface.border}`, background: t.surface.primary, boxShadow: '0 -2px 12px rgba(0,0,0,0.04)' }}>
          {[
            { page: 0 as const, icon: <Home className="w-5 h-5" />, label: 'Creer' },
            { page: 1 as const, icon: <Eye className="w-5 h-5" />, label: 'Apercu' },
          ].map(tab => {
            const active = mobilePage === tab.page;
            return (
              <button key={tab.page} onClick={() => setMobilePage(tab.page)}
                className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all active:scale-95"
                style={{ color: active ? '#d97706' : t.text.quaternary }}>
                {tab.icon}
                <span className="text-[9px] font-bold" style={{ color: active ? '#d97706' : t.text.quaternary }}>{tab.label}</span>
                {active && (
                  <div className="w-4 h-0.5 rounded-full mt-0.5"
                    style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {fullscreenUrl && (
        <FullscreenOverlay url={fullscreenUrl} onClose={() => setFullscreenUrl(null)} />
      )}
    </>
  );
}
