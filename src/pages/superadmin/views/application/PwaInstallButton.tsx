import { useState } from 'react';
import { Download, CheckCircle2, Share, Plus, MoreVertical } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type usePwaInstall from '../../../../hooks/usePwaInstall';

interface Props {
  pwa: ReturnType<typeof usePwaInstall>;
  appName?: string;
}

export default function PwaInstallButton({ pwa, appName }: Props) {
  const t = useThemeTokens();
  const [showHelp, setShowHelp] = useState(false);
  const displayName = appName ?? 'Talvex';
  const installLabel = `Installer ${displayName}`;

  if (pwa.state === 'installed') {
    return (
      <div className="flex flex-col items-center gap-2">
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
      </div>
    );
  }

  if (pwa.state === 'prompt-ready') {
    return (
      <button
        onClick={() => pwa.promptInstall()}
        disabled={pwa.installing}
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(14,165,233,0.3), 0 2px 8px rgba(14,165,233,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        <Download className="w-5 h-5" />
        {pwa.installing ? 'Installation...' : installLabel}
      </button>
    );
  }

  if (pwa.state === 'ios-manual' || pwa.state === 'android-manual') {
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
          {installLabel}
        </button>
        {showHelp && (
          <ManualInstallHelp t={t} variant={pwa.state === 'ios-manual' ? 'ios' : 'android'} />
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
        {installLabel}
      </div>
      <p className="text-[11px] font-medium" style={{ color: t.text.quaternary }}>
        Ouvrez cette page sur un smartphone pour installer l'application
      </p>
    </div>
  );
}

function ManualInstallHelp({ t, variant }: { t: ReturnType<typeof useThemeTokens>; variant: 'ios' | 'android' }) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-xl max-w-sm text-left animate-in fade-in duration-200"
      style={{
        background: t.surface.secondary,
        border: `1px solid ${t.surface.border}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        {variant === 'ios'
          ? <Share className="w-5 h-5" style={{ color: '#0ea5e9' }} />
          : <MoreVertical className="w-5 h-5" style={{ color: '#0ea5e9' }} />
        }
      </div>
      <div>
        <p className="text-[12px] font-bold mb-1.5" style={{ color: t.text.primary }}>
          {variant === 'ios' ? 'Installation sur iPhone' : 'Installation sur Android'}
        </p>
        <div className="space-y-1.5">
          {variant === 'ios' ? (
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
  );
}
