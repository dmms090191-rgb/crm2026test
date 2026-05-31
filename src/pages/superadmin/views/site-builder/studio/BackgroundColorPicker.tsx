import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Bookmark } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import { hsvToHex, hexToHsv } from './backgroundPanelHelpers';

interface Props {
  currentColor: string;
  onApplyColor: (color: string) => void;
  onSaveToCustom: () => void;
  onClose: () => void;
  t: ThemeTokens;
}

export default function BackgroundColorPicker({ currentColor, onApplyColor, onSaveToCustom, onClose, t }: Props) {
  const [hsv, setHsv] = useState(() => hexToHsv(currentColor));
  const satFieldRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const draggingSat = useRef(false);
  const draggingHue = useRef(false);

  useEffect(() => {
    setHsv(hexToHsv(currentColor));
  }, [currentColor]);

  const applyFromHsv = useCallback((next: { h: number; s: number; v: number }) => {
    setHsv(next);
    onApplyColor(hsvToHex(next.h, next.s, next.v));
  }, [onApplyColor]);

  const updateFromSatField = useCallback((clientX: number, clientY: number) => {
    const el = satFieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    applyFromHsv({ ...hsv, s, v });
  }, [hsv, applyFromHsv]);

  const updateFromHueBar = useCallback((clientX: number) => {
    const el = hueBarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = Math.max(0, Math.min(359.99, ((clientX - rect.left) / rect.width) * 360));
    applyFromHsv({ ...hsv, h });
  }, [hsv, applyFromHsv]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingSat.current) updateFromSatField(e.clientX, e.clientY);
      if (draggingHue.current) updateFromHueBar(e.clientX);
    };
    const onUp = () => {
      draggingSat.current = false;
      draggingHue.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updateFromSatField, updateFromHueBar]);

  const hueColor = hsvToHex(hsv.h, 1, 1);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: t.surface.primary,
        border: `1px solid ${t.surface.border}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      }}
    >
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <span className="text-[10px] font-semibold" style={{ color: t.text.secondary }}>Choisir une couleur</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSaveToCustom}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all hover:scale-[1.04] active:scale-[0.96]"
            style={{
              background: 'rgba(14,165,233,0.08)',
              border: '1px solid rgba(14,165,233,0.2)',
              color: '#0ea5e9',
            }}
            title="Enregistrer dans Mes couleurs"
          >
            <Bookmark className="w-3 h-3" />
            Enregistrer
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
            title="Fermer"
          >
            <X className="w-3.5 h-3.5" style={{ color: t.text.quaternary }} />
          </button>
        </div>
      </div>

      <div className="px-3 pt-3">
        <div
          ref={satFieldRef}
          className="relative w-full rounded-lg cursor-crosshair select-none"
          style={{
            height: 140,
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
            border: `1px solid ${t.surface.border}`,
          }}
          onPointerDown={e => {
            draggingSat.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromSatField(e.clientX, e.clientY);
          }}
        >
          <div
            className="absolute w-4 h-4 rounded-full pointer-events-none"
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              transform: 'translate(-50%, -50%)',
              border: '2px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.3)',
              background: currentColor,
            }}
          />
        </div>
      </div>

      <div className="px-3 pt-2.5 pb-3">
        <div
          ref={hueBarRef}
          className="relative w-full h-3.5 rounded-full cursor-pointer select-none"
          style={{
            background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
            border: `1px solid ${t.surface.border}`,
          }}
          onPointerDown={e => {
            draggingHue.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromHueBar(e.clientX);
          }}
        >
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full pointer-events-none"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              transform: 'translate(-50%, -50%)',
              border: '2px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.25)',
              background: hueColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
