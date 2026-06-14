import { useState } from 'react';
import { ScanSearch, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { segmentLogoWithAI, type AiZone } from './calquer-logo-ai-zones';
import CalquerLogoZoneList from './CalquerLogoZoneList';

interface Props {
  imageUrl: string | null;
  onZonesDetected: (zones: AiZone[], imgW: number, imgH: number) => void;
  onZoneSelect: (zoneId: string | null) => void;
  onZoneHover: (zoneId: string | null) => void;
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  zones: AiZone[];
  detected: boolean;
}

export default function CalquerLogoZoneTools({
  imageUrl, onZonesDetected, onZoneSelect, onZoneHover,
  selectedZoneId, hoveredZoneId, zones, detected,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const color = '#06b6d4';

  const handleToggle = () => {
    if (!expanded) {
      setExpanded(true);
      if (!detected) runDetection();
    } else {
      setExpanded(false);
    }
  };

  const runDetection = async () => {
    if (!imageUrl) return;
    setDetecting(true);
    setError(null);
    try {
      const result = await segmentLogoWithAI(imageUrl);
      if (result.error) {
        setError(result.error);
        onZonesDetected([], result.imageWidth, result.imageHeight);
      } else {
        onZonesDetected(result.zones, result.imageWidth, result.imageHeight);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur pendant l\'analyse IA.';
      setError(msg);
      onZonesDetected([], 512, 512);
    }
    setDetecting(false);
  };

  const handleRedetect = () => {
    onZoneSelect(null);
    runDetection();
  };

  const zoneItems = zones.map(z => ({
    id: z.id,
    label: z.label,
    type: z.type as 'group' | 'shape',
    tag: z.type,
    color: z.color,
    bbox: z.bbox,
    elementIndices: [],
    elementCount: 1,
  }));

  return (
    <div className="flex flex-col gap-2">
      <button onClick={handleToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: detected ? `${color}12` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${detected ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
        }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          {detecting
            ? <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
            : <ScanSearch className="w-4 h-4" style={{ color }} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate"
            style={{ color: detected ? color : 'rgba(226,232,240,0.9)' }}>
            Segmentation IA du logo
          </p>
          <p className="text-[9px] truncate" style={{ color: 'rgba(148,163,184,0.5)' }}>
            {detecting
              ? 'Analyse IA en cours...'
              : detected
              ? `${zones.length} zone${zones.length > 1 ? 's' : ''} detectee${zones.length > 1 ? 's' : ''}`
              : 'Analyse intelligente des zones'}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
          style={{ color: 'rgba(148,163,184,0.4)', transform: expanded ? 'rotate(180deg)' : 'none' }} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 pl-1 pr-1">
          {detecting && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
              <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
                Segmentation IA en cours...
              </span>
              <span className="text-[9px]" style={{ color: 'rgba(148,163,184,0.35)' }}>
                L'analyse peut prendre 10-30 secondes
              </span>
            </div>
          )}

          {error && !detecting && (
            <div className="flex items-start gap-2 p-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-[10px]" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}

          {!detecting && detected && !error && (
            <>
              <CalquerLogoZoneList
                zones={zoneItems}
                selectedZoneId={selectedZoneId}
                hoveredZoneId={hoveredZoneId}
                onSelect={onZoneSelect}
                onHover={onZoneHover}
              />
              <button onClick={handleRedetect}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(148,163,184,0.5)',
                }}>
                <ScanSearch className="w-3 h-3" />
                Relancer l'analyse IA
              </button>
            </>
          )}

          {!detecting && !detected && !error && (
            <div className="text-center py-3">
              <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
                Cliquez pour lancer la segmentation IA
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
