import { X, Clock, Phone, Mail, Briefcase, FileText, AlignLeft, Globe, UserPlus, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { RdvProposal } from './agendaTypes';
import { STATUS_CFG } from './agendaTypes';
import { isRdvPast } from './agendaHelpers';
import {
  getRdvLocalTime, getRdvLocalDate,
  formatDateInTz, getTzLabel, getTzBadgeStyle,
} from '../../lib/timezoneUtils';

interface RdvDetailModalProps {
  rdv: RdvProposal;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onTreat?: (id: string, treated: boolean) => void;
  canTreat?: boolean;
  readonly?: boolean;
  canDelete?: boolean;
  userTimezone: string;
  clientTimezone?: string;
}

function createdByLabel(role: string) {
  if (role === 'admin') return 'Administrateur';
  if (role === 'vendor') return 'Vendeur';
  if (role === 'client') return 'Client';
  return role;
}

export default function RdvDetailModal({ rdv, onClose, onDelete, onStatusChange, onTreat, canTreat, readonly, canDelete = !readonly, userTimezone, clientTimezone }: RdvDetailModalProps) {
  const tokens = useThemeTokens();
  const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
  const isPast = rdv.status === 'confirmed' && isRdvPast(rdv);
  const isTreated = !!rdv.treated_at;

  const userTime = getRdvLocalTime(rdv, userTimezone);
  const userDateStr = getRdvLocalDate(rdv, userTimezone);
  const userDateFull = rdv.appointment_utc
    ? formatDateInTz(rdv.appointment_utc, userTimezone)
    : new Date(rdv.proposed_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const showClientTz = clientTimezone && clientTimezone !== userTimezone;
  const clientTime = showClientTz ? getRdvLocalTime(rdv, clientTimezone) : null;
  const clientDateStr = showClientTz ? getRdvLocalDate(rdv, clientTimezone) : null;
  const clientDateFull = showClientTz && rdv.appointment_utc
    ? formatDateInTz(rdv.appointment_utc, clientTimezone)
    : null;

  const userBadge = getTzBadgeStyle(userTimezone);
  const clientBadge = showClientTz ? getTzBadgeStyle(clientTimezone) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
              style={{ background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}44)`, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              {rdv.lead_name ? rdv.lead_name.slice(0, 2).toUpperCase() : 'RV'}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: tokens.text.primary }}>{rdv.lead_name || 'Rendez-vous'}</p>
              <span
                className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold mt-0.5"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}` }}>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: tokens.text.tertiary }} />
              <div className="flex-1">
                <p className="text-sm font-medium capitalize" style={{ color: tokens.text.primary }}>
                  {userDateFull}
                </p>
                {userTime && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium" style={{ color: tokens.text.secondary }}>
                      {userTime}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: userBadge.bg, color: userBadge.color, border: userBadge.border }}>
                      {getTzLabel(userTimezone)}
                    </span>
                  </div>
                )}
                {showClientTz && clientTime && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Globe className="w-3 h-3 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
                    <span className="text-xs font-medium" style={{ color: tokens.text.secondary }}>
                      {clientTime}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: clientBadge!.bg, color: clientBadge!.color, border: clientBadge!.border }}>
                      Client ({getTzLabel(clientTimezone)})
                    </span>
                    {clientDateStr !== userDateStr && clientDateFull && (
                      <span className="text-[10px] capitalize" style={{ color: tokens.text.quaternary }}>
                        ({clientDateFull})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {rdv.lead_phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: tokens.text.tertiary }} />
                <span className="text-sm" style={{ color: tokens.text.secondary }}>{rdv.lead_phone}</span>
              </div>
            )}
            {rdv.lead_email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: tokens.text.tertiary }} />
                <span className="text-sm" style={{ color: tokens.text.secondary }}>{rdv.lead_email}</span>
              </div>
            )}
            {rdv.vendor_name && (
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 flex-shrink-0" style={{ color: tokens.text.tertiary }} />
                <span className="text-sm font-medium" style={{ color: tokens.text.secondary }}>{rdv.vendor_name}</span>
              </div>
            )}
          </div>

          {rdv.motif && (
            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: tokens.text.tertiary }} />
              <div>
                <p className="text-[10px] font-bold tracking-wider uppercase mb-0.5" style={{ color: tokens.text.quaternary }}>Motif</p>
                <p className="text-sm font-medium" style={{ color: tokens.text.primary }}>{rdv.motif}</p>
              </div>
            </div>
          )}

          {rdv.description && (
            <div className="flex items-start gap-2.5">
              <AlignLeft className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: tokens.text.tertiary }} />
              <div>
                <p className="text-[10px] font-bold tracking-wider uppercase mb-0.5" style={{ color: tokens.text.quaternary }}>Description</p>
                <p className="text-sm leading-relaxed" style={{ color: tokens.text.secondary }}>{rdv.description}</p>
              </div>
            </div>
          )}

          {rdv.notes && (
            <div className="rounded-xl px-3.5 py-3" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}` }}>
              <p className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: tokens.text.quaternary }}>Notes</p>
              <p className="text-xs leading-relaxed" style={{ color: tokens.text.tertiary }}>{rdv.notes}</p>
            </div>
          )}

          {rdv.created_by_role && (
            <div className="flex items-center gap-2 pt-1" style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}>
              <UserPlus className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
              <span className="text-[11px]" style={{ color: tokens.text.quaternary }}>
                Cree par : <span className="font-semibold" style={{ color: tokens.text.tertiary }}>
                  {rdv.created_by_name || createdByLabel(rdv.created_by_role)}
                </span>
                {rdv.created_by_name && (
                  <span style={{ color: tokens.text.quaternary }}> ({createdByLabel(rdv.created_by_role)})</span>
                )}
              </span>
              {rdv.created_at && (
                <span className="text-[10px] ml-auto" style={{ color: tokens.text.quaternary }}>
                  {new Date(rdv.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {rdv.status === 'confirmed' && (
            <div
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all"
              style={{
                background: isTreated
                  ? 'rgba(34,197,94,0.06)'
                  : isPast
                    ? 'rgba(239,68,68,0.05)'
                    : tokens.surface.secondary,
                border: `1px solid ${isTreated
                  ? 'rgba(34,197,94,0.18)'
                  : isPast
                    ? 'rgba(239,68,68,0.15)'
                    : tokens.surface.borderLight}`,
              }}
            >
              <label
                className={`flex items-center gap-2.5 flex-1 ${canTreat ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={canTreat && onTreat ? () => onTreat(rdv.id, !isTreated) : undefined}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: isTreated ? '#22c55e' : 'transparent',
                    border: isTreated ? '1.5px solid #22c55e' : `1.5px solid ${tokens.text.quaternary}`,
                  }}
                >
                  {isTreated && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-xs font-semibold" style={{ color: isTreated ? '#22c55e' : tokens.text.secondary }}>
                  Rendez-vous traité
                </span>
              </label>
              {isPast && !isTreated && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  Non traité
                </span>
              )}
              {isTreated && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.18)' }}>
                  Traité
                </span>
              )}
            </div>
          )}

          {(!readonly || canDelete) && (
            <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}>
              {!readonly && Object.entries(STATUS_CFG).filter(([k]) => k !== rdv.status).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => { onStatusChange(rdv.id, k); onClose(); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}
                >
                  {v.label}
                </button>
              ))}
              {canDelete && (
                <button
                  onClick={() => { onDelete(rdv.id); onClose(); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 ml-auto"
                  style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}
                >
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
