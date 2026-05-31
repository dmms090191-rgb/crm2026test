import { useRef, useCallback, useState } from 'react';
import type { GradientConfig } from './studioSectionTypes';

type DragTarget = 'start' | 'end' | 'line' | null;

interface Props {
  gradient: GradientConfig;
  onChange: (gradient: GradientConfig) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function GradientGuideLine({ gradient, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    target: DragTarget;
    originX: number;
    originY: number;
    startXOrig: number;
    startYOrig: number;
    endXOrig: number;
    endYOrig: number;
  } | null>(null);
  const [hovering, setHovering] = useState<DragTarget>(null);
  const [dragging, setDragging] = useState(false);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, target: DragTarget) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg || !target) return;

    (e.target as SVGElement).setPointerCapture(e.pointerId);
    const pt = getSvgPoint(e.clientX, e.clientY);

    dragRef.current = {
      target,
      originX: pt.x,
      originY: pt.y,
      startXOrig: gradient.startX,
      startYOrig: gradient.startY,
      endXOrig: gradient.endX,
      endYOrig: gradient.endY,
    };
    setDragging(true);
  }, [gradient, getSvgPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    const svg = svgRef.current;
    if (!d || !svg) return;

    const rect = svg.getBoundingClientRect();
    const pt = getSvgPoint(e.clientX, e.clientY);
    const dx = pt.x - d.originX;
    const dy = pt.y - d.originY;

    const dxPct = (dx / rect.width) * 100;
    const dyPct = (dy / rect.height) * 100;

    if (d.target === 'start') {
      onChange({
        ...gradient,
        startX: clamp(d.startXOrig + dxPct, 0, 100),
        startY: clamp(d.startYOrig + dyPct, 0, 100),
      });
    } else if (d.target === 'end') {
      onChange({
        ...gradient,
        endX: clamp(d.endXOrig + dxPct, 0, 100),
        endY: clamp(d.endYOrig + dyPct, 0, 100),
      });
    } else if (d.target === 'line') {
      const spanX = d.endXOrig - d.startXOrig;
      const spanY = d.endYOrig - d.startYOrig;
      const newStartX = d.startXOrig + dxPct;
      const newStartY = d.startYOrig + dyPct;

      const clampedStartX = clamp(newStartX, 0, 100);
      const clampedStartY = clamp(newStartY, 0, 100);

      onChange({
        ...gradient,
        startX: clampedStartX,
        startY: clampedStartY,
        endX: clamp(clampedStartX + spanX, 0, 100),
        endY: clamp(clampedStartY + spanY, 0, 100),
      });
    }
  }, [gradient, onChange, getSvgPoint]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  const x1 = `${gradient.startX}%`;
  const y1 = `${gradient.startY}%`;
  const x2 = `${gradient.endX}%`;
  const y2 = `${gradient.endY}%`;

  const lineHover = hovering === 'line' || dragging;
  const startHover = hovering === 'start';
  const endHover = hovering === 'end';

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 10, cursor: dragging ? 'grabbing' : 'default' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <defs>
        <linearGradient id="guide-grad" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0%" stopColor={gradient.color1} />
          <stop offset="100%" stopColor={gradient.color2} />
        </linearGradient>
        <filter id="guide-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Invisible wider hit area for line grab */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="transparent"
        strokeWidth="18"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerDown={(e) => handlePointerDown(e, 'line')}
        onPointerEnter={() => setHovering('line')}
        onPointerLeave={() => { if (!dragging) setHovering(null); }}
      />

      {/* Visible guide line */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="url(#guide-grad)"
        strokeWidth={lineHover ? '3.5' : '2.5'}
        strokeLinecap="round"
        strokeDasharray="8 4"
        filter="url(#guide-glow)"
        opacity={lineHover ? 0.9 : 0.65}
        pointerEvents="none"
        style={{ transition: 'stroke-width 0.15s, opacity 0.15s' }}
      />

      {/* Start endpoint */}
      <circle
        cx={x1} cy={y1}
        r={startHover || dragging ? 8 : 6}
        fill={gradient.color1}
        stroke="#fff"
        strokeWidth="2"
        opacity={startHover ? 1 : 0.9}
        style={{ cursor: dragging ? 'grabbing' : 'grab', transition: 'r 0.15s, opacity 0.15s' }}
        onPointerDown={(e) => handlePointerDown(e, 'start')}
        onPointerEnter={() => setHovering('start')}
        onPointerLeave={() => { if (!dragging) setHovering(null); }}
      />

      {/* End endpoint */}
      <circle
        cx={x2} cy={y2}
        r={endHover || dragging ? 8 : 6}
        fill={gradient.color2}
        stroke="#fff"
        strokeWidth="2"
        opacity={endHover ? 1 : 0.9}
        style={{ cursor: dragging ? 'grabbing' : 'grab', transition: 'r 0.15s, opacity 0.15s' }}
        onPointerDown={(e) => handlePointerDown(e, 'end')}
        onPointerEnter={() => setHovering('end')}
        onPointerLeave={() => { if (!dragging) setHovering(null); }}
      />
    </svg>
  );
}
