import { Globe, ShieldCheck, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';

interface Props {
  page: CompanyHomePage;
  status: { label: string; color: string; bg: string; border: string };
}

export default function SiteDomainAdminCard({ page, status }: Props) {
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
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Domaine personnalise</h3>
          <p className="text-[10px]" style={{ color: t.text.quaternary }}>Gere par votre Super Admin</p>
        </div>
      </div>
      <div className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Statut</span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}
          >
            {page.domain_status === 'verified' ? <ShieldCheck className="w-3 h-3" /> :
             page.domain_status === 'error' ? <AlertCircle className="w-3 h-3" /> :
             <Clock className="w-3 h-3" />}
            {status.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Domaine</span>
          {hasDomain ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: t.text.primary }}>{page.custom_domain}</span>
              {domainUrl && (
                <a href={domainUrl} target="_blank" rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                  <ExternalLink className="w-3 h-3" style={{ color: '#0ea5e9' }} />
                </a>
              )}
            </div>
          ) : (
            <span className="text-xs" style={{ color: t.text.tertiary }}>Aucun domaine attribue</span>
          )}
        </div>
      </div>
    </div>
  );
}
