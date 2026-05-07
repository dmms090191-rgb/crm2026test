import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export default function SyncBanner({
  syncing,
  syncResult,
  onSync,
}: {
  syncing: boolean;
  syncResult: { status: 'idle' | 'ok' | 'error'; message?: string };
  onSync: () => void;
}) {
  const tokens = useThemeTokens();

  return (
    <div
      className="rounded-xl p-3 mb-4 flex flex-col md:flex-row md:items-center gap-2.5 md:gap-3"
      style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${tokens.surface.border}` }}
    >
      <div className="flex-1 min-w-0">
        {syncResult.status === 'ok' && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.success.text }} />
            <span className="text-xs" style={{ color: tokens.success.text }}>
              {syncResult.message}
            </span>
          </div>
        )}
        {syncResult.status === 'error' && (
          <span className="text-xs" style={{ color: tokens.danger.text }}>
            {syncResult.message || 'Erreur de synchronisation'}
          </span>
        )}
        {syncResult.status === 'idle' && !syncing && (
          <span className="text-[11px] md:text-xs" style={{ color: tokens.text.quaternary }}>
            Cliquez sur Synchroniser pour mettre a jour toutes les tables depuis Supabase.
          </span>
        )}
        {syncing && (
          <span className="text-xs" style={{ color: tokens.accent.text }}>
            Synchronisation en cours...
          </span>
        )}
      </div>

      <button
        onClick={onSync}
        disabled={syncing}
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 flex-shrink-0 self-start md:self-auto"
        style={{
          background: syncing ? 'rgba(56,189,248,0.06)' : tokens.accent.bg,
          color: syncing ? 'rgba(56,189,248,0.4)' : tokens.accent.text,
          border: `1px solid ${syncing ? 'rgba(56,189,248,0.15)' : tokens.accent.border}`,
          cursor: syncing ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!syncing) {
            e.currentTarget.style.background = 'rgba(56,189,248,0.14)';
            e.currentTarget.style.borderColor = 'rgba(56,189,248,0.35)';
          }
        }}
        onMouseLeave={(e) => {
          if (!syncing) {
            e.currentTarget.style.background = tokens.accent.bg;
            e.currentTarget.style.borderColor = tokens.accent.border;
          }
        }}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
        Synchroniser tout
      </button>
    </div>
  );
}
