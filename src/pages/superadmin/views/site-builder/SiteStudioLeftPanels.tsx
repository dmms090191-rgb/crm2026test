import { ArrowLeft } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { GradientConfig, BgMode } from './studio/studioSectionTypes';
import StudioBackgroundPanel from './studio/StudioBackgroundPanel';
import StudioGradientPanel from './studio/StudioGradientPanel';
import StudioBackgroundModePanel from './studio/StudioBackgroundModePanel';
import StudioPageHeightPanel from './studio/StudioPageHeightPanel';

export type LeftPanel = 'bg-mode' | 'solid' | 'gradient';

interface PanelHeaderProps {
  onBack: () => void;
  title: string;
  subtitle: string;
  t: ThemeTokens;
}

function PanelHeader({ onBack, title, subtitle, t }: PanelHeaderProps) {
  return (
    <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
      <button
        onClick={onBack}
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
      >
        <ArrowLeft className="w-3 h-3" />
      </button>
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-bold" style={{ color: t.text.primary }}>{title}</h3>
        <p className="text-[9px]" style={{ color: t.text.quaternary }}>{subtitle}</p>
      </div>
    </div>
  );
}

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
}

export default function SiteStudioLeftPanels({
  leftPanel, isMobileMode, t,
  currentPageHeight, setPageHeight,
  bgMode, currentBgColor, currentGradient,
  onNavigate, bgAccordionOpen, onToggleBgAccordion,
  onBackToBgMode,
  onBgChange, onBgReset, onActivateSolid, onDeactivate,
  onGradientChange, onGradientReset, onActivateGradient,
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
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
      </div>
    </div>
  );
}
