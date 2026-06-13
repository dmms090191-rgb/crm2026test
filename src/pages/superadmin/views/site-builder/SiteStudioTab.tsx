import { useState, useRef, useCallback } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import type { SiteTab } from './SiteTabs';
import type { CompanyHomePage, SiteTemplate, SiteTemplateConfig } from '../../../../lib/companyHomePages';
import type { GradientConfig, BgMode } from './studio/studioSectionTypes';
import { DEFAULT_GRADIENT } from './studio/studioSectionTypes';
import StudioToolbar, { type PreviewMode } from './studio/StudioToolbar';
import StudioPreview from './studio/StudioPreview';
import StudioMobileFlow from './studio/StudioMobileFlow';
import StudioFullscreenOverlay from './studio/StudioFullscreenOverlay';
import PublishConfirmModal from './studio/PublishConfirmModal';
import SaveAsTemplateModal from './studio/SaveAsTemplateModal';
import useStudioSections from './studio/useStudioSections';
import SiteStudioLeftPanels, { type LeftPanel } from './SiteStudioLeftPanels';
import StudioEntryPage from './studio/StudioEntryPage';
import StudioRightPanel from './studio/StudioRightPanel';

interface Props {
  page: CompanyHomePage | null;
  activeTemplate: SiteTemplate | null;
  onTabChange: (tab: SiteTab) => void;
  onTemplateCreated?: () => void;
  editorOpen: boolean;
  onEditorOpenChange: (open: boolean) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'template';
}

export default function SiteStudioTab({ page, activeTemplate, onTabChange, onTemplateCreated, editorOpen, onEditorOpenChange }: Props) {
  const t = useThemeTokens();
  const templateKey = activeTemplate?.template_key ?? null;
  const homePageId = page?.id ?? null;

  const studio = useStudioSections(homePageId, templateKey, page?.is_published ?? false);

  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [fullscreen, setFullscreen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('bg-mode');
  const [bgAccordionOpen, setBgAccordionOpen] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [freeDragId, setFreeDragId] = useState<string | null>(null);

  const lastGradientDesktop = useRef<GradientConfig>(DEFAULT_GRADIENT);
  const lastGradientMobile = useRef<GradientConfig>(DEFAULT_GRADIENT);

  const siteSlug = page?.slug;
  const publicUrl = siteSlug ? `${window.location.origin}/site/${siteSlug}` : null;

  const handleSaveAsTemplate = useCallback(async (name: string) => {
    setTemplateSaving(true);
    try {
      const config: SiteTemplateConfig = {
        canvasBgDesktop: studio.canvasBgDesktop,
        canvasBgMobile: studio.canvasBgMobile,
        gradientDesktop: studio.gradientDesktop as unknown as Record<string, unknown> | null,
        gradientMobile: studio.gradientMobile as unknown as Record<string, unknown> | null,
        bgModeDesktop: studio.bgModeDesktop,
        bgModeMobile: studio.bgModeMobile,
        pageHeightDesktop: studio.pageHeightDesktop,
        pageHeightMobile: studio.pageHeightMobile,
        overlayElements: studio.overlayElements,
      };

      const slug = slugify(name);
      const key = `custom_${slug}_${Date.now()}`;

      const { error } = await supabase.from('site_templates').insert({
        name,
        slug,
        template_key: key,
        description: `Template personnalise : ${name}`,
        category: 'Personnalise',
        is_default: false,
        is_visible: true,
        config,
      });
      if (error) throw error;

      setTemplateModalOpen(false);
      onTemplateCreated?.();
    } finally {
      setTemplateSaving(false);
    }
  }, [studio, onTemplateCreated]);

  if (!templateKey || !editorOpen) {
    return (
      <StudioEntryPage
        t={t}
        onOpenEditor={() => onEditorOpenChange(true)}
        onGoToTemplates={() => onTabChange('templates')}
        hasTemplate={!!templateKey}
        isPublished={studio.isPublished}
      />
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
  const handleSelectElement = (id: string | null) => {
    setSelectedElementId(id);
    setLeftPanel(id ? 'element-settings' : 'bg-mode');
  };
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditorOpenChange(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: t.surface.secondary,
              border: `1px solid ${t.surface.border}`,
              color: t.text.secondary,
            }}
          >
            <ArrowLeft className="w-3 h-3" />
            Retour
          </button>
          <div className="flex-1">
        <StudioToolbar
          previewMode={previewMode} onPreviewModeChange={setPreviewMode}
          onFullscreen={() => setFullscreen(true)} publicUrl={publicUrl} t={t}
          hasUnsavedChanges={studio.hasUnsavedChanges} isSaving={studio.isSaving}
          isPublished={studio.isPublished} isPublishing={studio.isPublishing}
          onSaveDraft={handleSaveDraft} onPublish={() => setPublishModalOpen(true)}
          onSaveAsTemplate={() => setTemplateModalOpen(true)}
          lastSavedAt={studio.lastSavedAt} lastPublishedAt={studio.lastPublishedAt} templateKey={templateKey}
        />
          </div>
        </div>
        <div className="flex gap-2 flex-1 min-h-0 rounded-xl overflow-hidden">
          <div className="w-72 flex-shrink-0 rounded-xl overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.55), rgba(15, 23, 42, 0.65))',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.30)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          }}>
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
              overlayElements={studio.overlayElements}
              onAddOverlayElement={studio.addOverlayElement}
              onUpdateOverlayElement={studio.updateOverlayElement}
              onRemoveOverlayElement={studio.removeOverlayElement}
              selectedElementId={selectedElementId}
              onSelectElement={handleSelectElement}
              freeDragId={freeDragId}
              onToggleFreeDrag={setFreeDragId}
            />
          </div>
          <div className="flex-1 rounded-xl overflow-hidden min-w-0" style={{ background: '#0a0e17', border: `1px solid ${t.surface.border}` }}>
            <StudioPreview
              templateKey={templateKey} previewMode={previewMode} t={t}
              canvasBg={effectiveBgForPreview} gradient={effectiveGradientForPreview}
              onGradientChange={setGradient} pageHeight={currentPageHeight}
              overlayElements={studio.overlayElements}
              selectedElementId={selectedElementId}
              onSelectElement={handleSelectElement}
              freeDragId={freeDragId}
              onUpdateOverlayElement={studio.updateOverlayElement}
            />
          </div>
          <StudioRightPanel t={t} />
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex-1 min-h-0">
        <div className="rounded-xl overflow-hidden h-full" style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.55), rgba(15, 23, 42, 0.65))',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.30)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        }}>
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

      <SaveAsTemplateModal
        isOpen={templateModalOpen}
        isSaving={templateSaving}
        onSave={handleSaveAsTemplate}
        onClose={() => setTemplateModalOpen(false)}
        t={t}
      />
    </div>
  );
}
