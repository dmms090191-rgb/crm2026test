import SavedColorSwatchItem from './SavedColorSwatchItem';
import { type SavedColor } from './editorSavedStore';
import { type getEditorPanelTokens } from './editorPanelTheme';

const COLS = 5;
const MIN_SLOTS = 4;

function EmptySwatch({ pt }: { pt: ReturnType<typeof getEditorPanelTokens> }) {
  return (
    <div
      className="w-full aspect-square rounded-lg"
      style={{
        border: `1px dashed ${pt.surface.border}`,
        background: pt.surface.secondary,
      }}
    />
  );
}

export default function SavedSwatchGrid({
  items,
  label,
  onPreview,
  onRemove,
  pt,
}: {
  items: SavedColor[];
  label: string;
  onPreview: (s: SavedColor) => void;
  onRemove: (id: string) => void;
  pt: ReturnType<typeof getEditorPanelTokens>;
}) {
  const reversed = [...items].reverse();
  const filledCount = reversed.length;
  const minSlots = Math.max(MIN_SLOTS, filledCount);
  const totalSlots = Math.ceil(minSlots / COLS) * COLS;
  const emptyCount = totalSlots - filledCount;

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {reversed.map((item, idx) => (
        <SavedColorSwatchItem
          key={item.id}
          item={item}
          index={idx + 1}
          total={filledCount}
          label={label}
          onPreview={onPreview}
          onRemove={onRemove}
          pt={pt}
        />
      ))}
      {Array.from({ length: emptyCount }, (_, i) => (
        <EmptySwatch key={`empty-${i}`} pt={pt} />
      ))}
    </div>
  );
}
