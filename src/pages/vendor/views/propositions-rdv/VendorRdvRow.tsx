import { Clock, Phone, Mail, Pencil, XCircle, CheckCircle, ArrowUpRight } from 'lucide-react';
import { RdvProposal, statusConfig, formatDate } from '../rdvPropositionsConstants';
import { getRdvLocalTime, getRdvLocalDate } from '../../../../lib/timezoneUtils';
import CheckBox from '../../../admin/views/crm/CheckBox';
import CopyButton from '../../../../components/CopyButton';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface VendorRdvRowProps {
  rdv: RdvProposal;
  idx: number;
  filteredLength: number;
  tokens: ThemeTokens;
  timezone: string;
  todayStr: string;
  selected: boolean;
  onToggleSelect: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onGoToLead?: () => void;
}

export default function VendorRdvRow({
  rdv, idx, filteredLength, tokens, timezone, todayStr,
  selected, onToggleSelect, onAccept, onCancel, onEdit, onGoToLead,
}: VendorRdvRowProps) {
  const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
  const isPast = rdv.proposed_date < todayStr;
  const isPending = rdv.status === 'pending';
  const isCounterProposed = rdv.status === 'counter_proposed';
  const isClientProposal = rdv.created_by_role === 'client';
  const isClientCounter = isClientProposal && !!rdv.parent_proposal_id;

  return (
    <tr
      className="group transition-all duration-150"
      style={{
        borderBottom: idx < filteredLength - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none',
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
                Leads
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
