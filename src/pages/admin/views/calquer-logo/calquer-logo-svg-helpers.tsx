import type { MaskShape } from './calquer-logo-types';

export function pointsToSvgPath(points: { x: number; y: number }[], closed: boolean): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
  if (closed) d += ' Z';
  return d;
}

export function bezierToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function arcSvgPath(cx: number, cy: number, rx: number, ry: number, startAngle: number, endAngle: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const s = toRad(startAngle);
  const e = toRad(endAngle);
  const x1 = cx + rx * Math.cos(s);
  const y1 = cy + ry * Math.sin(s);
  const x2 = cx + rx * Math.cos(e);
  const y2 = cy + ry * Math.sin(e);
  const sweep = endAngle - startAngle;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;
  return `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;
}

export function getShapeTransform(shape: MaskShape): string {
  if (!shape.rotation) return '';
  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;
  return `rotate(${shape.rotation} ${cx} ${cy})`;
}

export function renderShapeSvg(
  shape: MaskShape,
  opts: { isPreview?: boolean; selectedId?: string | null; onMouseDown?: (e: React.MouseEvent, s: MaskShape) => void; onClick?: (e: React.MouseEvent, id: string) => void }
): React.ReactNode {
  const stroke = shape.color || (shape.mode === 'garder' ? '#22c55e' : '#ef4444');
  const selected = !opts.isPreview && opts.selectedId === shape.id;
  const strokeW = shape.size;
  const filter = selected ? 'url(#selection-glow)' : undefined;
  const transform = getShapeTransform(shape);
  const fillVal = shape.fillMode === 'fill' ? stroke : 'none';
  const fillOpacity = shape.fillMode === 'fill' ? (shape.opacity / 100) : undefined;
  const evts = opts.isPreview ? {} : {
    onMouseDown: (e: React.MouseEvent) => opts.onMouseDown?.(e, shape),
    onClick: (e: React.MouseEvent) => opts.onClick?.(e, shape.id),
  };

  if (shape.tool === 'rectangle') {
    const r = shape.cornerRadius ?? 0;
    return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.w} height={shape.h}
      rx={r} ry={r} fill={fillVal} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW}
      filter={filter} transform={transform} className="cursor-move" {...evts} />;
  }

  if (shape.tool === 'ellipse') {
    return <ellipse key={shape.id} cx={shape.x + shape.w / 2} cy={shape.y + shape.h / 2}
      rx={shape.w / 2} ry={shape.h / 2}
      fill={fillVal} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW}
      filter={filter} transform={transform} className="cursor-move" {...evts} />;
  }

  if (shape.tool === 'line') {
    return <line key={shape.id} x1={shape.x} y1={shape.y}
      x2={shape.x + shape.w} y2={shape.y + shape.h}
      stroke={stroke} strokeWidth={strokeW} strokeLinecap="round"
      filter={filter} transform={transform} className="cursor-move" {...evts} />;
  }

  if (shape.tool === 'lasso' && shape.points) {
    const d = pointsToSvgPath(shape.points, true);
    return <path key={shape.id} d={d} fill={fillVal} fillOpacity={fillOpacity}
      stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" strokeLinecap="round"
      filter={filter} className="cursor-move" {...evts} />;
  }

  if (shape.tool === 'arc') {
    const cx = shape.x + shape.w / 2;
    const cy = shape.y + shape.h / 2;
    const d = arcSvgPath(cx, cy, shape.w / 2, shape.h / 2, shape.arcStart ?? 0, shape.arcEnd ?? 180);
    return <path key={shape.id} d={d} fill="none" stroke={stroke} strokeWidth={strokeW}
      strokeLinecap="round" filter={filter} transform={transform} className="cursor-move" {...evts} />;
  }

  if (shape.tool === 'bezier' && shape.points) {
    const d = bezierToSvgPath(shape.points);
    return <path key={shape.id} d={d} fill="none" stroke={stroke} strokeWidth={strokeW}
      strokeLinecap="round" strokeLinejoin="round"
      filter={filter} className="cursor-move" {...evts} />;
  }

  if (shape.tool === 'polygon' && shape.points) {
    const d = pointsToSvgPath(shape.points, true);
    return <path key={shape.id} d={d} fill={fillVal} fillOpacity={fillOpacity}
      stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
      filter={filter} transform={transform} className="cursor-move" {...evts} />;
  }

  if (shape.tool === 'eraser' && shape.points) {
    const d = pointsToSvgPath(shape.points, false);
    return <path key={shape.id} d={d} fill="none" stroke="rgba(255,255,255,0.5)"
      strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray="4 4" filter={filter} className="cursor-move" {...evts} />;
  }

  return null;
}
