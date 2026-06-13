import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { ImageOff } from 'lucide-react';
import CalquerLogoLayerBar from './CalquerLogoLayerBar';
import CalquerLogoMaskOverlay from './CalquerLogoMaskOverlay';
import type { MaskState, MaskShape } from './calquer-logo-types';

interface Props {
  imageUrl: string | null;
  zoom: number;
  onZoomChange: (z: number) => void;
  hasOverlay: boolean;
  overlayOpacity: number;
  inverted: boolean;
  onSwap: () => void;
  panX: number;
  panY: number;
  onPanChange: (x: number, y: number) => void;
  splitView: boolean;
  originalUrl: string | null;
  transformedUrl: string | null;
  transformedBg: string;
  showTransformed: boolean;
  showMaskOverlay: boolean;
  mask: MaskState;
  moveMode: boolean;
  onMaskAddShape: (s: MaskShape) => void;
  onMaskSelectShape: (id: string | null) => void;
  onMaskMoveShape: (id: string, x: number, y: number) => void;
  onMaskDeleteSelected: () => void;
}

export interface CanvasHandle {
  getImageRect: () => { x: number; y: number; w: number; h: number } | null;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.08;

const CalquerLogoCanvas = forwardRef<CanvasHandle, Props>(function CalquerLogoCanvas({
  imageUrl, zoom, onZoomChange, hasOverlay, overlayOpacity,
  inverted, onSwap, panX, panY, onPanChange,
  splitView, originalUrl, transformedUrl, transformedBg, showTransformed,
  showMaskOverlay, mask, moveMode, onMaskAddShape, onMaskSelectShape, onMaskMoveShape, onMaskDeleteSelected,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useImperativeHandle(ref, () => ({
    getImageRect: () => {
      const img = imgRef.current;
      if (!img) return null;
      const rect = img.getBoundingClientRect();
      const container = containerRef.current;
      if (!container) return null;
      const cRect = container.getBoundingClientRect();
      return { x: rect.left - cRect.left, y: rect.top - cRect.top, w: rect.width, h: rect.height };
    },
  }));

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(zoom + delta * (1 + zoom * 0.3)).toFixed(3)));
    onZoomChange(next);
  }, [zoom, onZoomChange]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => { e.preventDefault(); }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return;
    e.preventDefault();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onPanChange(panX + dx, panY + dy);
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 2 && dragging.current) { dragging.current = false; setIsDragging(false); }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [panX, panY, onPanChange]);

  if (!imageUrl && !splitView) {
    return <div className="flex-1 flex items-center justify-center" style={{ background: checkerBg() }}><EmptyState /></div>;
  }

  if (splitView && originalUrl && transformedUrl) {
    return (
      <div ref={containerRef} onWheel={handleWheel} onContextMenu={handleContextMenu} onMouseDown={handleMouseDown}
        className="flex-1 overflow-hidden relative flex" style={{ cursor: isDragging ? 'grabbing' : 'default' }}>
        <SplitPane label="Original" src={originalUrl} zoom={zoom} panX={panX} panY={panY} />
        <div className="w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <SplitPane label="Transforme" src={transformedUrl} zoom={zoom} panX={panX} panY={panY} bg={transformedBg} />
      </div>
    );
  }

  const logoLayer = (
    <img ref={imgRef} src={imageUrl!} alt="Logo reference"
      className="block max-w-[80vw] max-h-[70vh] object-contain select-none pointer-events-none"
      draggable={false} />
  );

  const overlayLayer = hasOverlay ? (
    <div className="absolute inset-0 pointer-events-none"
      style={{ background: `rgba(255, 255, 255, ${1 - overlayOpacity})`, transition: 'background 0.2s ease' }} />
  ) : null;

  return (
    <div ref={containerRef} data-calquer-canvas
      onWheel={handleWheel} onContextMenu={handleContextMenu} onMouseDown={showMaskOverlay ? undefined : handleMouseDown}
      className="flex-1 overflow-hidden relative"
      style={{ background: (showTransformed && transformedBg !== 'checker') ? transformedBg : checkerBg(), cursor: isDragging ? 'grabbing' : (showMaskOverlay ? 'crosshair' : 'default') }}>

      <div className="min-h-full flex items-center justify-center p-8"
        style={{ transform: `translate(${panX}px, ${panY}px)` }}>
        <div className="relative"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}>
          {inverted ? (<>{overlayLayer && <div className="absolute inset-0" style={{ background: `rgba(255, 255, 255, ${1 - overlayOpacity})` }} />}{logoLayer}</>) : (<>{logoLayer}{overlayLayer}</>)}
        </div>
      </div>

      {showMaskOverlay && (
        <CalquerLogoMaskOverlay mask={mask} moveMode={moveMode}
          onAddShape={onMaskAddShape} onSelectShape={onMaskSelectShape}
          onMoveShape={onMaskMoveShape} onDeleteSelected={onMaskDeleteSelected} />
      )}

      <CalquerLogoLayerBar hasOverlay={hasOverlay} inverted={inverted} onSwap={onSwap} />
    </div>
  );
});

export default CalquerLogoCanvas;

function EmptyState() {
  return (
    <div className="text-center space-y-4 max-w-sm px-6">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
        style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)' }}>
        <ImageOff className="w-8 h-8" style={{ color: 'rgba(148,163,184,0.4)' }} />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'rgba(226,232,240,0.6)' }}>Aucun logo charge</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>Uploadez une image depuis le panneau de gauche pour commencer.</p>
      </div>
    </div>
  );
}

function SplitPane({ label, src, zoom, panX, panY, bg }: { label: string; src: string; zoom: number; panX: number; panY: number; bg?: string }) {
  const bgStyle = bg && bg !== 'checker' ? bg : checkerBg();
  return (
    <div className="flex-1 overflow-hidden relative" style={{ background: bgStyle }}>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider"
        style={{ background: 'rgba(15,23,42,0.8)', color: 'rgba(226,232,240,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
        {label}
      </div>
      <div className="min-h-full flex items-center justify-center p-8" style={{ transform: `translate(${panX}px, ${panY}px)` }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}>
          <img src={src} alt={label} className="block max-w-[40vw] max-h-[70vh] object-contain select-none pointer-events-none" draggable={false} />
        </div>
      </div>
    </div>
  );
}

function checkerBg() {
  return `repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, rgba(0,0,0,0.08) 0% 50%) 0 0 / 32px 32px, rgb(15 23 42)`;
}
