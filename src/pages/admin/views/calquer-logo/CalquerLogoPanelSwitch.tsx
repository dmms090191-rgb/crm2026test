import CalquerLogoPanel from './CalquerLogoPanel';
import CalquerLogoColorPanel from './CalquerLogoColorPanel';
import CalquerLogoColorLogoPanel from './CalquerLogoColorLogoPanel';
import type { CalquerTab } from './CalquerLogoTabBar';
import type { BgConfig, LogoColorConfig, ColorIsolationState } from './calquer-logo-types';

interface Props {
  activeTab: CalquerTab;
  bgConfig: BgConfig; setBgConfig: (v: BgConfig) => void;
  transformedUrl: string | null; iaSvgContent: string | null; imageUrl: string | null;
  logoColorConfig: LogoColorConfig;
  handleLogoColorChange: (cfg: LogoColorConfig) => void;
  handleLogoColorReset: () => void;
  handleUpload: () => void;
  ciState: ColorIsolationState; ciPipetteActive: boolean; ciApplying: boolean; ciHasResult: boolean;
  setCiPipetteActive: (fn: (v: boolean) => boolean) => void;
  handleCiToleranceChange: (t: number) => void;
  handleCiUndo: () => void;
  handleCiReset: () => void;
}

/** Choix du panneau lateral selon l'onglet actif. Extrait tel quel. */
export default function CalquerLogoPanelSwitch({
  activeTab, bgConfig, setBgConfig, transformedUrl, iaSvgContent, imageUrl, logoColorConfig,
  handleLogoColorChange, handleLogoColorReset, handleUpload,
  ciState, ciPipetteActive, ciApplying, ciHasResult, setCiPipetteActive,
  handleCiToleranceChange, handleCiUndo, handleCiReset,
}: Props) {
    if (activeTab === 'couleur') {
      return <CalquerLogoColorPanel bgConfig={bgConfig} onBgConfigChange={setBgConfig} hasTransformed={!!transformedUrl} />;
    }
    if (activeTab === 'couleur-logo') {
      return (
        <CalquerLogoColorLogoPanel
          hasContent={!!iaSvgContent || !!transformedUrl}
          logoColorConfig={logoColorConfig}
          onConfigChange={handleLogoColorChange}
          onReset={handleLogoColorReset}
        />
      );
    }
    return (
      <CalquerLogoPanel
        onUpload={handleUpload} hasImage={!!imageUrl}
        ciState={ciState} pipetteActive={ciPipetteActive}
        applying={ciApplying} hasResult={ciHasResult}
        onActivatePipette={() => setCiPipetteActive(v => !v)}
        onToleranceChange={handleCiToleranceChange}
        onUndo={handleCiUndo} onReset={handleCiReset}
      />
  );
}
