import { useState } from 'react';
import { X, Eye, EyeOff, ExternalLink, Copy, Check } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { AiApi } from '../SAApiIaModal';
import type { CreditInfo } from './apiIaTypes';
import { maskValue, formatApiForCopy } from './apiIaTypes';

interface Props {
  api: AiApi;
  creditMap: Record<string, CreditInfo>;
  onClose: () => void;
}

export default function SAApiIaDetailModal({ api, creditMap, onClose }: Props) {
  const t = useThemeTokens();
  const [showPwd, setShowPwd] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showApiId, setShowApiId] = useState(false);
  const [copied, setCopied] = useState(false);

  const credit = creditMap[api.id]?.credit ?? api.remaining_credit;

  const handleCopy = () => {
    navigator.clipboard.writeText(formatApiForCopy(api, creditMap));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: t.card.bg, border: t.card.border }}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-base font-bold" style={{ color: t.text.primary }}>
            Detail : {api.name}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:opacity-70">
            <X className="w-4 h-4" style={{ color: t.text.tertiary }} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <Row label="Nom de l'API" t={t}>
            <span className="text-sm font-semibold" style={{ color: t.text.primary }}>{api.name}</span>
          </Row>

          <Row label="Lien" t={t}>
            {api.url ? (
              <a href={api.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm" style={{ color: '#f59e0b' }}>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{api.url}</span>
              </a>
            ) : <Empty />}
          </Row>

          <Row label="Connexion Gmail" t={t}>
            <GmailBadge gmail={api.gmail_login} t={t} />
          </Row>

          <Row label={api.gmail_login ? 'Email Gmail' : 'Email / ID'} t={t}>
            <span className="text-sm" style={{ color: t.text.secondary }}>{api.account_email || 'Non renseigne'}</span>
          </Row>

          {!api.gmail_login && api.account_password && (
            <Row label="Mot de passe" t={t}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono" style={{ color: t.text.secondary }}>
                  {showPwd ? api.account_password : maskValue(api.account_password)}
                </span>
                <ToggleBtn visible={showPwd} onToggle={() => setShowPwd(v => !v)} t={t} />
              </div>
            </Row>
          )}

          <Row label="ID API" t={t}>
            {api.api_id ? (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono" style={{ color: t.text.secondary }}>
                  {showApiId ? api.api_id : 'Configuree'}
                </span>
                <ToggleBtn visible={showApiId} onToggle={() => setShowApiId(v => !v)} t={t} />
              </div>
            ) : <Empty />}
          </Row>

          <Row label="Cle API" t={t}>
            {api.api_key ? (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono" style={{ color: t.text.secondary }}>
                  {showKey ? api.api_key : 'Configuree'}
                </span>
                <ToggleBtn visible={showKey} onToggle={() => setShowKey(v => !v)} t={t} />
              </div>
            ) : <Empty />}
          </Row>

          <Row label="Credit restant" t={t}>
            <span className="text-sm font-semibold" style={{ color: t.text.primary }}>{credit || 'Non renseigne'}</span>
          </Row>

          <Row label="Cout" t={t}>
            <span className="text-sm" style={{ color: t.text.secondary }}>{api.cost || 'Non renseigne'}</span>
          </Row>

          <Row label="Date de paiement / achat" t={t}>
            <span className="text-sm" style={{ color: t.text.secondary }}>{api.purchase_date || 'Non renseignee'}</span>
          </Row>

          <Row label="Notes" t={t}>
            <span className="text-sm whitespace-pre-wrap" style={{ color: t.text.secondary }}>{api.notes || '-'}</span>
          </Row>

          <div className="flex items-center gap-2 pt-3">
            <button onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: copied ? 'rgba(34,197,94,0.1)' : t.surface.hover, border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : t.surface.borderLight}`, color: copied ? '#16a34a' : t.text.secondary }}>
              {copied ? <><Check className="w-3.5 h-3.5" /> Copie !</> : <><Copy className="w-3.5 h-3.5" /> Copier les infos</>}
            </button>
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: t.surface.hover, border: `1px solid ${t.surface.borderLight}`, color: t.text.secondary }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, t, children }: { label: string; t: ReturnType<typeof useThemeTokens>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5" style={{ borderBottom: `1px solid ${t.surface.borderLight}`, paddingBottom: 10 }}>
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>{label}</span>
      {children}
    </div>
  );
}

function Empty() {
  const t = useThemeTokens();
  return <span className="text-sm" style={{ color: t.text.quaternary }}>Non renseigne</span>;
}

function GmailBadge({ gmail, t }: { gmail: boolean; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold"
      style={gmail ? { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' } : { background: t.surface.hover, color: t.text.quaternary }}>
      {gmail ? 'Oui' : 'Non'}
    </span>
  );
}

function ToggleBtn({ visible, onToggle, t }: { visible: boolean; onToggle: () => void; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <button onClick={onToggle} className="p-1 rounded hover:opacity-70">
      {visible ? <EyeOff className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} /> : <Eye className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} />}
    </button>
  );
}
