import { Globe, ExternalLink, CheckCircle2, AlertCircle, Link2, Info, Settings2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import DomainChecklist from '../../../../components/domain/DomainChecklist';

interface Props {
  page: CompanyHomePage | null;
  onOpenDomainManager: () => void;
  ownerType?: 'super_admin' | 'admin_company';
  onPageRefresh?: () => void;
}

export default function SiteDomainTab({ page, onOpenDomainManager, ownerType = 'super_admin', onPageRefresh }: Props) {
  const t = useThemeTokens();
  const isAdmin = ownerType === 'admin_company';

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

  const hasDomain = !!page.custom_domain;
  const publicUrl = page.slug ? `${window.location.origin}/site/${page.slug}` : null;

  return (
    <div className="space-y-4">
      {/* Internal link card */}
      <InternalLinkCard page={page} publicUrl={publicUrl} t={t} />

      {/* Domain section */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Domaine personnalise</h3>
            <p className="text-[10px]" style={{ color: t.text.quaternary }}>
              {hasDomain ? page.custom_domain : isAdmin ? 'Gere par votre Super Admin' : 'Aucun domaine configure'}
            </p>
          </div>
        </div>

        {/* Checklist when domain exists */}
        {hasDomain && (
          <div className="pt-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <DomainChecklist
              domain={page.custom_domain}
              domainStatus={page.domain_status as 'not_configured' | 'pending' | 'verified' | 'error'}
              domainVerified={page.domain_verified}
              domainNotes={page.domain_notes || null}
              pageId={page.id}
              readOnly={isAdmin}
              onRefresh={onPageRefresh}
            />
          </div>
        )}

        {/* No domain message */}
        {!hasDomain && (
          <div className="pt-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <p className="text-xs" style={{ color: t.text.tertiary }}>
              {isAdmin
                ? 'Aucun domaine attribue. Contactez votre Super Admin pour en configurer un.'
                : 'Attribuez un domaine via le panneau d\'administration de la societe ou le gestionnaire de domaines.'}
            </p>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} />
          <div className="space-y-1">
            <p className="text-xs leading-relaxed" style={{ color: t.text.secondary }}>
              Votre site fonctionne avec un lien interne Talvex, meme sans domaine personnalise.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
              {isAdmin
                ? 'Le domaine est gere par votre Super Admin. Contactez-le pour tout changement.'
                : 'Quand un domaine sera connecte, il pointera vers ce site. Le contenu et le template resteront les memes.'}
            </p>
          </div>
        </div>
      </div>

      {/* Super Admin: manage button */}
      {!isAdmin && (
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
      )}
    </div>
  );
}

function InternalLinkCard({ page, publicUrl, t }: { page: CompanyHomePage; publicUrl: string | null; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 0 16px rgba(22,163,106,0.3)' }}>
          <Link2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Lien interne Talvex</h3>
          <p className="text-[10px]" style={{ color: t.text.quaternary }}>Accessible sans domaine personnalise</p>
        </div>
      </div>

      <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Site interne actif</span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{
              background: page.is_active ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${page.is_active ? 'rgba(22,163,106,0.15)' : 'rgba(239,68,68,0.15)'}`,
              color: page.is_active ? '#16a34a' : '#ef4444',
            }}
          >
            {page.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {page.is_active ? 'Oui' : 'Non'}
          </span>
        </div>

        {page.slug && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Lien interne</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: t.text.secondary }}>/site/{page.slug}</span>
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                  <ExternalLink className="w-3 h-3" style={{ color: '#0ea5e9' }} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
