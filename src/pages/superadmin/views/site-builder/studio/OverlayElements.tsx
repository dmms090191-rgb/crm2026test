import type { OverlayButtonConfig, OverlayTextConfig } from './overlayElementTypes';
import { ensureGoogleFont } from '../../../../../components/editor/EditorTypographyFontRow';

export function OverlayButtonElement({ el, selected, onSelect, draggable, onDragStart }: {
  el: OverlayButtonConfig; selected: boolean; onSelect: () => void;
  draggable: boolean; onDragStart: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="absolute cursor-pointer select-none"
      style={{
        top: `${el.topPercent}%`,
        left: `${el.leftPercent}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onMouseDown={e => { if (draggable) { e.stopPropagation(); e.preventDefault(); onDragStart(e); } }}
    >
      <div
        className="px-6 py-3 text-sm font-semibold whitespace-nowrap"
        style={{
          background: el.bgColor,
          color: el.textColor,
          borderRadius: `${el.borderRadius}px`,
          boxShadow: selected ? '0 0 0 2px #0ea5e9, 0 0 12px rgba(14,165,233,0.4)' : 'none',
          cursor: draggable ? 'grab' : 'pointer',
        }}
      >
        {el.text}
      </div>
    </div>
  );
}

export function OverlayTextElement({ el, selected, onSelect, draggable, onDragStart }: {
  el: OverlayTextConfig; selected: boolean; onSelect: () => void;
  draggable: boolean; onDragStart: (e: React.MouseEvent) => void;
}) {
  if (el.fontFamily) ensureGoogleFont(el.fontFamily);

  return (
    <div
      className="absolute cursor-pointer select-none"
      style={{
        top: `${el.topPercent}%`,
        left: `${el.leftPercent}%`,
        transform: 'translate(-50%, -50%)',
        textAlign: el.align,
      }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onMouseDown={e => { if (draggable) { e.stopPropagation(); e.preventDefault(); onDragStart(e); } }}
    >
      <span
        className="inline-block rounded-md whitespace-nowrap"
        style={{
          color: el.textColor,
          fontSize: `${el.fontSize}px`,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily ? `"${el.fontFamily}", sans-serif` : undefined,
          padding: '2px 4px',
          boxShadow: selected ? '0 0 0 2px #0ea5e9, 0 0 12px rgba(14,165,233,0.4)' : 'none',
          cursor: draggable ? 'grab' : 'pointer',
        }}
      >
        {el.text}
      </span>
    </div>
  );
}
