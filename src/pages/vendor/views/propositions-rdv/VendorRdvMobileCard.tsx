import { CalendarDays, Clock, Phone, Mail, Pencil, XCircle, CheckCircle, ArrowUpRight } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { RdvProposal, statusConfig, formatDate } from '../rdvPropositionsConstants';
import { getRdvLocalTime, getRdvLocalDate } from '../../../../lib/timezoneUtils';
import CheckBox from '../../../admin/views/crm/CheckBox';
import CopyButton from '../../../../components/CopyButton';

interface Props {
  rdv: RdvProposal;
  timezone: string;
  selected: boolean;
  onToggleSelect: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDetail: () => void;
  onGoToLead?: () => void;
}

export default function VendorRdvMobileCard({ rdv, timezone, selected, onToggleSelect, onAccept, onCancel, onEdit, onDetail, onGoToLead }: Props) {
  const tokens = useThemeTokens();
  const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
  const isPending = rdv.status === 'pending';
  const isCounterProposed = rdv.status === 'counter_proposed';
  const isClientProposal = rdv.created_by_role === 'client';
  const isClientCounter = isClientProposal && !!rdv.parent_proposal_id;

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
              <ArrowUpRight className="w-3 h-3" />Leads
            </button>
          )}
        </div>
      )}
    </div>
  );
}
