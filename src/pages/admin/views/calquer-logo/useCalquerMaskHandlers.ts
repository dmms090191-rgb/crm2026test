import { useCallback } from 'react';
import type { MaskState, MaskShape, MaskTool, MaskMode } from './calquer-logo-types';

type SetMask = React.Dispatch<React.SetStateAction<MaskState>>;

export function useCalquerMaskHandlers(setMask: SetMask, setMoveMode: (fn: (v: boolean) => boolean) => void) {
  const handleToolChange = useCallback((t: MaskTool) => setMask(m => ({ ...m, tool: t })), [setMask]);
  const handleModeChange = useCallback((mode: MaskMode) => setMask(m => ({
    ...m, mode, strokeColor: mode === 'garder' ? '#22c55e' : '#ef4444',
  })), [setMask]);
  const handleSizeChange = useCallback((v: number) => setMask(m => {
    if (m.selectedId) return { ...m, shapes: m.shapes.map(s => s.id === m.selectedId ? { ...s, size: v } : s), size: v };
    return { ...m, size: v };
  }), [setMask]);
  const handleAddShape = useCallback((s: MaskShape) => setMask(m => ({ ...m, shapes: [...m.shapes, s] })), [setMask]);
  const handleSelectShape = useCallback((id: string | null) => { setMask(m => ({ ...m, selectedId: id })); if (!id) setMoveMode(() => false); }, [setMask, setMoveMode]);
  const handleDeleteSelected = useCallback(() => { setMask(m => ({ ...m, shapes: m.shapes.filter(s => s.id !== m.selectedId), selectedId: null })); setMoveMode(() => false); }, [setMask, setMoveMode]);
  const handleMoveModeToggle = useCallback(() => setMoveMode(v => !v), [setMoveMode]);
  const handleDeleteShape = useCallback((id: string) => { setMask(m => ({ ...m, shapes: m.shapes.filter(s => s.id !== id), selectedId: m.selectedId === id ? null : m.selectedId })); }, [setMask]);
  const handleMoveShape = useCallback((id: string, x: number, y: number) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === id ? { ...s, x, y } : s) })); }, [setMask]);
  const handleReset = useCallback(() => setMask(m => ({ ...m, shapes: [], selectedId: null })), [setMask]);
  const handleUpdateShape = useCallback((id: string, patch: Partial<MaskShape>) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === id ? { ...s, ...patch } : s) })); }, [setMask]);

  const handleDuplicateShape = useCallback(() => {
    setMask(m => {
      if (!m.selectedId) return m;
      const orig = m.shapes.find(s => s.id === m.selectedId);
      if (!orig) return m;
      const dup: MaskShape = { ...orig, id: `shape_dup_${Date.now()}`, x: orig.x + 20, y: orig.y + 20, name: undefined };
      return { ...m, shapes: [...m.shapes, dup], selectedId: dup.id };
    });
  }, [setMask]);

  const handleRenameShape = useCallback((id: string, name: string) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === id ? { ...s, name } : s) })); }, [setMask]);
  const handleColorChange = useCallback((id: string, color: string) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === id ? { ...s, color } : s), strokeColor: color })); }, [setMask]);
  const handleRenameFolder = useCallback((id: string, name: string) => { setMask(m => ({ ...m, folders: m.folders.map(f => f.id === id ? { ...f, name } : f) })); }, [setMask]);
  const handleToggleFolder = useCallback((id: string) => { setMask(m => ({ ...m, folders: m.folders.map(f => f.id === id ? { ...f, expanded: !f.expanded } : f) })); }, [setMask]);
  const handleDeleteFolder = useCallback((id: string) => { setMask(m => { if (m.shapes.some(s => s.folderId === id)) return m; return { ...m, folders: m.folders.filter(f => f.id !== id) }; }); }, [setMask]);
  const handleMoveToFolder = useCallback((shapeId: string, folderId: string | undefined) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === shapeId ? { ...s, folderId } : s) })); }, [setMask]);

  const handleReorderShape = useCallback((shapeId: string, targetShapeId: string | null, position: 'above' | 'below', targetFolderId: string | undefined) => {
    setMask(m => {
      const idx = m.shapes.findIndex(s => s.id === shapeId);
      if (idx === -1) return m;
      const shape = { ...m.shapes[idx], folderId: targetFolderId };
      const without = m.shapes.filter(s => s.id !== shapeId);
      if (!targetShapeId) return { ...m, shapes: [...without, shape] };
      const targetIdx = without.findIndex(s => s.id === targetShapeId);
      if (targetIdx === -1) return { ...m, shapes: [...without, shape] };
      const insertAt = position === 'below' ? targetIdx + 1 : targetIdx;
      const result = [...without]; result.splice(insertAt, 0, shape);
      return { ...m, shapes: result };
    });
  }, [setMask]);

  return {
    handleToolChange, handleModeChange, handleSizeChange,
    handleAddShape, handleSelectShape, handleDeleteSelected, handleMoveModeToggle,
    handleDeleteShape, handleMoveShape, handleReset, handleUpdateShape,
    handleDuplicateShape, handleRenameShape, handleColorChange,
    handleRenameFolder, handleToggleFolder, handleDeleteFolder,
    handleMoveToFolder, handleReorderShape,
  };
}
