import { useState, useEffect } from 'react';
import type { EditorPanelTokens } from './editorPanelTheme';

interface Props {
  color: string;
  opacity: number;
  onColorChange: (c: string) => void;
  onOpacityChange: (o: number) => void;
  pickerRef: React.RefObject<HTMLInputElement | null>;
  pt: EditorPanelTokens;
  hideOpacity?: boolean;
}

export default function SolidColorPanel({
  color,
  opacity,
  onColorChange,
  onOpacityChange,
  pickerRef,
  pt,
  hideOpacity,
}: Props) {
  const [hexInput, setHexInput] = useState(color.replace('#', ''));
  useEffect(() => {
    setHexInput(color.replace('#', ''));
  }, [color]);

  return (
    <div className="px-3.5 pb-2.5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => pickerRef.current?.click()}
          className="w-9 h-9 rounded-xl border transition-all hover:scale-105 flex-shrink-0"
          style={{
            background: color,
            borderColor: pt.swatchBorder,
          }}
        />
        <input
          ref={pickerRef}
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="sr-only"
        />
        <div className="flex-1 flex items-center gap-1.5">
          <span
            className="text-[10px] font-medium"
            style={{ color: pt.label.muted }}
          >
            #
          </span>
          <input
            value={hexInput}
            onChange={(e) => {
              const v = e.target.value
                .replace(/[^0-9a-fA-F]/g, '')
                .slice(0, 6);
              setHexInput(v);
              if (v.length === 6) onColorChange(`#${v}`);
            }}
            className="flex-1 text-xs font-mono px-2 py-1.5 rounded-lg"
            style={{
              background: pt.input.bg,
              border: `1px solid ${pt.input.border}`,
              color: pt.input.text,
            }}
            maxLength={6}
          />
        </div>
      </div>
      {!hideOpacity && (
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-medium w-12"
            style={{ color: pt.label.muted }}
          >
            Opacite
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, transparent, ${color})`,
            }}
          />
          <span
            className="text-[10px] font-mono w-8 text-right"
            style={{ color: pt.text.secondary }}
          >
            {opacity}%
          </span>
        </div>
      )}
    </div>
  );
}
