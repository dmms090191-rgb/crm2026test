import { useState } from 'react';
import { Eye, EyeOff, Trash2, Palette } from 'lucide-react';
import type { SvgShape } from './calquer-logo-svg-decompose';

interface Props {
  shapes: SvgShape[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}

export default function CalquerLogoSvgShapesPanel({
  shapes, selectedId, onSelect, onToggleVisible, onDelete, onRename, onColorChange, onOpacityChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startRename = (s: SvgShape) => {
    setEditingId(s.id);
    setEditName(s.label);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const selected = selectedId ? shapes.find(s => s.id === selectedId) : null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'rgba(148,163,184,0.6)' }}>
        Formes detectees ({shapes.length})
      </h3>

      <div className="max-h-[200px] overflow-y-auto space-y-0.5 rounded-lg p-1"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {shapes.map(s => (
          <ShapeRow
            key={s.id}
            shape={s}
            selected={s.id === selectedId}
            editing={s.id === editingId}
            editName={editName}
            onEditNameChange={setEditName}
            onClick={() => onSelect(s.id === selectedId ? null : s.id)}
            onToggleVisible={() => onToggleVisible(s.id)}
            onDelete={() => onDelete(s.id)}
            onStartRename={() => startRename(s)}
            onCommitRename={commitRename}
          />
        ))}
        {shapes.length === 0 && (
          <p className="text-[10px] text-center py-3" style={{ color: 'rgba(148,163,184,0.4)' }}>
            Aucune forme
          </p>
        )}
      </div>

      {selected && (
        <ShapeDetail
          shape={selected}
          onColorChange={(c) => onColorChange(selected.id, c)}
          onOpacityChange={(o) => onOpacityChange(selected.id, o)}
        />
      )}
    </div>
  );
}

function ShapeRow({ shape, selected, editing, editName, onEditNameChange, onClick, onToggleVisible, onDelete, onStartRename, onCommitRename }: {
  shape: SvgShape; selected: boolean; editing: boolean; editName: string;
  onEditNameChange: (v: string) => void;
  onClick: () => void; onToggleVisible: () => void; onDelete: () => void;
  onStartRename: () => void; onCommitRename: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-150"
      style={{
        background: selected ? 'rgba(59,130,246,0.12)' : 'transparent',
        border: `1px solid ${selected ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
        opacity: shape.visible ? 1 : 0.4,
      }}
      onClick={onClick}
    >
      <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: shape.color || '#888' }} />

      {editing ? (
        <input
          className="flex-1 min-w-0 text-[10px] bg-transparent border-b outline-none px-0.5"
          style={{ borderColor: 'rgba(59,130,246,0.4)', color: 'rgba(226,232,240,0.9)' }}
          value={editName}
          onChange={e => onEditNameChange(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={e => e.key === 'Enter' && onCommitRename()}
          onClick={e => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <span
          className="flex-1 min-w-0 text-[10px] truncate"
          style={{ color: selected ? '#60a5fa' : 'rgba(226,232,240,0.7)' }}
          onDoubleClick={(e) => { e.stopPropagation(); onStartRename(); }}
        >
          {shape.label}
        </span>
      )}

      <span className="text-[8px] shrink-0 px-1 py-0.5 rounded"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.5)' }}>
        {shape.tag}
      </span>

      <button onClick={e => { e.stopPropagation(); onToggleVisible(); }}
        className="shrink-0 p-0.5 rounded hover:bg-white/5 transition-colors">
        {shape.visible ? (
          <Eye className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.5)' }} />
        ) : (
          <EyeOff className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.3)' }} />
        )}
      </button>

      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 p-0.5 rounded hover:bg-red-500/10 transition-colors">
        <Trash2 className="w-3 h-3" style={{ color: 'rgba(239,68,68,0.5)' }} />
      </button>
    </div>
  );
}

function ShapeDetail({ shape, onColorChange, onOpacityChange }: {
  shape: SvgShape;
  onColorChange: (c: string) => void;
  onOpacityChange: (o: number) => void;
}) {
  const opacityPct = Math.round(shape.opacity * 100);

  return (
    <div className="rounded-lg p-2.5 space-y-2"
      style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
      <p className="text-[10px] font-semibold truncate" style={{ color: '#60a5fa' }}>
        {shape.label}
      </p>

      <div className="flex items-center gap-2">
        <Palette className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.5)' }} />
        <input
          type="color"
          value={shape.color || '#808080'}
          onChange={e => onColorChange(e.target.value)}
          className="w-6 h-6 rounded border-0 cursor-pointer"
          style={{ background: 'transparent' }}
        />
        <span className="text-[9px] font-mono" style={{ color: 'rgba(148,163,184,0.6)' }}>
          {shape.color}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px]" style={{ color: 'rgba(148,163,184,0.5)' }}>Opacite</span>
          <span className="text-[9px] font-mono px-1 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.8)' }}>
            {opacityPct}%
          </span>
        </div>
        <input type="range" min={0} max={100} value={opacityPct}
          onChange={e => onOpacityChange(Number(e.target.value) / 100)}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #3b82f6 ${opacityPct}%, rgba(255,255,255,0.1) ${opacityPct}%)` }}
        />
      </div>

      <div className="flex gap-3 text-[8px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
        <span>Type: {shape.tag}</span>
        {shape.area > 0 && <span>Surface: {(shape.area * 100).toFixed(0)}%</span>}
      </div>
    </div>
  );
}
