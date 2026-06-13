import { useState, useCallback, useRef, useEffect } from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { PRESET_PALETTES, type CustomPanelPalette } from './editorPanelTheme';

export function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export function PaletteModalsDropdown() {
  const ctx = useEditorMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const effective = ctx.panelPalettePreview || ctx.customPanelPalette;
  const [draft, setDraft] = useState<CustomPanelPalette>({
    background: effective?.background ?? '#1c1e2a',
    surface: effective?.surface ?? '#252838',
    accent: effective?.accent ?? '#3b82f6',
  });

  useEffect(() => {
    if (open) {
      const eff = ctx.panelPalettePreview || ctx.customPanelPalette;
      setDraft({
        background: eff?.background ?? '#1c1e2a',
        surface: eff?.surface ?? '#252838',
        accent: eff?.accent ?? '#3b82f6',
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        ctx.setPanelPalettePreview(null);
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, ctx]);

  const updateField = useCallback((field: keyof CustomPanelPalette, value: string) => {
    setDraft(prev => {
      const next = { ...prev, [field]: value };
      if (isValidHex(value)) ctx.setPanelPalettePreview(next);
      return next;
    });
  }, [ctx]);

  const handleApply = useCallback(() => {
    if (isValidHex(draft.background) && isValidHex(draft.surface) && isValidHex(draft.accent)) {
      ctx.setPanelPalettePreview(draft);
      ctx.commitPanelPalette();
      setOpen(false);
    }
  }, [draft, ctx]);

  const handleReset = useCallback(() => {
    ctx.resetPanelPalette();
    setDraft({ background: '#1c1e2a', surface: '#252838', accent: '#3b82f6' });
    setOpen(false);
  }, [ctx]);

  const handlePreset = useCallback((palette: CustomPanelPalette) => {
    setDraft({ ...palette });
    ctx.setPanelPalettePreview(palette);
  }, [ctx]);

  const hasCustom = !!ctx.customPanelPalette;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{
          background: hasCustom ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.04)',
          border: hasCustom ? '1px solid rgba(59,130,246,0.20)' : '1px solid rgba(255,255,255,0.06)',
          color: hasCustom ? '#60a5fa' : 'rgba(255,255,255,0.50)',
        }}
      >
        <Palette className="w-3 h-3" />
        <span className="hidden sm:inline">Palette modals</span>
        {hasCustom && (
          <span className="flex gap-0.5 ml-0.5">
            <span className="w-2 h-2 rounded-full border border-white/20" style={{ background: ctx.customPanelPalette!.background }} />
            <span className="w-2 h-2 rounded-full border border-white/20" style={{ background: ctx.customPanelPalette!.surface }} />
            <span className="w-2 h-2 rounded-full border border-white/20" style={{ background: ctx.customPanelPalette!.accent }} />
          </span>
        )}
        <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-[99999] rounded-xl overflow-hidden"
          style={{
            background: 'rgba(10,12,20,0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            width: 260,
          }}
        >
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#60a5fa' }}>
              Palette modals
            </p>
          </div>

          <div className="px-3 pb-2 flex gap-1.5">
            {PRESET_PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.palette)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-semibold transition-all hover:scale-[1.03]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                <span className="flex gap-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.palette.background, border: '1px solid rgba(255,255,255,0.15)' }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: p.palette.accent, border: '1px solid rgba(255,255,255,0.15)' }} />
                </span>
                {p.label}
              </button>
            ))}
          </div>

          <div className="px-3 pb-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <PaletteField label="Fond modal" value={draft.background} onChange={v => updateField('background', v)} />
            <PaletteField label="Surface modal" value={draft.surface} onChange={v => updateField('surface', v)} />
            <PaletteField label="Accent modal" value={draft.accent} onChange={v => updateField('accent', v)} />
          </div>

          <div className="px-3 pb-3 flex flex-col gap-1.5">
            <button
              onClick={handleApply}
              className="w-full py-2 rounded-lg text-[10px] font-bold transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                border: '1px solid rgba(59,130,246,0.30)',
                boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
              }}
            >
              Appliquer la palette
            </button>
            <button
              onClick={handleReset}
              className="w-full py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.01]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              Reinitialiser les couleurs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PaletteField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = isValidHex(value);
  return (
    <div className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="relative w-6 h-6 flex-shrink-0">
        <span
          className="block w-6 h-6 rounded-lg"
          style={{
            background: valid ? value : '#333',
            border: '2px solid rgba(255,255,255,0.12)',
            boxShadow: valid ? `0 0 8px ${value}40` : 'none',
          }}
        />
        <input
          type="color"
          value={valid ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {label}
        </p>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full text-[11px] font-mono px-2 py-1 rounded-md outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${valid ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.30)'}`,
            color: valid ? 'rgba(255,255,255,0.80)' : '#f87171',
          }}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
