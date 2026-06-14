import { MousePointer2 } from 'lucide-react';
import type { SvgZone } from './calquer-logo-svg-zones';

interface Props {
  zones: SvgZone[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

export default function CalquerLogoZoneSummary({ zones, selectedId, hoveredId, onSelect, onHover }: Props) {
  const totalElements = zones.reduce((s, z) => s + z.elementCount, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(148,163,184,0.6)' }}>
          Zones detectees
        </h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
          {zones.length} zones / {totalElements} formes
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
        style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)' }}>
        <MousePointer2 className="w-3 h-3 shrink-0" style={{ color: 'rgba(6,182,212,0.5)' }} />
        <p className="text-[9px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
          Survolez ou cliquez directement sur le logo pour selectionner une zone
        </p>
      </div>

      <div className="space-y-0.5 rounded-lg p-1"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {zones.map(zone => {
          const isSelected = zone.id === selectedId;
          const isHovered = zone.id === hoveredId;

          return (
            <button
              key={zone.id}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-all duration-150 text-left"
              style={{
                background: isSelected
                  ? `${zone.color}15`
                  : isHovered ? `${zone.color}08` : 'transparent',
                border: `1px solid ${isSelected ? `${zone.color}30` : 'transparent'}`,
              }}
              onClick={() => onSelect(zone.id === selectedId ? null : zone.id)}
              onMouseEnter={() => onHover(zone.id)}
              onMouseLeave={() => onHover(null)}
            >
              <div className="w-3 h-3 rounded-full shrink-0"
                style={{
                  background: zone.color,
                  boxShadow: isSelected ? `0 0 6px ${zone.color}60` : 'none',
                }}
              />
              <span className="flex-1 min-w-0 text-[10px] font-medium truncate"
                style={{ color: isSelected ? zone.color : 'rgba(226,232,240,0.8)' }}>
                {zone.label}
              </span>
              <span className="text-[8px] shrink-0 px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(148,163,184,0.5)',
                }}>
                {zone.elementCount}
              </span>
            </button>
          );
        })}
        {zones.length === 0 && (
          <p className="text-[10px] text-center py-3" style={{ color: 'rgba(148,163,184,0.4)' }}>
            Aucune zone
          </p>
        )}
      </div>
    </div>
  );
}
