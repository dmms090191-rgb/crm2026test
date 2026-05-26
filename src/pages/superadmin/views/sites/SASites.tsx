import { useState, useCallback, useEffect } from 'react';
import { Globe, ExternalLink, Copy, Settings2, Check, ToggleLeft, ToggleRight, Link2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getAllHomePages, toggleHomePageActive, type CompanyHomePageWithCompany } from '../../../../lib/companyHomePages';
import SASiteEditModal from './SASiteEditModal';
import SADomainsModal from './SADomainsModal';

const DOMAIN_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  not_configured: { label: 'Non configure', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
  pending: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  verified: { label: 'Verifie', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  error: { label: 'Erreur', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SASites() {
  const t = useThemeTokens();
  const [pages, setPages] = useState<CompanyHomePageWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPage, setEditPage] = useState<CompanyHomePageWithCompany | null>(null);
  const [domainsPage, setDomainsPage] = useState<CompanyHomePageWithCompany | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await getAllHomePages();
    setPages(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (page: CompanyHomePageWithCompany) => {
    await toggleHomePageActive(page.id, page.is_active);
    setPages(prev => prev.map(p => p.id === page.id ? { ...p, is_active: !p.is_active, updated_at: new Date().toISOString() } : p));
  };

  const handleCopy = (slug: string, id: string) => {
    const url = `${window.location.origin}/site/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleView = (slug: string) => {
    window.open(`/site/${slug}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
          <Globe className="w-4.5 h-4.5" style={{ color: '#0ea5e9' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: t.text.primary }}>Sites & Domaines</h1>
          <p className="text-xs" style={{ color: t.text.tertiary }}>{pages.length} site{pages.length !== 1 ? 's' : ''} configure{pages.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: t.text.tertiary }} />
          <p className="text-sm font-medium" style={{ color: t.text.secondary }}>Aucun site configure.</p>
          <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>Les sites sont crees automatiquement depuis la liste admins.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.surface.border}`, background: t.card.bg }}>
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
                      onToggle={handleToggleActive} onCopy={handleCopy} onView={handleView}
                      onEdit={setEditPage} onDomains={setDomainsPage} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {pages.map(p => (
              <MobileCard key={p.id} page={p} t={t} copiedId={copiedId}
                onToggle={handleToggleActive} onCopy={handleCopy} onView={handleView}
                onEdit={setEditPage} onDomains={setDomainsPage} />
            ))}
          </div>
        </>
      )}

      {editPage && (
        <SASiteEditModal
          page={editPage}
          onClose={() => setEditPage(null)}
          onSaved={() => { setEditPage(null); load(); }}
        />
      )}

      {domainsPage && (
        <SADomainsModal
          page={domainsPage}
          onClose={() => setDomainsPage(null)}
          onChanged={() => { load(); }}
        />
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
        <span className="text-xs font-semibold" style={{ color: t.text.primary }}>{page.site_scope === 'platform' ? 'Talvex (Plateforme)' : (page.companies?.name ?? '--')}</span>
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

function MobileCard({ page, t, copiedId, onToggle, onCopy, onView, onEdit, onDomains }: RowProps) {
  const statusCfg = DOMAIN_STATUS_CFG[page.domain_status] ?? DOMAIN_STATUS_CFG.not_configured;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: t.card.bg, border: `1px solid ${t.surface.border}` }}>
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
        <span className="ml-auto text-[10px]" style={{ color: t.text.tertiary }}>{formatDate(page.updated_at)}</span>
      </div>
    </div>
  );
}

function IconBtn({ onClick, color, title, children }: { onClick: () => void; color: string; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color }} title={title}>
      {children}
    </button>
  );
}
