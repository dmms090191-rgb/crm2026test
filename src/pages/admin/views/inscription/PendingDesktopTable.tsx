import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import type { Registration } from './inscriptionTypes';
import { formatDate, formatTime } from './inscriptionTypes';
import type { ThemeTokens } from '../../../../lib/themeTokens';

interface Props {
  pending: Registration[];
  tokens: ThemeTokens;
  revealedIds: Set<string>;
  onToggleReveal: (id: string) => void;
  onUpdateStatus: (id: string, status: 'accepted' | 'refused') => void;
}

export default function PendingDesktopTable({ pending, tokens, revealedIds, onToggleReveal, onUpdateStatus }: Props) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead style={{ background: tokens.table.headerBg }}>
          <tr style={{ borderBottom: tokens.table.rowBorder }}>
            {['Prenom', 'Nom', 'Adresse email', 'Mot de passe', 'Telephone', 'Date', 'Heure', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.12em] uppercase whitespace-nowrap" style={{ color: tokens.table.headerText }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pending.map(r => (
            <tr key={r.id} style={{ borderBottom: tokens.table.rowBorder }} className="group transition-colors" onMouseEnter={(e) => e.currentTarget.style.background = tokens.table.rowHover} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <td className="px-4 py-3 font-medium" style={{ color: tokens.text.secondary }}>{r.first_name}</td>
              <td className="px-4 py-3" style={{ color: tokens.text.secondary }}>{r.last_name}</td>
              <td className="px-4 py-3 text-xs" style={{ color: tokens.text.tertiary }}>{r.email}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono tracking-widest" style={{ color: tokens.text.tertiary }}>
                    {revealedIds.has(r.id) ? r.password : '••••••'}
                  </span>
                  <button
                    onClick={() => onToggleReveal(r.id)}
                    className="transition-colors"
                    style={{ color: tokens.text.quaternary }}
                  >
                    {revealedIds.has(r.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: tokens.text.tertiary }}>{r.phone || '—'}</td>
              <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: tokens.text.tertiary }}>{formatDate(r.registered_at)}</td>
              <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: tokens.text.tertiary }}>{formatTime(r.registered_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onUpdateStatus(r.id, 'accepted')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:brightness-110"
                    style={{ background: tokens.success.bg, color: tokens.success.text, border: tokens.success.border }}
                  >
                    <CheckCircle className="w-3 h-3" />
                    Valider
                  </button>
                  <button
                    onClick={() => onUpdateStatus(r.id, 'refused')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:brightness-110"
                    style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border }}
                  >
                    <XCircle className="w-3 h-3" />
                    Refuser
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
