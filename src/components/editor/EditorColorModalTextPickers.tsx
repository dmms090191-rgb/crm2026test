import { useState, useEffect } from 'react';
import { Type } from 'lucide-react';
import type { EditorPanelTokens } from './editorPanelTheme';

export function TextModeContent({ targetLabel, color, onColorChange, pickerRef, pt }: {
  targetLabel: string | null;
  color: string;
  onColorChange: (c: string) => void;
  pickerRef: React.RefObject<HTMLInputElement | null>;
  pt: EditorPanelTokens;
}) {
  const [hexInput, setHexInput] = useState(color.replace('#', ''));
  useEffect(() => { setHexInput(color.replace('#', '')); }, [color]);

  return (
    <div className="flex flex-col px-3.5 pt-4 gap-5">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" style={{ color: pt.accent.solid }} />
          <span className="text-xs font-bold" style={{ color: pt.text.primary }}>
            Couleur du texte
          </span>
        </div>
        <p className="text-[10px]" style={{ color: pt.label.muted }}>
          Choisis une couleur pour les textes du menu.
        </p>
      </div>

      {targetLabel && (
        <div
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
        >
          <span className="text-[10px] font-medium" style={{ color: pt.label.muted }}>Cible :</span>
          <span className="text-[10px] font-bold" style={{ color: pt.accent.text }}>{targetLabel}</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => pickerRef.current?.click()}
          className="w-14 h-14 rounded-2xl border-2 transition-all hover:scale-105 shadow-lg"
          style={{
            background: color,
            borderColor: pt.swatchBorder,
            boxShadow: `0 4px 20px ${color}40`,
          }}
        />
        <input
          ref={pickerRef}
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="sr-only"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium" style={{ color: pt.label.muted }}>#</span>
          <input
            value={hexInput}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
              setHexInput(v);
              if (v.length === 6) onColorChange(`#${v}`);
            }}
            className="w-20 text-xs font-mono px-2.5 py-1.5 rounded-lg text-center"
            style={{
              background: pt.input.bg,
              border: `1px solid ${pt.input.border}`,
              color: pt.input.text,
            }}
            maxLength={6}
          />
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
      >
        <span className="w-4 h-4 rounded-md flex-shrink-0" style={{ background: color, border: `1px solid ${pt.swatchBorder}` }} />
        <span className="text-[10px] font-medium flex-1" style={{ color: pt.text.secondary }}>Apercu en temps reel</span>
        <span className="text-[10px] font-mono" style={{ color: pt.label.muted }}>{color}</span>
      </div>
    </div>
  );
}

export function ButtonTextColorPicker({ color, onColorChange, pickerRef, pt }: {
  color: string;
  onColorChange: (c: string) => void;
  pickerRef: React.RefObject<HTMLInputElement | null>;
  pt: EditorPanelTokens;
}) {
  const [hexInput, setHexInput] = useState(color.replace('#', ''));
  useEffect(() => { setHexInput(color.replace('#', '')); }, [color]);

  return (
    <div className="flex flex-col px-3.5 pt-3 gap-4">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" style={{ color: pt.accent.solid }} />
          <span className="text-xs font-bold" style={{ color: pt.text.primary }}>
            Couleur du texte
          </span>
        </div>
        <p className="text-[10px]" style={{ color: pt.label.muted }}>
          Choisis la couleur du texte du bouton.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => pickerRef.current?.click()}
          className="w-14 h-14 rounded-2xl border-2 transition-all hover:scale-105 shadow-lg"
          style={{
            background: color,
            borderColor: pt.swatchBorder,
            boxShadow: `0 4px 20px ${color}40`,
          }}
        />
        <input
          ref={pickerRef}
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="sr-only"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium" style={{ color: pt.label.muted }}>#</span>
          <input
            value={hexInput}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
              setHexInput(v);
              if (v.length === 6) onColorChange(`#${v}`);
            }}
            className="w-20 text-xs font-mono px-2.5 py-1.5 rounded-lg text-center"
            style={{
              background: pt.input.bg,
              border: `1px solid ${pt.input.border}`,
              color: pt.input.text,
            }}
            maxLength={6}
          />
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
      >
        <span className="w-4 h-4 rounded-md flex-shrink-0" style={{ background: color, border: `1px solid ${pt.swatchBorder}` }} />
        <span className="text-[10px] font-medium flex-1" style={{ color: pt.text.secondary }}>Apercu en temps reel</span>
        <span className="text-[10px] font-mono" style={{ color: pt.label.muted }}>{color}</span>
      </div>
    </div>
  );
}
