import { useState } from 'react';
import { Smartphone, Download, ExternalLink } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import AppIconDisplay from './app-tab/AppIconDisplay';
import AppPhonePreview from './app-tab/AppPhonePreview';

const APP_CONFIG = {
  appName: 'Talvex',
  downloadUrl: null as string | null,
};

export default function SiteApplicationTab() {
  const t = useThemeTokens();
  const [downloadHovered, setDownloadHovered] = useState(false);

  const hasDownloadUrl = !!APP_CONFIG.downloadUrl;

  const handleDownload = () => {
    if (APP_CONFIG.downloadUrl) {
      window.open(APP_CONFIG.downloadUrl, '_blank', 'noopener');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}
        >
          <Smartphone className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#0ea5e9' }}>Application mobile</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: t.heading.primary }}>
          {APP_CONFIG.appName}
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: t.text.tertiary }}>
          Gerez votre activite ou que vous soyez avec l'application mobile Talvex.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left: App icon + features */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: t.surface.primary,
            border: `1px solid ${t.surface.border}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <AppIconDisplay />
        </div>

        {/* Right: Phone preview */}
        <div className="flex flex-col items-center gap-6">
          <div
            className="rounded-2xl p-6 sm:p-8 flex justify-center"
            style={{
              background: 'linear-gradient(180deg, #060a14 0%, #0a0e17 50%, #060a14 100%)',
              border: `1px solid ${t.surface.border}`,
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            }}
          >
            <AppPhonePreview />
          </div>
        </div>
      </div>

      {/* Download button */}
      <div className="flex justify-center mt-8 sm:mt-10">
        {hasDownloadUrl ? (
          <button
            onClick={handleDownload}
            onMouseEnter={() => setDownloadHovered(true)}
            onMouseLeave={() => setDownloadHovered(false)}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: downloadHovered
                ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
                : 'linear-gradient(135deg, #0ea5e9, #10b981)',
              color: '#fff',
              boxShadow: downloadHovered
                ? '0 8px 32px rgba(14,165,233,0.4), 0 0 0 1px rgba(14,165,233,0.2)'
                : '0 4px 20px rgba(14,165,233,0.25)',
            }}
          >
            <Download className="w-5 h-5" />
            Telecharger l'application
            <ExternalLink className="w-4 h-4 opacity-60" />
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold"
              style={{
                background: t.surface.secondary,
                border: `1.5px dashed ${t.surface.border}`,
                color: t.text.quaternary,
                cursor: 'not-allowed',
              }}
            >
              <Download className="w-5 h-5 opacity-40" />
              Telecharger l'application
            </div>
            <p className="text-[11px] font-medium" style={{ color: t.text.quaternary }}>
              Telechargement bientot disponible
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
