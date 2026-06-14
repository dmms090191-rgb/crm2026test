import { useCallback, useMemo } from 'react';
import type { SvgZone } from './calquer-logo-svg-zones';

interface Props {
  zones: SvgZone[];
  viewBox: string;
  selectedId: string | null;
  hoveredId: string | null;
  onZoneClick: (id: string | null) => void;
  onZoneHover: (id: string | null) => void;
}

export default function CalquerLogoZoneGroupOverlay({
  zones, viewBox, selectedId, hoveredId, onZoneClick, onZoneHover,
}: Props) {
  const handleBgClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onZoneClick(null);
  }, [onZoneClick]);

  const parsed = useMemo(() => {
    return zones.map(zone => {
      const elAttrs = zone.pathData.map(xml => parseElementXml(xml)).filter(Boolean) as ParsedEl[];
      return { zone, elAttrs };
    });
  }, [zones]);

  return (
    <svg
      viewBox={viewBox}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ zIndex: 10, pointerEvents: 'none' }}
      onClick={handleBgClick}
    >
      {parsed.map(({ zone, elAttrs }) => {
        const isSelected = zone.id === selectedId;
        const isHovered = zone.id === hoveredId;
        const active = isSelected || isHovered;
        const sw = isSelected ? 2.5 : isHovered ? 1.8 : 0;
        const fillColor = isSelected ? `${zone.color}20` : isHovered ? `${zone.color}0c` : 'transparent';
        const strokeColor = active ? zone.color : 'transparent';

        return (
          <g key={zone.id} style={{ pointerEvents: 'all' }}>
            {elAttrs.map((el, i) => (
              <ZonePathElement
                key={i}
                el={el}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={sw}
                strokeDasharray={isSelected ? undefined : '6 3'}
                onClick={(e) => { e.stopPropagation(); onZoneClick(zone.id === selectedId ? null : zone.id); }}
                onMouseEnter={() => onZoneHover(zone.id)}
                onMouseLeave={() => onZoneHover(null)}
              />
            ))}
            {active && <ZoneLabel zone={zone} />}
          </g>
        );
      })}
    </svg>
  );
}

interface ParsedEl {
  tag: string;
  d?: string;
  x?: number; y?: number; width?: number; height?: number;
  cx?: number; cy?: number; r?: number; rx?: number; ry?: number;
  points?: string;
  x1?: number; y1?: number; x2?: number; y2?: number;
}

function ZonePathElement({ el, fill, stroke, strokeWidth, strokeDasharray, onClick, onMouseEnter, onMouseLeave }: {
  el: ParsedEl; fill: string; stroke: string; strokeWidth: number; strokeDasharray?: string;
  onClick: (e: React.MouseEvent) => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const common = { fill, stroke, strokeWidth, strokeDasharray, className: 'cursor-pointer', onClick, onMouseEnter, onMouseLeave };

  if (el.tag === 'path' && el.d) return <path d={el.d} {...common} />;
  if (el.tag === 'circle') return <circle cx={el.cx} cy={el.cy} r={el.r} {...common} />;
  if (el.tag === 'ellipse') return <ellipse cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} {...common} />;
  if (el.tag === 'rect') return <rect x={el.x} y={el.y} width={el.width} height={el.height} {...common} />;
  if ((el.tag === 'polygon' || el.tag === 'polyline') && el.points) return <polygon points={el.points} {...common} />;
  if (el.tag === 'line') {
    return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
      stroke={stroke} strokeWidth={Math.max(strokeWidth, 4)} strokeDasharray={strokeDasharray}
      className="cursor-pointer" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />;
  }
  return null;
}

function ZoneLabel({ zone }: { zone: SvgZone }) {
  const { x, y, w } = zone.bbox;
  const cx = x + w / 2;
  const ly = y - 6;
  const text = zone.label;
  const fontSize = 11;
  const padX = 6;
  const padY = 3;
  const textW = text.length * fontSize * 0.52;
  const boxW = textW + padX * 2;
  const boxH = fontSize + padY * 2;
  const clampedY = Math.max(boxH + 2, ly);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={cx - boxW / 2} y={clampedY - boxH}
        width={boxW} height={boxH}
        rx={4} ry={4}
        fill="rgba(15,23,42,0.92)"
        stroke={zone.color}
        strokeWidth={1.2}
      />
      <text
        x={cx} y={clampedY - padY}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={700}
        fontFamily="system-ui, sans-serif"
        fill={zone.color}
      >
        {text}
      </text>
    </g>
  );
}

function parseElementXml(xml: string): ParsedEl | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${xml}</svg>`, 'image/svg+xml');
  const el = doc.querySelector('svg')?.firstElementChild;
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  const n = (a: string) => parseFloat(el.getAttribute(a) || '0');

  if (tag === 'path') return { tag, d: el.getAttribute('d') || '' };
  if (tag === 'rect') return { tag, x: n('x'), y: n('y'), width: n('width'), height: n('height') };
  if (tag === 'circle') return { tag, cx: n('cx'), cy: n('cy'), r: n('r') };
  if (tag === 'ellipse') return { tag, cx: n('cx'), cy: n('cy'), rx: n('rx'), ry: n('ry') };
  if (tag === 'polygon' || tag === 'polyline') return { tag, points: el.getAttribute('points') || '' };
  if (tag === 'line') return { tag, x1: n('x1'), y1: n('y1'), x2: n('x2'), y2: n('y2') };
  if (tag === 'text') return { tag, x: n('x'), y: n('y') };
  return null;
}
