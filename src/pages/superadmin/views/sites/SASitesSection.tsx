import { useState } from 'react';
import { Globe, ExternalLink, Copy, Settings2, Check, ToggleLeft, ToggleRight, Link2, ChevronDown, ChevronRight } from 'lucide-react';
import type { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePageWithCompany } from '../../../../lib/companyHomePages';
import SASitesMobileCard from './SASitesMobileCard';

const DOMAIN_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  not_configured: { label: 'Non configure', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
  pending: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  verified: { label: 'Verifie', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  error: { label: 'Erreur', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
};

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  pages: CompanyHomePageWithCompany[];
  t: ReturnType<typeof useThemeTokens>;
  copiedId: string | null;
  defaultOpen?: boolean;
  onToggle: (p: CompanyHomePageWithCompany) => void;
  onCopy: (slug: string, id: string) => void;
  onView: (slug: string) => void;
  onEdit: (p: CompanyHomePageWithCompany) => void;
  onDomains: (p: CompanyHomePageWithCompany) => void;
}

export default function SASitesSection({
  title, icon, iconBg, iconBorder, pages, t, copiedId, defaultOpen = true,
  onToggle, onCopy, onView, onEdit, onDomains,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (pages.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full group"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg, border: `1px solid ${iconBorder}` }}>
          {icon}
        </div>
        <h2 className="text-sm font-bold flex-1 text-left" style={{ color: t.text.primary }}>{title}</h2>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: iconBg, color: t.text.secondary }}>
          {pages.length} site{pages.length !== 1 ? 's' : ''}
        </span>
        {open
          ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: t.text.tertiary }} />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: t.text.tertiary }} />
        }
      </button>

      {open && (
        <>
          <div className="hidden md:block rounded-xl overflow-hidden" style={{
            border: '1px solid rgba(245,158,11,0.25)',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.02), rgba(217,119,6,0.02))',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 900 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.surface.border}` }}>
                    {['Societe', 'Slug', 'URL publique', 'Active', 'Domaine', 'Statut domaine', 'Modifie le', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pages.map(p => (
                    <DesktopRow key={p.id} page={p} t={t} copiedId={copiedId}
                      onToggle={onToggle} onCopy={onCopy} onView={onView}
                      onEdit={onEdit} onDomains={onDomains} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {pages.map(p => (
              <SASitesMobileCard key={p.id} page={p} t={t} copiedId={copiedId}
                statusCfg={DOMAIN_STATUS_CFG[p.domain_status] ?? DOMAIN_STATUS_CFG.not_configured}
                formattedDate={formatDate(p.updated_at)}
                onToggle={onToggle} onCopy={onCopy} onView={onView}
                onEdit={onEdit} onDomains={onDomains} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface RowProps {
  page: CompanyHomePageWithCompany;
  t: ReturnType<typeof useThemeTokens>;
  copiedId: string | null;
  onToggle: (p: CompanyHomePageWithCompany) => void;
  onCopy: (slug: string, id: string) => void;
  onView: (slug: string) => void;
  onEdit: (p: CompanyHomePageWithCompany) => void;
  onDomains: (p: CompanyHomePageWithCompany) => void;
}

function DesktopRow({ page, t, copiedId, onToggle, onCopy, onView, onEdit, onDomains }: RowProps) {
  const statusCfg = DOMAIN_STATUS_CFG[page.domain_status] ?? DOMAIN_STATUS_CFG.not_configured;
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      className="transition-colors"
      style={{ borderBottom: `1px solid ${t.surface.borderLight}`, background: hovered ? t.surface.hover : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="px-3 py-2.5">
        <span className="text-xs font-semibold" style={{ color: t.text.primary }}>
          {page.site_scope === 'platform' ? 'Talvex (Plateforme)' : (page.companies?.name ?? '--')}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: t.surface.primary, color: '#0ea5e9', border: `1px solid ${t.surface.border}` }}>
          {page.slug ?? '--'}
        </code>
      </td>
      <td className="px-3 py-2.5">
        {page.slug ? (
          <span className="text-xs" style={{ color: t.text.secondary }}>/site/{page.slug}</span>
        ) : (
          <span className="text-xs" style={{ color: t.text.tertiary }}>--</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <button onClick={() => onToggle(page)} className="flex items-center gap-1.5 transition-colors" title={page.is_active ? 'Desactiver' : 'Activer'}>
          {page.is_active
            ? <ToggleRight className="w-5 h-5" style={{ color: '#10b981' }} />
            : <ToggleLeft className="w-5 h-5" style={{ color: t.text.tertiary }} />
          }
          <span className="text-[11px] font-medium" style={{ color: page.is_active ? '#10b981' : t.text.tertiary }}>
            {page.is_active ? 'Active' : 'Inactive'}
          </span>
        </button>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs" style={{ color: page.custom_domain ? t.text.secondary : t.text.tertiary }}>
          {page.custom_domain || 'Non configure'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold"
          style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusCfg.color }} />
          {statusCfg.label}
        </span>
        {page.last_domain_check_at && (
          <p className="text-[9px] mt-0.5" style={{ color: t.text.tertiary }}>Verif. {new Date(page.last_domain_check_at).toLocaleDateString('fr-FR')}</p>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className="text-[11px]" style={{ color: t.text.tertiary }}>{formatDate(page.updated_at)}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => onEdit(page)} color="#0ea5e9" title="Site"><Settings2 className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn onClick={() => onDomains(page)} color="#f59e0b" title="Domaines"><Link2 className="w-3.5 h-3.5" /></IconBtn>
          {page.slug && (
            <>
              <IconBtn onClick={() => onView(page.slug!)} color={t.text.tertiary} title="Voir"><ExternalLink className="w-3.5 h-3.5" /></IconBtn>
              <IconBtn onClick={() => onCopy(page.slug!, page.id)} color={copiedId === page.id ? '#10b981' : t.text.tertiary} title="Copier">
                {copiedId === page.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </IconBtn>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function IconBtn({ onClick, color, title, children }: { onClick: () => void; color: string; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color }} title={title}>
      {children}
    </button>
  );
}
