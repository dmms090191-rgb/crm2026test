import { useState, useRef, useEffect } from 'react';
import { Square, Circle, Minus, Trash2, Pencil } from 'lucide-react';
import type { MaskShape } from './calquer-logo-types';

const TOOL_LABELS: Record<string, string> = { rectangle: 'Rectangle', ellipse: 'Ellipse', line: 'Ligne' };

interface Props {
  shape: MaskShape;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, position: 'above' | 'below') => void;
  onDrop: () => void;
  showInsertAbove: boolean;
  showInsertBelow: boolean;
}

export default function CalquerLogoShapeRow({
  shape, index, selected, onSelect, onDelete, onRename,
  onDragStart, onDragEnd, onDragOver, onDrop,
  showInsertAbove, showInsertBelow,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const displayName = shape.name || `${TOOL_LABELS[shape.tool]} ${index + 1}`;
  const isKeep = shape.mode === 'garder';
  const shapeColor = shape.color || (isKeep ? '#22c55e' : '#ef4444');

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const startRename = () => { setEditValue(displayName); setEditing(true); };
  const commitRename = () => { setEditing(false); const t = editValue.trim(); if (t && t !== displayName) onRename(t); };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', shape.id);
    onDragStart(shape.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const midY = rect.top + rect.height / 2;
    onDragOver(e, e.clientY < midY ? 'above' : 'below');
  };

  return (
    <div ref={rowRef} className="relative" onDragOver={handleDragOver} onDrop={e => { e.preventDefault(); onDrop(); }}>
      {showInsertAbove && <div className="absolute top-0 left-2 right-2 h-0.5 rounded" style={{ background: '#3b82f6', zIndex: 20 }} />}
      <button
        draggable={!editing}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={onSelect}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-all duration-150 group cursor-grab active:cursor-grabbing"
        style={{
          background: selected ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${selected ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
        }}>
        <ShapeIcon tool={shape.tool} color={shapeColor} />
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {editing ? (
            <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={commitRename} onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
              className="flex-1 text-[11px] font-medium bg-transparent border-b outline-none px-0 py-0"
              style={{ color: '#93c5fd', borderColor: 'rgba(59,130,246,0.5)' }}
              onClick={e => e.stopPropagation()} />
          ) : (
            <span className="text-[11px] font-medium truncate"
              onDoubleClick={e => { e.stopPropagation(); startRename(); }}
              style={{ color: selected ? '#93c5fd' : 'rgba(226,232,240,0.8)' }}>
              {displayName}
            </span>
          )}
          <span className="text-[9px] font-semibold uppercase px-1 rounded"
            style={{ color: shapeColor, opacity: 0.7 }}>
            {isKeep ? 'G' : 'S'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <span onClick={e => { e.stopPropagation(); startRename(); }} className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
            style={{ color: 'rgba(148,163,184,0.7)' }} title="Renommer"><Pencil className="w-3 h-3" /></span>
          <span onClick={e => { e.stopPropagation(); onDelete(); }} className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
            style={{ color: 'rgba(239,68,68,0.5)' }} title="Supprimer"><Trash2 className="w-3 h-3" /></span>
        </div>
      </button>
      {showInsertBelow && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded" style={{ background: '#3b82f6', zIndex: 20 }} />}
    </div>
  );
}

function ShapeIcon({ tool, color }: { tool: string; color: string }) {
  const cls = "w-3 h-3";
  if (tool === 'rectangle') return <Square className={cls} style={{ color }} />;
  if (tool === 'ellipse') return <Circle className={cls} style={{ color }} />;
  return <Minus className={cls} style={{ color }} />;
}
