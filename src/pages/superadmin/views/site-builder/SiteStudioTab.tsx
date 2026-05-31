import { useState, useRef } from 'react';
import { LayoutGrid, Paintbrush, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { SiteTab } from './SiteTabs';
import type { CompanyHomePage, SiteTemplate } from '../../../../lib/companyHomePages';
import type { GradientConfig, BgMode } from './studio/studioSectionTypes';
import { DEFAULT_GRADIENT } from './studio/studioSectionTypes';
import StudioToolbar, { type PreviewMode } from './studio/StudioToolbar';
import StudioPreview from './studio/StudioPreview';
import StudioMobileFlow from './studio/StudioMobileFlow';
import StudioFullscreenOverlay from './studio/StudioFullscreenOverlay';
import PublishConfirmModal from './studio/PublishConfirmModal';
import useStudioSections from './studio/useStudioSections';
import SiteStudioLeftPanels, { type LeftPanel } from './SiteStudioLeftPanels';

interface Props {
  page: CompanyHomePage | null;
  activeTemplate: SiteTemplate | null;
  onTabChange: (tab: SiteTab) => void;
}

export default function SiteStudioTab({ page, activeTemplate, onTabChange }: Props) {
  const t = useThemeTokens();
  const templateKey = activeTemplate?.template_key ?? null;
  const homePageId = page?.id ?? null;

  const studio = useStudioSections(homePageId, templateKey, page?.is_published ?? false);

  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [fullscreen, setFullscreen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('bg-mode');
  const [bgAccordionOpen, setBgAccordionOpen] = useState(false);

  const lastGradientDesktop = useRef<GradientConfig>(DEFAULT_GRADIENT);
  const lastGradientMobile = useRef<GradientConfig>(DEFAULT_GRADIENT);

  const siteSlug = page?.slug;
  const publicUrl = siteSlug ? `${window.location.origin}/site/${siteSlug}` : null;

  if (!templateKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))',
            border: '1px solid rgba(14,165,233,0.2)',
            boxShadow: '0 0 24px rgba(14,165,233,0.1)',
          }}
        >
          <Paintbrush className="w-7 h-7" style={{ color: '#0ea5e9' }} />
        </div>
        <p className="text-sm font-medium text-center max-w-xs" style={{ color: t.text.secondary }}>
          Aucun template actif
        </p>
        <p className="text-xs mt-2 text-center max-w-xs" style={{ color: t.text.tertiary }}>
          Choisissez un template dans l'onglet Templates avant de personnaliser votre site dans le Studio.
        </p>
        <button
          onClick={() => onTabChange('templates')}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 2px 12px rgba(14,165,233,0.3)' }}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Choisir un template
        </button>
      </div>
    );
  }

  if (studio.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0ea5e9' }} />
      </div>
    );
  }

  const handleSaveDraft = async () => { await studio.saveDraft(); };
  const handlePublish = async () => { const ok = await studio.publish(); if (ok) setPublishModalOpen(false); };

  const isMobileMode = previewMode === 'mobile';
  const currentBgColor = isMobileMode ? studio.canvasBgMobile : studio.canvasBgDesktop;
  const currentGradient = isMobileMode ? studio.gradientMobile : studio.gradientDesktop;
  const bgMode: BgMode = isMobileMode ? studio.bgModeMobile : studio.bgModeDesktop;
  const setBgMode = isMobileMode ? studio.setBgModeMobile : studio.setBgModeDesktop;
  const setGradient = isMobileMode ? studio.setGradientMobile : studio.setGradientDesktop;

  if (currentGradient) {
    if (isMobileMode) lastGradientMobile.current = currentGradient;
    else lastGradientDesktop.current = currentGradient;
  }

  const handleNavigateToPanel = (panel: 'solid' | 'gradient') => {
    if (panel === 'gradient' && !currentGradient) {
      setGradient(isMobileMode ? lastGradientMobile.current : lastGradientDesktop.current);
    }
    setLeftPanel(panel);
  };

  const handleBackToBgMode = () => { setLeftPanel('bg-mode'); setBgAccordionOpen(true); };
  const handleActivateSolid = () => { setBgMode('solid'); };
  const handleActivateGradient = () => {
    if (!currentGradient) setGradient(isMobileMode ? lastGradientMobile.current : lastGradientDesktop.current);
    setBgMode('gradient');
  };
  const handleDeactivate = () => { setBgMode('default'); };

  const currentPageHeight = isMobileMode ? studio.pageHeightMobile : studio.pageHeightDesktop;
  const setPageHeight = isMobileMode ? studio.setPageHeightMobile : studio.setPageHeightDesktop;
  const effectiveBgForPreview = bgMode === 'default' ? '#ffffff' : currentBgColor;
  const effectiveGradientForPreview = bgMode === 'gradient' ? currentGradient : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Desktop layout */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 gap-1.5 p-1.5">
        <StudioToolbar
          previewMode={previewMode} onPreviewModeChange={setPreviewMode}
          onFullscreen={() => setFullscreen(true)} publicUrl={publicUrl} t={t}
          hasUnsavedChanges={studio.hasUnsavedChanges} isSaving={studio.isSaving}
          isPublished={studio.isPublished} isPublishing={studio.isPublishing}
          onSaveDraft={handleSaveDraft} onPublish={() => setPublishModalOpen(true)}
          lastSavedAt={studio.lastSavedAt} lastPublishedAt={studio.lastPublishedAt} templateKey={templateKey}
        />
        <div className="flex gap-2 flex-1 min-h-0 rounded-xl overflow-hidden">
          <div className="w-72 flex-shrink-0 rounded-xl overflow-hidden" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
            <SiteStudioLeftPanels
              leftPanel={leftPanel} isMobileMode={isMobileMode} t={t}
              currentPageHeight={currentPageHeight} setPageHeight={setPageHeight}
              bgMode={bgMode} currentBgColor={currentBgColor} currentGradient={currentGradient}
              onNavigate={handleNavigateToPanel} bgAccordionOpen={bgAccordionOpen} onToggleBgAccordion={setBgAccordionOpen}
              onBackToBgMode={handleBackToBgMode}
              onBgChange={isMobileMode ? studio.setCanvasBgMobile : studio.setCanvasBgDesktop}
              onBgReset={() => studio.resetCanvasBg(isMobileMode ? 'mobile' : 'desktop')}
              onActivateSolid={handleActivateSolid} onDeactivate={handleDeactivate}
              onGradientChange={setGradient}
              onGradientReset={() => studio.resetGradient(isMobileMode ? 'mobile' : 'desktop')}
              onActivateGradient={handleActivateGradient}
            />
          </div>
          <div className="flex-1 rounded-xl overflow-hidden min-w-0" style={{ background: '#0a0e17', border: `1px solid ${t.surface.border}` }}>
            <StudioPreview
              templateKey={templateKey} previewMode={previewMode} t={t}
              canvasBg={effectiveBgForPreview} gradient={effectiveGradientForPreview}
              onGradientChange={setGradient} pageHeight={currentPageHeight}
            />
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex-1 min-h-0">
        <div className="rounded-xl overflow-hidden h-full" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
          <StudioMobileFlow
            t={t} lastSavedAt={studio.lastSavedAt}
            hasUnsavedChanges={studio.hasUnsavedChanges} isSaving={studio.isSaving}
            isPublished={studio.isPublished} isPublishing={studio.isPublishing}
            onSaveDraft={handleSaveDraft} onPublish={() => setPublishModalOpen(true)}
            canvasBg={studio.canvasBgMobile} onCanvasBgChange={studio.setCanvasBgMobile}
            onCanvasBgReset={() => studio.resetCanvasBg('mobile')}
            gradient={studio.gradientMobile} onGradientChange={studio.setGradientMobile}
            onGradientReset={() => studio.resetGradient('mobile')}
            pageHeight={studio.pageHeightMobile} onPageHeightChange={studio.setPageHeightMobile}
            bgMode={studio.bgModeMobile} onBgModeChange={studio.setBgModeMobile}
          />
        </div>
      </div>

      {fullscreen && (
        <StudioFullscreenOverlay
          onExit={() => setFullscreen(false)}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
          canvasBg={effectiveBgForPreview}
          gradient={effectiveGradientForPreview}
          onGradientChange={setGradient}
          pageHeightDesktop={studio.pageHeightDesktop}
          pageHeightMobile={studio.pageHeightMobile}
          hasUnsavedChanges={studio.hasUnsavedChanges}
          isSaving={studio.isSaving}
          isPublishing={studio.isPublishing}
          onSaveDraft={handleSaveDraft}
          onPublish={() => setPublishModalOpen(true)}
        />
      )}

      {publishModalOpen && (
        <PublishConfirmModal isPublishing={studio.isPublishing} onConfirm={handlePublish} onClose={() => setPublishModalOpen(false)} t={t} />
      )}
    </div>
  );
}
