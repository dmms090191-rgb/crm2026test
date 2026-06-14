import { useState, useMemo } from 'react';
import { Check, Download, RotateCcw, Image, Sparkles, Columns2 as Columns } from 'lucide-react';
import CalquerLogoZoneGroupOverlay from './CalquerLogoZoneGroupOverlay';
import type { SvgZone } from './calquer-logo-svg-zones';

type ViewMode = 'compare' | 'original' | 'result';

interface Props {
  originalUrl: string;
  svgContent: string;
  onUseSvg: () => void;
  onDownload: () => void;
  onReset: () => void;
  bgColor?: string | null;
  zones?: SvgZone[];
  zonesViewBox?: string;
  selectedZoneId?: string | null;
  hoveredZoneId?: string | null;
  onZoneClick?: (id: string | null) => void;
  onZoneHover?: (id: string | null) => void;
}

export default function CalquerLogoIACompare({
  originalUrl, svgContent, onUseSvg, onDownload, onReset, bgColor,
  zones, zonesViewBox, selectedZoneId, hoveredZoneId, onZoneClick, onZoneHover,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const hasOverlay = zones && zones.length > 0 && onZoneClick && onZoneHover;

  const svgBlobUrl = useMemo(() => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }, [svgContent]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: checkerBg() }}>
      <CompareToolbar viewMode={viewMode} onViewModeChange={setViewMode}
        onUseSvg={onUseSvg} onDownload={onDownload} onReset={onReset} />
      <div className="flex-1 flex min-h-0">
        {viewMode === 'compare' && (
          <>
            <Pane label="Original" src={originalUrl} />
            <div className="w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <Pane label="Resultat IA / SVG" src={svgBlobUrl} bgColor={bgColor}
              zones={hasOverlay ? zones : undefined}
              zonesViewBox={zonesViewBox}
              selectedZoneId={selectedZoneId} hoveredZoneId={hoveredZoneId}
              onZoneClick={onZoneClick} onZoneHover={onZoneHover} />
          </>
        )}
        {viewMode === 'original' && <Pane label="Original" src={originalUrl} full />}
        {viewMode === 'result' && (
          <Pane label="Resultat IA / SVG" src={svgBlobUrl} full bgColor={bgColor}
            zones={hasOverlay ? zones : undefined}
            zonesViewBox={zonesViewBox}
            selectedZoneId={selectedZoneId} hoveredZoneId={hoveredZoneId}
            onZoneClick={onZoneClick} onZoneHover={onZoneHover} />
        )}
      </div>
    </div>
  );
}

function CompareToolbar({ viewMode, onViewModeChange, onUseSvg, onDownload, onReset }: {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  onUseSvg: () => void;
  onDownload: () => void;
  onReset: () => void;
}) {
  const modes: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'compare', label: 'Comparaison', icon: <Columns className="w-3.5 h-3.5" /> },
    { key: 'original', label: 'Original', icon: <Image className="w-3.5 h-3.5" /> },
    { key: 'result', label: 'Resultat', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 gap-3"
      style={{ background: 'rgba(15,23,42,0.85)', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-1">
        {modes.map(({ key, label, icon }) => {
          const active = viewMode === key;
          return (
            <button key={key} onClick={() => onViewModeChange(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200"
              style={{
                background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                color: active ? '#60a5fa' : 'rgba(148,163,184,0.6)',
              }}>
              {icon}{label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onUseSvg}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#fff', boxShadow: '0 2px 6px rgba(34,197,94,0.3)' }}>
          <Check className="w-3.5 h-3.5" />Utiliser ce SVG
        </button>
        <button onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.02]"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
          <Download className="w-3.5 h-3.5" />Telecharger
        </button>
        <button onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.5)' }}>
          <RotateCcw className="w-3.5 h-3.5" />Recommencer
        </button>
      </div>
    </div>
  );
}

function Pane({ label, src, full, bgColor, zones, zonesViewBox,
  selectedZoneId, hoveredZoneId, onZoneClick, onZoneHover }: {
  label: string; src: string; full?: boolean; bgColor?: string | null;
  zones?: SvgZone[]; zonesViewBox?: string;
  selectedZoneId?: string | null; hoveredZoneId?: string | null;
  onZoneClick?: (id: string | null) => void;
  onZoneHover?: (id: string | null) => void;
}) {
  const hasOverlay = zones && zones.length > 0 && onZoneClick && onZoneHover;

  return (
    <div className="flex-1 overflow-hidden relative flex items-center justify-center"
      style={{ background: bgColor || checkerBg(), cursor: hasOverlay ? 'crosshair' : undefined }}>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider"
        style={{ background: 'rgba(15,23,42,0.8)', color: 'rgba(226,232,240,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
        {label}
      </div>
      <div className="p-8 flex items-center justify-center w-full h-full relative">
        <img src={src} alt={label}
          className={`block ${full ? 'max-w-[70vw]' : 'max-w-[38vw]'} max-h-[70vh] object-contain select-none`}
          draggable={false} />
        {hasOverlay && (
          <CalquerLogoZoneGroupOverlay
            zones={zones}
            viewBox={zonesViewBox || '0 0 300 300'}
            selectedId={selectedZoneId ?? null}
            hoveredId={hoveredZoneId ?? null}
            onZoneClick={onZoneClick}
            onZoneHover={onZoneHover}
          />
        )}
      </div>
    </div>
  );
}

function checkerBg() {
  return `repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, rgba(0,0,0,0.08) 0% 50%) 0 0 / 32px 32px, rgb(15 23 42)`;
}
