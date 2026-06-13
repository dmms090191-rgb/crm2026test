import { useState, useRef, useEffect, useCallback } from 'react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';
import { notifyAppIconChanged } from '../../hooks/useAppIcon';
import type { Preset, NumProposals, ColorPaletteId } from './logoAiConstants';
import LogoAiV4Controls from './LogoAiV4Controls';
import LogoAiOptionsBar from './LogoAiOptionsBar';
import LogoAiCostPanel from './LogoAiCostPanel';
import LogoAiResultsPreview from './LogoAiResultsPreview';
import LogoAiSelectedDetail from './LogoAiSelectedDetail';
import LogoAiAppIconBanner from './LogoAiAppIconBanner';
import LogoAiMobileLayout from './LogoAiMobileLayout';
import { FullscreenOverlay } from './LogoAiFullscreen';
import LogoAiGallerySection from './LogoAiGallerySection';
import useLogoAiGenerate from './useLogoAiGenerate';
import useLogoAiGallery from './useLogoAiGallery';
import { useVCElement } from '../visualCustomize/useVCElement';

interface Props {
  companyId: string | null;
  isSA?: boolean;
  appIconSelectionMode?: boolean;
  onAppIconSelected?: () => void;
}

export default function LogoAiTab({ companyId, isSA, appIconSelectionMode, onAppIconSelected }: Props) {
  const t = useThemeTokens();
  const detailRef = useRef<HTMLDivElement>(null);
  const vcSauvegardes = useVCElement<HTMLDivElement>('logo-card-sauvegardes', 'card', 'Carte Logos sauvegardes');

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
  const [hideBg, setHideBg] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
    setSavingAppIcon(true);
    try {
      const ownerType = isSA ? 'super_admin' : 'company';
      const cid = isSA ? null : companyId;
      if (!isSA && !companyId) return;

      const now = new Date().toISOString();
      const query = supabase.from('app_config').select('id').eq('owner_type', ownerType);
      if (cid) query.eq('company_id', cid); else query.is('company_id', null);
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        await supabase.from('app_config')
          .update({ app_icon_url: logoUrl, app_icon_id: logoId, updated_at: now })
          .eq('id', existing.id);
      } else {
        await supabase.from('app_config')
          .insert({ owner_type: ownerType, company_id: cid, app_icon_url: logoUrl, app_icon_id: logoId, app_name: '', enabled_modules: {} });
      }

      notifyAppIconChanged({
        owner_type: ownerType,
        company_id: cid,
        app_icon_url: logoUrl,
      });
      onAppIconSelected?.();
    } catch { /* silent */ }
    finally { setSavingAppIcon(false); }
  }, [companyId, isSA, onAppIconSelected]);

  const gen = useLogoAiGenerate({
    companyId, selectedPresets, numProposals, brandName,
    colorPalette, customPrimary, customSecondary, prompt,
    transparentBg, onLogosChanged: gallery.fetchSavedLogos,
  });

  const costAndGenerate = (
    <LogoAiCostPanel
      estimatedCost={gen.estimatedCost} totalImages={gen.totalImages}
      canGenerate={gen.canGenerate} loading={gen.loading} postProcessing={gen.postProcessing}
      onGenerate={gen.handleGenerate} textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
    />
  );

  const configPanel = (
    <div className="flex flex-col gap-2 h-full min-h-0">
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
      <LogoAiOptionsBar
        transparentBg={transparentBg} setTransparentBg={setTransparentBg}
        numProposals={numProposals} setNumProposals={setNumProposals} numTypes={gen.numTypes}
        surfacePrimary={t.surface.primary} surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
        textSecondary={t.text.secondary} textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
        propositionsFooter={costAndGenerate}
      />
    </div>
  );

  const resultsPreview = (
    <LogoAiResultsPreview
      gen={gen} transparentBg={transparentBg} numProposals={numProposals}
      companyId={companyId} onFullscreen={setFullscreenUrl}
      textPrimary={t.text.primary} textSecondary={t.text.secondary}
      textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
      surfacePrimary={t.surface.primary} surfaceSecondary={t.surface.secondary}
      surfaceBorder={t.surface.border} surfaceBorderLight={t.surface.borderLight}
    />
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
    hideBg, setHideBg,
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

  const appIconBanner = appIconSelectionMode
    ? <LogoAiAppIconBanner savingAppIcon={savingAppIcon} textQuaternary={t.text.quaternary} />
    : null;

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      {hideBg && (
        <div className="absolute inset-0 pointer-events-none z-0"
          style={{ background: t.surface.primary }} />
      )}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      {/* Desktop layout (lg+) */}
      <div className="hidden lg:flex flex-col lg:flex-row flex-1 min-h-0 lg:items-stretch">
        <div className="w-full lg:w-[42%] lg:flex-shrink-0 flex flex-col"
          style={{ borderRight: `1px solid ${t.surface.borderLight}` }}>
          <div className="px-4 sm:px-5 pt-3 pb-3 flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0">{isDesktop ? configPanel : null}</div>
          </div>
        </div>
        <div className="w-full lg:w-[58%] flex flex-col min-h-0 lg:overflow-hidden">
          {!appIconSelectionMode && resultsPreview}
          {appIconBanner}
          <div className="flex-1 min-h-0 px-4 pt-3 pb-3 flex flex-col">
            <div ref={vcSauvegardes.ref} className="flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden"
              style={{
                ...(vcSauvegardes.style?.background ? {} : {
                  background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.primary}80)`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }),
                border: `1px solid ${t.surface.border}`,
                ...vcSauvegardes.style,
              }}>
              <div className="flex-shrink-0 px-3 pt-3 pb-2" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
                <LogoAiGallerySection {...galleryProps} headerVariant="desktop" />
              </div>
              <div ref={detailRef} className="flex-1 min-h-0 p-3 overflow-y-auto">
                {detailPanel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout (below lg) */}
      <LogoAiMobileLayout
        mobilePage={mobilePage} setMobilePage={setMobilePage}
        configPanel={isDesktop ? null : configPanel} costAndGenerate={null}
        resultsPreview={resultsPreview} detailPanel={detailPanel}
        appIconBanner={appIconBanner}
        gallerySection={<LogoAiGallerySection {...galleryProps} headerVariant="mobile-page1" compact />}
        showResults={gen.resultGroups.length > 0 || gen.loading || gen.postProcessing}
        savedCount={gallery.savedLogos.length}
        appIconSelectionMode={!!appIconSelectionMode}
        selectedLogo={gallery.selectedLogo}
        detailRef={detailRef as React.RefObject<HTMLDivElement>}
        surfacePrimary={t.surface.primary} surfaceBorder={t.surface.border}
        surfaceBorderLight={t.surface.borderLight} surfaceSecondary={t.surface.secondary}
        textPrimary={t.text.primary} textQuaternary={t.text.quaternary} textSecondary={t.text.secondary}
      />

      {fullscreenUrl && (
        <FullscreenOverlay url={fullscreenUrl} onClose={() => setFullscreenUrl(null)} />
      )}
      </div>
    </div>
  );
}
