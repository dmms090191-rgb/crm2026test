import { ChevronUp, ChevronDown, Pencil, Trash2, Check, Lock, GripVertical } from 'lucide-react';
import { type ThemeCategoryRow, isProtectedCategory } from '../../../../hooks/useThemeCategories';

interface Props {
  cat: ThemeCategoryRow;
  idx: number;
  total: number;
  count: number;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export default function CategoryRow({ cat, idx, total, count, isEditing, editValue, onEditValueChange, onStartEdit, onConfirmEdit, onCancelEdit, onMoveUp, onMoveDown, onDelete, selectionMode, isSelected, onToggleSelect }: Props) {
  const isProtected = isProtectedCategory(cat);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl group transition-colors"
      style={{
        background: isSelected ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.025)',
        border: isSelected ? '1px solid rgba(59,130,246,0.20)' : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {selectionMode && (
        <button
          onClick={() => !isProtected && onToggleSelect()}
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
          style={{
            background: isSelected ? 'rgba(59,130,246,0.20)' : 'transparent',
            border: isSelected ? '1px solid rgba(59,130,246,0.40)' : '1px solid rgba(255,255,255,0.10)',
            opacity: isProtected ? 0.25 : 1,
            cursor: isProtected ? 'not-allowed' : 'pointer',
          }}
          disabled={isProtected}
        >
          {isSelected && <Check className="w-3 h-3 text-blue-400" />}
        </button>
      )}

      {!selectionMode && (
        <GripVertical className="w-3.5 h-3.5 text-white/15 flex-shrink-0" />
      )}

      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={e => onEditValueChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirmEdit(); if (e.key === 'Escape') onCancelEdit(); }}
          className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-white/[0.06] border border-blue-500/30 text-xs text-white/90 outline-none"
          autoFocus
        />
      ) : (
        <span
          className="flex-1 min-w-0 text-xs font-medium truncate"
          style={{ color: isProtected ? 'rgba(245,158,11,0.70)' : 'rgba(255,255,255,0.75)' }}
        >
          {cat.name}
        </span>
      )}

      {isProtected && (
        <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(245,158,11,0.40)' }} />
      )}

      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 tabular-nums min-w-[22px] text-center"
        style={{
          background: count > 0 ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.04)',
          color: count > 0 ? '#60a5fa' : 'rgba(255,255,255,0.20)',
          border: count > 0 ? '1px solid rgba(59,130,246,0.15)' : '1px solid transparent',
        }}
      >
        {count}
      </span>

      {!selectionMode && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isEditing ? (
            <button onClick={onConfirmEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={onStartEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
          )}

          <button onClick={onMoveUp} disabled={idx === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          <button onClick={onMoveDown} disabled={idx === total - 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isProtected ? (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" title="Categorie protegee">
              <Lock className="w-3 h-3 text-white/10" />
            </div>
          ) : (
            <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Supprimer">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
