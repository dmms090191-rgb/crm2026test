import { type ReactNode } from 'react';
import CalquerLogoCanvas from './CalquerLogoCanvas';
import type { CanvasHandle } from './CalquerLogoCanvas';
import { bgConfigToCss } from './calquer-logo-types';
import type { BgConfig } from './calquer-logo-types';
import type { Ref } from 'react';
import type { CalquerTab } from './CalquerLogoTabBar';

interface Props {
  renderPanel: () => ReactNode;
  canvasRef: Ref<CanvasHandle>;
  displayUrl: string | null;
  zoom: number;
  setZoom: (z: number) => void;
  panX: number;
  panY: number;
  handlePanChange: (x: number, y: number) => void;
  imageUrl: string | null; transformedUrl: string | null; bgConfig: BgConfig; showTransformed: boolean;
  activeTab: CalquerTab;
  ciPipetteActive: boolean;
  handleCiPipetteClick: (x: number, y: number) => void;
  ciPreviewUrl: string | null;
}

/** Zone centrale : panneau lateral + canvas. Extrait tel quel, aucun calcul modifie. */
export default function CalquerLogoStage({
  renderPanel, canvasRef, displayUrl, zoom, setZoom, panX, panY, handlePanChange,
  imageUrl, transformedUrl, bgConfig, showTransformed, activeTab, ciPipetteActive,
  handleCiPipetteClick, ciPreviewUrl,
}: Props) {
  return (
      <div className="flex flex-1 min-h-0">
        {renderPanel()}
        <CalquerLogoCanvas ref={canvasRef} imageUrl={displayUrl} zoom={zoom} onZoomChange={setZoom}
          hasOverlay={false} overlayOpacity={0.5} inverted={false}
          onSwap={() => {}} panX={panX} panY={panY} onPanChange={handlePanChange}
          splitView={false} originalUrl={imageUrl} transformedUrl={transformedUrl}
          transformedBg={bgConfigToCss(bgConfig)} showTransformed={showTransformed}
          showMaskOverlay={false} mask={{ tool: 'rectangle', mode: 'supprimer', opacity: 60, size: 20, strokeColor: '#ef4444', shapes: [], selectedId: null, folders: [] }}
          moveMode={false}
          onMaskAddShape={() => {}} onMaskSelectShape={() => {}} onMaskMoveShape={() => {}} onMaskDeleteSelected={() => {}}
          pipetteActive={activeTab === 'logo' && ciPipetteActive}
          onPipetteClick={handleCiPipetteClick}
          selectionPreviewUrl={activeTab === 'logo' ? ciPreviewUrl : null}
        />
      </div>
  );
}
