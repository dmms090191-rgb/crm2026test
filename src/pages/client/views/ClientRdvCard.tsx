import { CalendarDays, Clock, Phone, Mail, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { getRdvLocalDate, getRdvLocalTime } from '../../../lib/timezoneUtils';
import type { ThemeTokens } from '../../../lib/themeTokensTypes';

interface RdvProposal {
  id: string;
  vendor_id?: string | null;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  proposed_date: string;
  proposed_time: string;
  notes: string;
  status: string;
  motif: string;
  description: string;
  created_by_role: string;
  created_by_id?: string | null;
  target_role: string;
  responded_at?: string | null;
  responded_by?: string | null;
  created_at: string;
  appointment_utc?: string | null;
  source_timezone?: string;
  created_by_name?: string;
  parent_proposal_id?: string | null;
  counter_message?: string;
}

interface ClientRdvCardProps {
  rdv: RdvProposal;
  tokens: ThemeTokens;
  timezone: string;
  todayStr: string;
  statusConfig: Record<string, { label: string; color: string; bg: string; border: string }>;
  onAccept: (id: string) => void;
  onRefuse: (id: string) => void;
  onCounterPropose: (id: string) => void;
  onCancelOwn?: (id: string) => void;
}

export default function ClientRdvCard({ rdv, tokens, timezone, todayStr, statusConfig, onAccept, onRefuse, onCounterPropose, onCancelOwn }: ClientRdvCardProps) {
  const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
  const isPast = rdv.proposed_date < todayStr;
  const isPending = rdv.status === 'pending';
  const isCounterProposed = rdv.status === 'counter_proposed';
  const isOwnProposal = rdv.created_by_role === 'client';
  const canRespond = isPending && !isOwnProposal;
  const isWaitingResponse = isPending && isOwnProposal;

  return (
    <div
      className="flex items-start gap-4 px-5 py-4 transition-all"
      style={{
        background: 'transparent',
        opacity: isCounterProposed ? 0.5 : 1,
        pointerEvents: isCounterProposed ? 'none' : undefined,
      }}
      onMouseEnter={e => { if (!isCounterProposed) e.currentTarget.style.background = tokens.surface.hover; }}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <CalendarDays className="w-4 h-4" style={{ color: cfg.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <span className="text-sm font-semibold" style={{ color: isPast && rdv.status !== 'done' ? tokens.text.tertiary : tokens.text.primary }}>
            {rdv.created_by_role === 'client' ? `Rendez-vous de ${rdv.lead_name}` : 'Rendez-vous de votre conseiller'}
          </span>
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
          {isCounterProposed && (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{ background: 'rgba(100,116,139,0.08)', color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }}
            >
              Remplacee
            </span>
          )}
        </div>

        {rdv.motif && (
          <p className="text-xs font-medium mb-1" style={{ color: tokens.text.secondary || tokens.text.primary }}>
            {rdv.motif}
          </p>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.text.tertiary }}>
            <CalendarDays className="w-3 h-3" style={{ color: tokens.text.quaternary }} />
            <span>
              {new Date(getRdvLocalDate(rdv, timezone) + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.text.tertiary }}>
            <Clock className="w-3 h-3" style={{ color: tokens.text.quaternary }} />
            <span>{getRdvLocalTime(rdv, timezone)}</span>
          </div>
        </div>

        {(rdv.lead_phone || rdv.lead_email) && (
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {rdv.lead_phone && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.text.quaternary }}>
                <Phone className="w-3 h-3" />
                <span>{rdv.lead_phone}</span>
              </div>
            )}
            {rdv.lead_email && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.text.quaternary }}>
                <Mail className="w-3 h-3" />
                <span>{rdv.lead_email}</span>
              </div>
            )}
          </div>
        )}

        {rdv.description && (
          <p className="text-xs mt-1.5" style={{ color: tokens.text.quaternary }}>{rdv.description}</p>
        )}

        {rdv.notes && (
          <p className="text-xs mt-1 italic" style={{ color: tokens.text.quaternary }}>{rdv.notes}</p>
        )}

        {canRespond && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => onAccept(rdv.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Accepter
            </button>
            <button
              onClick={() => onRefuse(rdv.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
            >
              <XCircle className="w-3.5 h-3.5" />
              Refuser
            </button>
            <button
              onClick={() => onCounterPropose(rdv.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Modifier l'horaire
            </button>
          </div>
        )}

        {isWaitingResponse && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24' }}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              En attente de reponse du conseiller
            </div>
            {onCancelOwn && (
              <button
                onClick={() => onCancelOwn(rdv.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}
              >
                <XCircle className="w-3.5 h-3.5" />
                Annuler ma proposition
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
