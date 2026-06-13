import { X } from 'lucide-react';
import { type SavedColor } from './editorSavedStore';
import type { EditorPanelTokens } from './editorPanelTheme';

export function getHexLabel(item: SavedColor): string {
  if (item.bg.type === 'solid')
    return (item.bg.color || '#000').toUpperCase();
  if (item.bg.gradient)
    return `${item.bg.gradient.color1.toUpperCase()} -> ${item.bg.gradient.color2.toUpperCase()}`;
  return '';
}

export function getSwatchBg(item: SavedColor): string {
  if (item.bg.type === 'solid') return item.bg.color || '#000';
  if (item.bg.gradient) {
    const { direction, color1, color2 } = item.bg.gradient;
    return `linear-gradient(${direction}deg, ${color1}, ${color2})`;
  }
  return '#000';
}

export default function SavedColorSwatchItem({
  item,
  index,
  total,
  label,
  onPreview,
  onRemove,
  pt,
}: {
  item: SavedColor;
  index: number;
  total: number;
  label: string;
  onPreview: (s: SavedColor) => void;
  onRemove: (id: string) => void;
  pt: EditorPanelTokens;
}) {
  const bg = getSwatchBg(item);
  const hex = getHexLabel(item);
  const ageLabel =
    index === 1 && total > 1
      ? 'plus recente'
      : index === total && total > 1
        ? 'plus ancienne'
        : null;
  const tooltip = `${label} ${index}${ageLabel ? ` -- ${ageLabel}` : ''}\n${hex}`;

  return (
    <div className="relative group">
      <button
        onClick={() => onPreview(item)}
        className="w-full aspect-square rounded-lg border transition-all hover:scale-105 hover:ring-1 hover:ring-offset-1"
        style={{
          background: bg,
          borderColor: pt.swatchBorder,
          ringColor: pt.accent.solid,
          ringOffsetColor: pt.panel.bg,
        }}
        title={tooltip}
      >
        <span
          className="absolute bottom-0.5 left-0.5 text-[7px] font-bold leading-none px-[3px] py-[1px] rounded"
          style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.80)' }}
        >
          {index}
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex transition-all"
        style={{
          background: pt.danger.bg,
          border: `1px solid ${pt.danger.border}`,
        }}
        title="Supprimer"
      >
        <X
          className="w-2 h-2"
          style={{ color: pt.danger.text }}
        />
      </button>
    </div>
  );
}
