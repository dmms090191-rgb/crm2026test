import { useState } from 'react';
import { Ruler, Lock, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import { PAGE_HEIGHT_MIN, PAGE_HEIGHT_MAX, DESKTOP_WIDTH, MOBILE_WIDTH, DEFAULT_PAGE_HEIGHT, DEFAULT_MOBILE_HEIGHT } from './studioSectionTypes';

interface Props {
  height: number;
  onChange: (h: number) => void;
  isMobile: boolean;
  t: ThemeTokens;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export default function StudioPageHeightPanel({ height, onChange, isMobile, t }: Props) {
  const [open, setOpen] = useState(false);
  const fixedWidth = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;

  return (
    <div>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full group rounded-xl px-3 py-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: open
            ? 'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(5,150,105,0.02))'
            : t.surface.secondary,
          border: `1.5px solid ${open ? 'rgba(16,185,129,0.2)' : t.surface.border}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.06))',
              border: '1px solid rgba(16,185,129,0.15)',
            }}
          >
            <Ruler className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
          </div>
          <p className="flex-1 min-w-0 text-[11px] font-bold" style={{ color: t.text.primary }}>
            Taille page
          </p>
          {open
            ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ color: t.text.quaternary }} />
            : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ color: t.text.quaternary }} />
          }
        </div>
      </button>

      {open && (
        <div
          className="space-y-3 pl-2 pr-0.5 pt-2 pb-1"
          style={{ borderLeft: '2px solid rgba(16,185,129,0.12)', marginLeft: '18px' }}
        >
          {/* Width - read only */}
          <div>
            <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>
              Largeur
            </label>
            <div className="flex items-center gap-1.5">
              <div
                className="flex-1 flex items-center pl-2.5 pr-2.5 py-2 rounded-lg text-[11px] font-semibold"
                style={{
                  background: t.surface.secondary,
                  border: `1.5px solid ${t.surface.border}`,
                  color: t.text.quaternary,
                  opacity: 0.7,
                }}
              >
                <span className="flex-1">{fixedWidth}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold" style={{ color: t.text.quaternary }}>px</span>
                  <Lock className="w-2.5 h-2.5" style={{ color: t.text.quaternary }} />
                </div>
              </div>
            </div>
          </div>

          {/* Height - editable */}
          <HeightInput
            value={height}
            onChange={onChange}
            t={t}
          />

          {/* Reset */}
          {height !== (isMobile ? DEFAULT_MOBILE_HEIGHT : DEFAULT_PAGE_HEIGHT) && (
            <div className="flex justify-end pt-0.5">
              <button
                onClick={() => onChange(isMobile ? DEFAULT_MOBILE_HEIGHT : DEFAULT_PAGE_HEIGHT)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.18)',
                  color: '#10b981',
                }}
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset {isMobile ? DEFAULT_MOBILE_HEIGHT : DEFAULT_PAGE_HEIGHT}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeightInput({
  value, onChange, t,
}: {
  value: number;
  onChange: (h: number) => void;
  t: ThemeTokens;
}) {
  const [localVal, setLocalVal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const displayed = focused ? localVal : String(value);

  const commit = (raw: string) => {
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    onChange(clamp(num, PAGE_HEIGHT_MIN, PAGE_HEIGHT_MAX));
  };

  const handleBlur = () => {
    setFocused(false);
    commit(localVal);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '' || /^\d+$/.test(v)) {
      setLocalVal(v);
      const num = parseInt(v, 10);
      if (!isNaN(num) && num >= PAGE_HEIGHT_MIN && num <= PAGE_HEIGHT_MAX) {
        onChange(num);
      }
    }
  };

  return (
    <div>
      <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>
        Longueur de la page
      </label>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="numeric"
            value={displayed}
            onFocus={() => { setFocused(true); setLocalVal(String(value)); }}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={e => { if (e.key === 'Enter') handleBlur(); }}
            className="w-full pl-2.5 pr-8 py-2 rounded-lg text-[11px] font-semibold outline-none transition-all"
            style={{
              background: t.surface.secondary,
              border: `1.5px solid ${focused ? 'rgba(16,185,129,0.4)' : t.surface.border}`,
              color: t.text.primary,
              boxShadow: focused ? '0 0 0 2px rgba(16,185,129,0.1)' : 'none',
            }}
          />
          <span
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold pointer-events-none"
            style={{ color: t.text.quaternary }}
          >
            px
          </span>
        </div>
        <input
          type="range"
          min={PAGE_HEIGHT_MIN}
          max={PAGE_HEIGHT_MAX}
          value={value}
          onChange={e => commit(e.target.value)}
          className="flex-1 h-1 accent-emerald-500 cursor-pointer"
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[7px]" style={{ color: t.text.quaternary }}>{PAGE_HEIGHT_MIN}</span>
        <span className="text-[7px]" style={{ color: t.text.quaternary }}>{PAGE_HEIGHT_MAX}</span>
      </div>
    </div>
  );
}
