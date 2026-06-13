import { Square, Layers, Image as ImageIcon } from 'lucide-react';
import { useEditorMode, resolveZoneBg, type EditorZone } from '../../contexts/EditorModeContext';
import type { EditorPanelTokens } from './editorPanelTheme';

const ZONES: { id: EditorZone; label: string }[] = [
  { id: 'zone1', label: 'Zone 1' },
  { id: 'zone2', label: 'Zone 2' },
  { id: 'zone3', label: 'Zone 3' },
  { id: 'zone4', label: 'Zone 4' },
];

interface Props {
  ctx: ReturnType<typeof useEditorMode>;
  pt: EditorPanelTokens;
}

export default function EditorFondsContent({ ctx, pt }: Props) {
  const hasImage = !!ctx.backgroundImage;

  return (
    <div className="px-3 py-2 flex flex-col gap-1.5">
      {ZONES.map(zone => {
        const isActive = ctx.activeZone === zone.id;
        const override = ctx.zoneOverrides[zone.id];
        const bg = override ? resolveZoneBg(override) : null;
        const isZone4WithImage = zone.id === 'zone4' && hasImage;

        return (
          <button
            key={zone.id}
            onClick={() => ctx.setActiveZone(isActive ? null : zone.id)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${pt.accent.bg}, ${pt.accent.bgHover})`
                : 'transparent',
              border: `1px solid ${isActive ? pt.accent.border : 'transparent'}`,
            }}
          >
            {isZone4WithImage ? (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 relative"
                style={{
                  background: bg || pt.surface.secondary,
                  border: `1px solid ${bg ? pt.swatchBorder : pt.surface.border}`,
                }}
              >
                {bg ? (
                  <div className="w-4 h-4 rounded" style={{ background: bg }} />
                ) : (
                  <Square className="w-3.5 h-3.5" style={{ color: pt.label.muted }} />
                )}
                <ImageIcon
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-sm"
                  style={{ color: '#0ea5e9', background: pt.surface.primary, padding: 1 }}
                />
              </div>
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: bg || pt.surface.secondary,
                  border: `1px solid ${bg ? pt.swatchBorder : pt.surface.border}`,
                }}
              >
                {bg ? (
                  <div className="w-4 h-4 rounded" style={{ background: bg }} />
                ) : (
                  <Square className="w-3.5 h-3.5" style={{ color: pt.label.muted }} />
                )}
              </div>
            )}
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <span className="text-xs font-semibold" style={{ color: isActive ? pt.accent.text : pt.text.primary }}>
                {zone.label}
              </span>
              {isZone4WithImage ? (
                <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: '#0ea5e9' }}>
                  <Layers className="w-2.5 h-2.5" />
                  Image + Fond
                </span>
              ) : override ? (
                <span className="text-[10px]" style={{ color: pt.label.muted }}>
                  {override.type === 'gradient' ? 'Degrade' : 'Couleur unie'}
                </span>
              ) : null}
            </div>
            {isZone4WithImage && (
              <span
                className="ml-auto text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1"
                style={{
                  background: 'rgba(14,165,233,0.10)',
                  color: '#0ea5e9',
                  border: '1px solid rgba(14,165,233,0.20)',
                }}
              >
                <Layers className="w-2 h-2" />
                2 couches
              </span>
            )}
            {isActive && (
              <span
                className={`${isZone4WithImage ? '' : 'ml-auto'} w-2 h-2 rounded-full flex-shrink-0`}
                style={{ background: pt.accent.solid, boxShadow: `0 0 8px ${pt.accent.solid}` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
