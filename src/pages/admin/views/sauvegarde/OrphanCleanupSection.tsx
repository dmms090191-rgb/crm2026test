import { useState } from 'react';
import { Search, Trash2, AlertTriangle, CheckCircle, Loader2, Info, RotateCcw, Database } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useOrphanCleanup } from './useOrphanCleanup';

export function OrphanCleanupSection({ tokens: t, onCleanupDone }: { tokens: ReturnType<typeof useThemeTokens>; onCleanupDone?: () => void }) {
  const { status, scanResult, error, deletedCount, remainingCount, liveCheck, liveCheckLoading, scan, deleteOrphans, deleteSoftDeleted, performLiveCheck, reset } = useOrphanCleanup();
  const [confirmOrphans, setConfirmOrphans] = useState(false);
  const [confirmSoftDeleted, setConfirmSoftDeleted] = useState(false);

  const handleDeleteOrphans = async () => {
    setConfirmOrphans(false);
    await deleteOrphans();
    onCleanupDone?.();
  };

  const handleDeleteSoftDeleted = async () => {
    setConfirmSoftDeleted(false);
    await deleteSoftDeleted();
    onCleanupDone?.();
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
    >
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
            Nettoyage des donnees orphelines
          </h3>
          <p className="text-[11px]" style={{ color: t.text.tertiary }}>
            Detecter et supprimer les anciens messages qui ne sont plus lies a des donnees actives.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        {status === 'idle' && (
          <>
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: t.surface.secondary }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.text.tertiary }} />
              <p className="text-xs" style={{ color: t.text.secondary }}>
                Cette analyse verifie les <span className="font-mono">client_messages</span> dont le <span className="font-mono">client_auth_id</span> ne correspond plus a aucun lead actif dans le CRM.
                Aucune donnee ne sera supprimee sans confirmation.
              </p>
            </div>
            <button
              onClick={scan}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
              style={{ background: t.accent.solid, color: '#ffffff' }}
            >
              <Search className="w-4 h-4" />
              Detecter les messages orphelins
            </button>
          </>
        )}

        {status === 'scanning' && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: t.accent.solid }} />
            <p className="text-sm" style={{ color: t.text.secondary }}>Analyse en cours...</p>
          </div>
        )}

        {status === 'scanned' && scanResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl px-4 py-3" style={{ background: t.surface.secondary }}>
                <p className="text-[11px]" style={{ color: t.text.tertiary }}>Messages actifs orphelins</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: scanResult.orphanIds.length > 0 ? '#ef4444' : t.text.primary }}>
                  {scanResult.orphanIds.length}
                </p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: t.surface.secondary }}>
                <p className="text-[11px]" style={{ color: t.text.tertiary }}>Messages deleted=true</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: scanResult.softDeletedIds.length > 0 ? '#f59e0b' : t.text.primary }}>
                  {scanResult.softDeletedIds.length}
                </p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: t.surface.secondary }}>
                <p className="text-[11px]" style={{ color: t.text.tertiary }}>vendor_admin_messages</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: t.text.quaternary }}>
                  non concernes
                </p>
              </div>
            </div>

            {scanResult.orphanIds.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}` }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.warning.text }} />
                <p className="text-xs" style={{ color: t.warning.text }}>
                  Ces {scanResult.orphanIds.length} messages existent encore dans Supabase et seront exportes tant qu'ils ne sont pas supprimes definitivement.
                  Leur <span className="font-mono">client_auth_id</span> ne correspond a aucun lead actif.
                </p>
              </div>
            )}

            {scanResult.orphanIds.length === 0 && scanResult.softDeletedIds.length === 0 && (
              <div className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: t.success.bg, border: `1px solid ${t.success.border}` }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: t.success.text }} />
                <p className="text-xs" style={{ color: t.success.text }}>
                  Aucun message orphelin detecte. La base est propre.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              {scanResult.orphanIds.length > 0 && (
                <>
                  {!confirmOrphans ? (
                    <button
                      onClick={() => setConfirmOrphans(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
                      style={{ background: '#ef4444', color: '#ffffff' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer les {scanResult.orphanIds.length} messages orphelins
                    </button>
                  ) : (
                    <button
                      onClick={handleDeleteOrphans}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all animate-pulse"
                      style={{ background: '#dc2626', color: '#ffffff' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Confirmer la suppression definitive
                    </button>
                  )}
                </>
              )}

              {scanResult.softDeletedIds.length > 0 && (
                <>
                  {!confirmSoftDeleted ? (
                    <button
                      onClick={() => setConfirmSoftDeleted(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
                      style={{ background: t.surface.secondary, color: t.text.primary, border: `1px solid ${t.surface.border}` }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Purger les {scanResult.softDeletedIds.length} messages deleted=true
                    </button>
                  ) : (
                    <button
                      onClick={handleDeleteSoftDeleted}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all animate-pulse"
                      style={{ background: '#dc2626', color: '#ffffff' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Confirmer la purge definitive
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => { setConfirmOrphans(false); setConfirmSoftDeleted(false); reset(); }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
                style={{ background: t.surface.secondary, color: t.text.secondary }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {status === 'deleting' && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#ef4444' }} />
            <p className="text-sm" style={{ color: t.text.secondary }}>Suppression en cours...</p>
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: t.success.bg, border: `1px solid ${t.success.border}` }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: t.success.text }} />
              <p className="text-xs font-medium" style={{ color: t.success.text }}>
                {deletedCount} message{deletedCount > 1 ? 's' : ''} orphelin{deletedCount > 1 ? 's' : ''} supprime{deletedCount > 1 ? 's' : ''} definitivement.
              </p>
            </div>
            {remainingCount !== null && (
              <div className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: t.surface.secondary }}>
                <Info className="w-4 h-4 flex-shrink-0" style={{ color: t.text.tertiary }} />
                <p className="text-xs" style={{ color: t.text.secondary }}>
                  Verification : <span className="font-bold" style={{ color: t.text.primary }}>{remainingCount}</span> client_messages actifs restants en base.
                  {remainingCount === 0 && ' La table est vide.'}
                </p>
              </div>
            )}
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}` }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.warning.text }} />
              <p className="text-xs" style={{ color: t.warning.text }}>
                Les donnees ont change. Refaites un export pour voir l'etat actuel.
              </p>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
              style={{ background: t.surface.secondary, color: t.text.secondary }}
            >
              <RotateCcw className="w-4 h-4" />
              Relancer une analyse
            </button>
          </div>
        )}

        {status === 'error' && error && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.danger.text }} />
              <p className="text-xs" style={{ color: t.danger.text }}>{error}</p>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
              style={{ background: t.surface.secondary, color: t.text.secondary }}
            >
              <RotateCcw className="w-4 h-4" />
              Reessayer
            </button>
          </div>
        )}

        {/* Live check section */}
        <div className="pt-3 mt-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <button
            onClick={performLiveCheck}
            disabled={liveCheckLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
            style={{ background: t.surface.secondary, color: t.text.primary, border: `1px solid ${t.surface.border}` }}
          >
            {liveCheckLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Verifier l'etat actuel Supabase
          </button>

          {liveCheck && (
            <div className="mt-3 rounded-xl px-4 py-3 space-y-2.5" style={{ background: t.surface.secondary }}>
              <p className="text-xs font-medium" style={{ color: t.text.secondary }}>
                Etat actuel de Supabase (temps reel)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                <div className="rounded-lg px-3 py-2" style={{ background: t.card.bg }}>
                  <span className="text-[10px]" style={{ color: t.text.tertiary }}>leads</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text.primary }}>{liveCheck.leads}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: t.card.bg }}>
                  <span className="text-[10px]" style={{ color: t.text.tertiary }}>vendors</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text.primary }}>{liveCheck.vendors}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: t.card.bg }}>
                  <span className="text-[10px]" style={{ color: t.text.tertiary }}>client_messages actifs</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: liveCheck.clientMessagesActive > 0 ? '#ef4444' : t.text.primary }}>{liveCheck.clientMessagesActive}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: t.card.bg }}>
                  <span className="text-[10px]" style={{ color: t.text.tertiary }}>client_messages deleted</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: liveCheck.clientMessagesDeleted > 0 ? '#f59e0b' : t.text.primary }}>{liveCheck.clientMessagesDeleted}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: t.card.bg }}>
                  <span className="text-[10px]" style={{ color: t.text.tertiary }}>vendor_admin actifs</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text.primary }}>{liveCheck.vendorAdminMessagesActive}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: t.card.bg }}>
                  <span className="text-[10px]" style={{ color: t.text.tertiary }}>messages</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text.primary }}>{liveCheck.messages}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: t.card.bg }}>
                  <span className="text-[10px]" style={{ color: t.text.tertiary }}>conversations</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text.primary }}>{liveCheck.conversations}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
