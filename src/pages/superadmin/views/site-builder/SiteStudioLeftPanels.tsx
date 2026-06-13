import { Layers, MousePointerClick, Type, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { GradientConfig, BgMode } from './studio/studioSectionTypes';
import type { OverlayElement } from './studio/overlayElementTypes';
import { createDefaultButton, createDefaultText } from './studio/overlayElementTypes';
import StudioBackgroundPanel from './studio/StudioBackgroundPanel';
import StudioGradientPanel from './studio/StudioGradientPanel';
import StudioBackgroundModePanel from './studio/StudioBackgroundModePanel';
import StudioPageHeightPanel from './studio/StudioPageHeightPanel';
import StudioElementSettings from './studio/StudioElementSettings';
import { PanelHeader, CollapsibleCategory, ElementItemButton, ElementListItem } from './SiteStudioLeftPanelParts';

export type LeftPanel = 'bg-mode' | 'solid' | 'gradient' | 'element-settings';

interface Props {
  leftPanel: LeftPanel;
  isMobileMode: boolean;
  t: ThemeTokens;
  currentPageHeight: number;
  setPageHeight: (h: number) => void;
  bgMode: BgMode;
  currentBgColor: string;
  currentGradient: GradientConfig | null;
  onNavigate: (panel: 'solid' | 'gradient') => void;
  bgAccordionOpen: boolean;
  onToggleBgAccordion: (open: boolean) => void;
  onBackToBgMode: () => void;
  onBgChange: (color: string) => void;
  onBgReset: () => void;
  onActivateSolid: () => void;
  onDeactivate: () => void;
  onGradientChange: (g: GradientConfig | null) => void;
  onGradientReset: () => void;
  onActivateGradient: () => void;
  overlayElements: OverlayElement[];
  onAddOverlayElement: (el: OverlayElement) => void;
  onUpdateOverlayElement: (id: string, partial: Partial<OverlayElement>) => void;
  onRemoveOverlayElement: (id: string) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  freeDragId: string | null;
  onToggleFreeDrag: (id: string | null) => void;
}

export default function SiteStudioLeftPanels({
  leftPanel, isMobileMode, t,
  currentPageHeight, setPageHeight,
  bgMode, currentBgColor, currentGradient,
  onNavigate, bgAccordionOpen, onToggleBgAccordion,
  onBackToBgMode,
  onBgChange, onBgReset, onActivateSolid, onDeactivate,
  onGradientChange, onGradientReset, onActivateGradient,
  overlayElements, onAddOverlayElement, onUpdateOverlayElement, onRemoveOverlayElement,
  selectedElementId, onSelectElement,
  freeDragId, onToggleFreeDrag,
}: Props) {
  const modeLabel = isMobileMode ? 'mobile' : 'desktop';

  if (leftPanel === 'solid') {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader onBack={onBackToBgMode} title="Couleur unie" subtitle={`Mode ${modeLabel}`} t={t} />
        <div className="flex-1 min-h-0">
          <StudioBackgroundPanel
            currentColor={currentBgColor}
            onChange={onBgChange}
            onReset={onBgReset}
            isActive={bgMode === 'solid'}
            onActivate={onActivateSolid}
            onDeactivate={onDeactivate}
            t={t}
          />
        </div>
      </div>
    );
  }

  if (leftPanel === 'gradient') {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader onBack={onBackToBgMode} title="Degrade" subtitle={`Mode ${modeLabel}`} t={t} />
        <div className="flex-1 min-h-0">
          <StudioGradientPanel
            gradient={currentGradient}
            onChange={onGradientChange}
            onReset={onGradientReset}
            isActive={bgMode === 'gradient'}
            onActivate={onActivateGradient}
            onDeactivate={onDeactivate}
            t={t}
          />
        </div>
      </div>
    );
  }

  if (leftPanel === 'element-settings' && selectedElementId) {
    const element = overlayElements.find(el => el.id === selectedElementId);
    if (element) {
      const typeLabel = element.type === 'button' ? 'Bouton' : element.type === 'text' ? 'Texte' : 'Image';
      return (
        <div className="flex flex-col h-full">
          <PanelHeader
            onBack={() => onSelectElement(null)}
            title={typeLabel}
            subtitle={`Mode ${modeLabel}`}
            t={t}
          />
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
            <StudioElementSettings
              element={element}
              onUpdate={(id, partial) => onUpdateOverlayElement(id, partial)}
              onRemove={(id) => { onRemoveOverlayElement(id); onSelectElement(null); }}
              t={t}
              freeDragId={freeDragId}
              onToggleFreeDrag={onToggleFreeDrag}
            />
          </div>
        </div>
      );
    }
  }

  const handleAddButton = () => {
    const btn = createDefaultButton();
    onAddOverlayElement(btn);
    onSelectElement(btn.id);
  };

  const handleAddText = () => {
    const txt = createDefaultText();
    onAddOverlayElement(txt);
    onSelectElement(txt.id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <CollapsibleCategory
          t={t}
          label="Page & fond"
          icon={<Layers className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />}
          accentColor="#3b82f6"
          accentBg="rgba(59,130,246,0.08)"
          accentBorder="rgba(59,130,246,0.18)"
        >
          <StudioPageHeightPanel
            height={currentPageHeight}
            onChange={setPageHeight}
            isMobile={isMobileMode}
            t={t}
          />
          <StudioBackgroundModePanel
            bgMode={bgMode}
            solidColor={currentBgColor}
            gradient={currentGradient}
            onNavigate={onNavigate}
            isMobile={isMobileMode}
            t={t}
            open={bgAccordionOpen}
            onToggle={onToggleBgAccordion}
          />
        </CollapsibleCategory>

        <CollapsibleCategory
          t={t}
          label="Elements"
          icon={<Sparkles className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />}
          accentColor="#f59e0b"
          accentBg="rgba(245,158,11,0.08)"
          accentBorder="rgba(245,158,11,0.18)"
          defaultOpen={true}
        >
          <ElementItemButton
            label="Bouton connexion"
            icon={<MousePointerClick className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />}
            onClick={handleAddButton}
            accentColor="245,158,11"
            t={t}
          />
          <ElementItemButton
            label="Texte"
            icon={<Type className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />}
            onClick={handleAddText}
            accentColor="14,165,233"
            t={t}
          />
          <ElementItemButton
            label="Image"
            icon={<ImageIcon className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />}
            onClick={() => {}}
            disabled
            badge="bientot"
            accentColor="139,92,246"
            t={t}
          />

          {overlayElements.length > 0 && (
            <div className="pt-1 space-y-1">
              <p className="text-[8px] font-semibold px-1" style={{ color: t.text.quaternary }}>
                Elements ajoutes ({overlayElements.length})
              </p>
              {overlayElements.map(el => (
                <ElementListItem
                  key={el.id}
                  element={el}
                  onClick={() => onSelectElement(el.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </CollapsibleCategory>
      </div>
    </div>
  );
}
