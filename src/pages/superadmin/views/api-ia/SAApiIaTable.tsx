import { useState, useEffect } from 'react';
import { Eye, EyeOff, Pencil, Trash2, Copy, ExternalLink, FileText } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { AiApi } from '../SAApiIaModal';
import type { CreditInfo } from './apiIaTypes';
import { maskValue } from './apiIaTypes';

const LIVE_PROVIDERS = new Set(['DeepSeek', 'Recraft', 'Stability AI', 'Vectorizer.AI']);
function isLiveProvider(name: string) { return LIVE_PROVIDERS.has(name); }

export function StatusBadge({ status }: { status: string | null }) {
  const isActive = status === 'active';
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={isActive ? { background: 'rgba(34,197,94,0.1)', color: '#16a34a' } : { background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
      {isActive ? 'Actif' : 'Inactif'}
    </span>
  );
}

export function RelativeTime({ iso, tokens }: { iso: string; tokens: ReturnType<typeof useThemeTokens> }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const compute = () => {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diff < 5) { setLabel('a l\'instant'); return; }
      if (diff < 60) { setLabel(`il y a ${diff}s`); return; }
      const mins = Math.floor(diff / 60);
      if (mins < 60) { setLabel(`il y a ${mins} min`); return; }
      setLabel(new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    };
    compute();
    const id = setInterval(compute, 10_000);
    return () => clearInterval(id);
  }, [iso]);
  if (!label) return null;
  return <p className="text-[9px] mt-0.5" style={{ color: tokens.text.quaternary }}>{label}</p>;
}

export function CreditCell({ liveCredit, fallbackCredit, fallbackCheckedAt, isLoading, flash, tokens }: {
  liveCredit?: CreditInfo; fallbackCredit: string | null; fallbackCheckedAt: string | null;
  isLoading: boolean; flash: boolean; tokens: ReturnType<typeof useThemeTokens>;
}) {
  const credit = liveCredit?.credit ?? fallbackCredit;
  const checkedAt = liveCredit?.checkedAt ?? fallbackCheckedAt;
  const isError = credit === 'Erreur verification' || credit === 'Cle manquante';
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold transition-colors duration-500"
          style={{ color: flash ? '#16a34a' : isError ? '#ef4444' : tokens.text.primary }}>
          {credit || '-'}
        </span>
        {isLoading && <div className="w-3 h-3 border border-t-amber-400 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: '#f59e0b' }} />}
      </div>
      {checkedAt && <RelativeTime iso={checkedAt} tokens={tokens} />}
    </div>
  );
}

interface TableProps {
  apis: AiApi[]; tokens: ReturnType<typeof useThemeTokens>;
  visiblePwd: Set<string>; visibleKey: Set<string>;
  copied: string | null; deleteConfirm: string | null;
  creditMap: Record<string, CreditInfo>; creditLoading: boolean; creditFlash: boolean;
  onTogglePwd: (id: string) => void; onToggleKey: (id: string) => void;
  onCopy: (text: string, id: string) => void; onEdit: (api: AiApi) => void;
  onDetail: (api: AiApi) => void;
  onDeleteConfirm: (id: string | null) => void; onDelete: (id: string) => void;
}

const HEADERS = ['Nom', 'Lien', 'Email / ID', 'ID API', 'Cle API', 'Credit', 'Cout', 'Date achat', 'Notes', 'Actions'];

export function ApiTable(props: TableProps) {
  const { apis, tokens } = props;
  const colSep = { borderRight: `1px solid ${tokens.table.colSep}` };
  const thStyle = { ...colSep, color: tokens.table.headerText };

  return (
    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: tokens.table.headerBorder, background: tokens.table.headerBg }}>
          {HEADERS.map((h, i) => (
            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.12em] uppercase"
              style={i < HEADERS.length - 1 ? thStyle : { color: tokens.table.headerText }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {apis.map(api => <ApiRow key={api.id} api={api} colSep={colSep} {...props} />)}
      </tbody>
    </table>
  );
}

function ApiRow({ api, tokens, colSep, visiblePwd, visibleKey, copied, deleteConfirm, creditMap, creditLoading, creditFlash, onTogglePwd, onToggleKey, onCopy, onEdit, onDetail, onDeleteConfirm, onDelete }: TableProps & { api: AiApi; colSep: React.CSSProperties }) {
  const apiIdDisplay = api.api_id ? 'Configuree' : 'Non renseigne';
  const keyDisplay = api.api_key
    ? (visibleKey.has(api.id) ? api.api_key : 'Configuree')
    : (api.notes?.includes('Supabase Secrets') ? 'Configuree' : 'Non renseigne');

  const pwdDisplay = api.account_password
    ? (visiblePwd.has(api.id) ? api.account_password : maskValue(api.account_password))
    : null;

  return (
    <tr className="transition-colors" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>
      <td className="px-4 py-3 text-xs font-semibold" style={{ ...colSep, color: tokens.text.primary }}>
        {api.name}
        {pwdDisplay && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] font-mono" style={{ color: tokens.text.quaternary }}>{pwdDisplay}</span>
            <button onClick={() => onTogglePwd(api.id)} className="p-0.5 rounded hover:opacity-70">
              {visiblePwd.has(api.id) ? <EyeOff className="w-2.5 h-2.5" style={{ color: tokens.text.quaternary }} /> : <Eye className="w-2.5 h-2.5" style={{ color: tokens.text.quaternary }} />}
            </button>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs" style={{ ...colSep, color: tokens.text.secondary }}>
        {api.url ? (
          <a href={api.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline" style={{ color: '#f59e0b' }}>
            <ExternalLink className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{api.url.replace(/^https?:\/\//, '')}</span>
          </a>
        ) : <span style={{ color: tokens.text.quaternary }}>-</span>}
      </td>
      <td className="px-4 py-3 text-xs" style={{ ...colSep, color: tokens.text.secondary }}>
        {api.account_email || '-'}
        {api.gmail_login && api.account_email && (
          <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Gmail</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs font-mono" style={{ ...colSep, color: api.api_id ? tokens.text.secondary : tokens.text.quaternary }}>
        {apiIdDisplay}
      </td>
      <td className="px-4 py-3" style={colSep}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono" style={{ color: api.api_key ? tokens.text.secondary : tokens.text.quaternary }}>{keyDisplay}</span>
          {api.api_key && (
            <button onClick={() => onToggleKey(api.id)} className="p-0.5 rounded hover:opacity-70">
              {visibleKey.has(api.id) ? <EyeOff className="w-3 h-3" style={{ color: tokens.text.tertiary }} /> : <Eye className="w-3 h-3" style={{ color: tokens.text.tertiary }} />}
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3" style={colSep}>
        <CreditCell liveCredit={creditMap[api.id]} fallbackCredit={api.remaining_credit} fallbackCheckedAt={api.last_checked_at}
          isLoading={creditLoading && isLiveProvider(api.name)} flash={creditFlash && isLiveProvider(api.name)} tokens={tokens} />
      </td>
      <td className="px-4 py-3 text-xs" style={{ ...colSep, color: tokens.text.secondary }}>{api.cost || '-'}</td>
      <td className="px-4 py-3 text-xs" style={{ ...colSep, color: tokens.text.secondary }}>{api.purchase_date || '-'}</td>
      <td className="px-4 py-3 text-xs" style={{ ...colSep, color: tokens.text.secondary }}>
        <span className="truncate max-w-[140px] block">{api.notes || '-'}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onDetail(api)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" title="Detail">
            <FileText className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
          </button>
          <button onClick={() => onEdit(api)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" title="Modifier">
            <Pencil className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
          </button>
          {api.url && (
            <button onClick={() => onCopy(api.url!, api.id)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" title={copied === api.id ? 'Copie !' : 'Copier le lien'}>
              <Copy className="w-3.5 h-3.5" style={{ color: copied === api.id ? '#16a34a' : tokens.text.tertiary }} />
            </button>
          )}
          {deleteConfirm === api.id ? (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => onDelete(api.id)} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Oui</button>
              <button onClick={() => onDeleteConfirm(null)} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: tokens.surface.hover, color: tokens.text.secondary }}>Non</button>
            </div>
          ) : (
            <button onClick={() => onDeleteConfirm(api.id)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
