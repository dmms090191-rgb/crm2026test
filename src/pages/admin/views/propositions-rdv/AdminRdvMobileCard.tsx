import { CalendarDays, Clock, Phone, Mail, Users, Pencil, XCircle, CheckCircle, ArrowUpRight, ArrowRight, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { RdvProposal, statusConfig, formatDate } from '../../../vendor/views/rdvPropositionsConstants';
import { getRdvLocalTime, getRdvLocalDate, utcToLocal } from '../../../../lib/timezoneUtils';
import CheckBox from '../crm/CheckBox';
import CopyButton from '../../../../components/CopyButton';

interface Props {
  rdv: RdvProposal;
  timezone: string;
  selected: boolean;
  vendorName: string | null;
  onToggleSelect: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDetail: () => void;
  onGoToLead?: () => void;
  onAcceptReschedule?: () => void;
  onRefuseReschedule?: () => void;
  onEditReschedule?: () => void;
}

export default function AdminRdvMobileCard({ rdv, timezone, selected, vendorName: vName, onToggleSelect, onAccept, onCancel, onEdit, onDetail, onGoToLead, onAcceptReschedule, onRefuseReschedule, onEditReschedule }: Props) {
  const tokens = useThemeTokens();
  const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
  const isPending = rdv.status === 'pending';
  const isCounterProposed = rdv.status === 'counter_proposed';
  const isClientProposal = rdv.created_by_role === 'client';
  const isClientCounter = isClientProposal && !!rdv.parent_proposal_id;
  const isReschedulePending = rdv.status === 'confirmed' && rdv.reschedule_status === 'pending';

  return (
    <div className="p-3 space-y-2" style={{ opacity: isCounterProposed ? 0.45 : 1 }}>
      <div className="flex items-start gap-2">
        <CheckBox checked={selected} onChange={onToggleSelect} />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onDetail}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', color: '#fff' }}>
                {rdv.lead_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate" style={{ color: tokens.table.cellText }}>{rdv.lead_name}</span>
                  <CopyButton value={rdv.lead_email} label="Copier l'email" />
                </div>
                {rdv.created_by_role === 'client' && (
                  <span className="text-[9px] font-medium" style={{ color: '#06b6d4' }}>Propose par le client</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isClientCounter && isPending && (
                <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-semibold" style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
                  Contre-prop.
                </span>
              )}
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.label}
              </span>
              {isReschedulePending && (
                <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-semibold" style={{ background: 'rgba(251,191,36,0.08)', color: '#f59e0b', border: '1px solid rgba(251,191,36,0.2)' }}>
                  Decalage
                </span>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-x-3 text-[11px]" style={{ color: tokens.table.cellTextMuted }}>
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
              {formatDate(getRdvLocalDate(rdv, timezone))}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
              {getRdvLocalTime(rdv, timezone)}
            </span>
            {vName && (
              <span className="flex items-center gap-1 truncate">
                <Users className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                <span className="truncate">{vName}</span>
              </span>
            )}
          </div>
          {(rdv.lead_phone || rdv.lead_email) && (
            <div className="mt-1 flex items-center gap-x-3 text-[11px]" style={{ color: tokens.table.cellTextMuted }}>
              {rdv.lead_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                  {rdv.lead_phone}
                </span>
              )}
              {rdv.lead_email && (
                <span className="flex items-center gap-1 min-w-0">
                  <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                  <span className="truncate">{rdv.lead_email}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {rdv.counter_message && (
        <p className="text-[11px] italic pl-6 truncate" style={{ color: '#06b6d4' }}>"{rdv.counter_message}"</p>
      )}
      {isReschedulePending && (() => {
        const newLocal = rdv.reschedule_utc
          ? utcToLocal(rdv.reschedule_utc, timezone)
          : { date: rdv.reschedule_date || '', time: rdv.reschedule_time || '' };
        const isClientReschedule = rdv.reschedule_requested_by === 'client';
        return (
          <div className="ml-6 p-2.5 rounded-xl space-y-2" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <p className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>
              {isClientReschedule ? 'Le client souhaite decaler ce RDV' : 'Decalage propose'}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]" style={{ color: tokens.text.tertiary }}>
              <span className="line-through opacity-60">{getRdvLocalTime(rdv, timezone)} - {formatDate(getRdvLocalDate(rdv, timezone))}</span>
              <ArrowRight className="w-3 h-3" style={{ color: '#f59e0b' }} />
              <span className="font-semibold" style={{ color: '#f59e0b' }}>
                {newLocal.time} - {newLocal.date ? formatDate(newLocal.date) : ''}
              </span>
            </div>
            {rdv.reschedule_reason && (
              <p className="text-[10px] italic" style={{ color: tokens.text.quaternary }}>Motif : {rdv.reschedule_reason}</p>
            )}
            {isClientReschedule && (
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                <button onClick={onAcceptReschedule} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                  <CheckCircle className="w-3 h-3" />Accepter
                </button>
                <button onClick={onRefuseReschedule} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                  <XCircle className="w-3 h-3" />Refuser
                </button>
                <button onClick={onEditReschedule} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}>
                  <RefreshCw className="w-3 h-3" />Modifier
                </button>
              </div>
            )}
          </div>
        );
      })()}
      {!isCounterProposed && (
        <div className="grid grid-cols-2 gap-1.5 pl-6">
          {isPending && isClientProposal && (
            <button onClick={onAccept} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
              <CheckCircle className="w-3 h-3" />Accepter
            </button>
          )}
          {isPending && (
            <button onClick={onCancel} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
              <XCircle className="w-3 h-3" />{isClientProposal ? 'Refuser' : 'Annuler'}
            </button>
          )}
          <button onClick={onEdit} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#60a5fa' }}>
            <Pencil className="w-3 h-3" />Modifier
          </button>
          {onGoToLead && (
            <button onClick={onGoToLead} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}>
              <ArrowUpRight className="w-3 h-3" />CRM
            </button>
          )}
        </div>
      )}
    </div>
  );
}
