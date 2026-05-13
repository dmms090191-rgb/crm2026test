import { X } from 'lucide-react';
import type { RdvProposal } from './agendaTypes';
import { STATUS_CFG } from './agendaTypes';
import { isRdvPast } from './agendaHelpers';
import { getRdvLocalTime } from '../../lib/timezoneUtils';

interface RdvPillProps {
  rdv: RdvProposal;
  compact?: boolean;
  onDetail: (rdv: RdvProposal) => void;
  userTimezone?: string;
}

export default function RdvPill({ rdv, compact, onDetail, userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }: RdvPillProps) {
  const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
  const localTime = getRdvLocalTime(rdv, userTimezone);
  const isPast = rdv.status === 'confirmed' && isRdvPast(rdv);
  const isTreated = !!rdv.treated_at;
  const showUntreated = isPast && !isTreated;

  return (
    <button
      onClick={e => { e.stopPropagation(); onDetail(rdv); }}
      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-all hover:brightness-125 relative overflow-hidden"
      style={{
        background: isTreated ? 'rgba(148,163,184,0.08)' : cfg.bg,
        color: isTreated ? '#64748b' : cfg.color,
        border: `1px solid ${isTreated ? 'rgba(148,163,184,0.2)' : cfg.border}`,
      }}
      title={`${localTime} — ${rdv.lead_name}${rdv.motif ? ` — ${rdv.motif}` : ''}${showUntreated ? ' (Non traité)' : ''}${isTreated ? ' (Traité)' : ''}`}
    >
      {showUntreated && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <X className="w-5 h-5 text-red-500 opacity-20" />
        </div>
      )}
      <span className="block truncate relative">
        {!compact && <span className="opacity-70 mr-1">{localTime}</span>}
        {rdv.lead_name}
        {showUntreated && <span className="ml-1 text-[8px] text-red-500 font-bold opacity-80">!</span>}
        {isTreated && !compact && <span className="ml-1 text-[8px] text-slate-400 font-semibold">&#10003;</span>}
      </span>
      {!compact && rdv.motif && (
        <span className="block truncate text-[9px] opacity-60">{rdv.motif}</span>
      )}
    </button>
  );
}
