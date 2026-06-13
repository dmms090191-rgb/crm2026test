import { ExternalLink, Copy, Settings2, Check, ToggleLeft, ToggleRight, Link2 } from 'lucide-react';
import type { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePageWithCompany } from '../../../../lib/companyHomePages';

interface DomainStatusCfg {
  label: string;
  color: string;
  bg: string;
  border: string;
}

interface Props {
  page: CompanyHomePageWithCompany;
  t: ReturnType<typeof useThemeTokens>;
  copiedId: string | null;
  statusCfg: DomainStatusCfg;
  formattedDate: string;
  onToggle: (p: CompanyHomePageWithCompany) => void;
  onCopy: (slug: string, id: string) => void;
  onView: (slug: string) => void;
  onEdit: (p: CompanyHomePageWithCompany) => void;
  onDomains: (p: CompanyHomePageWithCompany) => void;
}

export default function SASitesMobileCard({
  page, t, copiedId, statusCfg, formattedDate,
  onToggle, onCopy, onView, onEdit, onDomains,
}: Props) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.02), rgba(217,119,6,0.02))',
      border: '1px solid rgba(245,158,11,0.25)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: t.text.primary }}>{page.site_scope === 'platform' ? 'Talvex (Plateforme)' : (page.companies?.name ?? '--')}</span>
        <button onClick={() => onToggle(page)} className="flex items-center gap-1.5">
          {page.is_active
            ? <ToggleRight className="w-5 h-5" style={{ color: '#10b981' }} />
            : <ToggleLeft className="w-5 h-5" style={{ color: t.text.tertiary }} />
          }
          <span className="text-[11px] font-medium" style={{ color: page.is_active ? '#10b981' : t.text.tertiary }}>
            {page.is_active ? 'Active' : 'Inactive'}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {page.slug && (
          <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: t.surface.primary, color: '#0ea5e9', border: `1px solid ${t.surface.border}` }}>
            /site/{page.slug}
          </code>
        )}
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
          {statusCfg.label}
        </span>
      </div>

      {page.custom_domain && (
        <p className="text-xs" style={{ color: t.text.secondary }}>{page.custom_domain}</p>
      )}

      <div className="flex items-center gap-2 pt-1 flex-wrap" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
        <button
          onClick={() => onEdit(page)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.2)' }}
        >
          <Settings2 className="w-3 h-3" /> Site
        </button>
        <button
          onClick={() => onDomains(page)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <Link2 className="w-3 h-3" /> Domaines
        </button>
        {page.slug && (
          <>
            <button
              onClick={() => onView(page.slug!)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
              style={{ background: t.surface.primary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
            >
              <ExternalLink className="w-3 h-3" /> Voir
            </button>
            <button
              onClick={() => onCopy(page.slug!, page.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
              style={{ background: t.surface.primary, color: copiedId === page.id ? '#10b981' : t.text.secondary, border: `1px solid ${t.surface.border}` }}
            >
              {copiedId === page.id ? <><Check className="w-3 h-3" /> Copie</> : <><Copy className="w-3 h-3" /> Copier</>}
            </button>
          </>
        )}
        <span className="ml-auto text-[10px]" style={{ color: t.text.tertiary }}>{formattedDate}</span>
      </div>
    </div>
  );
}
