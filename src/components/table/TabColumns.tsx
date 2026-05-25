import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { PlusCircle, X, Eye, EyeOff } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';
import type { ColumnDef } from './useColumnOrder';
import type { CustomColumnInput, ColumnModalConfig } from './columnModalTypes';
import TabColumnRow from './TabColumnRow';
import AddColumnForm from './AddColumnForm';
import DesktopPreviewBlock from './DesktopPreviewBlock';

interface Props {
  columns: ColumnDef[];
  initialOrder: string[];
  initialHidden: string[];
  onCreate?: (col: CustomColumnInput) => Promise<void>;
  onDelete?: (key: string) => Promise<void>;
  onRename?: (key: string, newLabel: string) => Promise<void>;
  onSave: (config: ColumnModalConfig) => void;
  t: ThemeTokens;
}

export default function TabColumns({
  columns, initialOrder, initialHidden,
  onCreate, onDelete, onRename, onSave, t,
}: Props) {
  const [draftOrder, setDraftOrder] = useState<string[]>(() => [...initialOrder]);
  const [draftHidden, setDraftHidden] = useState<Set<string>>(() => new Set(initialHidden));

  const colMap = useMemo(() => new Map(columns.map(c => [c.key, c])), [columns]);
  const allCols = useMemo(() => draftOrder.map(k => colMap.get(k)).filter(Boolean) as ColumnDef[], [draftOrder, colMap]);

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');
  const [creating, setCreating] = useState(false);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const hiddenCount = allCols.filter(c => draftHidden.has(c.key)).length;
  const visibleCount = allCols.length - hiddenCount;

  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    saveRef.current({ order: draftOrder, hiddenDesktop: [...draftHidden] });
  }, [draftOrder, draftHidden]);

  useEffect(() => {
    const newKeys = columns.map(c => c.key);
    const existing = new Set(draftOrder);
    const added = newKeys.filter(k => !existing.has(k));
    if (added.length > 0) setDraftOrder(prev => [...prev, ...added]);
  }, [columns, draftOrder]);

  const moveUp = useCallback((key: string) => {
    setDraftOrder(prev => {
      const idx = prev.indexOf(key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((key: string) => {
    setDraftOrder(prev => {
      const idx = prev.indexOf(key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = dragIdx.current;
    if (fromIdx !== null && fromIdx !== toIdx) {
      setDraftOrder(prev => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
    }
    dragIdx.current = null;
    setOverIdx(null);
  };

  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null); };

  const toggleHidden = useCallback((key: string) => {
    setDraftHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleCreate = async () => {
    if (!onCreate || !newLabel.trim() || creating) return;
    setCreating(true);
    try {
      await onCreate({ label: newLabel.trim(), fieldType: newType, visibleDesktop: true });
      setNewLabel(''); setNewType('text'); setShowAddForm(false);
    } finally { setCreating(false); }
  };

  const startEdit = (col: ColumnDef) => { setEditingKey(col.key); setEditLabel(col.label); };
  const cancelEdit = () => { setEditingKey(null); setEditLabel(''); };

  const handleRename = async () => {
    if (!onRename || !editingKey || !editLabel.trim() || renaming) return;
    setRenaming(true);
    try { await onRename(editingKey, editLabel.trim()); setEditingKey(null); setEditLabel(''); }
    finally { setRenaming(false); }
  };

  const handleDelete = async (key: string) => {
    if (!onDelete) return;
    setDeleting(key);
    try {
      await onDelete(key);
      setDraftOrder(prev => prev.filter(k => k !== key));
      setDraftHidden(prev => { const n = new Set(prev); n.delete(key); return n; });
    } finally { setDeleting(null); setConfirmDeleteKey(null); }
  };

  const visibleCols = useMemo(() =>
    draftOrder.filter(k => !draftHidden.has(k)).map(k => colMap.get(k)).filter(Boolean) as ColumnDef[]
  , [draftOrder, draftHidden, colMap]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[11px]" style={{ color: t.text.tertiary }}>
            Utilise Modifier pour renommer, Masquer pour cacher une colonne, Supprimer pour retirer definitivement. Les colonnes protegees (Statut, Actions, Acces, IA) ne peuvent pas etre supprimees.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              <Eye className="w-2.5 h-2.5" />{visibleCount}
            </span>
            {hiddenCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
                <EyeOff className="w-2.5 h-2.5" />{hiddenCount}
              </span>
            )}
          </div>
        </div>
        {onCreate && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all flex-shrink-0"
            style={{ background: showAddForm ? t.surface.tertiary : 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
            {showAddForm ? 'Fermer' : 'Ajouter une colonne'}
          </button>
        )}
      </div>

      {showAddForm && onCreate && (
        <AddColumnForm
          show={showAddForm} newLabel={newLabel} newType={newType} creating={creating} t={t}
          onToggle={() => setShowAddForm(!showAddForm)}
          onLabelChange={setNewLabel} onTypeChange={setNewType}
          onCreate={handleCreate}
          onCancel={() => { setShowAddForm(false); setNewLabel(''); setNewType('text'); }}
        />
      )}

      <div className="space-y-1">
        {allCols.map((col, idx) => (
          <TabColumnRow
            key={col.key} col={col} idx={idx} totalCount={allCols.length}
            isHidden={draftHidden.has(col.key)} isOver={overIdx === idx}
            editingKey={editingKey} editLabel={editLabel} renaming={renaming}
            confirmDeleteKey={confirmDeleteKey} deleting={deleting} t={t}
            onRename={onRename} onDelete={onDelete}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
            onMoveUp={moveUp} onMoveDown={moveDown} onToggleHidden={toggleHidden}
            onStartEdit={startEdit} onCancelEdit={cancelEdit}
            onEditLabelChange={setEditLabel} onConfirmRename={handleRename}
            onSetConfirmDelete={setConfirmDeleteKey} onConfirmDelete={handleDelete}
          />
        ))}
        {allCols.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: t.text.tertiary }}>Aucune colonne</p>
        )}
      </div>

      <DesktopPreviewBlock visibleCols={visibleCols} t={t} />
    </div>
  );
}
