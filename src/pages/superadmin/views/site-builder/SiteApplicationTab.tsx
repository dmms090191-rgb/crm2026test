import { useState } from 'react';
import { Smartphone, Download, CheckCircle2, Share, Plus, MoreVertical } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import usePwaInstall from '../../../../hooks/usePwaInstall';
import type { PwaInstallState } from '../../../../hooks/usePwaInstall';
import AppIconDisplay from './app-tab/AppIconDisplay';
import AppPhonePreview from './app-tab/AppPhonePreview';

export default function SiteApplicationTab() {
  const t = useThemeTokens();
  const pwa = usePwaInstall();

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
          Talvex
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: t.text.tertiary }}>
          Gerez votre activite ou que vous soyez avec l'application mobile Talvex.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
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

      {/* Install button */}
      <div className="flex justify-center mt-8 sm:mt-10">
        <SiteInstallButton state={pwa.state} installing={pwa.installing} promptInstall={pwa.promptInstall} />
      </div>
    </div>
  );
}

function SiteInstallButton({ state, installing, promptInstall }: { state: PwaInstallState; installing: boolean; promptInstall: () => Promise<string> }) {
  const t = useThemeTokens();
  const [showHelp, setShowHelp] = useState(false);

  if (state === 'installed') {
    return (
      <div
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.12))',
          border: '1px solid rgba(16,185,129,0.2)',
          color: '#10b981',
        }}
      >
        <CheckCircle2 className="w-5 h-5" />
        Application deja installee
      </div>
    );
  }

  if (state === 'prompt-ready') {
    return (
      <button
        onClick={() => promptInstall()}
        disabled={installing}
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(14,165,233,0.3), 0 2px 8px rgba(14,165,233,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        <Download className="w-5 h-5" />
        {installing ? 'Installation...' : 'Installer Talvex'}
      </button>
    );
  }

  const isManual = state === 'ios-manual' || state === 'android-manual';

  if (isManual) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(14,165,233,0.3), 0 2px 8px rgba(14,165,233,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <Download className="w-5 h-5" />
          Installer Talvex
        </button>
        {showHelp && (
          <div
            className="flex items-start gap-3 px-5 py-4 rounded-xl max-w-sm text-left"
            style={{
              background: t.surface.secondary,
              border: `1px solid ${t.surface.border}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {state === 'ios-manual'
                ? <Share className="w-5 h-5" style={{ color: '#0ea5e9' }} />
                : <MoreVertical className="w-5 h-5" style={{ color: '#0ea5e9' }} />
              }
            </div>
            <div>
              <p className="text-[12px] font-bold mb-1.5" style={{ color: t.text.primary }}>
                {state === 'ios-manual' ? 'Installation sur iPhone' : 'Installation sur Android'}
              </p>
              <div className="space-y-1.5">
                {state === 'ios-manual' ? (
                  <>
                    <p className="text-[11px] flex items-center gap-2" style={{ color: t.text.secondary }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>1</span>
                      Appuyez sur <Share className="w-3.5 h-3.5 inline" style={{ color: '#0ea5e9' }} /> Partager
                    </p>
                    <p className="text-[11px] flex items-center gap-2" style={{ color: t.text.secondary }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>2</span>
                      Puis <Plus className="w-3.5 h-3.5 inline" style={{ color: '#0ea5e9' }} /> Ajouter a l'ecran d'accueil
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] flex items-center gap-2" style={{ color: t.text.secondary }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>1</span>
                      Appuyez sur <MoreVertical className="w-3.5 h-3.5 inline" style={{ color: '#0ea5e9' }} /> le menu du navigateur
                    </p>
                    <p className="text-[11px] flex items-center gap-2" style={{ color: t.text.secondary }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>2</span>
                      Puis <Download className="w-3.5 h-3.5 inline" style={{ color: '#0ea5e9' }} /> Installer l'application
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
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
        Installer Talvex
      </div>
      <p className="text-[11px] font-medium" style={{ color: t.text.quaternary }}>
        Ouvrez cette page sur un smartphone pour installer l'application
      </p>
    </div>
  );
}
