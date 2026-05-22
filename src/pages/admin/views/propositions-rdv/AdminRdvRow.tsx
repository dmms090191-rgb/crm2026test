import { Clock, Phone, Mail, Users, Pencil, XCircle, CheckCircle, ArrowUpRight, ArrowRight, RefreshCw } from 'lucide-react';
import { RdvProposal, statusConfig, formatDate } from '../../../vendor/views/rdvPropositionsConstants';
import { getRdvLocalTime, getRdvLocalDate, utcToLocal } from '../../../../lib/timezoneUtils';
import CheckBox from '../crm/CheckBox';
import CopyButton from '../../../../components/CopyButton';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface AdminRdvRowProps {
  rdv: RdvProposal;
  idx: number;
  filteredLength: number;
  tokens: ThemeTokens;
  timezone: string;
  todayStr: string;
  selected: boolean;
  vendorName: string | null;
  onToggleSelect: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onGoToLead?: () => void;
  onAcceptReschedule?: () => void;
  onRefuseReschedule?: () => void;
  onEditReschedule?: () => void;
}

export default function AdminRdvRow({
  rdv, idx, filteredLength, tokens, timezone, todayStr,
  selected, vendorName, onToggleSelect, onAccept, onCancel, onEdit, onGoToLead,
  onAcceptReschedule, onRefuseReschedule, onEditReschedule,
}: AdminRdvRowProps) {
  const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
  const isPast = rdv.proposed_date < todayStr;
  const isPending = rdv.status === 'pending';
  const isCounterProposed = rdv.status === 'counter_proposed';
  const isClientProposal = rdv.created_by_role === 'client';
  const isClientCounter = isClientProposal && !!rdv.parent_proposal_id;
  const isReschedulePending = rdv.status === 'confirmed' && rdv.reschedule_status === 'pending';

  const newLocal = isReschedulePending && rdv.reschedule_utc
    ? utcToLocal(rdv.reschedule_utc, timezone)
    : { date: rdv.reschedule_date || '', time: rdv.reschedule_time || '' };
  const isClientReschedule = isReschedulePending && rdv.reschedule_requested_by === 'client';

  return (
    <>
    <tr
      className="group transition-all duration-150"
      style={{
        borderBottom: isReschedulePending ? 'none' : (idx < filteredLength - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none'),
        opacity: isCounterProposed ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!isCounterProposed) e.currentTarget.style.background = tokens.table.rowHover; }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td className="pl-5 pr-1 py-3.5 w-8">
        <CheckBox checked={selected} onChange={onToggleSelect} />
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', color: '#fff' }}
          >
            {rdv.lead_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: tokens.table.cellText }}>{rdv.lead_name}</span>
              <CopyButton value={rdv.lead_email} label="Copier l'email" />
            </div>
            {rdv.created_by_role === 'client' && (
              <span className="text-[10px] font-medium" style={{ color: '#06b6d4' }}>Propose par le client</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {vendorName ? (
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
            <span className="text-xs font-medium" style={{ color: tokens.table.cellTextMuted }}>{vendorName}</span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: tokens.table.footerText }}>--</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <div>
          <p className="text-sm font-medium" style={{ color: isPast && rdv.status !== 'done' ? tokens.text.tertiary : tokens.table.cellText }}>
            {formatDate(getRdvLocalDate(rdv, timezone))}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" style={{ color: tokens.table.cellIcon }} />
            <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{getRdvLocalTime(rdv, timezone)}</span>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="space-y-1">
          {rdv.lead_phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
              <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{rdv.lead_phone}</span>
            </div>
          )}
          {rdv.lead_email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
              <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{rdv.lead_email}</span>
            </div>
          )}
          {!rdv.lead_phone && !rdv.lead_email && <span className="text-xs" style={{ color: tokens.table.footerText }}>--</span>}
        </div>
      </td>
      <td className="px-5 py-3.5 max-w-[200px]">
        {rdv.counter_message ? (
          <div>
            <p className="text-[11px] italic truncate" style={{ color: '#06b6d4' }}>"{rdv.counter_message}"</p>
            {rdv.motif && <p className="text-[11px] truncate mt-0.5" style={{ color: tokens.table.cellTextMuted }}>{rdv.motif}</p>}
          </div>
        ) : rdv.motif ? (
          <div>
            <p className="text-xs font-semibold truncate" style={{ color: tokens.table.cellText }}>{rdv.motif}</p>
            {rdv.description && <p className="text-[11px] truncate mt-0.5" style={{ color: tokens.table.cellTextMuted }}>{rdv.description}</p>}
          </div>
        ) : (
          <p className="text-xs truncate" style={{ color: tokens.table.cellTextMuted }}>{rdv.notes || '--'}</p>
        )}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-1">
          <span
            className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold w-fit"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
          {isClientCounter && isPending && (
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold w-fit" style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
              Contre-proposition
            </span>
          )}
          {isCounterProposed && (
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold w-fit" style={{ background: 'rgba(100,116,139,0.08)', color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }}>
              Remplacee
            </span>
          )}
          {isReschedulePending && (
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold w-fit" style={{ background: 'rgba(251,191,36,0.08)', color: '#f59e0b', border: '1px solid rgba(251,191,36,0.2)' }}>
              Decalage en attente
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5">
        {isCounterProposed ? (
          <span className="text-[11px]" style={{ color: tokens.table.footerText }}>--</span>
        ) : (
          <div className="flex items-center gap-1.5">
            {isPending && isClientProposal && (
              <button
                onClick={onAccept}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}
              >
                <CheckCircle className="w-3 h-3" />
                Accepter
              </button>
            )}
            {isPending && (
              <button
                onClick={onCancel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
              >
                <XCircle className="w-3 h-3" />
                {isClientProposal ? 'Refuser' : 'Annuler'}
              </button>
            )}
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#60a5fa' }}
            >
              <Pencil className="w-3 h-3" />
              Modifier
            </button>
            {onGoToLead && (
              <button
                onClick={onGoToLead}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}
              >
                <ArrowUpRight className="w-3 h-3" />
                CRM
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
    {isReschedulePending && (
      <tr style={{ borderBottom: idx < filteredLength - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none' }}>
        <td colSpan={8} className="px-5 pb-3.5 pt-0">
          <div className="ml-9 p-3 rounded-xl space-y-2" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
              {isClientReschedule ? 'Le client souhaite decaler ce rendez-vous' : 'Decalage propose (en attente du client)'}
            </p>
            <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: tokens.text.tertiary }}>
              <span className="line-through opacity-60">{getRdvLocalTime(rdv, timezone)} - {formatDate(getRdvLocalDate(rdv, timezone))}</span>
              <ArrowRight className="w-3 h-3" style={{ color: '#f59e0b' }} />
              <span className="font-semibold" style={{ color: '#f59e0b' }}>
                {newLocal.time} - {newLocal.date ? formatDate(newLocal.date) : ''}
              </span>
            </div>
            {rdv.reschedule_reason && (
              <p className="text-[11px] italic" style={{ color: tokens.text.quaternary }}>Motif : {rdv.reschedule_reason}</p>
            )}
            {isClientReschedule && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <button
                  onClick={onAcceptReschedule}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}
                >
                  <CheckCircle className="w-3 h-3" />
                  Accepter
                </button>
                <button
                  onClick={onRefuseReschedule}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
                >
                  <XCircle className="w-3 h-3" />
                  Refuser
                </button>
                <button
                  onClick={onEditReschedule}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Modifier l'horaire
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    )}
    </>
  );
}
