import { Clock, Phone, Mail, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { RdvProposal, statusConfig, formatDate } from '../rdvPropositionsConstants';
import { getRdvLocalTime, getRdvLocalDate } from '../../../../lib/timezoneUtils';
import CheckBox from '../../../admin/views/crm/CheckBox';
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
  onRefuse: () => void;
  onEdit: () => void;
}

export default function VendorRdvRow({
  rdv, idx, filteredLength, tokens, timezone, todayStr,
  selected, onToggleSelect, onAccept, onRefuse, onEdit,
}: VendorRdvRowProps) {
  const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
  const isPast = rdv.proposed_date < todayStr;
  const isPending = rdv.status === 'pending';

  return (
    <tr
      className="group transition-all duration-150"
      style={{ borderBottom: idx < filteredLength - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none' }}
      onMouseEnter={e => e.currentTarget.style.background = tokens.table.rowHover}
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
          <span className="text-sm font-semibold" style={{ color: tokens.table.cellText }}>{rdv.lead_name}</span>
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
        {rdv.motif ? (
          <div>
            <p className="text-xs font-semibold truncate" style={{ color: tokens.table.cellText }}>{rdv.motif}</p>
            {rdv.description && <p className="text-[11px] truncate mt-0.5" style={{ color: tokens.table.cellTextMuted }}>{rdv.description}</p>}
          </div>
        ) : (
          <p className="text-xs truncate" style={{ color: tokens.table.cellTextMuted }}>{rdv.notes || '--'}</p>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span
          className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
          {cfg.label}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          {isPending && (
            <>
              <button
                onClick={onAccept}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}
              >
                <CheckCircle className="w-3 h-3" />
                Accepter
              </button>
              <button
                onClick={onRefuse}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
              >
                <XCircle className="w-3 h-3" />
                Refuser
              </button>
            </>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#60a5fa' }}
          >
            <Pencil className="w-3 h-3" />
            Modifier
          </button>
        </div>
      </td>
    </tr>
  );
}
