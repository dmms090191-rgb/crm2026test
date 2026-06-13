import { useState, useEffect, useRef, useCallback } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { PreviewMode } from './StudioToolbar';
import type { GradientConfig } from './studioSectionTypes';
import { DESKTOP_WIDTH, MOBILE_WIDTH, DEFAULT_PAGE_HEIGHT, DEFAULT_MOBILE_HEIGHT } from './studioSectionTypes';
import { getCanvasBackground } from './gradientHelpers';
import GradientGuideLine from './GradientGuideLine';
import GradientBalanceLine from './GradientBalanceLine';
import type { OverlayElement, OverlayTextConfig } from './overlayElementTypes';
import { OverlayButtonElement, OverlayTextElement } from './OverlayElements';

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

interface Props {
  templateKey: string | null;
  previewMode: PreviewMode;
  t: ThemeTokens;
  canvasBg?: string;
  gradient?: GradientConfig | null;
  onGradientChange?: (gradient: GradientConfig) => void;
  pageHeight?: number;
  overlayElements?: OverlayElement[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  freeDragId?: string | null;
  onUpdateOverlayElement?: (id: string, partial: Partial<OverlayElement>) => void;
}

export default function StudioPreview({
  previewMode, canvasBg, gradient, onGradientChange, pageHeight,
  overlayElements = [], selectedElementId, onSelectElement,
  freeDragId, onUpdateOverlayElement,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const dragRef = useRef<{ id: string; startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  const isMobile = previewMode === 'mobile';
  const refW = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
  const refH = pageHeight ?? (isMobile ? DEFAULT_MOBILE_HEIGHT : DEFAULT_PAGE_HEIGHT);
  const label = isMobile ? `Mobile ${refW} x ${refH}` : `Desktop ${refW} x ${refH}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const pad = isMobile ? 48 : 64;
      const availW = el.clientWidth - pad;
      if (availW <= 0) return;
      setScale(Math.min(availW / refW, 1));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [refW, isMobile]);

  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    const el = overlayElements.find(x => x.id === id);
    if (!el) return;
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: el.leftPercent,
      startTop: el.topPercent,
    };
  }, [overlayElements]);

  useEffect(() => {
    if (!freeDragId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !canvasRef.current) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const dxPercent = (dx / scale / refW) * 100;
      const dyPercent = (dy / scale / refH) * 100;
      const newLeft = Math.max(0, Math.min(100, drag.startLeft + dxPercent));
      const newTop = Math.max(0, Math.min(100, drag.startTop + dyPercent));
      onUpdateOverlayElement?.(drag.id, { leftPercent: newLeft, topPercent: newTop } as Partial<OverlayElement>);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [freeDragId, scale, refW, refH, onUpdateOverlayElement]);

  const displayGradient = gradient ?? null;
  const effectiveBg = getCanvasBackground(canvasBg || '#ffffff', displayGradient);
  const isLightBg = canvasBg ? isLight(canvasBg) : false;
  const overlayText = isLightBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
  const overlaySubtext = isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
  const Icon = isMobile ? Smartphone : Monitor;

  const scaledW = Math.round(refW * scale);
  const scaledH = Math.round(refH * scale);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center overflow-y-auto overflow-x-hidden relative"
      style={{
        background: `
          radial-gradient(circle at 50% 50%, rgba(14,165,233,0.02) 0%, transparent 70%),
          linear-gradient(180deg, #060a14 0%, #0a0e17 50%, #060a14 100%)
        `,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 z-10"
        style={{ pointerEvents: 'none' }}
      >
        <span
          className="text-[9px] font-mono font-medium tracking-wider px-3 py-1 rounded-full"
          style={{
            color: 'rgba(148,163,184,0.5)',
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(148,163,184,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          width: scaledW,
          height: scaledH,
          position: 'relative',
          flexShrink: 0,
          marginTop: 32,
        }}
      >
        <div
          className="absolute -inset-1 rounded-2xl"
          style={{
            boxShadow: isMobile
              ? '0 0 60px rgba(14,165,233,0.06), 0 8px 40px rgba(0,0,0,0.5)'
              : '0 0 80px rgba(14,165,233,0.04), 0 12px 60px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            width: refW,
            height: refH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            borderRadius: isMobile ? '2rem' : '0.75rem',
            overflow: 'hidden',
            border: isMobile
              ? '8px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(148,163,184,0.12)',
            boxSizing: 'border-box',
          }}
        >
          <div
            ref={canvasRef}
            className="relative w-full h-full transition-colors duration-300"
            style={{ background: effectiveBg }}
            onClick={() => onSelectElement?.(null)}
          >
            {displayGradient?.showBalanceLine && onGradientChange && (
              <GradientBalanceLine gradient={displayGradient} onChange={onGradientChange} />
            )}
            {displayGradient?.showGuideLine && onGradientChange && (
              <GradientGuideLine gradient={displayGradient} onChange={onGradientChange} />
            )}

            {overlayElements.length > 0 ? (
              overlayElements.map(el => {
                const isDraggable = freeDragId === el.id;
                if (el.type === 'button') {
                  return (
                    <OverlayButtonElement
                      key={el.id} el={el}
                      selected={selectedElementId === el.id}
                      onSelect={() => onSelectElement?.(el.id)}
                      draggable={isDraggable}
                      onDragStart={e => handleDragStart(el.id, e)}
                    />
                  );
                }
                if (el.type === 'text') {
                  return (
                    <OverlayTextElement
                      key={el.id} el={el as OverlayTextConfig}
                      selected={selectedElementId === el.id}
                      onSelect={() => onSelectElement?.(el.id)}
                      draggable={isDraggable}
                      onDragStart={e => handleDragStart(el.id, e)}
                    />
                  );
                }
                return null;
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 px-6 text-center pt-16 relative z-10">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <Icon className="w-7 h-7" style={{ color: overlayText }} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: overlayText }}>
                    Zone d'edition {isMobile ? 'mobile' : 'desktop'}
                  </p>
                  <p className="text-[11px] leading-relaxed max-w-[260px]" style={{ color: overlaySubtext }}>
                    Ajoutez des elements depuis le panneau de gauche.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 right-0 py-2 px-3 z-10"
        style={{ pointerEvents: 'none' }}
      >
        <span
          className="text-[8px] font-mono font-medium"
          style={{ color: 'rgba(148,163,184,0.3)' }}
        >
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}
