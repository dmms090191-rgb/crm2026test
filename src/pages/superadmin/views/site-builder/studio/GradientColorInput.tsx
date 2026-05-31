import { useState, useEffect, useRef } from 'react';
import { Pipette, Palette, AlertCircle } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import { isValidHex, hasEyeDropper } from './backgroundPanelHelpers';
import BackgroundColorPicker from './BackgroundColorPicker';

interface Props {
  label: string;
  color: string;
  onChange: (color: string) => void;
  t: ThemeTokens;
}

export default function GradientColorInput({ label, color, onChange, t }: Props) {
  const [hexInput, setHexInput] = useState(color);
  const [hexError, setHexError] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pipetteError, setPipetteError] = useState<string | null>(null);
  const pipetteTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setHexInput(color);
    setHexError(false);
  }, [color]);

  const applyColor = (c: string) => {
    onChange(c);
    setHexInput(c);
    setHexError(false);
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (isValidHex(val)) { setHexError(false); onChange(val); }
    else setHexError(val.length >= 7);
  };

  const handleHexBlur = () => {
    if (isValidHex(hexInput)) applyColor(hexInput);
    else if (hexInput !== color) { setHexInput(color); setHexError(false); }
  };

  const handlePipette = async () => {
    if (!hasEyeDropper()) {
      setPipetteError('Pipette non disponible.');
      if (pipetteTimeout.current) clearTimeout(pipetteTimeout.current);
      pipetteTimeout.current = setTimeout(() => setPipetteError(null), 3000);
      return;
    }
    try {
      // @ts-expect-error EyeDropper API
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) applyColor(result.sRGBHex);
    } catch { /* user cancelled */ }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-semibold block" style={{ color: t.text.tertiary }}>{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 cursor-pointer transition-transform hover:scale-110"
          style={{ background: color, border: `1.5px solid ${t.surface.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          onClick={() => setPaletteOpen(!paletteOpen)}
        />
        <input
          type="text"
          value={hexInput}
          onChange={e => handleHexChange(e.target.value)}
          onBlur={handleHexBlur}
          onKeyDown={e => { if (e.key === 'Enter') handleHexBlur(); }}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 px-2.5 py-2 rounded-lg text-[11px] font-mono outline-none transition-colors min-w-0"
          style={{
            background: t.surface.secondary,
            border: `1px solid ${hexError ? 'rgba(239,68,68,0.4)' : t.surface.border}`,
            color: t.text.secondary,
          }}
        />
        <button
          onClick={() => setPaletteOpen(!paletteOpen)}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
          style={{
            background: paletteOpen ? 'rgba(14,165,233,0.08)' : t.surface.secondary,
            border: `1px solid ${paletteOpen ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
          }}
        >
          <Palette className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
        </button>
        <button
          onClick={handlePipette}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
        >
          <Pipette className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
        </button>
      </div>
      {hexError && <p className="text-[9px]" style={{ color: '#ef4444' }}>Format invalide. Utilisez : #RRGGBB</p>}
      {pipetteError && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: '#ef4444' }} />
          <span className="text-[9px]" style={{ color: '#ef4444' }}>{pipetteError}</span>
        </div>
      )}
      {paletteOpen && (
        <BackgroundColorPicker
          currentColor={color}
          onApplyColor={applyColor}
          onSaveToCustom={() => {}}
          onClose={() => setPaletteOpen(false)}
          t={t}
        />
      )}
    </div>
  );
}
