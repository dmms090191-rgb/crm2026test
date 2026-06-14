import { useCallback, useMemo } from 'react';
import type { SvgShape } from './calquer-logo-svg-decompose';

const OVERLAY_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#d946ef', '#84cc16', '#e11d48', '#0ea5e9', '#a855f7',
];

interface Props {
  shapes: SvgShape[];
  viewBox: string;
  selectedId: string | null;
  hoveredId: string | null;
  onShapeClick: (id: string | null) => void;
  onShapeHover: (id: string | null) => void;
}

export default function CalquerLogoShapeOverlay({
  shapes, viewBox, selectedId, hoveredId, onShapeClick, onShapeHover,
}: Props) {
  const handleBgClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onShapeClick(null);
  }, [onShapeClick]);

  const contours = useMemo(() => {
    return shapes
      .filter(s => s.visible)
      .map((shape, i) => {
        const overlayColor = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
        const attrs = parseShapeElement(shape.element);
        if (!attrs) return null;
        return { shape, overlayColor, attrs, index: i };
      })
      .filter(Boolean) as { shape: SvgShape; overlayColor: string; attrs: ShapeAttrs; index: number }[];
  }, [shapes]);

  return (
    <svg
      viewBox={viewBox}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ zIndex: 10, pointerEvents: 'none' }}
      onClick={handleBgClick}
    >
      {contours.map(({ shape, overlayColor, attrs }) => {
        const isSelected = shape.id === selectedId;
        const isHovered = shape.id === hoveredId;
        const active = isSelected || isHovered;

        return (
          <g key={shape.id} style={{ pointerEvents: 'all' }}>
            <ContourElement
              attrs={attrs}
              fill={isSelected ? `${overlayColor}20` : isHovered ? `${overlayColor}0c` : 'transparent'}
              stroke={active ? overlayColor : 'transparent'}
              strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 0}
              strokeDasharray={isSelected ? undefined : '6 3'}
              onClick={(e) => {
                e.stopPropagation();
                onShapeClick(shape.id === selectedId ? null : shape.id);
              }}
              onMouseEnter={() => onShapeHover(shape.id)}
              onMouseLeave={() => onShapeHover(null)}
            />
            {active && (
              <ShapeLabel
                attrs={attrs}
                label={shape.label}
                color={overlayColor}
                tag={shape.tag}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface ShapeAttrs {
  tag: string;
  d?: string;
  x?: number; y?: number; width?: number; height?: number;
  cx?: number; cy?: number; r?: number; rx?: number; ry?: number;
  points?: string;
  x1?: number; y1?: number; x2?: number; y2?: number;
  bbox: { x: number; y: number; w: number; h: number };
}

function ContourElement({ attrs, fill, stroke, strokeWidth, strokeDasharray, onClick, onMouseEnter, onMouseLeave }: {
  attrs: ShapeAttrs;
  fill: string; stroke: string; strokeWidth: number;
  strokeDasharray?: string;
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const common = {
    fill, stroke, strokeWidth,
    strokeDasharray,
    className: 'transition-all duration-150 cursor-pointer',
    onClick, onMouseEnter, onMouseLeave,
  };

  if (attrs.tag === 'path' && attrs.d) {
    return <path d={attrs.d} {...common} />;
  }
  if (attrs.tag === 'circle') {
    return <circle cx={attrs.cx} cy={attrs.cy} r={attrs.r} {...common} />;
  }
  if (attrs.tag === 'ellipse') {
    return <ellipse cx={attrs.cx} cy={attrs.cy} rx={attrs.rx} ry={attrs.ry} {...common} />;
  }
  if (attrs.tag === 'rect') {
    return <rect x={attrs.x} y={attrs.y} width={attrs.width} height={attrs.height} {...common} />;
  }
  if ((attrs.tag === 'polygon' || attrs.tag === 'polyline') && attrs.points) {
    return <polygon points={attrs.points} {...common} />;
  }
  if (attrs.tag === 'line') {
    return <line x1={attrs.x1} y1={attrs.y1} x2={attrs.x2} y2={attrs.y2}
      stroke={stroke} strokeWidth={Math.max(strokeWidth, 4)}
      strokeDasharray={strokeDasharray}
      className="transition-all duration-150 cursor-pointer"
      onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />;
  }

  const { x, y, w, h } = attrs.bbox;
  return <rect x={x} y={y} width={w} height={h} rx={2} {...common} />;
}

function ShapeLabel({ attrs, label, color, tag }: {
  attrs: ShapeAttrs; label: string; color: string; tag: string;
}) {
  const { x, y, w } = attrs.bbox;
  const cx = x + w / 2;
  const ly = y - 6;

  const text = label;
  const fontSize = 10;
  const padX = 5;
  const padY = 2.5;
  const textW = text.length * fontSize * 0.55;
  const boxW = textW + padX * 2;
  const boxH = fontSize + padY * 2;
  const clampedY = Math.max(boxH + 2, ly);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={cx - boxW / 2} y={clampedY - boxH}
        width={boxW} height={boxH}
        rx={3} ry={3}
        fill="rgba(15,23,42,0.9)"
        stroke={color}
        strokeWidth={1}
      />
      <text
        x={cx} y={clampedY - padY}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={600}
        fontFamily="system-ui, sans-serif"
        fill={color}
      >
        {text}
      </text>
    </g>
  );
}

function parseShapeElement(elementXml: string): ShapeAttrs | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${elementXml}</svg>`, 'image/svg+xml');
  const el = doc.querySelector('svg')?.firstElementChild;
  if (!el) return null;

  const tag = el.tagName.toLowerCase();
  const num = (attr: string) => parseFloat(el.getAttribute(attr) || '0');

  let bbox = { x: 0, y: 0, w: 0, h: 0 };

  if (tag === 'path') {
    const d = el.getAttribute('d') || '';
    bbox = computePathBbox(d) || bbox;
    return { tag, d, bbox };
  }
  if (tag === 'rect') {
    const x = num('x'), y = num('y'), width = num('width'), height = num('height');
    return { tag, x, y, width, height, bbox: { x, y, w: width, h: height } };
  }
  if (tag === 'circle') {
    const cx = num('cx'), cy = num('cy'), r = num('r');
    return { tag, cx, cy, r, bbox: { x: cx - r, y: cy - r, w: r * 2, h: r * 2 } };
  }
  if (tag === 'ellipse') {
    const cx = num('cx'), cy = num('cy'), rx = num('rx'), ry = num('ry');
    return { tag, cx, cy, rx, ry, bbox: { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 } };
  }
  if (tag === 'polygon' || tag === 'polyline') {
    const points = el.getAttribute('points') || '';
    bbox = computePointsBbox(points) || bbox;
    return { tag, points, bbox };
  }
  if (tag === 'line') {
    const x1 = num('x1'), y1 = num('y1'), x2 = num('x2'), y2 = num('y2');
    bbox = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    return { tag, x1, y1, x2, y2, bbox };
  }
  if (tag === 'text') {
    const x = num('x'), y = num('y');
    const fontSize = parseFloat(el.getAttribute('font-size') || '16');
    const text = el.textContent || '';
    const approxW = text.length * fontSize * 0.6;
    bbox = { x, y: y - fontSize, w: approxW, h: fontSize * 1.2 };
    return { tag, x, y, width: approxW, height: fontSize * 1.2, bbox };
  }

  return null;
}

function computePathBbox(d: string): { x: number; y: number; w: number; h: number } | null {
  const coords = [...d.matchAll(/([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/gi)].map(m => parseFloat(m[1]));
  if (coords.length < 2) return null;
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < coords.length - 1; i += 2) { xs.push(coords[i]); ys.push(coords[i + 1]); }
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  if (!isFinite(minX) || !isFinite(minY)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function computePointsBbox(points: string): { x: number; y: number; w: number; h: number } | null {
  const nums = points.match(/-?\d+\.?\d*/g)?.map(Number);
  if (!nums || nums.length < 4) return null;
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < nums.length - 1; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]); }
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}
