import { useRef, useCallback, useState } from 'react';
import type { MaskShape, MaskState } from './calquer-logo-types';
import { createDefaultShape } from './calquer-logo-types';
import { renderShapeSvg, pointsToSvgPath, bezierToSvgPath } from './calquer-logo-svg-helpers';

interface Props {
  mask: MaskState;
  moveMode: boolean;
  onAddShape: (shape: MaskShape) => void;
  onSelectShape: (id: string | null) => void;
  onMoveShape: (id: string, dx: number, dy: number) => void;
  onDeleteSelected: () => void;
}

let shapeCounter = 0;
function genId() { return `shape_${++shapeCounter}_${Date.now()}`; }

interface DragState { startX: number; startY: number; curX: number; curY: number }
interface MoveState { id: string; startX: number; startY: number; origX: number; origY: number }

export default function CalquerLogoMaskOverlay({ mask, moveMode, onAddShape, onSelectShape, onMoveShape, onDeleteSelected }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<DragState | null>(null);
  const [moving, setMoving] = useState<MoveState | null>(null);
  const [freePoints, setFreePoints] = useState<{ x: number; y: number }[]>([]);
  const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>([]);
  const [bezierPoints, setBezierPoints] = useState<{ x: number; y: number }[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const getSvgPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const isPointTool = mask.tool === 'polygon' || mask.tool === 'bezier';
  const isFreeTool = mask.tool === 'lasso' || mask.tool === 'eraser';

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pt = getSvgPoint(e);

    if (moveMode && mask.selectedId) {
      const shape = mask.shapes.find(s => s.id === mask.selectedId);
      if (shape && !shape.locked) {
        setMoving({ id: shape.id, startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y });
        return;
      }
    }

    if (isPointTool) return;

    onSelectShape(null);

    if (isFreeTool) {
      setFreePoints([pt]);
      return;
    }

    setDrawing({ startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y });
  }, [getSvgPoint, onSelectShape, moveMode, mask.selectedId, mask.shapes, mask.tool, isPointTool, isFreeTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pt = getSvgPoint(e);
    setCursorPos(pt);

    if (drawing) {
      setDrawing(d => d ? { ...d, curX: pt.x, curY: pt.y } : null);
    }
    if (moving) {
      const dx = e.clientX - moving.startX;
      const dy = e.clientY - moving.startY;
      onMoveShape(moving.id, moving.origX + dx, moving.origY + dy);
    }
    if (freePoints.length > 0) {
      setFreePoints(prev => [...prev, pt]);
    }
  }, [drawing, moving, freePoints.length, getSvgPoint, onMoveShape]);

  const handleMouseUp = useCallback(() => {
    if (drawing) {
      const { startX, startY, curX, curY } = drawing;
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);
      if (w > 3 || h > 3) {
        const mode = mask.tool === 'eraser' ? 'supprimer' as const : mask.mode;
        const shape = createDefaultShape(mask.tool, mode, {
          id: genId(),
          x: Math.min(startX, curX), y: Math.min(startY, curY), w, h,
          opacity: mask.opacity, size: mask.size, color: mask.strokeColor,
          arcStart: 0, arcEnd: 180,
        });
        onAddShape(shape);
      }
      setDrawing(null);
    }

    if (freePoints.length > 2) {
      const simplified = simplifyPoints(freePoints, 2);
      const bounds = getBounds(simplified);
      const mode = mask.tool === 'eraser' ? 'supprimer' as const : mask.mode;
      const shape = createDefaultShape(mask.tool, mode, {
        id: genId(),
        x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h,
        opacity: mask.opacity, size: mask.size, color: mask.strokeColor,
        points: simplified,
      });
      onAddShape(shape);
    }
    setFreePoints([]);

    if (moving) setMoving(null);
  }, [drawing, moving, freePoints, mask, onAddShape]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isPointTool) return;
    const pt = getSvgPoint(e);

    if (mask.tool === 'polygon') {
      setPolyPoints(prev => [...prev, pt]);
    }
    if (mask.tool === 'bezier') {
      setBezierPoints(prev => [...prev, pt]);
    }
  }, [isPointTool, mask.tool, getSvgPoint]);

  const handleDoubleClick = useCallback(() => {
    if (mask.tool === 'polygon' && polyPoints.length >= 3) {
      const bounds = getBounds(polyPoints);
      const shape = createDefaultShape('polygon', mask.mode, {
        id: genId(), x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h,
        opacity: mask.opacity, size: mask.size, color: mask.strokeColor,
        points: polyPoints,
      });
      onAddShape(shape);
      setPolyPoints([]);
    }
    if (mask.tool === 'bezier' && bezierPoints.length >= 2) {
      const bounds = getBounds(bezierPoints);
      const shape = createDefaultShape('bezier', mask.mode, {
        id: genId(), x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h,
        opacity: mask.opacity, size: mask.size, color: mask.strokeColor,
        points: bezierPoints,
      });
      onAddShape(shape);
      setBezierPoints([]);
    }
  }, [mask, polyPoints, bezierPoints, onAddShape]);

  const handleShapeClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelectShape(id);
  }, [onSelectShape]);

  const handleShapeDragStart = useCallback((e: React.MouseEvent, shape: MaskShape) => {
    e.stopPropagation();
    if (shape.locked) return;
    onSelectShape(shape.id);
    setMoving({ id: shape.id, startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y });
  }, [onSelectShape]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (polyPoints.length > 0) { setPolyPoints(prev => prev.slice(0, -1)); return; }
      if (bezierPoints.length > 0) { setBezierPoints(prev => prev.slice(0, -1)); return; }
      if (mask.selectedId) { onDeleteSelected(); }
      return;
    }
    if (e.key === 'Delete' && mask.selectedId) {
      onDeleteSelected();
    }
    if (e.key === 'Escape') {
      if (polyPoints.length > 0) setPolyPoints([]);
      if (bezierPoints.length > 0) setBezierPoints([]);
    }
    if (e.key === 'Enter') {
      if (mask.tool === 'polygon' && polyPoints.length >= 3) { handleDoubleClick(); }
      if (mask.tool === 'bezier' && bezierPoints.length >= 2) { handleDoubleClick(); }
    }
  }, [mask.selectedId, polyPoints, bezierPoints, mask.tool, onDeleteSelected, handleDoubleClick]);

  const renderPreview = () => {
    if (drawing) {
      const { startX, startY, curX, curY } = drawing;
      const preview = createDefaultShape(mask.tool, mask.mode, {
        id: 'preview',
        x: Math.min(startX, curX), y: Math.min(startY, curY),
        w: Math.abs(curX - startX), h: Math.abs(curY - startY),
        opacity: mask.opacity, size: mask.size, color: mask.strokeColor,
        arcStart: 0, arcEnd: 180,
      });
      return renderShapeSvg(preview, { isPreview: true });
    }
    return null;
  };

  const renderFreePreview = () => {
    if (freePoints.length < 2) return null;
    const stroke = mask.tool === 'eraser' ? 'rgba(255,255,255,0.5)' : (mask.strokeColor || '#22c55e');
    const d = pointsToSvgPath(freePoints, false);
    return <path d={d} fill="none" stroke={stroke} strokeWidth={mask.size}
      strokeLinecap="round" strokeLinejoin="round" opacity={0.7}
      strokeDasharray={mask.tool === 'eraser' ? '4 4' : undefined} />;
  };

  const renderPointPreview = () => {
    const pts = mask.tool === 'polygon' ? polyPoints : bezierPoints;
    if (pts.length === 0) return null;
    const stroke = mask.strokeColor || '#22c55e';
    const allPts = cursorPos ? [...pts, cursorPos] : pts;

    return (
      <g>
        {mask.tool === 'polygon' && allPts.length >= 2 && (
          <path d={pointsToSvgPath(allPts, false)} fill="none" stroke={stroke}
            strokeWidth={mask.size} strokeDasharray="6 4" opacity={0.6} />
        )}
        {mask.tool === 'bezier' && allPts.length >= 2 && (
          <path d={bezierToSvgPath(allPts)} fill="none" stroke={stroke}
            strokeWidth={mask.size} strokeDasharray="6 4" opacity={0.6} />
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={stroke} stroke="#fff" strokeWidth={1.5} />
        ))}
      </g>
    );
  };

  const isDrawing = isPointTool && (polyPoints.length > 0 || bezierPoints.length > 0);
  const cursorStyle = moveMode ? 'move' : isDrawing ? 'crosshair' : isFreeTool ? 'crosshair' : isPointTool ? 'crosshair' : 'crosshair';

  return (
    <svg ref={svgRef} tabIndex={0}
      className="absolute inset-0 w-full h-full z-20 outline-none"
      style={{ cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { if (freePoints.length > 0) handleMouseUp(); if (drawing) handleMouseUp(); }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}>
      <defs>
        <filter id="selection-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.8" />
        </filter>
      </defs>
      {mask.shapes.map(s => renderShapeSvg(s, {
        selectedId: mask.selectedId,
        onMouseDown: handleShapeDragStart,
        onClick: handleShapeClick,
      }))}
      {renderPreview()}
      {renderFreePreview()}
      {renderPointPreview()}
    </svg>
  );
}

function simplifyPoints(pts: { x: number; y: number }[], tolerance: number): { x: number; y: number }[] {
  if (pts.length <= 3) return pts;
  const result: { x: number; y: number }[] = [pts[0]];
  let last = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const dx = pts[i].x - last.x;
    const dy = pts[i].y - last.y;
    if (dx * dx + dy * dy > tolerance * tolerance) {
      result.push(pts[i]);
      last = pts[i];
    }
  }
  result.push(pts[pts.length - 1]);
  return result;
}

function getBounds(pts: { x: number; y: number }[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
