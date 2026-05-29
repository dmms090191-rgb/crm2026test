import { useState, useRef } from 'react';
import { Pipette, ChevronRight, Sparkles, Palette, Type, ArrowLeftRight } from 'lucide-react';
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
  const [showPicker, setShowPicker] = useState(false);

  const palettes: { id: ColorPaletteId; label: string; swatches: string[] }[] = [
    { id: 'custom', label: 'Personnalisees', swatches: [customPrimary, customSecondary] },
    { id: 'black_white', label: 'Noir & Blanc', swatches: ['#000000', '#ffffff'] },
    { id: 'none', label: 'Libre IA', swatches: [] },
  ];

  const selectedLabels = selectedPresets.map(id => PRESETS.find(p => p.id === id)?.label).filter(Boolean).join(', ');
  const hasSelection = selectedPresets.length > 0;

  return (
    <>
      {/* Type selector */}
      <div>
        <SectionLabel icon={<Sparkles className="w-3 h-3" />} text="Style du logo" color={textTertiary} />
        <button type="button" onClick={() => setShowPicker(true)}
          className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left"
          style={{
            background: hasSelection
              ? 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(217,119,6,0.1))'
              : surfaceSecondary,
            border: `1px solid ${hasSelection ? 'rgba(245,158,11,0.2)' : surfaceBorder}`,
            boxShadow: hasSelection ? '0 4px 20px rgba(245,158,11,0.06)' : 'none',
          }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: hasSelection ? 'linear-gradient(135deg, #f59e0b, #b45309)' : `linear-gradient(135deg, ${surfaceBorder}, ${surfaceSecondary})`,
              boxShadow: hasSelection ? '0 4px 16px rgba(245,158,11,0.2)' : 'none',
            }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: hasSelection ? '#fff' : textQuaternary }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold block" style={{ color: hasSelection ? '#f59e0b' : textPrimary }}>
              {!hasSelection ? 'Choisir un style' : `${selectedPresets.length} style${selectedPresets.length > 1 ? 's' : ''}`}
            </span>
            <span className="text-[9px] block mt-0.5 font-medium truncate" style={{ color: textQuaternary }}>
              {hasSelection ? selectedLabels : `Jusqu'a ${MAX_SELECTED_PRESETS} types differents`}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: hasSelection ? '#f59e0b' : textQuaternary }} />
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

      {/* Brand name */}
      {needsBrand && (
        <div>
          <SectionLabel icon={<Type className="w-3 h-3" />} text="Nom de marque" color={textTertiary} />
          <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
            placeholder="Votre marque..." maxLength={60}
            className="w-full rounded-xl lg:rounded-lg px-3 py-2.5 lg:py-2 text-[12px] lg:text-[11px] font-semibold focus:outline-none transition-all placeholder:font-normal"
            style={{
              background: surfaceSecondary,
              border: `1px solid ${surfaceBorder}`,
              color: textPrimary,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.06)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = surfaceBorder; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
      )}

      {/* Color palette */}
      <div>
        <SectionLabel icon={<Palette className="w-3 h-3" />} text="Couleurs" color={textTertiary} />
        <div className="grid grid-cols-3 gap-2 lg:gap-1.5">
          {palettes.map(pal => {
            const active = colorPalette === pal.id;
            return (
              <button key={pal.id} type="button" onClick={() => setColorPalette(pal.id)}
                className="flex flex-col items-center gap-1.5 py-2.5 lg:py-2 px-2 rounded-xl lg:rounded-lg transition-all active:scale-95"
                style={{
                  background: active ? 'rgba(245,158,11,0.06)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(245,158,11,0.2)' : surfaceBorder}`,
                }}>
                {pal.swatches.length > 0 ? (
                  <span className="flex -space-x-1">
                    {pal.swatches.map((c, i) => (
                      <span key={i} className="w-6 h-6 lg:w-5 lg:h-5 rounded-full flex-shrink-0 ring-2 transition-transform"
                        style={{
                          background: c,
                          ringColor: surfacePrimary,
                          transform: active ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: `0 2px 6px ${c}30`,
                        }} />
                    ))}
                  </span>
                ) : (
                  <span className="w-6 h-6 lg:w-5 lg:h-5 rounded-full flex-shrink-0"
                    style={{ background: `conic-gradient(#f59e0b, #ef4444, #8b5cf6, #3b82f6, #10b981, #f59e0b)`, opacity: active ? 1 : 0.4 }} />
                )}
                <span className="text-[10px] lg:text-[9px] font-bold" style={{ color: active ? '#f59e0b' : textQuaternary }}>{pal.label}</span>
              </button>
            );
          })}
        </div>

        {colorPalette === 'custom' && (
          <div className="flex items-end gap-1.5 mt-1.5 p-2 rounded-lg" style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}` }}>
            <div className="flex-1 min-w-0">
              <ColorPicker label="Principale" value={customPrimary} onChange={v => setCustomPrimary(v.toUpperCase())}
                pickerRef={primaryRef} surfacePrimary={surfacePrimary} surfaceBorder={surfaceBorder}
                textPrimary={textPrimary} textQuaternary={textQuaternary} />
            </div>
            <button
              type="button"
              onClick={() => { const tmp = customPrimary; setCustomPrimary(customSecondary); setCustomSecondary(tmp); }}
              className="flex items-center justify-center w-7 h-7 rounded-lg mb-[1px] transition-all hover:scale-110 active:scale-95 flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${customPrimary}18, ${customSecondary}18)`,
                border: `1px solid ${surfaceBorder}`,
              }}
              title="Echanger les couleurs"
            >
              <ArrowLeftRight className="w-3 h-3" style={{ color: textQuaternary }} />
            </button>
            <div className="flex-1 min-w-0">
              <ColorPicker label="Secondaire" value={customSecondary} onChange={v => setCustomSecondary(v.toUpperCase())}
                pickerRef={secondaryRef} surfacePrimary={surfacePrimary} surfaceBorder={surfaceBorder}
                textPrimary={textPrimary} textQuaternary={textQuaternary} />
            </div>
          </div>
        )}
      </div>

      {/* Hints */}
      <div>
        <SectionLabel icon={<Pipette className="w-3 h-3" />} text="Description (optionnel)" color={textTertiary} />
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Style, symboles, ambiance..."
          rows={2}
          className="w-full rounded-xl lg:rounded-lg px-3 py-2.5 lg:py-2 text-[12px] lg:text-[11px] leading-relaxed focus:outline-none transition-all resize-y placeholder:font-normal"
          style={{
            background: surfaceSecondary,
            border: `1px solid ${surfaceBorder}`,
            color: textPrimary,
            minHeight: 48, maxHeight: 120,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.06)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = surfaceBorder; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>
    </>
  );
}

function SectionLabel({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  return (
    <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mb-1.5">
      <span style={{ color: '#d97706' }}>{icon}</span>
      <span style={{ color }}>{text}</span>
    </label>
  );
}

function ColorPicker({ label, value, onChange, pickerRef, surfacePrimary, surfaceBorder, textPrimary, textQuaternary }: {
  label: string; value: string; onChange: (v: string) => void; pickerRef: React.RefObject<HTMLInputElement>;
  surfacePrimary: string; surfaceBorder: string; textPrimary: string; textQuaternary: string;
}) {
  return (
    <div>
      <label className="block text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: textQuaternary }}>{label}</label>
      <button type="button" onClick={() => pickerRef.current?.click()}
        className="group w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
        style={{ background: surfacePrimary, border: `1px solid ${surfaceBorder}` }}>
        <span className="w-6 h-6 rounded-md flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ background: value, boxShadow: `0 2px 8px ${value}30` }} />
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: textPrimary }}>{value}</span>
          <span className="text-[7px] font-medium tabular-nums" style={{ color: textQuaternary }}>RGB({hexToRgb(value).join(',')})</span>
        </div>
      </button>
      <input ref={pickerRef} type="color" value={value} onChange={e => onChange(e.target.value)} className="w-0 h-0 opacity-0 absolute" tabIndex={-1} />
    </div>
  );
}
