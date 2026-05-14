import { Pencil, XCircle, CheckCircle, ArrowUpRight, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { RdvProposal, statusConfig, formatDate } from '../rdvPropositionsConstants';
import { getRdvLocalTime, getRdvLocalDate } from '../../../../lib/timezoneUtils';

interface Props {
  rdv: RdvProposal;
  timezone: string;
  onClose: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onGoToLead?: () => void;
}

export default function VendorRdvDetailModal({ rdv, timezone, onClose, onAccept, onCancel, onEdit, onGoToLead }: Props) {
  const tokens = useThemeTokens();
  const cfg = statusConfig[rdv.status] ?? statusConfig.pending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: 'min(28rem, calc(100vw - 24px))', maxHeight: 'calc(100vh - 32px)', background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${tokens.card.border}` }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', color: '#fff' }}>
              {rdv.lead_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: tokens.modal.title }}>{rdv.lead_name}</p>
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold mt-0.5" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Date</p>
              <p className="text-sm font-medium" style={{ color: tokens.modal.fieldValue }}>{formatDate(getRdvLocalDate(rdv, timezone))}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Heure</p>
              <p className="text-sm font-medium" style={{ color: tokens.modal.fieldValue }}>{getRdvLocalTime(rdv, timezone)}</p>
            </div>
          </div>
          {rdv.lead_phone && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Telephone</p>
              <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{rdv.lead_phone}</p>
            </div>
          )}
          {rdv.lead_email && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Email</p>
              <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{rdv.lead_email}</p>
            </div>
          )}
          {rdv.motif && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Motif</p>
              <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{rdv.motif}</p>
            </div>
          )}
          {rdv.description && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Description</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: tokens.modal.fieldValue }}>{rdv.description}</p>
            </div>
          )}
          {rdv.created_by_name && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>Cree par</p>
              <p className="text-sm" style={{ color: tokens.modal.fieldValue }}>{rdv.created_by_name} ({rdv.created_by_role})</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ borderTop: `1px solid ${tokens.card.border}` }}>
          {rdv.status === 'pending' && rdv.created_by_role === 'client' && !!rdv.parent_proposal_id && (
            <button onClick={onAccept} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
              <CheckCircle className="w-3 h-3" />Accepter
            </button>
          )}
          {rdv.status === 'pending' && (
            <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
              <XCircle className="w-3 h-3" />{rdv.created_by_role === 'client' && rdv.parent_proposal_id ? 'Refuser' : 'Annuler'}
            </button>
          )}
          <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#60a5fa' }}>
            <Pencil className="w-3 h-3" />Modifier
          </button>
          {onGoToLead && (
            <button onClick={onGoToLead} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}>
              <ArrowUpRight className="w-3 h-3" />Leads
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
