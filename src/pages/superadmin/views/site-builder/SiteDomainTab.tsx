import { Globe, ExternalLink, ShieldCheck, AlertCircle, Clock, Settings2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  not_configured: { label: 'Non configure', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
  pending: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
  verified: { label: 'Verifie', color: '#16a34a', bg: 'rgba(22,163,106,0.08)', border: 'rgba(22,163,106,0.15)' },
  error: { label: 'Erreur', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
};

interface Props {
  page: CompanyHomePage | null;
  onOpenDomainManager: () => void;
}

export default function SiteDomainTab({ page, onOpenDomainManager }: Props) {
  const t = useThemeTokens();

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))',
            border: '1px solid rgba(14,165,233,0.2)',
            boxShadow: '0 0 24px rgba(14,165,233,0.1)',
          }}
        >
          <Globe className="w-7 h-7" style={{ color: '#0ea5e9' }} />
        </div>
        <p className="text-sm font-medium text-center max-w-xs" style={{ color: t.text.secondary }}>
          Aucun site actif
        </p>
        <p className="text-xs mt-2 text-center max-w-xs" style={{ color: t.text.tertiary }}>
          Creez d'abord un site en appliquant un template avant de configurer un domaine.
        </p>
      </div>
    );
  }

  const status = STATUS_MAP[page.domain_status] ?? STATUS_MAP.not_configured;
  const hasDomain = !!page.custom_domain;
  const domainUrl = hasDomain && page.domain_verified ? `https://${page.custom_domain}` : null;

  return (
    <div className="space-y-4">
      {/* Domain status card */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Configuration du domaine</h3>
            <p className="text-[10px]" style={{ color: t.text.quaternary }}>Gerez le nom de domaine de votre site</p>
          </div>
        </div>

        <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          {/* Status */}
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

          {/* Domain name */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Domaine</span>
            {hasDomain ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: t.text.primary }}>{page.custom_domain}</span>
                {domainUrl && (
                  <a
                    href={domainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
                  >
                    <ExternalLink className="w-3 h-3" style={{ color: '#0ea5e9' }} />
                  </a>
                )}
              </div>
            ) : (
              <span className="text-xs" style={{ color: t.text.tertiary }}>Aucun domaine configure</span>
            )}
          </div>

          {/* Slug */}
          {page.slug && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Lien interne</span>
              <span className="text-xs font-mono" style={{ color: t.text.secondary }}>/site/{page.slug}</span>
            </div>
          )}
        </div>
      </div>

      {/* Manage button */}
      <button
        onClick={onOpenDomainManager}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold transition-all hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          color: '#fff',
          boxShadow: '0 2px 12px rgba(14,165,233,0.3)',
        }}
      >
        <Settings2 className="w-4 h-4" />
        Gerer les domaines
      </button>
    </div>
  );
}
