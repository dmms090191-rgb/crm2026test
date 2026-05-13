import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import type { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Registration } from './inscriptionTypes';
import { formatDate, formatTime } from './inscriptionTypes';

interface Props {
  pending: Registration[];
  tokens: ReturnType<typeof useThemeTokens>;
  revealedIds: Set<string>;
  onToggleReveal: (id: string) => void;
  onUpdateStatus: (id: string, status: 'accepted' | 'refused') => void;
}

export default function PendingMobileCards({ pending, tokens, revealedIds, onToggleReveal, onUpdateStatus }: Props) {
  return (
    <div className="md:hidden p-3 space-y-3">
      {pending.map(r => (
        <div
          key={r.id}
          className="rounded-xl p-4 space-y-3"
          style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold min-w-0 truncate" style={{ color: tokens.text.primary }}>
              {r.first_name} {r.last_name}
            </p>
            <span className="text-[10px] whitespace-nowrap flex-shrink-0" style={{ color: tokens.text.quaternary }}>
              {formatDate(r.registered_at)} {formatTime(r.registered_at)}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-[11px] font-medium flex-shrink-0 w-20" style={{ color: tokens.text.quaternary }}>Email</span>
              <span className="text-xs break-all min-w-0" style={{ color: tokens.text.tertiary }}>{r.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium flex-shrink-0 w-20" style={{ color: tokens.text.quaternary }}>Telephone</span>
              <span className="text-xs" style={{ color: tokens.text.tertiary }}>{r.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium flex-shrink-0 w-20" style={{ color: tokens.text.quaternary }}>Mot de passe</span>
              <span className="text-xs font-mono tracking-widest" style={{ color: tokens.text.tertiary }}>
                {revealedIds.has(r.id) ? r.password : '••••••'}
              </span>
              <button
                onClick={() => onToggleReveal(r.id)}
                className="transition-colors ml-1"
                style={{ color: tokens.text.quaternary }}
              >
                {revealedIds.has(r.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onUpdateStatus(r.id, 'accepted')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{ background: tokens.success.bg, color: tokens.success.text, border: tokens.success.border }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Valider
            </button>
            <button
              onClick={() => onUpdateStatus(r.id, 'refused')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border }}
            >
              <XCircle className="w-3.5 h-3.5" />
              Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
