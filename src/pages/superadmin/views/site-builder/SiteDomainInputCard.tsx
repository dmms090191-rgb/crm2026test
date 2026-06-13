import {
  Globe, ShieldCheck, Clock, AlertCircle, ExternalLink, Loader2, AlertTriangle,
} from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import { formatRelativeTime } from '../../../../lib/formatRelativeTime';
import { STALE_THRESHOLD_MS } from './siteDomainConstants';

interface Props {
  page: CompanyHomePage;
  domainInput: string;
  setDomainInput: (v: string) => void;
  onSave: () => void;
  autoRechecking: boolean;
  status: { label: string; color: string; bg: string; border: string };
}

export default function SiteDomainInputCard({
  page, domainInput, setDomainInput, onSave, autoRechecking, status,
}: Props) {
  const t = useThemeTokens();
  const hasDomain = !!page.custom_domain;
  const isVerified = page.domain_verified && page.domain_status === 'verified';
  const domainUrl = isVerified ? `https://${page.custom_domain}` : null;

  return (
    <div className="rounded-xl p-5 space-y-4 transition-all" style={{
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.55), rgba(15, 23, 42, 0.65))',
      border: '1px solid rgba(148, 163, 184, 0.15)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.30)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Domaine officiel Talvex</h3>
          <p className="text-[10px]" style={{ color: t.text.quaternary }}>Domaine de la plateforme - gere par le Super Admin</p>
        </div>
      </div>

      <div className="pt-2 space-y-3" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.text.quaternary }}>
            Domaine personnalise
          </label>
          <input
            type="text" value={domainInput} onChange={e => setDomainInput(e.target.value)}
            placeholder="talvex.com"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all"
            style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.text.primary }}
            onKeyDown={e => { if (e.key === 'Enter') onSave(); }}
          />
        </div>

        {hasDomain && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Statut</span>
              <div className="flex items-center gap-2">
                {autoRechecking && <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#0ea5e9' }} />}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}
                >
                  {isVerified ? <ShieldCheck className="w-3 h-3" /> : page.domain_status === 'error' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {status.label}
                </span>
              </div>
            </div>

            {page.last_domain_check_at && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Derniere verification</span>
                <span className="text-[11px]" style={{
                  color: (Date.now() - new Date(page.last_domain_check_at).getTime() > STALE_THRESHOLD_MS) ? '#f59e0b' : t.text.tertiary,
                }}>
                  {(Date.now() - new Date(page.last_domain_check_at).getTime() > STALE_THRESHOLD_MS) && (
                    <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: '#f59e0b' }} />
                  )}
                  {formatRelativeTime(page.last_domain_check_at)}
                </span>
              </div>
            )}

            {hasDomain && page.domain_provider && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Fournisseur</span>
                <span className="text-xs font-medium capitalize" style={{ color: t.text.secondary }}>
                  {page.domain_provider}
                </span>
              </div>
            )}
          </div>
        )}

        {domainUrl && (
          <a href={domainUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.01]"
            style={{ background: 'rgba(22,163,106,0.06)', border: '1px solid rgba(22,163,106,0.15)', color: '#16a34a' }}>
            <ExternalLink className="w-3.5 h-3.5" />
            {page.custom_domain}
          </a>
        )}
      </div>
    </div>
  );
}
