import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, Smartphone, Minimize2, Save, Rocket, Loader2, Check, Plus } from 'lucide-react';
import type { GradientConfig } from './studioSectionTypes';
import { DESKTOP_WIDTH, MOBILE_WIDTH, DEFAULT_PAGE_HEIGHT, DEFAULT_MOBILE_HEIGHT } from './studioSectionTypes';
import { getCanvasBackground } from './gradientHelpers';
import GradientBalanceLine from './GradientBalanceLine';
import GradientGuideLine from './GradientGuideLine';

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

type PreviewMode = 'desktop' | 'mobile';

interface Props {
  onExit: () => void;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
  canvasBg: string;
  gradient: GradientConfig | null;
  onGradientChange: (g: GradientConfig) => void;
  pageHeightDesktop: number;
  pageHeightMobile: number;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export default function StudioFullscreenOverlay({
  onExit, previewMode, onPreviewModeChange,
  canvasBg, gradient, onGradientChange,
  pageHeightDesktop, pageHeightMobile,
  hasUnsavedChanges, isSaving, isPublishing,
  onSaveDraft, onPublish,
}: Props) {
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const isMobile = previewMode === 'mobile';
  const refW = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
  const refH = isMobile
    ? (pageHeightMobile || DEFAULT_MOBILE_HEIGHT)
    : (pageHeightDesktop || DEFAULT_PAGE_HEIGHT);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onExit();
  }, [onExit]);

  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [handleEsc]);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const compute = () => {
      const padX = 64;
      const availW = el.clientWidth - padX;
      if (availW <= 0) return;
      setScale(Math.min(availW / refW, 1));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [refW]);

  const handleSave = () => {
    onSaveDraft();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const effectiveBg = getCanvasBackground(canvasBg || '#ffffff', gradient);
  const light = canvasBg ? isLight(canvasBg) : false;
  const textColor = light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
  const subtextColor = light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
  const Icon = isMobile ? Smartphone : Monitor;

  const scaledW = Math.round(refW * scale);
  const scaledH = Math.round(refH * scale);
  const canPublish = !hasUnsavedChanges && !isPublishing;

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 99999, background: '#030712' }}
    >
      {/* Compact top bar */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{
          background: 'rgba(3,7,18,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['desktop', 'mobile'] as const).map(mode => {
            const active = previewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onPreviewModeChange(mode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all"
                style={{
                  background: active ? 'rgba(14,165,233,0.12)' : 'transparent',
                  border: active ? '1px solid rgba(14,165,233,0.25)' : '1px solid transparent',
                  color: active ? '#0ea5e9' : 'rgba(255,255,255,0.4)',
                }}
              >
                {mode === 'desktop' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                {mode === 'desktop' ? 'Desktop' : 'Mobile'}
              </button>
            );
          })}
        </div>

        <span
          className="text-[9px] font-mono font-medium tracking-wider px-3 py-1 rounded-full hidden sm:inline-block"
          style={{ color: 'rgba(148,163,184,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}
        >
          {refW} x {refH} &middot; {Math.round(scale * 100)}%
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{
              background: hasUnsavedChanges ? 'rgba(14,165,233,0.1)' : 'rgba(255,255,255,0.04)',
              border: hasUnsavedChanges ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(255,255,255,0.06)',
              color: hasUnsavedChanges ? '#0ea5e9' : 'rgba(255,255,255,0.25)',
              opacity: hasUnsavedChanges ? 1 : 0.5,
              cursor: hasUnsavedChanges ? 'pointer' : 'default',
            }}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> :
             savedFeedback && !hasUnsavedChanges ? <Check className="w-3 h-3" /> :
             <Save className="w-3 h-3" />}
            <span className="hidden sm:inline">
              {isSaving ? 'Sauvegarde...' : savedFeedback && !hasUnsavedChanges ? 'OK' : 'Enregistrer'}
            </span>
          </button>

          <button
            onClick={onPublish}
            disabled={!canPublish}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              opacity: canPublish ? 1 : 0.4,
              cursor: canPublish ? 'pointer' : 'not-allowed',
            }}
          >
            {isPublishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
            <span className="hidden sm:inline">
              {isPublishing ? 'Publication...' : 'Publier'}
            </span>
          </button>

          <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} />

          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Quitter
          </button>
        </div>
      </div>

      {/* Canvas area -- takes all remaining space */}
      <div
        ref={canvasAreaRef}
        className="flex-1 flex flex-col items-center overflow-y-auto overflow-x-hidden"
        style={{
          background: `
            radial-gradient(circle at 50% 40%, rgba(14,165,233,0.03) 0%, transparent 60%),
            linear-gradient(180deg, #060a14 0%, #0a0e17 50%, #060a14 100%)
          `,
        }}
      >
        <div
          style={{
            width: scaledW,
            height: scaledH,
            position: 'relative',
            flexShrink: 0,
            marginTop: 24,
            marginBottom: 24,
          }}
        >
          <div
            className="absolute -inset-1 rounded-2xl"
            style={{
              boxShadow: isMobile
                ? '0 0 80px rgba(14,165,233,0.08), 0 12px 60px rgba(0,0,0,0.6)'
                : '0 0 100px rgba(14,165,233,0.05), 0 16px 80px rgba(0,0,0,0.7)',
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
              className="relative w-full h-full flex flex-col items-center justify-start pt-16 transition-colors duration-300"
              style={{ background: effectiveBg }}
            >
              {gradient?.showBalanceLine && (
                <GradientBalanceLine gradient={gradient} onChange={onGradientChange} />
              )}
              {gradient?.showGuideLine && (
                <GradientGuideLine gradient={gradient} onChange={onGradientChange} />
              )}

              <div className="flex flex-col items-center justify-center gap-4 px-6 text-center relative z-10">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <Icon className="w-7 h-7" style={{ color: textColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: textColor }}>
                    Zone d'edition {isMobile ? 'mobile' : 'desktop'}
                  </p>
                  <p className="text-[11px] leading-relaxed max-w-[260px]" style={{ color: subtextColor }}>
                    Mode plein ecran
                  </p>
                </div>
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-semibold opacity-40 cursor-not-allowed"
                  style={{
                    background: light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
                    color: textColor,
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un element
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
