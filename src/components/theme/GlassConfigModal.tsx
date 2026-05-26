import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Image, Droplets, Layers, Sun, Moon, Palette, Check, SlidersHorizontal, Eye } from 'lucide-react';
import { useTheme, type GlassConfig, DEFAULT_GLASS_CONFIG } from '../../contexts/ThemeContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import GlassPreviewMockup from './GlassPreviewMockup';
import GlassImageLibrary from './GlassImageLibrary';

interface Props { open: boolean; onClose: () => void; }

const BLUR_OPTIONS: { value: GlassConfig['blur']; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Fort' },
];
const TRANSPARENCY_OPTIONS: { value: GlassConfig['cardTransparency']; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Forte' },
];
const ACCENT_PRESETS = ['#f97316', '#22d3ee', '#3b82f6', '#34d399', '#f43f5e', '#eab308', '#ec4899', '#06b6d4'];

export default function GlassConfigModal({ open, onClose }: Props) {
  const { theme, setTheme, glassConfig, setGlassConfig } = useTheme();
  const tokens = useThemeTokens();
  const [draft, setDraft] = useState<GlassConfig>(() => ({ ...DEFAULT_GLASS_CONFIG, ...glassConfig }));

  if (!open) return null;

  function updateDraft(partial: Partial<GlassConfig>) {
    setDraft(prev => ({ ...prev, ...partial }));
  }
  function apply() {
    setGlassConfig(draft);
    if (theme !== 'glass') setTheme('glass');
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4 md:p-6 z-[100001]"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-4xl rounded-t-3xl sm:rounded-3xl overflow-hidden animate-[fadeScaleIn_200ms_ease-out] flex flex-col"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', maxHeight: 'min(92vh, 820px)', height: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: tokens.text.quaternary + '40' }} />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-8 pt-4 sm:pt-7 pb-4 sm:pb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f9731620', border: '1px solid #f9731630' }}>
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#f97316' }} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold tracking-tight" style={{ color: tokens.heading.primary }}>Glass personnalise</h2>
              <p className="text-[10px] sm:text-xs mt-0.5 font-medium" style={{ color: tokens.text.quaternary }}>Configurez votre theme glassmorphism premium</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 pb-6 sm:pb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-5 min-w-0">
              <Section icon={<Image className="w-4 h-4" />} title="Bibliotheque d'images" tokens={tokens}>
                <GlassImageLibrary selectedUrl={draft.imageUrl} onSelect={url => updateDraft({ imageUrl: url })} accent={draft.accentColor} tokens={tokens} />
              </Section>

              <Section icon={draft.overlayMode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} title="Mode overlay" tokens={tokens}>
                <div className="flex gap-2">
                  <Pill label="Sombre" active={draft.overlayMode === 'dark'} accent={draft.accentColor} tokens={tokens} onClick={() => updateDraft({ overlayMode: 'dark' })} icon={<Moon className="w-3 h-3" />} />
                  <Pill label="Clair" active={draft.overlayMode === 'light'} accent={draft.accentColor} tokens={tokens} onClick={() => updateDraft({ overlayMode: 'light' })} icon={<Sun className="w-3 h-3" />} />
                </div>
              </Section>

              <Section icon={<SlidersHorizontal className="w-4 h-4" />} title="Reglages image" tokens={tokens}>
                <Slider label="Flou du fond" value={draft.backgroundBlur} min={0} max={16} step={1} onChange={v => updateDraft({ backgroundBlur: v })} accent={draft.accentColor} tokens={tokens} />
                <Slider label="Luminosite" value={draft.brightness} min={0.2} max={1} step={0.05} onChange={v => updateDraft({ brightness: v })} accent={draft.accentColor} tokens={tokens} />
                <Slider label="Saturation" value={draft.saturation} min={0} max={1.2} step={0.05} onChange={v => updateDraft({ saturation: v })} accent={draft.accentColor} tokens={tokens} />
              </Section>

              <Section icon={<Eye className="w-4 h-4" />} title="Overlay et transparence" tokens={tokens}>
                <Slider label="Opacite overlay" value={draft.overlayOpacity} min={0} max={1} step={0.05} onChange={v => updateDraft({ overlayOpacity: v })} accent={draft.accentColor} tokens={tokens} />
                <div className="flex gap-2 mt-2">
                  {TRANSPARENCY_OPTIONS.map(opt => (
                    <Pill key={opt.value} label={opt.label} active={draft.cardTransparency === opt.value} accent={draft.accentColor} tokens={tokens} onClick={() => updateDraft({ cardTransparency: opt.value })} />
                  ))}
                </div>
              </Section>

              <Section icon={<Droplets className="w-4 h-4" />} title="Effet blur des surfaces" tokens={tokens}>
                <div className="flex gap-2">
                  {BLUR_OPTIONS.map(opt => (
                    <Pill key={opt.value} label={opt.label} active={draft.blur === opt.value} accent={draft.accentColor} tokens={tokens} onClick={() => updateDraft({ blur: opt.value })} />
                  ))}
                </div>
              </Section>

              <Section icon={<Palette className="w-4 h-4" />} title="Couleur d'accent" tokens={tokens}>
                <div className="flex flex-wrap gap-2.5">
                  {ACCENT_PRESETS.map(color => (
                    <button key={color} onClick={() => updateDraft({ accentColor: color })} className="w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center" style={{ background: color, boxShadow: draft.accentColor === color ? `0 0 0 2px #111, 0 0 0 4px ${color}` : `0 2px 8px ${color}30` }}>
                      {draft.accentColor === color && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </Section>
            </div>

            <div className="lg:w-[340px] flex-shrink-0">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: tokens.text.quaternary }}>Apercu</p>
              <GlassPreviewMockup config={draft} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 sm:px-8 py-4 sm:py-5 flex-shrink-0" style={{ borderTop: `1px solid ${tokens.surface.border}` }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]" style={{ color: tokens.text.tertiary, background: tokens.surface.hover }}>Annuler</button>
          <button onClick={apply} className="px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02]" style={{ background: draft.accentColor, boxShadow: `0 4px 16px ${draft.accentColor}40` }}>Appliquer le theme</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Section({ icon, title, tokens, children }: { icon: React.ReactNode; title: string; tokens: ReturnType<typeof useThemeTokens>; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span style={{ color: tokens.text.tertiary }}>{icon}</span>
        <span className="text-[11px] font-bold" style={{ color: tokens.text.secondary }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Pill({ label, active, accent, tokens, onClick, icon }: { label: string; active: boolean; accent: string; tokens: ReturnType<typeof useThemeTokens>; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold transition-all" style={{ background: active ? `${accent}18` : tokens.surface.hover, border: active ? `1.5px solid ${accent}40` : `1px solid ${tokens.surface.border}`, color: active ? accent : tokens.text.tertiary }}>
      {icon}{label}
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, accent, tokens }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; accent: string; tokens: ReturnType<typeof useThemeTokens> }) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold" style={{ color: tokens.text.tertiary }}>{label}</span>
        <span className="text-[10px] font-bold tabular-nums" style={{ color: accent }}>{pct}%</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(90deg, ${accent} ${pct}%, ${tokens.surface.border} ${pct}%)` }}
      />
    </div>
  );
}
