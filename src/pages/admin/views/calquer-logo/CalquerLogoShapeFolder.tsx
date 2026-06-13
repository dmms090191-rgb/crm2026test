import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Folder, Pencil, Trash2 } from 'lucide-react';
import type { MaskShape, MaskFolder } from './calquer-logo-types';
import CalquerLogoShapeRow from './CalquerLogoShapeRow';

interface DropIndicator { shapeId: string; position: 'above' | 'below'; }

interface Props {
  folder: MaskFolder;
  shapes: MaskShape[];
  selectedId: string | null;
  dragId: string | null;
  dropIndicator: DropIndicator | null;
  folderDropTarget: string | null;
  onToggle: () => void;
  onRenameFolder: (name: string) => void;
  onDeleteFolder: () => void;
  onSelectShape: (id: string | null) => void;
  onDeleteShape: (id: string) => void;
  onRenameShape: (id: string, name: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverShape: (shapeId: string, position: 'above' | 'below') => void;
  onDragOverFolder: (folderId: string) => void;
  onDragLeaveFolder: () => void;
  onDrop: () => void;
}

export default function CalquerLogoShapeFolder({
  folder, shapes, selectedId, dragId, dropIndicator, folderDropTarget,
  onToggle, onRenameFolder, onDeleteFolder,
  onSelectShape, onDeleteShape, onRenameShape,
  onDragStart, onDragEnd, onDragOverShape, onDragOverFolder, onDragLeaveFolder, onDrop,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const startRename = () => { setEditValue(folder.name); setEditing(true); };
  const commitRename = () => { setEditing(false); const t = editValue.trim(); if (t && t !== folder.name) onRenameFolder(t); };
  const canDelete = shapes.length === 0;
  const isDropTarget = folderDropTarget === folder.id && dragId && !shapes.find(s => s.id === dragId);

  const handleHeaderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOverFolder(folder.id);
  };

  const handleHeaderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop();
  };

  const handleEmptyDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOverFolder(folder.id);
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isDropTarget ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.06)'}` }}>
      <div className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer group"
        style={{ background: isDropTarget ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)' }}
        onClick={onToggle}
        onDragOver={handleHeaderDragOver}
        onDragLeave={onDragLeaveFolder}
        onDrop={handleHeaderDrop}>
        {folder.expanded
          ? <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.6)' }} />
          : <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.6)' }} />}
        {folder.expanded
          ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(96,165,250,0.7)' }} />
          : <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(96,165,250,0.7)' }} />}
        {editing ? (
          <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
            onBlur={commitRename} onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 text-[11px] font-medium bg-transparent border-b outline-none px-0"
            style={{ color: 'rgba(226,232,240,0.9)', borderColor: 'rgba(59,130,246,0.5)' }}
            onClick={e => e.stopPropagation()} />
        ) : (
          <span className="flex-1 text-[11px] font-medium truncate"
            onDoubleClick={e => { e.stopPropagation(); startRename(); }}
            style={{ color: 'rgba(226,232,240,0.9)' }}>
            {folder.name}
          </span>
        )}
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.6)' }}>
          {shapes.length}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); startRename(); }} className="p-0.5 rounded"
            style={{ color: 'rgba(148,163,184,0.7)' }} title="Renommer"><Pencil className="w-3 h-3" /></button>
          <button onClick={e => { e.stopPropagation(); if (canDelete) onDeleteFolder(); }}
            className="p-0.5 rounded" title={canDelete ? 'Supprimer' : 'Videz le dossier'}
            style={{ color: canDelete ? 'rgba(239,68,68,0.7)' : 'rgba(239,68,68,0.25)' }}>
            <Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      {folder.expanded && (
        <div className="px-1.5 pb-1.5 pt-0.5 space-y-0.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
          {shapes.length === 0 ? (
            <div className="text-center py-3" onDragOver={handleEmptyDragOver} onDrop={handleHeaderDrop}>
              <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>Vide</p>
            </div>
          ) : shapes.map((shape, idx) => (
            <CalquerLogoShapeRow key={shape.id} shape={shape} index={idx}
              selected={selectedId === shape.id}
              onSelect={() => onSelectShape(shape.id === selectedId ? null : shape.id)}
              onDelete={() => onDeleteShape(shape.id)}
              onRename={(name) => onRenameShape(shape.id, name)}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
              onDragOver={(_, pos) => onDragOverShape(shape.id, pos)}
              onDrop={onDrop}
              showInsertAbove={dropIndicator?.shapeId === shape.id && dropIndicator.position === 'above'}
              showInsertBelow={dropIndicator?.shapeId === shape.id && dropIndicator.position === 'below'} />
          ))}
        </div>
      )}
    </div>
  );
}
