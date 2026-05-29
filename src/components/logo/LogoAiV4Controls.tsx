import { useRef } from 'react';
import { Pipette } from 'lucide-react';
import { PRESETS, type Preset, type ColorPaletteId } from './logoAiConstants';
import { hexToRgb } from './logoAiHelpers';

interface Props {
  preset: Preset;
  setPreset: (p: Preset) => void;
  needsBrand: boolean;
  brandName: string;
  setBrandName: (v: string) => void;
  colorPalette: ColorPaletteId;
  setColorPalette: (v: ColorPaletteId) => void;
  customPrimary: string;
  setCustomPrimary: (v: string) => void;
  customSecondary: string;
  setCustomSecondary: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  btnStyle: (active: boolean) => React.CSSProperties;
  surfaceSecondary: string;
  surfaceBorder: string;
  surfacePrimary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
}

export default function LogoAiV4Controls({
  preset, setPreset, needsBrand, brandName, setBrandName,
  colorPalette, setColorPalette,
  customPrimary, setCustomPrimary, customSecondary, setCustomSecondary,
  prompt, setPrompt, btnStyle,
  surfaceSecondary, surfaceBorder, surfacePrimary,
  textPrimary, textSecondary, textTertiary, textQuaternary,
}: Props) {
  const primaryPickerRef = useRef<HTMLInputElement>(null);
  const secondaryPickerRef = useRef<HTMLInputElement>(null);

  const palettes: { id: ColorPaletteId; label: string; swatches: string[] }[] = [
    { id: 'custom', label: 'Personnalisees', swatches: [customPrimary, customSecondary] },
    { id: 'black_white', label: 'Noir + Blanc', swatches: ['#000000', '#ffffff'] },
    { id: 'none', label: 'Aucune preference', swatches: [] },
  ];

  return (
    <>
      {/* Preset selector */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textSecondary }}>Type de logo</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl transition-all text-left"
              style={btnStyle(preset === p.id)}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                {p.icon}
                {p.label}
              </span>
              <span className="text-[9px] font-normal opacity-70">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brand name */}
      {needsBrand && (
        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textSecondary }}>
            Nom de marque
          </label>
          <input
            type="text"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            placeholder="Ex : Talvex"
            maxLength={60}
            className="w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-all"
            style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textPrimary }}
            onFocus={e => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
            onBlur={e => { e.currentTarget.style.borderColor = surfaceBorder; }}
          />
        </div>
      )}

      {/* Color palette */}
      <div>
        <label className="block text-[11px] font-semibold mb-2" style={{ color: textSecondary }}>
          Palette de couleurs
        </label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {palettes.map(pal => (
            <button
              key={pal.id}
              type="button"
              onClick={() => setColorPalette(pal.id)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
              style={btnStyle(colorPalette === pal.id)}
            >
              {pal.swatches.length > 0 ? (
                <span className="flex gap-1">
                  {pal.swatches.map((c, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{
                        background: c,
                        border: c === '#ffffff' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(0,0,0,0.08)',
                      }}
                    />
                  ))}
                </span>
              ) : (
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: surfaceSecondary, border: `1px dashed ${surfaceBorder}` }}
                />
              )}
              <span className="truncate">{pal.label}</span>
            </button>
          ))}
        </div>

        {/* Custom color pickers */}
        {colorPalette === 'custom' && (
          <div
            className="grid grid-cols-2 gap-3 p-3.5 rounded-xl"
            style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}` }}
          >
            <ColorPickerButton
              label="Couleur principale"
              value={customPrimary}
              onChange={v => setCustomPrimary(v.toUpperCase())}
              pickerRef={primaryPickerRef}
              surfacePrimary={surfacePrimary}
              surfaceBorder={surfaceBorder}
              textPrimary={textPrimary}
              textTertiary={textTertiary}
              textQuaternary={textQuaternary}
            />
            <ColorPickerButton
              label="Couleur secondaire"
              value={customSecondary}
              onChange={v => setCustomSecondary(v.toUpperCase())}
              pickerRef={secondaryPickerRef}
              surfacePrimary={surfacePrimary}
              surfaceBorder={surfaceBorder}
              textPrimary={textPrimary}
              textTertiary={textTertiary}
              textQuaternary={textQuaternary}
            />
          </div>
        )}
      </div>

      {/* Optional hints */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textSecondary }}>
          Indications optionnelles
        </label>
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Couleurs, formes preferees..."
          maxLength={300}
          className="w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-all"
          style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textPrimary }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
          onBlur={e => { e.currentTarget.style.borderColor = surfaceBorder; }}
        />
        <span className="text-[10px] mt-0.5 block" style={{ color: textQuaternary }}>{prompt.length}/300</span>
      </div>
    </>
  );
}

function ColorPickerButton({
  label, value, onChange, pickerRef,
  surfacePrimary, surfaceBorder, textPrimary, textTertiary, textQuaternary,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  pickerRef: React.RefObject<HTMLInputElement>;
  surfacePrimary: string;
  surfaceBorder: string;
  textPrimary: string;
  textTertiary: string;
  textQuaternary: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold mb-2" style={{ color: textTertiary }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => pickerRef.current?.click()}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
        style={{ background: surfacePrimary, border: `1px solid ${surfaceBorder}` }}
      >
        <span
          className="w-7 h-7 rounded-lg flex-shrink-0"
          style={{
            background: value,
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: `0 2px 8px ${value}40`,
          }}
        />
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: textPrimary }}>
            {value}
          </span>
          <span className="text-[9px]" style={{ color: textQuaternary }}>
            RGB({hexToRgb(value).join(', ')})
          </span>
        </div>
        <Pipette className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: textQuaternary }} />
      </button>
      <input
        ref={pickerRef}
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-0 h-0 opacity-0 absolute"
        tabIndex={-1}
      />
    </div>
  );
}
