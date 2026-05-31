import { useState, useRef } from 'react';
import { Pipette, ChevronRight, Sparkles, Palette, Type, ArrowLeftRight, PenLine } from 'lucide-react';
import { PRESETS, MAX_SELECTED_PRESETS, type Preset, type ColorPaletteId } from './logoAiConstants';
import { hexToRgb } from './logoAiHelpers';
import LogoTypePickerModal from './LogoTypePickerModal';
import LogoTypeSelectedBadges from './LogoTypeSelectedBadges';

interface Props {
  selectedPresets: Preset[]; setSelectedPresets: (p: Preset[]) => void;
  needsBrand: boolean; brandName: string; setBrandName: (v: string) => void;
  colorPalette: ColorPaletteId; setColorPalette: (v: ColorPaletteId) => void;
  customPrimary: string; setCustomPrimary: (v: string) => void;
  customSecondary: string; setCustomSecondary: (v: string) => void;
  prompt: string; setPrompt: (v: string) => void;
  surfaceSecondary: string; surfaceBorder: string; surfacePrimary: string;
  textPrimary: string; textSecondary: string; textTertiary: string; textQuaternary: string;
}

export default function LogoAiV4Controls({
  selectedPresets, setSelectedPresets, needsBrand, brandName, setBrandName,
  colorPalette, setColorPalette,
  customPrimary, setCustomPrimary, customSecondary, setCustomSecondary,
  prompt, setPrompt,
  surfaceSecondary, surfaceBorder, surfacePrimary,
  textPrimary, textSecondary, textTertiary, textQuaternary,
}: Props) {
  const primaryRef = useRef<HTMLInputElement>(null);
  const secondaryRef = useRef<HTMLInputElement>(null);
  const singleRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);

  const palettes: { id: ColorPaletteId; label: string; swatches: string[] }[] = [
    { id: 'single', label: 'Unique', swatches: [customPrimary] },
    { id: 'custom', label: '2 couleurs', swatches: [customPrimary, customSecondary] },
    { id: 'none', label: 'Libre', swatches: [] },
  ];

  const selectedLabels = selectedPresets.map(id => PRESETS.find(p => p.id === id)?.label).filter(Boolean).join(', ');
  const hasSelection = selectedPresets.length > 0;

  return (
    <>
      {/* Style du logo */}
      <div className="pb-2.5">
        <RowLabel step={1} icon={<Sparkles className="w-2.5 h-2.5" />} text="Style" color={textTertiary} />
        <button type="button" onClick={() => setShowPicker(true)}
          className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left"
          style={{
            background: hasSelection
              ? 'linear-gradient(135deg, rgba(245,158,11,0.03), rgba(217,119,6,0.06))'
              : surfaceSecondary,
            border: `1px solid ${hasSelection ? 'rgba(245,158,11,0.18)' : surfaceBorder}`,
            boxShadow: hasSelection ? '0 2px 12px rgba(245,158,11,0.05)' : 'none',
          }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: hasSelection ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' : `linear-gradient(135deg, ${surfaceBorder}, ${surfaceSecondary})`,
              boxShadow: hasSelection ? '0 3px 12px rgba(245,158,11,0.22), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
            }}>
            <Sparkles className="w-3 h-3" style={{ color: hasSelection ? '#fff' : textQuaternary }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold block leading-tight" style={{ color: hasSelection ? '#d97706' : textPrimary }}>
              {!hasSelection ? 'Choisir un style' : `${selectedPresets.length} style${selectedPresets.length > 1 ? 's' : ''}`}
            </span>
            <span className="text-[9px] block font-medium truncate leading-tight" style={{ color: textQuaternary }}>
              {hasSelection ? selectedLabels : `Max ${MAX_SELECTED_PRESETS} types`}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: hasSelection ? '#d97706' : textQuaternary }} />
        </button>
        <LogoTypeSelectedBadges selected={selectedPresets} onRemove={id => setSelectedPresets(selectedPresets.filter(p => p !== id))} />
      </div>

      {showPicker && (
        <LogoTypePickerModal
          selected={selectedPresets}
          onConfirm={presets => { setSelectedPresets(presets); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <Divider color={surfaceBorder} />

      {/* Nom de marque */}
      {needsBrand && (
        <>
          <div className="py-2.5">
            <RowLabel step={2} icon={<Type className="w-2.5 h-2.5" />} text="Marque" color={textTertiary} />
            <div className="relative">
              <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
                placeholder="Nom de marque..." maxLength={60}
                className="w-full rounded-lg pl-3 pr-8 py-2 text-[11px] font-semibold focus:outline-none transition-all placeholder:font-normal"
                style={{
                  background: surfaceSecondary,
                  border: `1px solid ${surfaceBorder}`,
                  color: textPrimary,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.30)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.06)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = surfaceBorder; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <PenLine className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: textQuaternary, opacity: 0.4 }} />
            </div>
          </div>
          <Divider color={surfaceBorder} />
        </>
      )}

      {/* Couleurs */}
      <div className="py-2.5">
        <RowLabel step={needsBrand ? 3 : 2} icon={<Palette className="w-2.5 h-2.5" />} text="Couleurs" color={textTertiary} />
        <div className="grid grid-cols-3 gap-1.5">
          {palettes.map(pal => {
            const active = colorPalette === pal.id;
            return (
              <button key={pal.id} type="button" onClick={() => setColorPalette(pal.id)}
                className="flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-all active:scale-95"
                style={{
                  background: active ? 'rgba(245,158,11,0.05)' : 'transparent',
                  border: `1.5px solid ${active ? 'rgba(245,158,11,0.22)' : surfaceBorder}`,
                  boxShadow: active ? '0 2px 10px rgba(245,158,11,0.06)' : 'none',
                }}>
                {pal.swatches.length > 0 ? (
                  <span className="flex -space-x-1">
                    {pal.swatches.map((c, i) => (
                      <span key={i} className="w-5 h-5 rounded-full flex-shrink-0 ring-[1.5px] transition-transform"
                        style={{
                          background: c,
                          ringColor: surfacePrimary,
                          transform: active ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: `0 1px 4px ${c}20`,
                        }} />
                    ))}
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full flex-shrink-0 transition-opacity"
                    style={{ background: `conic-gradient(#f59e0b, #ef4444, #8b5cf6, #3b82f6, #10b981, #f59e0b)`, opacity: active ? 1 : 0.35 }} />
                )}
                <span className="text-[8px] font-bold" style={{ color: active ? '#d97706' : textQuaternary }}>{pal.label}</span>
              </button>
            );
          })}
        </div>

        {/* Single color picker */}
        {colorPalette === 'single' && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}` }}>
            <div className="flex-1 min-w-0">
              <ColorPicker label="Couleur" value={customPrimary} onChange={v => setCustomPrimary(v.toUpperCase())}
                pickerRef={singleRef} surfacePrimary={surfacePrimary} surfaceBorder={surfaceBorder}
                textPrimary={textPrimary} textQuaternary={textQuaternary} />
            </div>
            <div className="flex-shrink-0 px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.06)' }}>
              <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: '#b45309' }}>Monochrome</span>
            </div>
          </div>
        )}

        {/* Dual color picker */}
        {colorPalette === 'custom' && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}` }}>
            <div className="flex-1 min-w-0">
              <ColorPicker label="Prim." value={customPrimary} onChange={v => setCustomPrimary(v.toUpperCase())}
                pickerRef={primaryRef} surfacePrimary={surfacePrimary} surfaceBorder={surfaceBorder}
                textPrimary={textPrimary} textQuaternary={textQuaternary} />
            </div>
            <button
              type="button"
              onClick={() => { const tmp = customPrimary; setCustomPrimary(customSecondary); setCustomSecondary(tmp); }}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-all hover:scale-110 active:scale-95 flex-shrink-0 self-end"
              style={{ background: `linear-gradient(135deg, ${customPrimary}12, ${customSecondary}12)`, border: `1px solid ${surfaceBorder}` }}
              title="Echanger"
            >
              <ArrowLeftRight className="w-3 h-3" style={{ color: textQuaternary }} />
            </button>
            <div className="flex-1 min-w-0">
              <ColorPicker label="Sec." value={customSecondary} onChange={v => setCustomSecondary(v.toUpperCase())}
                pickerRef={secondaryRef} surfacePrimary={surfacePrimary} surfaceBorder={surfaceBorder}
                textPrimary={textPrimary} textQuaternary={textQuaternary} />
            </div>
          </div>
        )}
      </div>

      <Divider color={surfaceBorder} />

      {/* Description */}
      <div className="py-2.5">
        <RowLabel step={needsBrand ? 4 : 3} icon={<Pipette className="w-2.5 h-2.5" />} text="Description" color={textTertiary} optional />
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Style, symboles, ambiance..."
          rows={1}
          className="w-full rounded-lg px-3 py-2 text-[11px] leading-snug focus:outline-none transition-all resize-none placeholder:font-normal"
          style={{
            background: surfaceSecondary,
            border: `1px solid ${surfaceBorder}`,
            color: textPrimary,
            minHeight: 36, maxHeight: 64,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.30)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.06)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = surfaceBorder; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>
    </>
  );
}

function RowLabel({ step, icon, text, color, optional }: { step: number; icon: React.ReactNode; text: string; color: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-extrabold flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.14))', color: '#b45309', border: '1px solid rgba(245,158,11,0.10)' }}>
        {step}
      </span>
      <span style={{ color: '#d97706' }}>{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{text}</span>
      {optional && <span className="text-[7px] font-medium ml-0.5" style={{ color, opacity: 0.5 }}>optionnel</span>}
    </div>
  );
}

function Divider({ color }: { color: string }) {
  return <div className="h-px my-0.5" style={{ background: `linear-gradient(90deg, ${color}60, ${color}20, transparent)` }} />;
}

function ColorPicker({ label, value, onChange, pickerRef, surfacePrimary, surfaceBorder, textPrimary, textQuaternary }: {
  label: string; value: string; onChange: (v: string) => void; pickerRef: React.RefObject<HTMLInputElement>;
  surfacePrimary: string; surfaceBorder: string; textPrimary: string; textQuaternary: string;
}) {
  return (
    <div>
      <label className="block text-[7px] font-bold uppercase tracking-wider mb-1" style={{ color: textQuaternary }}>{label}</label>
      <button type="button" onClick={() => pickerRef.current?.click()}
        className="group w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all hover:brightness-105"
        style={{ background: surfacePrimary, border: `1px solid ${surfaceBorder}` }}>
        <span className="w-5 h-5 rounded flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ background: value, boxShadow: `0 2px 6px ${value}25` }} />
        <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: textPrimary }}>{value}</span>
      </button>
      <input ref={pickerRef} type="color" value={value} onChange={e => onChange(e.target.value)} className="w-0 h-0 opacity-0 absolute" tabIndex={-1} />
    </div>
  );
}
