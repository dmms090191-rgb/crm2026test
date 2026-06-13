import { useState, useCallback, useEffect, useMemo } from 'react';
import { Globe, Crown, Shield, Users } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getAllHomePages, toggleHomePageActive, type CompanyHomePageWithCompany } from '../../../../lib/companyHomePages';
import SASiteEditModal from './SASiteEditModal';
import SADomainsModal from './SADomainsModal';
import SASitesSection from './SASitesSection';

interface SuperAdminGroup {
  companyId: string;
  companyName: string;
  pages: CompanyHomePageWithCompany[];
}

function groupPages(pages: CompanyHomePageWithCompany[]) {
  const platform: CompanyHomePageWithCompany[] = [];
  const roisAdminDirect: CompanyHomePageWithCompany[] = [];
  const superAdminMap = new Map<string, SuperAdminGroup>();

  const saCompanyIds = new Set<string>();
  for (const p of pages) {
    if (p.companies?.company_tier === 'super_admin' && p.company_id) {
      saCompanyIds.add(p.company_id);
    }
  }

  for (const p of pages) {
    if (p.site_scope === 'platform') {
      platform.push(p);
      continue;
    }

    const tier = p.companies?.company_tier;
    const parentId = p.companies?.parent_company_id;

    if (tier === 'rois_admin') {
      platform.push(p);
      continue;
    }

    if (tier === 'super_admin' && p.company_id) {
      if (!superAdminMap.has(p.company_id)) {
        superAdminMap.set(p.company_id, {
          companyId: p.company_id,
          companyName: p.companies?.name ?? 'Super Admin',
          pages: [],
        });
      }
      superAdminMap.get(p.company_id)!.pages.unshift(p);
      continue;
    }

    if (tier === 'admin' && parentId && saCompanyIds.has(parentId)) {
      if (!superAdminMap.has(parentId)) {
        superAdminMap.set(parentId, {
          companyId: parentId,
          companyName: 'Super Admin',
          pages: [],
        });
      }
      superAdminMap.get(parentId)!.pages.push(p);
      continue;
    }

    if (tier === 'admin' && !parentId) {
      roisAdminDirect.push(p);
      continue;
    }

    roisAdminDirect.push(p);
  }

  const superAdminGroups = Array.from(superAdminMap.values()).sort((a, b) =>
    a.companyName.localeCompare(b.companyName)
  );

  return { platform, roisAdminDirect, superAdminGroups };
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

  const { platform, roisAdminDirect, superAdminGroups } = useMemo(() => groupPages(pages), [pages]);

  const totalCount = pages.length;

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

  const shared = { t, copiedId, onToggle: handleToggleActive, onCopy: handleCopy, onView: handleView, onEdit: setEditPage, onDomains: setDomainsPage };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
          <Globe className="w-4.5 h-4.5" style={{ color: '#0ea5e9' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: t.text.primary }}>Sites & Domaines</h1>
          <p className="text-xs" style={{ color: t.text.tertiary }}>{totalCount} site{totalCount !== 1 ? 's' : ''} configure{totalCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: t.text.tertiary }} />
          <p className="text-sm font-medium" style={{ color: t.text.secondary }}>Aucun site configure.</p>
          <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>Les sites sont crees automatiquement depuis la liste admins.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <SASitesSection
            title="Rois Admin / Plateforme"
            icon={<Crown className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />}
            iconBg="rgba(245,158,11,0.1)"
            iconBorder="rgba(245,158,11,0.25)"
            pages={platform}
            {...shared}
          />

          <SASitesSection
            title="Admins crees par Rois Admin"
            icon={<Users className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />}
            iconBg="rgba(14,165,233,0.1)"
            iconBorder="rgba(14,165,233,0.25)"
            pages={roisAdminDirect}
            {...shared}
          />

          {superAdminGroups.map(group => (
            <SASitesSection
              key={group.companyId}
              title={`Super Admin : ${group.companyName}`}
              icon={<Shield className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />}
              iconBg="rgba(139,92,246,0.1)"
              iconBorder="rgba(139,92,246,0.25)"
              pages={group.pages}
              {...shared}
            />
          ))}
        </div>
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
