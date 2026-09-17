import { useState, useCallback, useEffect, useMemo } from 'react';
import { Globe, Crown, Shield, Users } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import { getAllHomePages, toggleHomePageActive, type CompanyHomePageWithCompany } from '../../../../lib/companyHomePages';
import SASiteEditModal from './SASiteEditModal';
import SADomainsModal from './SADomainsModal';
import SASitesSection from './SASitesSection';
import { groupSites, missingParentIds } from './sasitesGrouping';

export default function SASites() {
  const t = useThemeTokens();
  const [pages, setPages] = useState<CompanyHomePageWithCompany[]>([]);
  const [parentNames, setParentNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editPage, setEditPage] = useState<CompanyHomePageWithCompany | null>(null);
  const [domainsPage, setDomainsPage] = useState<CompanyHomePageWithCompany | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await getAllHomePages();
      // Nom des Groupes parents qui n'ont pas eux-memes de site (type reel : entity_type).
      const missing = missingParentIds(data);
      const names = new Map<string, string>();
      if (missing.length > 0) {
        const { data: parents } = await supabase.from('companies').select('id, name').in('id', missing);
        for (const c of parents ?? []) names.set(c.id as string, c.name as string);
      }
      setPages(data);
      setParentNames(names);
    } catch {
      // Un echec de chargement ne doit jamais s'afficher comme « aucun site ».
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { platform, independents, groupes } = useMemo(() => groupSites(pages, parentNames), [pages, parentNames]);

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

      {loadError ? (
        <div className="text-center py-16" role="alert">
          <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: t.text.tertiary }} />
          <p className="text-sm font-medium" style={{ color: t.text.secondary }}>Les sites n'ont pas pu être chargés.</p>
          <button onClick={() => { setLoading(true); load(); }} className="mt-4 px-4 min-h-[44px] sm:min-h-[36px] rounded-lg text-sm font-semibold"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}>
            Réessayer
          </button>
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: t.text.tertiary }} />
          <p className="text-sm font-medium" style={{ color: t.text.secondary }}>Aucun site configure.</p>
          <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>Les sites sont crees automatiquement depuis la liste admins.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <SASitesSection
            title="Talvex / Plateforme"
            icon={<Crown className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />}
            iconBg="rgba(245,158,11,0.1)"
            iconBorder="rgba(245,158,11,0.25)"
            pages={platform}
            {...shared}
          />

          <SASitesSection
            title="Sociétés indépendantes"
            icon={<Users className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />}
            iconBg="rgba(14,165,233,0.1)"
            iconBorder="rgba(14,165,233,0.25)"
            pages={independents}
            {...shared}
          />

          {groupes.map(group => (
            <SASitesSection
              key={group.companyId}
              title={`Groupe : ${group.companyName}`}
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
