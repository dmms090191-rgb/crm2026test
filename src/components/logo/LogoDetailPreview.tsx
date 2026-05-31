import { Shield, Type, Smartphone, Layers } from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import type { SavedLogo } from './logoAiTypes';
import { ZoomControls } from './LogoAiFullscreen';
import { makeBgStyle } from './logoDetailHelpers';

interface PreviewTab {
  label: string;
  icon: JSX.Element;
  logos: SavedLogo[];
}

interface Props {
  logo: SavedLogo;
  family: SavedLogo[];
  displayedLogos: SavedLogo[];
  previewPage: number;
  setPreviewPage: (p: number) => void;
  previewBg: string | null;
  zoom: number;
  setZoom: (z: number) => void;
  t: ReturnType<typeof useThemeTokens>;
}

export function buildPreviewTabs(family: SavedLogo[]): PreviewTab[] | null {
  if (family.length <= 1) return null;
  return [
    { label: family[0].file_name?.includes('Icone') ? 'Icone' : 'Logo', icon: <Type className="w-2.5 h-2.5" />, logos: [family[0]] },
    { label: family[1].file_name?.includes('Icone') ? 'Icone' : 'Logo', icon: <Smartphone className="w-2.5 h-2.5" />, logos: [family[1]] },
    { label: 'Pack complet', icon: <Layers className="w-2.5 h-2.5" />, logos: family },
  ];
}

export default function LogoDetailPreview({
  logo, family, displayedLogos, previewPage, setPreviewPage,
  previewBg, zoom, setZoom, t,
}: Props) {
  const previewTabs = buildPreviewTabs(family);

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {previewTabs && (
        <div className="flex items-center gap-1 px-3 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          {previewTabs.map((tab, i) => (
            <button key={i} onClick={() => setPreviewPage(i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={previewPage === i ? {
                background: 'rgba(245,158,11,0.10)', color: '#d97706',
                border: '1px solid rgba(245,158,11,0.20)', boxShadow: '0 1px 4px rgba(245,158,11,0.08)',
              } : { color: t.text.quaternary, border: '1px solid transparent' }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center relative overflow-hidden transition-colors duration-300"
        style={{ ...makeBgStyle(displayedLogos[0].url, previewBg, t.surface.primary, t.surface.secondary), minHeight: 140 }}>
        {displayedLogos.length === 1 ? (
          <img src={displayedLogos[0].url} alt={displayedLogos[0].file_name}
            className="object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})`, maxHeight: '100%', maxWidth: '100%', padding: 16 }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
        ) : (
          <div className="flex items-center gap-4 lg:gap-6 px-4" style={{ transform: `scale(${zoom / 100})` }}>
            {displayedLogos.map((l) => (
              <img key={l.id} src={l.url} alt={l.file_name}
                className="object-contain transition-transform duration-200"
                style={{ maxHeight: 120, maxWidth: '45%' }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
            ))}
          </div>
        )}
        {logo.is_active && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold"
            style={{ background: 'rgba(22,163,106,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,106,0.25)', backdropFilter: 'blur(6px)' }}>
            <Shield className="w-3 h-3" /> Actif
          </span>
        )}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <ZoomControls zoom={zoom} onZoom={setZoom} variant="inline" />
        </div>
      </div>
    </div>
  );
}
