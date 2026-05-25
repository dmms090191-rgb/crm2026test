import {
  ChevronUp, ChevronDown, GripVertical, Lock, EyeOff, Sparkles,
  Pencil, Eye, Trash2, X, Check, Link as LinkIcon, Type,
} from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';
import type { ColumnDef } from './useColumnOrder';
import { FIELD_TYPES } from './columnModalTypes';
import { ROW_H } from './TabColumnsHelpers';

interface TabColumnRowProps {
  col: ColumnDef;
  idx: number;
  totalCount: number;
  isHidden: boolean;
  isOver: boolean;
  editingKey: string | null;
  editLabel: string;
  renaming: boolean;
  confirmDeleteKey: string | null;
  deleting: string | null;
  t: ThemeTokens;
  onRename?: (key: string, newLabel: string) => Promise<void>;
  onDelete?: (key: string) => Promise<void>;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
  onToggleHidden: (key: string) => void;
  onStartEdit: (col: ColumnDef) => void;
  onCancelEdit: () => void;
  onEditLabelChange: (val: string) => void;
  onConfirmRename: () => void;
  onSetConfirmDelete: (key: string | null) => void;
  onConfirmDelete: (key: string) => void;
}

function TypeBadge({ fieldType, t }: { fieldType?: string; t: ThemeTokens }) {
  if (!fieldType || fieldType === 'text') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
        <Type className="w-2.5 h-2.5" />Texte
      </span>
    );
  }
  if (fieldType === 'url') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>
        <LinkIcon className="w-2.5 h-2.5" />Lien
      </span>
    );
  }
  const ft = FIELD_TYPES.find(f => f.value === fieldType);
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
      {ft?.label ?? fieldType}
    </span>
  );
}

export default function TabColumnRow({
  col, idx, totalCount, isHidden, isOver,
  editingKey, editLabel, renaming, confirmDeleteKey, deleting, t,
  onRename, onDelete,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onMoveUp, onMoveDown, onToggleHidden,
  onStartEdit, onCancelEdit, onEditLabelChange, onConfirmRename,
  onSetConfirmDelete, onConfirmDelete,
}: TabColumnRowProps) {
  const isRequired = !!col.required;
  const isCustom = !!col.isCustom;
  const isEditing = editingKey === col.key;
  const isConfirmingDelete = confirmDeleteKey === col.key;
  const isDeletable = !isRequired;
  const canHide = !isRequired;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, idx)}
      onDragOver={e => onDragOver(e, idx)}
      onDrop={e => onDrop(e, idx)}
      onDragEnd={onDragEnd}
      className={`flex flex-wrap sm:flex-nowrap items-center gap-2 px-3 py-2 rounded-xl transition-all duration-150 group ${ROW_H}`}
      style={{
        background: isOver ? t.accent.bg : t.surface.primary,
        border: `1px solid ${isOver ? t.accent.border : t.surface.border}`,
        opacity: isHidden ? 0.55 : 1,
        cursor: 'grab',
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <GripVertical className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: t.text.tertiary }} />
        <span className="text-[11px] font-bold w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
          {idx + 1}
        </span>

        {isEditing ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              autoFocus
              value={editLabel}
              onChange={e => onEditLabelChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onConfirmRename(); if (e.key === 'Escape') onCancelEdit(); }}
              className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs outline-none"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.accent.border}`, color: t.text.primary }}
            />
            <button onClick={onConfirmRename} disabled={!editLabel.trim() || renaming} className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 disabled:opacity-30" style={{ background: '#22c55e', color: '#fff' }}>
              <Check className="w-3 h-3" />
            </button>
            <button onClick={onCancelEdit} className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-xs font-semibold truncate min-w-0" style={{ color: isHidden ? t.text.tertiary : t.text.primary }}>{col.label}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isRequired && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  <Lock className="w-2.5 h-2.5" /><span className="hidden sm:inline">Protegee</span>
                </span>
              )}
              {isCustom && <TypeBadge fieldType={col.fieldType} t={t} />}
              {isCustom && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>
                  <Sparkles className="w-2.5 h-2.5" /><span className="hidden sm:inline">Perso</span>
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {!isEditing && !isConfirmingDelete && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onRename && (
            <button
              onClick={e => { e.stopPropagation(); onStartEdit(col); }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
              onMouseEnter={e => { e.currentTarget.style.background = t.accent.bg; e.currentTarget.style.color = t.accent.text; e.currentTarget.style.borderColor = t.accent.border; }}
              onMouseLeave={e => { e.currentTarget.style.background = t.surface.secondary; e.currentTarget.style.color = t.text.secondary; e.currentTarget.style.borderColor = t.surface.border; }}
            >
              <Pencil className="w-3 h-3" /><span className="hidden sm:inline">Modifier</span>
            </button>
          )}

          {canHide ? (
            <button
              onClick={e => { e.stopPropagation(); onToggleHidden(col.key); }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={isHidden
                ? { background: 'rgba(34,197,94,0.08)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }
                : { background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' }
              }
              onMouseEnter={e => { e.currentTarget.style.background = isHidden ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isHidden ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'; }}
            >
              {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isHidden ? 'Afficher' : 'Masquer'}</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold opacity-40" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.15)' }}>
              <Eye className="w-3 h-3" /><span className="hidden sm:inline">Visible</span>
            </div>
          )}

          {isDeletable && onDelete ? (
            <button
              onClick={e => { e.stopPropagation(); onSetConfirmDelete(col.key); }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
            >
              <Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Supprimer</span>
            </button>
          ) : !isRequired ? <div className="w-[30px] sm:w-[88px]" /> : null}

          <div className="flex items-center gap-0.5 ml-0.5">
            <button onClick={e => { e.stopPropagation(); onMoveUp(col.key); }} disabled={idx === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20" style={{ color: t.text.secondary }}
              onMouseEnter={e => { if (idx > 0) e.currentTarget.style.background = t.surface.secondary; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }} title="Monter"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={e => { e.stopPropagation(); onMoveDown(col.key); }} disabled={idx === totalCount - 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20" style={{ color: t.text.secondary }}
              onMouseEnter={e => { if (idx < totalCount - 1) e.currentTarget.style.background = t.surface.secondary; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }} title="Descendre"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {!isEditing && isConfirmingDelete && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex flex-col gap-0 mr-1">
            <span className="text-[10px] font-semibold" style={{ color: '#ef4444' }}>Supprimer cette colonne ?</span>
            <span className="text-[9px]" style={{ color: t.text.tertiary }}>{isCustom ? 'Cette colonne et ses valeurs seront supprimees definitivement.' : 'Cette colonne sera retiree du tableau.'}</span>
          </div>
          <button onClick={e => { e.stopPropagation(); onConfirmDelete(col.key); }} disabled={deleting === col.key}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50" style={{ background: '#ef4444', color: '#fff' }}>
            {deleting === col.key ? '...' : 'Confirmer'}
          </button>
          <button onClick={e => { e.stopPropagation(); onSetConfirmDelete(null); }}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors" style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
