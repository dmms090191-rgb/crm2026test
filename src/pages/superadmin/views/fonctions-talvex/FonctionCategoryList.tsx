import { useState } from 'react';
import { Plus, Pencil, Trash2, FolderOpen, ChevronRight, CheckSquare, X } from 'lucide-react';
import type { TalvexCategorie, TalvexFonction } from './fonctionsTalvexTypes';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CheckBox from '../../../admin/views/crm/CheckBox';

interface Props {
  categories: TalvexCategorie[];
  fonctions: TalvexFonction[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (cat: TalvexCategorie) => void;
  onDelete: (cat: TalvexCategorie) => void;
  catSelectMode: boolean;
  catCheckedIds: Set<string>;
  onToggleCatSelectMode: () => void;
  onToggleCatCheck: (id: string) => void;
  onToggleCatAll: () => void;
  catAllChecked: boolean;
  catSomeChecked: boolean;
  onBulkDeleteCats: () => void;
}

export default function FonctionCategoryList({ categories, fonctions, selectedId, onSelect, onAdd, onEdit, onDelete, catSelectMode, catCheckedIds, onToggleCatSelectMode, onToggleCatCheck, onToggleCatAll, catAllChecked, catSomeChecked, onBulkDeleteCats }: Props) {
  const t = useThemeTokens();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const countFor = (catId: string) => fonctions.filter(f => f.categoryId === catId).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>Categories</span>
        <button onClick={onAdd} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }} title="Ajouter une categorie">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selection bar */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <button onClick={onToggleCatSelectMode}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={catSelectMode ? {
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
          } : {
            background: t.surface.hover, border: `1px solid ${t.surface.borderLight}`, color: t.text.secondary,
          }}>
          {catSelectMode ? <><X className="w-3 h-3" />Annuler</> : <><CheckSquare className="w-3 h-3" />Selectionner</>}
        </button>

        {catSelectMode && (
          <label className="flex items-center gap-1 cursor-pointer select-none px-1.5 py-1 rounded-md"
            style={{ background: t.surface.hover, border: `1px solid ${t.surface.borderLight}` }}>
            <CheckBox checked={catAllChecked} indeterminate={!catAllChecked && catSomeChecked} onChange={onToggleCatAll} />
            <span className="text-[10px] font-medium" style={{ color: t.text.secondary }}>Tout</span>
          </label>
        )}

        {catSelectMode && catCheckedIds.size > 0 && (
          <button onClick={onBulkDeleteCats}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}>
            <Trash2 className="w-3 h-3" />{catCheckedIds.size}
          </button>
        )}
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto py-1 px-1.5 space-y-0.5">
        {categories.map(cat => {
          const isActive = selectedId === cat.id;
          const isHovered = hoveredId === cat.id;
          const isChecked = catCheckedIds.has(cat.id);
          const count = countFor(cat.id);

          return (
            <div key={cat.id}
              className="group flex items-center gap-1.5 rounded-lg px-2.5 py-2 cursor-pointer transition-all duration-150"
              style={{
                background: isChecked ? 'rgba(239,68,68,0.04)' : isActive ? t.surface.active : isHovered ? t.surface.hover : 'transparent',
                color: isActive ? t.text.primary : t.text.secondary,
                border: isChecked ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
              }}
              onClick={() => catSelectMode ? onToggleCatCheck(cat.id) : onSelect(cat.id)}
              onMouseEnter={() => setHoveredId(cat.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {catSelectMode ? (
                <div className="flex-shrink-0" onClick={e => { e.stopPropagation(); onToggleCatCheck(cat.id); }}>
                  <CheckBox checked={isChecked} onChange={() => onToggleCatCheck(cat.id)} />
                </div>
              ) : (
                <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
              )}

              <span className="text-xs font-medium truncate flex-1">{cat.label}</span>
              <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 flex-shrink-0"
                style={{ background: t.surface.border, color: t.text.tertiary }}>{count}</span>

              {!catSelectMode && isActive && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-40" />}

              {!catSelectMode && (isHovered || isActive) && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); onEdit(cat); }}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{ color: t.text.tertiary }} title="Modifier">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); onDelete(cat); }}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{ color: '#ef4444' }} title="Supprimer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
