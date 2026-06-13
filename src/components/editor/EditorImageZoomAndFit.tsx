import { ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize2, StretchHorizontal } from 'lucide-react';
import type { BgImageFitMode } from '../../contexts/EditorModeContext';
import type { EditorPanelTokens } from './editorPanelTheme';

export function ZoomSlider({ zoom, onChange, pt }: { zoom: number; onChange: (z: number) => void; pt: EditorPanelTokens }) {
  const isDefault = zoom === 100;
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col gap-2"
      style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ZoomIn className="w-3 h-3" style={{ color: pt.accent.solid }} />
          <span className="text-[10px] font-semibold" style={{ color: pt.text.primary }}>Zoom</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
            style={{ background: pt.surface.primary, color: pt.accent.text, border: `1px solid ${pt.surface.border}` }}
          >
            {zoom}%
          </span>
          {!isDefault && (
            <button
              onClick={() => onChange(100)}
              title="Reinitialiser a 100%"
              className="flex items-center justify-center w-5 h-5 rounded-md transition-all hover:scale-110"
              style={{ background: pt.surface.primary, border: `1px solid ${pt.surface.border}`, color: pt.label.muted }}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ZoomOut className="w-3 h-3 flex-shrink-0" style={{ color: pt.label.muted }} />
        <input
          type="range"
          min={50}
          max={200}
          step={5}
          value={zoom}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${pt.accent.solid} ${((zoom - 50) / 150) * 100}%, ${pt.surface.border} ${((zoom - 50) / 150) * 100}%)`,
            accentColor: pt.accent.solid,
          }}
        />
        <ZoomIn className="w-3 h-3 flex-shrink-0" style={{ color: pt.label.muted }} />
      </div>
    </div>
  );
}

const FIT_OPTIONS: { value: BgImageFitMode; label: string; desc: string; Icon: typeof Maximize }[] = [
  { value: 'cover', label: 'Couvrir', desc: 'Remplit la zone (peut couper)', Icon: Maximize },
  { value: 'contain', label: 'Contenir', desc: 'Image entiere visible', Icon: Minimize2 },
  { value: 'fill', label: 'Etirer', desc: 'Etire pour remplir exactement', Icon: StretchHorizontal },
];

export function FitModeSelector({ fit, onChange, pt }: { fit: BgImageFitMode; onChange: (f: BgImageFitMode) => void; pt: EditorPanelTokens }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col gap-2"
      style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
    >
      <div className="flex items-center gap-1.5">
        <Maximize className="w-3 h-3" style={{ color: pt.accent.solid }} />
        <span className="text-[10px] font-semibold" style={{ color: pt.text.primary }}>
          Mode d'affichage
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {FIT_OPTIONS.map(({ value, label, desc, Icon }) => {
          const active = fit === value;
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              className="flex flex-col items-center gap-1 py-2 rounded-lg transition-all duration-150 hover:scale-[1.03]"
              style={{
                background: active ? pt.accent.bg : pt.surface.primary,
                border: `1.5px solid ${active ? pt.accent.solid : pt.surface.border}`,
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: active ? pt.accent.solid : pt.label.muted }} />
              <span className="text-[9px] font-bold" style={{ color: active ? pt.accent.text : pt.text.primary }}>
                {label}
              </span>
              <span className="text-[7px] leading-tight px-1 text-center" style={{ color: pt.label.muted }}>
                {desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
