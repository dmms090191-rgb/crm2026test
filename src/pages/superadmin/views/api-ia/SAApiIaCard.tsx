import { Eye, EyeOff, Pencil, Trash2, Copy, ExternalLink } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { AiApi } from '../SAApiIaModal';
import type { CreditInfo } from './apiIaTypes';
import { maskValue } from './apiIaTypes';
import { StatusBadge, RelativeTime } from './SAApiIaTable';

export function ApiCard({ api, tokens, pwdVisible, keyVisible, copied, liveCredit, creditLoading, creditFlash, onTogglePwd, onToggleKey, onCopy, onEdit, onDelete }: {
  api: AiApi;
  tokens: ReturnType<typeof useThemeTokens>;
  pwdVisible: boolean;
  keyVisible: boolean;
  copied: boolean;
  liveCredit?: CreditInfo;
  creditLoading: boolean;
  creditFlash: boolean;
  onTogglePwd: () => void;
  onToggleKey: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const keyDisplay = api.api_key ? (keyVisible ? api.api_key : maskValue(api.api_key)) : (api.notes?.includes('Supabase Secrets') ? 'Configuree' : '-');
  const credit = liveCredit?.credit ?? api.remaining_credit;
  const checkedAt = liveCredit?.checkedAt ?? api.last_checked_at;
  const liveStatus = liveCredit?.status ?? api.status;
  const isError = credit === 'Erreur verification' || credit === 'Cle manquante';
  const isLive = api.name === 'DeepSeek' || api.name === 'Recraft' || api.name === 'Stability AI';

  return (
    <div className="px-4 py-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: tokens.text.primary }}>{api.name}</span>
          <StatusBadge status={liveStatus} />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg"><Pencil className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} /></button>
          {api.url && <button onClick={onCopy} className="p-1.5 rounded-lg"><Copy className="w-3.5 h-3.5" style={{ color: copied ? '#16a34a' : tokens.text.tertiary }} /></button>}
          <button onClick={onDelete} className="p-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
        </div>
      </div>

      {api.saas_function && <p className="text-xs" style={{ color: tokens.text.secondary }}>{api.saas_function}</p>}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        {api.url && (
          <CardRow label="Lien" tokens={tokens}>
            <a href={api.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
              <ExternalLink className="w-3 h-3" /><span className="truncate">{api.url.replace(/^https?:\/\//, '')}</span>
            </a>
          </CardRow>
        )}
        {api.account_email && <CardRow label="Email" tokens={tokens}><span style={{ color: tokens.text.secondary }}>{api.account_email}</span></CardRow>}
        {api.account_password && (
          <CardRow label="Mot de passe" tokens={tokens}>
            <span className="font-mono" style={{ color: tokens.text.secondary }}>{pwdVisible ? api.account_password : maskValue(api.account_password)}</span>
            <button onClick={onTogglePwd} className="ml-1 p-0.5">
              {pwdVisible ? <EyeOff className="w-3 h-3" style={{ color: tokens.text.tertiary }} /> : <Eye className="w-3 h-3" style={{ color: tokens.text.tertiary }} />}
            </button>
          </CardRow>
        )}
        <CardRow label="Cle API" tokens={tokens}>
          <span className="font-mono" style={{ color: tokens.text.secondary }}>{keyDisplay}</span>
          {api.api_key && (
            <button onClick={onToggleKey} className="ml-1 p-0.5">
              {keyVisible ? <EyeOff className="w-3 h-3" style={{ color: tokens.text.tertiary }} /> : <Eye className="w-3 h-3" style={{ color: tokens.text.tertiary }} />}
            </button>
          )}
        </CardRow>
        <CardRow label="Credit" tokens={tokens}>
          <div className="flex items-center gap-1">
            <span
              className="font-semibold transition-colors duration-500"
              style={{ color: (creditFlash && isLive) ? '#16a34a' : isError ? '#ef4444' : tokens.text.primary }}
            >
              {credit || '-'}
            </span>
            {creditLoading && isLive && (
              <div className="w-2.5 h-2.5 border border-t-amber-400 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: '#f59e0b' }} />
            )}
          </div>
          {checkedAt && <RelativeTime iso={checkedAt} tokens={tokens} />}
        </CardRow>
        <CardRow label="Cout" tokens={tokens}>
          <span style={{ color: tokens.text.secondary }}>{api.cost || 'Non renseigne'}</span>
        </CardRow>
        {api.purchase_date && (
          <CardRow label="Date achat" tokens={tokens}>
            <span style={{ color: tokens.text.secondary }}>{api.purchase_date}</span>
          </CardRow>
        )}
      </div>
    </div>
  );
}

function CardRow({ label, tokens, children }: { label: string; tokens: ReturnType<typeof useThemeTokens>; children: React.ReactNode }) {
  return (
    <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
      <span className="font-semibold" style={{ color: tokens.text.quaternary }}>{label} :</span>
      {children}
    </div>
  );
}
