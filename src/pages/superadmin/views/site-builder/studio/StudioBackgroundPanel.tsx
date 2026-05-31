import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Pipette, AlertCircle, Palette } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import { DEFAULT_CANVAS_BG } from './useStudioSections';
import {
  isValidHex, isLightColor, hasEyeDropper, hexToHsv,
  loadCustomColors, saveCustomColors,
} from './backgroundPanelHelpers';
import BackgroundColorPicker from './BackgroundColorPicker';
import BackgroundSavedColors from './BackgroundSavedColors';

interface Props {
  currentColor: string;
  onChange: (color: string) => void;
  onReset: () => void;
  isActive?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  t: ThemeTokens;
}

export default function StudioBackgroundPanel({ currentColor, onChange, onReset, isActive, onActivate, onDeactivate, t }: Props) {
  const [hexInput, setHexInput] = useState(currentColor);
  const [hexError, setHexError] = useState(false);
  const [customColors, setCustomColors] = useState<(string | null)[]>(loadCustomColors);
  const [pipetteError, setPipetteError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const pipetteTimeout = useRef<ReturnType<typeof setTimeout>>();
  const saveMessageTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isDefault = currentColor === DEFAULT_CANVAS_BG;

  useEffect(() => {
    setHexInput(currentColor);
    setHexError(false);
  }, [currentColor]);

  const applyColor = useCallback((color: string) => {
    onChange(color);
    setHexInput(color);
    setHexError(false);
  }, [onChange]);

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (isValidHex(val)) {
      setHexError(false);
      onChange(val);
    } else {
      setHexError(val.length >= 7);
    }
  };

  const handleHexBlur = () => {
    if (isValidHex(hexInput)) {
      applyColor(hexInput);
    } else if (hexInput !== currentColor) {
      setHexInput(currentColor);
      setHexError(false);
    }
  };

  const handlePipette = async () => {
    if (!hasEyeDropper()) {
      setPipetteError('Pipette non disponible sur ce navigateur.');
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

  const handleReset = () => {
    onReset();
    setHexInput(DEFAULT_CANVAS_BG);
    setHexError(false);
  };

  const showSaveMessage = (msg: string) => {
    setSaveMessage(msg);
    if (saveMessageTimeout.current) clearTimeout(saveMessageTimeout.current);
    saveMessageTimeout.current = setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSaveCustomColor = () => {
    const lc = currentColor.toLowerCase();
    if (customColors.some(c => c?.toLowerCase() === lc)) {
      showSaveMessage('Cette couleur est deja enregistree.');
      return;
    }
    const emptyIdx = customColors.findIndex(c => c === null);
    if (emptyIdx === -1) {
      showSaveMessage('Les 4 couleurs sont deja enregistrees.');
      return;
    }
    const next = [...customColors];
    next[emptyIdx] = lc;
    setCustomColors(next);
    saveCustomColors(next);
    showSaveMessage('Couleur enregistree !');
  };

  const handleRemoveCustomColor = (idx: number) => {
    const next = [...customColors];
    next[idx] = null;
    setCustomColors(next);
    saveCustomColors(next);
  };

  const handleApplyFromSaved = (color: string) => {
    applyColor(color);
  };

  const openPalette = () => {
    setPaletteOpen(true);
  };

  const light = isLightColor(currentColor);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Current color preview */}
        <div>
          <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: t.text.tertiary }}>
            Couleur actuelle
          </label>
          <div
            className="w-full h-20 rounded-xl relative overflow-hidden"
            style={{
              background: currentColor,
              border: `1px solid ${t.surface.border}`,
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md"
                style={{
                  background: light ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  color: light ? '#1e293b' : '#ffffff',
                }}
              >
                {currentColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Palette + Pipette buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={openPalette}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: paletteOpen ? 'rgba(14,165,233,0.08)' : t.surface.secondary,
              border: paletteOpen ? '1px solid rgba(14,165,233,0.3)' : `1px solid ${t.surface.border}`,
            }}
          >
            <Palette className="w-5 h-5" style={{ color: '#0ea5e9' }} />
            <span className="text-[9px] font-bold" style={{ color: paletteOpen ? '#0ea5e9' : t.text.secondary }}>Palette</span>
          </button>

          <button
            onClick={handlePipette}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
          >
            <Pipette className="w-5 h-5" style={{ color: '#0ea5e9' }} />
            <span className="text-[9px] font-bold" style={{ color: t.text.secondary }}>Pipette</span>
          </button>
        </div>

        {pipetteError && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
            <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: '#ef4444' }} />
            <span className="text-[9px]" style={{ color: '#ef4444' }}>{pipetteError}</span>
          </div>
        )}

        {/* Color picker palette */}
        {paletteOpen && (
          <BackgroundColorPicker
            currentColor={currentColor}
            onApplyColor={applyColor}
            onSaveToCustom={handleSaveCustomColor}
            onClose={() => setPaletteOpen(false)}
            t={t}
          />
        )}

        {/* HEX input */}
        <div>
          <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: t.text.tertiary }}>
            Code HEX
          </label>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0"
              style={{ background: isValidHex(hexInput) ? hexInput : currentColor, border: `1px solid ${t.surface.border}` }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={e => handleHexChange(e.target.value)}
              onBlur={handleHexBlur}
              onKeyDown={e => { if (e.key === 'Enter') handleHexBlur(); }}
              placeholder="#020617"
              maxLength={7}
              className="flex-1 px-2.5 py-2 rounded-lg text-[11px] font-mono outline-none transition-colors"
              style={{
                background: t.surface.secondary,
                border: `1px solid ${hexError ? 'rgba(239,68,68,0.4)' : t.surface.border}`,
                color: t.text.secondary,
              }}
            />
          </div>
          {hexError && (
            <p className="text-[9px] mt-1" style={{ color: '#ef4444' }}>
              Format invalide. Utilisez : #RRGGBB
            </p>
          )}
        </div>

        {/* My colors */}
        <BackgroundSavedColors
          customColors={customColors}
          currentColor={currentColor}
          onApplyColor={handleApplyFromSaved}
          onSaveCustomColor={handleSaveCustomColor}
          onRemoveCustomColor={handleRemoveCustomColor}
          saveMessage={saveMessage}
          t={t}
        />

        {/* Reset */}
        {!isDefault && (
          <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.12)',
                color: '#ef4444',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reinitialiser les fonds
            </button>
          </div>
        )}

        {/* Activate / Deactivate */}
        {onActivate && onDeactivate && (
          <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            {isActive ? (
              <button
                onClick={onDeactivate}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'rgba(14,165,233,0.06)',
                  border: '1.5px solid rgba(14,165,233,0.25)',
                  color: '#0ea5e9',
                }}
              >
                Couleur unie active
              </button>
            ) : (
              <button
                onClick={onActivate}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(14,165,233,0.3)',
                }}
              >
                Activer la couleur unie
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
