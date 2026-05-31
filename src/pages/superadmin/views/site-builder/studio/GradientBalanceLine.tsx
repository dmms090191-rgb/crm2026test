import { useRef, useCallback, useState } from 'react';
import type { GradientConfig } from './studioSectionTypes';

interface Props {
  gradient: GradientConfig;
  onChange: (gradient: GradientConfig) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function GradientBalanceLine({ gradient, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ originPx: number; balanceOrig: number } | null>(null);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);

  const dirX = gradient.endX - gradient.startX;
  const dirY = gradient.endY - gradient.startY;
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  const safeLen = len || 1;

  const nx = dirX / safeLen;
  const ny = dirY / safeLen;

  const bal = clamp(gradient.balance ?? 50, 0, 100) / 100;
  const cx = gradient.startX + dirX * bal;
  const cy = gradient.startY + dirY * bal;

  const perpX = -ny;
  const perpY = nx;
  const armLen = 48;

  const lx1 = cx + perpX * armLen;
  const ly1 = cy + perpY * armLen;
  const lx2 = cx - perpX * armLen;
  const ly2 = cy - perpY * armLen;

  const projectOntoAxis = useCallback((clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return gradient.balance;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * 100;
    const py = ((clientY - rect.top) / rect.height) * 100;

    const apx = px - gradient.startX;
    const apy = py - gradient.startY;

    const dot = apx * nx + apy * ny;
    return clamp((dot / safeLen) * 100, 0, 100);
  }, [gradient.startX, gradient.startY, nx, ny, safeLen, gradient.balance]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    dragRef.current = { originPx: 0, balanceOrig: gradient.balance };
    setDragging(true);
  }, [gradient.balance]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const newBal = projectOntoAxis(e.clientX, e.clientY);
    onChange({ ...gradient, balance: Math.round(newBal) });
  }, [gradient, onChange, projectOntoAxis]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  const active = hovering || dragging;
  const lineColor = '#10b981';

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 9, cursor: dragging ? 'grabbing' : 'default' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <defs>
        <filter id="balance-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Invisible wider hit area */}
      <line
        x1={`${lx1}%`} y1={`${ly1}%`}
        x2={`${lx2}%`} y2={`${ly2}%`}
        stroke="transparent"
        strokeWidth="20"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => { if (!dragging) setHovering(false); }}
      />

      {/* Visible balance line */}
      <line
        x1={`${lx1}%`} y1={`${ly1}%`}
        x2={`${lx2}%`} y2={`${ly2}%`}
        stroke={lineColor}
        strokeWidth={active ? '2.5' : '1.5'}
        strokeLinecap="round"
        strokeDasharray="4 3"
        filter="url(#balance-glow)"
        opacity={active ? 0.9 : 0.55}
        pointerEvents="none"
        style={{ transition: 'stroke-width 0.15s, opacity 0.15s' }}
      />

      {/* Center handle */}
      <circle
        cx={`${cx}%`} cy={`${cy}%`}
        r={active ? 7 : 5}
        fill={lineColor}
        stroke="#fff"
        strokeWidth="2"
        opacity={active ? 1 : 0.85}
        style={{ cursor: dragging ? 'grabbing' : 'grab', transition: 'r 0.15s, opacity 0.15s' }}
        onPointerDown={handlePointerDown}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => { if (!dragging) setHovering(false); }}
      />

      {/* Balance percentage label */}
      {active && (
        <text
          x={`${cx}%`}
          y={`${cy - 5}%`}
          textAnchor="middle"
          dy="-8"
          fill="#fff"
          fontSize="10"
          fontWeight="700"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)', pointerEvents: 'none' }}
        >
          {Math.round(gradient.balance)}%
        </text>
      )}
    </svg>
  );
}
