import { useState, useRef, useEffect } from 'react';
import { Smartphone, Plus } from 'lucide-react';
import type { GradientConfig } from './studioSectionTypes';
import { DEFAULT_MOBILE_HEIGHT, MOBILE_WIDTH } from './studioSectionTypes';
import GradientBalanceLine from './GradientBalanceLine';
import GradientGuideLine from './GradientGuideLine';

interface Props {
  effectiveBg: string;
  gradient: GradientConfig | null;
  onGradientChange: ((g: GradientConfig | null) => void) | null;
  light: boolean;
  textColor: string;
  subtextColor: string;
  pageHeight?: number;
}

export default function MobilePreviewPane({
  effectiveBg, gradient, onGradientChange, light, textColor, subtextColor, pageHeight,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const refW = MOBILE_WIDTH;
  const refH = pageHeight ?? DEFAULT_MOBILE_HEIGHT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const pad = 40;
      const availW = el.clientWidth - pad;
      if (availW <= 0) return;
      setScale(Math.min(availW / refW, 1));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [refW]);

  const scaledW = Math.round(refW * scale);
  const scaledH = Math.round(refH * scale);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col items-center overflow-y-auto overflow-x-hidden relative"
      style={{
        background: 'linear-gradient(180deg, #060a14 0%, #0a0e17 50%, #060a14 100%)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-1.5 z-10"
        style={{ pointerEvents: 'none' }}
      >
        <span
          className="text-[8px] font-mono font-medium tracking-wider px-2.5 py-0.5 rounded-full"
          style={{
            color: 'rgba(148,163,184,0.5)',
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(148,163,184,0.08)',
          }}
        >
          Mobile {refW} x {refH}
        </span>
      </div>

      <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0, marginTop: 24 }}>
        <div
          className="absolute -inset-1 rounded-[2rem]"
          style={{
            boxShadow: '0 0 60px rgba(14,165,233,0.06), 0 8px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            width: refW,
            height: refH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            borderRadius: '2rem',
            overflow: 'hidden',
            border: '8px solid rgba(255,255,255,0.08)',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="w-full h-full relative flex flex-col items-center justify-start pt-12 gap-4 px-6 text-center transition-colors duration-300"
            style={{ background: effectiveBg }}
          >
            {gradient?.showBalanceLine && onGradientChange && (
              <GradientBalanceLine gradient={gradient} onChange={(g) => onGradientChange(g)} />
            )}
            {gradient?.showGuideLine && onGradientChange && (
              <GradientGuideLine gradient={gradient} onChange={(g) => onGradientChange(g)} />
            )}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <Smartphone className="w-6 h-6" style={{ color: textColor }} />
            </div>
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: textColor }}>
                Zone d'edition mobile
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: subtextColor }}>
                Modifiez l'arriere-plan ci-dessus.
              </p>
            </div>
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-semibold opacity-40 cursor-not-allowed"
              style={{
                background: light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                color: textColor,
              }}
            >
              <Plus className="w-3 h-3" />
              Ajouter un element
            </button>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 right-0 py-1.5 px-2.5 z-10"
        style={{ pointerEvents: 'none' }}
      >
        <span className="text-[8px] font-mono font-medium" style={{ color: 'rgba(148,163,184,0.3)' }}>
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}
