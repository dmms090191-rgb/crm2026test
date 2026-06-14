import type { SvgZone } from './calquer-logo-svg-zones';

interface Props {
  zones: SvgZone[];
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  onSelect: (zoneId: string | null) => void;
  onHover: (zoneId: string | null) => void;
}

export default function CalquerLogoZoneList({
  zones, selectedZoneId, hoveredZoneId, onSelect, onHover,
}: Props) {
  if (zones.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
          Aucune zone detectee
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 max-h-[280px] overflow-y-auto rounded-lg p-1"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {zones.map(zone => (
        <ZoneRow
          key={zone.id}
          zone={zone}
          selected={zone.id === selectedZoneId}
          hovered={zone.id === hoveredZoneId}
          onSelect={() => onSelect(zone.id === selectedZoneId ? null : zone.id)}
          onMouseEnter={() => onHover(zone.id)}
          onMouseLeave={() => onHover(null)}
        />
      ))}
    </div>
  );
}

function ZoneRow({ zone, selected, hovered, onSelect, onMouseEnter, onMouseLeave }: {
  zone: SvgZone;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const active = selected || hovered;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all duration-150 hover:scale-[1.01]"
      style={{
        background: selected
          ? `${zone.color}18`
          : hovered
          ? `${zone.color}0a`
          : 'transparent',
        border: `1px solid ${selected ? `${zone.color}40` : 'transparent'}`,
      }}
    >
      <div className="w-2.5 h-2.5 rounded-sm shrink-0"
        style={{
          background: zone.color,
          opacity: active ? 1 : 0.5,
          boxShadow: selected ? `0 0 6px ${zone.color}60` : 'none',
        }} />

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium truncate"
          style={{ color: active ? zone.color : 'rgba(226,232,240,0.7)' }}>
          {zone.label}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[8px] px-1 py-0.5 rounded"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(148,163,184,0.5)',
          }}>
          {zone.tag}
        </span>
        {zone.elementCount > 1 && (
          <span className="text-[8px] px-1 py-0.5 rounded"
            style={{
              background: `${zone.color}15`,
              color: zone.color,
            }}>
            {zone.elementCount}
          </span>
        )}
      </div>
    </button>
  );
}
