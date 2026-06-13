import { useState, useCallback } from 'react';
import { Layers, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react';
import type { MaskShape, MaskFolder } from './calquer-logo-types';
import CalquerLogoShapeFolder from './CalquerLogoShapeFolder';
import CalquerLogoShapeRow from './CalquerLogoShapeRow';

interface DropIndicator { shapeId: string; position: 'above' | 'below'; }

interface Props {
  shapes: MaskShape[];
  selectedId: string | null;
  folders: MaskFolder[];
  onSelectShape: (id: string | null) => void;
  onDeleteShape: (id: string) => void;
  onRenameShape: (id: string, name: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onToggleFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveToFolder: (shapeId: string, folderId: string | undefined) => void;
  onReorderShape: (shapeId: string, targetShapeId: string | null, position: 'above' | 'below', targetFolderId: string | undefined) => void;
}

export default function CalquerLogoShapesPanel({
  shapes, selectedId, folders,
  onSelectShape, onDeleteShape, onRenameShape,
  onCreateFolder, onRenameFolder, onToggleFolder, onDeleteFolder,
  onMoveToFolder, onReorderShape,
}: Props) {
  const [unfoldedExpanded, setUnfoldedExpanded] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [folderDropTarget, setFolderDropTarget] = useState<string | null>(null);

  const unfoldedShapes = shapes.filter(s => !s.folderId);

  const handleDragStart = useCallback((id: string) => { setDragId(id); }, []);
  const handleDragEnd = useCallback(() => { setDragId(null); setDropIndicator(null); setFolderDropTarget(null); }, []);

  const handleDragOverShape = useCallback((shapeId: string, position: 'above' | 'below') => {
    setDropIndicator({ shapeId, position });
    setFolderDropTarget(null);
  }, []);

  const handleDragOverFolder = useCallback((folderId: string) => {
    setFolderDropTarget(folderId);
    setDropIndicator(null);
  }, []);

  const handleDragLeaveFolder = useCallback(() => { setFolderDropTarget(null); }, []);

  const handleDrop = useCallback(() => {
    if (!dragId) return;
    if (dropIndicator) {
      const targetShape = shapes.find(s => s.id === dropIndicator.shapeId);
      if (targetShape && targetShape.id !== dragId) {
        onReorderShape(dragId, dropIndicator.shapeId, dropIndicator.position, targetShape.folderId);
      }
    } else if (folderDropTarget) {
      onMoveToFolder(dragId, folderDropTarget);
    }
    setDragId(null); setDropIndicator(null); setFolderDropTarget(null);
  }, [dragId, dropIndicator, folderDropTarget, shapes, onReorderShape, onMoveToFolder]);

  const handleUnfoldedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setFolderDropTarget('__unfolded__');
    setDropIndicator(null);
  };

  const handleUnfoldedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragId) { onMoveToFolder(dragId, undefined); }
    setDragId(null); setDropIndicator(null); setFolderDropTarget(null);
  };

  const isUnfoldedTarget = folderDropTarget === '__unfolded__' && dragId && unfoldedShapes.every(s => s.id !== dragId);

  return (
    <div className="w-60 flex-shrink-0 flex flex-col border-l overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>

      <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Layers className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.7)' }} />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Formes
        </h3>
        {shapes.length > 0 && (
          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.7)' }}>
            {shapes.length}
          </span>
        )}
      </div>

      <div className="px-2 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={onCreateFolder}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors hover:bg-white/5"
          style={{ color: 'rgba(96,165,250,0.9)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <FolderPlus className="w-3 h-3" /> Dossier
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {shapes.length === 0 && folders.length === 0 ? <EmptyState /> : (
          <>
            {folders.map(folder => (
              <CalquerLogoShapeFolder key={folder.id} folder={folder}
                shapes={shapes.filter(s => s.folderId === folder.id)}
                selectedId={selectedId} dragId={dragId}
                dropIndicator={dropIndicator} folderDropTarget={folderDropTarget}
                onToggle={() => onToggleFolder(folder.id)}
                onRenameFolder={(name) => onRenameFolder(folder.id, name)}
                onDeleteFolder={() => onDeleteFolder(folder.id)}
                onSelectShape={onSelectShape} onDeleteShape={onDeleteShape}
                onRenameShape={onRenameShape}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                onDragOverShape={handleDragOverShape}
                onDragOverFolder={handleDragOverFolder}
                onDragLeaveFolder={handleDragLeaveFolder}
                onDrop={handleDrop} />
            ))}
            {unfoldedShapes.length > 0 && (
              <div className="rounded-lg overflow-hidden"
                style={{ border: `1px solid ${isUnfoldedTarget ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.06)'}` }}>
                <div className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer"
                  style={{ background: isUnfoldedTarget ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)' }}
                  onClick={() => setUnfoldedExpanded(v => !v)}
                  onDragOver={handleUnfoldedDragOver}
                  onDrop={handleUnfoldedDrop}>
                  {unfoldedExpanded
                    ? <ChevronDown className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.6)' }} />
                    : <ChevronRight className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.6)' }} />}
                  <span className="flex-1 text-[11px] font-medium" style={{ color: 'rgba(226,232,240,0.7)' }}>
                    Sans dossier
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.6)' }}>
                    {unfoldedShapes.length}
                  </span>
                </div>
                {unfoldedExpanded && (
                  <div className="px-1.5 pb-1.5 pt-0.5 space-y-0.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    {unfoldedShapes.map((shape, idx) => (
                      <CalquerLogoShapeRow key={shape.id} shape={shape} index={idx}
                        selected={selectedId === shape.id}
                        onSelect={() => onSelectShape(shape.id === selectedId ? null : shape.id)}
                        onDelete={() => onDeleteShape(shape.id)}
                        onRename={(name) => onRenameShape(shape.id, name)}
                        onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                        onDragOver={(_, pos) => handleDragOverShape(shape.id, pos)}
                        onDrop={handleDrop}
                        showInsertAbove={dropIndicator?.shapeId === shape.id && dropIndicator.position === 'above'}
                        showInsertBelow={dropIndicator?.shapeId === shape.id && dropIndicator.position === 'below'} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {unfoldedShapes.length === 0 && folders.length > 0 && (
              <div className="rounded-lg overflow-hidden"
                style={{ border: `1px solid ${isUnfoldedTarget ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.06)'}` }}
                onDragOver={handleUnfoldedDragOver} onDrop={handleUnfoldedDrop}>
                <div className="flex items-center gap-1.5 px-2.5 py-2"
                  style={{ background: isUnfoldedTarget ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)' }}>
                  <span className="flex-1 text-[11px] font-medium" style={{ color: 'rgba(226,232,240,0.5)' }}>
                    Sans dossier
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
        <Layers className="w-5 h-5" style={{ color: 'rgba(148,163,184,0.3)' }} />
      </div>
      <p className="text-[11px] font-medium" style={{ color: 'rgba(226,232,240,0.5)' }}>Aucune forme</p>
      <p className="text-[10px] mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
        Dessinez une forme sur le logo pour commencer.
      </p>
    </div>
  );
}