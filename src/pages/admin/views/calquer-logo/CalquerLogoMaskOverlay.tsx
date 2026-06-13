import { useRef, useCallback, useState } from 'react';
import type { MaskShape, MaskState } from './calquer-logo-types';

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

export default function CalquerLogoMaskOverlay({ mask, moveMode, onAddShape, onSelectShape, onMoveShape, onDeleteSelected }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const [moving, setMoving] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const getSvgPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pt = getSvgPoint(e);
    if (moveMode && mask.selectedId) {
      const shape = mask.shapes.find(s => s.id === mask.selectedId);
      if (shape) {
        setMoving({ id: shape.id, startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y });
        return;
      }
    }
    onSelectShape(null);
    setDrawing({ startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y });
  }, [getSvgPoint, onSelectShape, moveMode, mask.selectedId, mask.shapes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (drawing) {
      const pt = getSvgPoint(e);
      setDrawing(d => d ? { ...d, curX: pt.x, curY: pt.y } : null);
    }
    if (moving) {
      const dx = e.clientX - moving.startX;
      const dy = e.clientY - moving.startY;
      onMoveShape(moving.id, moving.origX + dx, moving.origY + dy);
    }
  }, [drawing, moving, getSvgPoint, onMoveShape]);

  const handleMouseUp = useCallback(() => {
    if (drawing) {
      const { startX, startY, curX, curY } = drawing;
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);
      if (w > 3 || h > 3) {
        const shape: MaskShape = {
          id: genId(),
          tool: mask.tool,
          mode: mask.mode,
          x: Math.min(startX, curX),
          y: Math.min(startY, curY),
          w, h,
          opacity: mask.opacity,
          size: mask.size,
          color: mask.strokeColor,
        };
        onAddShape(shape);
      }
      setDrawing(null);
    }
    if (moving) setMoving(null);
  }, [drawing, moving, mask, onAddShape]);

  const handleShapeClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelectShape(id);
  }, [onSelectShape]);

  const handleShapeDragStart = useCallback((e: React.MouseEvent, shape: MaskShape) => {
    e.stopPropagation();
    onSelectShape(shape.id);
    setMoving({ id: shape.id, startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y });
  }, [onSelectShape]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && mask.selectedId) {
      onDeleteSelected();
    }
  }, [mask.selectedId, onDeleteSelected]);

  const renderShape = (shape: MaskShape, isPreview?: boolean) => {
    const stroke = shape.color || (shape.mode === 'garder' ? '#22c55e' : '#ef4444');
    const selected = !isPreview && mask.selectedId === shape.id;
    const strokeW = shape.size;
    const filter = selected ? 'url(#selection-glow)' : undefined;

    if (shape.tool === 'rectangle') {
      return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.w} height={shape.h}
        fill="none" stroke={stroke} strokeWidth={strokeW}
        filter={filter} className="cursor-move"
        onMouseDown={e => !isPreview && handleShapeDragStart(e, shape)}
        onClick={e => !isPreview && handleShapeClick(e, shape.id)} />;
    }
    if (shape.tool === 'ellipse') {
      return <ellipse key={shape.id} cx={shape.x + shape.w / 2} cy={shape.y + shape.h / 2}
        rx={shape.w / 2} ry={shape.h / 2}
        fill="none" stroke={stroke} strokeWidth={strokeW}
        filter={filter} className="cursor-move"
        onMouseDown={e => !isPreview && handleShapeDragStart(e, shape)}
        onClick={e => !isPreview && handleShapeClick(e, shape.id)} />;
    }
    return <line key={shape.id} x1={shape.x} y1={shape.y}
      x2={shape.x + shape.w} y2={shape.y + shape.h}
      stroke={stroke} strokeWidth={strokeW}
      strokeLinecap="round" filter={filter} className="cursor-move"
      onMouseDown={e => !isPreview && handleShapeDragStart(e, shape)}
      onClick={e => !isPreview && handleShapeClick(e, shape.id)} />;
  };

  const renderPreview = () => {
    if (!drawing) return null;
    const { startX, startY, curX, curY } = drawing;
    const previewShape: MaskShape = {
      id: 'preview', tool: mask.tool, mode: mask.mode,
      x: Math.min(startX, curX), y: Math.min(startY, curY),
      w: Math.abs(curX - startX), h: Math.abs(curY - startY),
      opacity: mask.opacity, size: mask.size, color: mask.strokeColor,
    };
    return renderShape(previewShape, true);
  };

  return (
    <svg ref={svgRef} tabIndex={0}
      className="absolute inset-0 w-full h-full z-20 outline-none"
      style={{ cursor: moveMode ? 'move' : 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onKeyDown={handleKeyDown}>
      <defs>
        <filter id="selection-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.8" />
        </filter>
      </defs>
      {mask.shapes.map(s => renderShape(s))}
      {renderPreview()}
    </svg>
  );
}
