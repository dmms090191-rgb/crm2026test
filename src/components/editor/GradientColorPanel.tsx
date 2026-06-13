import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowRightLeft } from 'lucide-react';
import type { EditorPanelTokens } from './editorPanelTheme';

const DIRECTION_BUTTONS: { deg: number; label: string; icon: typeof ArrowUp }[] = [
  { deg: 0, label: 'Haut', icon: ArrowUp },
  { deg: 180, label: 'Bas', icon: ArrowDown },
  { deg: 270, label: 'Gauche', icon: ArrowLeft },
  { deg: 90, label: 'Droite', icon: ArrowRight },
];

interface Props {
  color1: string;
  color2: string;
  direction: number;
  onColor1Change: (c: string) => void;
  onColor2Change: (c: string) => void;
  onDirectionChange: (deg: number) => void;
  onInvert: () => void;
  picker1Ref: React.RefObject<HTMLInputElement | null>;
  picker2Ref: React.RefObject<HTMLInputElement | null>;
  pt: EditorPanelTokens;
}

export default function GradientColorPanel({
  color1,
  color2,
  direction,
  onColor1Change,
  onColor2Change,
  onDirectionChange,
  onInvert,
  picker1Ref,
  picker2Ref,
  pt,
}: Props) {
  const [hex1, setHex1] = useState(color1.replace('#', ''));
  const [hex2, setHex2] = useState(color2.replace('#', ''));
  useEffect(() => { setHex1(color1.replace('#', '')); }, [color1]);
  useEffect(() => { setHex2(color2.replace('#', '')); }, [color2]);

  return (
    <div className="px-3.5 pb-2.5 flex flex-col gap-2.5">
      <div
        className="h-10 rounded-xl border"
        style={{
          background: `linear-gradient(${direction}deg, ${color1}, ${color2})`,
          borderColor: pt.swatchBorder,
        }}
      />
      <ColorRow
        label="Couleur 1"
        color={color1}
        hex={hex1}
        onHexChange={(v) => { setHex1(v); if (v.length === 6) onColor1Change(`#${v}`); }}
        onPickerClick={() => picker1Ref.current?.click()}
        pickerRef={picker1Ref}
        onColorChange={onColor1Change}
        pt={pt}
      />
      <ColorRow
        label="Couleur 2"
        color={color2}
        hex={hex2}
        onHexChange={(v) => { setHex2(v); if (v.length === 6) onColor2Change(`#${v}`); }}
        onPickerClick={() => picker2Ref.current?.click()}
        pickerRef={picker2Ref}
        onColorChange={onColor2Change}
        pt={pt}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-medium" style={{ color: pt.label.muted }}>
          Direction
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {DIRECTION_BUTTONS.map(({ deg, label, icon: Icon }) => {
            const active = direction === deg;
            return (
              <button
                key={deg}
                onClick={() => onDirectionChange(deg)}
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: active
                    ? `linear-gradient(135deg, ${pt.accent.bg}, ${pt.accent.bgHover})`
                    : pt.surface.secondary,
                  color: active ? pt.accent.text : pt.text.secondary,
                  border: `1px solid ${active ? pt.accent.border : pt.surface.border}`,
                  boxShadow: active ? `0 2px 8px ${pt.accent.bg}` : 'none',
                }}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={onInvert}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.02]"
          style={{
            background: pt.surface.secondary,
            color: pt.text.secondary,
            border: `1px solid ${pt.surface.border}`,
          }}
        >
          <ArrowRightLeft className="w-3 h-3" />
          Inverser
        </button>
      </div>
    </div>
  );
}

function ColorRow({
  label,
  color,
  hex,
  onHexChange,
  onPickerClick,
  pickerRef,
  onColorChange,
  pt,
}: {
  label: string;
  color: string;
  hex: string;
  onHexChange: (v: string) => void;
  onPickerClick: () => void;
  pickerRef: React.RefObject<HTMLInputElement | null>;
  onColorChange: (c: string) => void;
  pt: EditorPanelTokens;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-[10px] font-medium"
        style={{ color: pt.label.muted }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPickerClick}
          className="w-7 h-7 rounded-lg border transition-all hover:scale-105 flex-shrink-0"
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
            value={hex}
            onChange={(e) => {
              onHexChange(
                e.target.value
                  .replace(/[^0-9a-fA-F]/g, '')
                  .slice(0, 6),
              );
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
    </div>
  );
}
