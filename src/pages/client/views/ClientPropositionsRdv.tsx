import { CalendarDays, Plus } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { statusConfig, FILTERS, filterToStatus } from './propositions-rdv/clientRdvConstants';
import { useClientRdvData } from './propositions-rdv/useClientRdvData';
import ClientRdvCard from './ClientRdvCard';
import ClientCounterProposalModal from './ClientCounterProposalModal';
import ClientNewRdvModal from './ClientNewRdvModal';

interface ClientPropositionsRdvProps {
  clientEmail: string;
  onMount?: () => void;
}

export default function ClientPropositionsRdv({ clientEmail, onMount }: ClientPropositionsRdvProps) {
  const tokens = useThemeTokens();
  const {
    rdvs, loading, filter, setFilter, filtered, todayStr,
    counterTarget, setCounterTarget, counterSaving, counterError,
    showNewRdv, setShowNewRdv, newRdvSaving, newRdvError, setNewRdvError,
    handleAccept, handleRefuse, handleOpenCounter, handleCancelOwn,
    handleAcceptReschedule, handleRefuseReschedule, handleOpenCounterReschedule,
    handleRequestReschedule, handleCounterSubmit, handleNewRdvSubmit,
    CLIENT_TZ,
  } = useClientRdvData({ clientEmail, onMount });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Propositions RDV</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>{rdvs.length} proposition{rdvs.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => { setNewRdvError(''); setShowNewRdv(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
          style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
        >
          <Plus className="w-3.5 h-3.5" />
          Proposer un rendez-vous
        </button>
      </div>

      {rdvs.length === 0 && !loading && (
        <div
          className="rounded-2xl p-6 flex items-center gap-4"
          style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.1)' }}
        >
          <CalendarDays className="w-5 h-5 flex-shrink-0" style={{ color: '#34d399' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Aucune proposition de rendez-vous</p>
            <p className="text-xs" style={{ color: tokens.text.tertiary }}>Votre conseiller vous proposera bientot des creneaux.</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        <div className="flex items-center gap-2 px-5 py-3.5 flex-wrap" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          {FILTERS.map(f => {
            const active = filter === f;
            const statusKey = filterToStatus[f];
            const cfg = statusKey ? statusConfig[statusKey] : null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={active
                  ? { background: cfg ? cfg.bg : 'rgba(255,255,255,0.08)', color: cfg ? cfg.color : tokens.text.primary, border: `1px solid ${cfg ? cfg.border : tokens.surface.border}` }
                  : { background: 'transparent', color: tokens.text.tertiary, border: `1px solid ${tokens.surface.borderLight}` }
                }
              >
                {f}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: tokens.surface.border, borderTopColor: '#34d399' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.surface.secondary }}>
              <CalendarDays className="w-5 h-5" style={{ color: tokens.text.quaternary }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune proposition pour ce filtre</p>
          </div>
        ) : (
          <div>
            {filtered.map((rdv, idx) => (
              <div key={rdv.id} style={{ borderTop: idx > 0 ? `1px solid ${tokens.surface.borderLight}` : 'none' }}>
                <ClientRdvCard
                  rdv={rdv}
                  tokens={tokens}
                  timezone={CLIENT_TZ}
                  todayStr={todayStr}
                  statusConfig={statusConfig}
                  onAccept={handleAccept}
                  onRefuse={handleRefuse}
                  onCounterPropose={handleOpenCounter}
                  onCancelOwn={handleCancelOwn}
                  onAcceptReschedule={handleAcceptReschedule}
                  onRefuseReschedule={handleRefuseReschedule}
                  onCounterReschedule={handleOpenCounterReschedule}
                  onRequestReschedule={handleRequestReschedule}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}>
            <p className="text-xs" style={{ color: tokens.text.quaternary }}>{filtered.length} proposition{filtered.length !== 1 ? 's' : ''} affichee{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {counterTarget && (
        <ClientCounterProposalModal
          currentDate={counterTarget.proposed_date}
          currentTime={counterTarget.proposed_time}
          onSubmit={handleCounterSubmit}
          onCancel={() => setCounterTarget(null)}
          saving={counterSaving}
          error={counterError}
        />
      )}

      {showNewRdv && (
        <ClientNewRdvModal
          onSubmit={handleNewRdvSubmit}
          onCancel={() => setShowNewRdv(false)}
          saving={newRdvSaving}
          error={newRdvError}
        />
      )}
    </div>
  );
}
