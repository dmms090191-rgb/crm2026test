import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Palette, FolderPlus, Plus, Pencil, Trash2 } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';

interface Props {
  depth: number;
  tokens: ReturnType<typeof useThemeTokens>;
  onAddChild: () => void;
  onAddItem: () => void;
  onRename: () => void;
  onDelete: () => void;
  onOpenColorPicker: () => void;
}

export default function SystemCategoryActions({ depth, tokens, onAddChild, onAddItem, onRename, onDelete, onOpenColorPicker }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const items: { label: string; icon: React.ReactNode; action: () => void; danger?: boolean }[] = [];

  if (depth < 2) {
    items.push({ label: depth === 0 ? 'Sous-categorie' : 'Fonctionnalite', icon: <FolderPlus className="w-3.5 h-3.5" />, action: onAddChild });
  }
  items.push({ label: 'Item', icon: <Plus className="w-3.5 h-3.5" />, action: onAddItem });
  items.push({ label: 'Couleur', icon: <Palette className="w-3.5 h-3.5" />, action: onOpenColorPicker });
  items.push({ label: 'Renommer', icon: <Pencil className="w-3.5 h-3.5" />, action: onRename });
  items.push({ label: 'Supprimer', icon: <Trash2 className="w-3.5 h-3.5" />, action: onDelete, danger: true });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-md transition-colors"
        style={{ color: tokens.text.tertiary }}
        title="Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.action(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors hover:opacity-80"
              style={{ color: item.danger ? tokens.danger.text : tokens.text.secondary }}
            >
              <span style={{ color: item.danger ? tokens.danger.text : tokens.text.quaternary }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
