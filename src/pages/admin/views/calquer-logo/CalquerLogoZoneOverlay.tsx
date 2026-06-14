import { useCallback, useMemo } from 'react';
import type { AiZone } from './calquer-logo-ai-zones';

interface Props {
  zones: AiZone[];
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  onZoneClick: (zoneId: string | null) => void;
  onZoneHover: (zoneId: string | null) => void;
  imageWidth: number;
  imageHeight: number;
}

export default function CalquerLogoZoneOverlay({
  zones, selectedZoneId, hoveredZoneId,
  onZoneClick, onZoneHover, imageWidth, imageHeight,
}: Props) {
  const viewBox = `0 0 ${imageWidth} ${imageHeight}`;

  const handleClick = useCallback((zoneId: string) => {
    onZoneClick(zoneId === selectedZoneId ? null : zoneId);
  }, [onZoneClick, selectedZoneId]);

  const handleBgClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onZoneClick(null);
  }, [onZoneClick]);

  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => b.area - a.area);
  }, [zones]);

  return (
    <svg
      viewBox={viewBox}
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ zIndex: 10 }}
      onClick={handleBgClick}
    >
      {sortedZones.map(zone => {
        const isSelected = zone.id === selectedZoneId;
        const isHovered = zone.id === hoveredZoneId;
        const active = isSelected || isHovered;
        const { x, y, w, h } = zone.bbox;
        const pad = 2;

        return (
          <g key={zone.id} style={{ pointerEvents: 'all' }}>
            <rect
              x={x - pad} y={y - pad} width={w + pad * 2} height={h + pad * 2}
              rx={4} ry={4}
              fill={isSelected ? `${zone.color}18` : isHovered ? `${zone.color}0c` : 'transparent'}
              stroke={active ? zone.color : 'transparent'}
              strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 0}
              strokeDasharray={isSelected ? '' : '6 3'}
              className="transition-all duration-150 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); handleClick(zone.id); }}
              onMouseEnter={() => onZoneHover(zone.id)}
              onMouseLeave={() => onZoneHover(null)}
            />
            {active && (
              <ZoneLabel
                x={x + w / 2} y={y - 8}
                label={zone.label}
                color={zone.color}
                confidence={zone.confidence}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ZoneLabel({ x, y, label, color, confidence }: {
  x: number; y: number; label: string; color: string; confidence: number;
}) {
  const text = `${label} (${Math.round(confidence * 100)}%)`;
  const fontSize = 11;
  const padX = 6;
  const padY = 3;
  const textW = text.length * fontSize * 0.55;
  const boxW = textW + padX * 2;
  const boxH = fontSize + padY * 2;
  const clampedY = Math.max(boxH + 2, y);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={x - boxW / 2} y={clampedY - boxH}
        width={boxW} height={boxH}
        rx={3} ry={3}
        fill="rgba(15,23,42,0.88)"
        stroke={color}
        strokeWidth={1}
      />
      <text
        x={x} y={clampedY - padY}
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
