import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import {
  getHomePageByCompanyId, getPlatformHomePage, getAllTemplates, getTemplateById, applyTemplate, createOrUpdateSite,
  type CompanyHomePage, type SiteTemplate,
} from '../../../../lib/companyHomePages';
import { getAssignedTemplateIds } from '../../../../lib/siteTemplateAssignments';
import { getSiteDomains } from '../../../../lib/siteDomains';
import type { SiteDomainRecord } from '../../../../lib/siteDomainTypes';
import {
  applyTemplateErrorMessage, buildSectionOverrides, buildTemplateLibrary, pickPrimaryDomain,
  type PublishedSectionRow, type SitePreviewPayload, type TemplateEntry,
} from '../../../../lib/siteWorkspaceModel';
import type { SiteContextState } from '../../../../lib/siteContextModel';

/*
 * Donnees du module Site pour la cible du SiteContext.
 * La cible vient EXCLUSIVEMENT du contexte (verifie par le serveur) ; toutes les lectures
 * passent par la RLS avec le JWT de la personne reellement connectee.
 */
export interface SiteWorkspaceData {
  loading: boolean;
  loadError: boolean;
  page: CompanyHomePage | null;
  /* Domaine principal (site_domains, lu via get_site_domains) ; null => anciennes colonnes du site. */
  siteDomain: SiteDomainRecord | null;
  activeTemplate: SiteTemplate | null;
  library: TemplateEntry[];
  sitePreview: SitePreviewPayload | null;
  reload: () => Promise<void>;
  applyTemplateToSite: (template: SiteTemplate) => Promise<string | null>;
}

export function useSiteWorkspaceData(ctx: SiteContextState): SiteWorkspaceData {
  const scope = ctx.target?.scope ?? 'company';
  const companyId = ctx.target?.companyId ?? null;
  const companyName = ctx.target?.name ?? '';
  const actorIsTalvex = ctx.actor?.role === 'super_admin';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState<CompanyHomePage | null>(null);
  const [siteDomain, setSiteDomain] = useState<SiteDomainRecord | null>(null);
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [activeTemplate, setActiveTemplate] = useState<SiteTemplate | null>(null);
  const [publishedRows, setPublishedRows] = useState<PublishedSectionRow[]>([]);

  const load = useCallback(async (silent = false) => {
    if (scope === 'company' && !companyId) return;
    if (!silent) setLoading(true);
    try {
      const [allTemplates, homePage, assigned, domains] = await Promise.all([
        getAllTemplates(),
        scope === 'platform' ? getPlatformHomePage() : getHomePageByCompanyId(companyId as string),
        scope === 'company' ? getAssignedTemplateIds(companyId as string) : Promise.resolve(new Set<string>()),
        // Les domaines ne doivent jamais empecher l'affichage du site : en cas d'echec, aucun domaine.
        scope === 'company' ? getSiteDomains(companyId as string).catch(() => [] as SiteDomainRecord[]) : Promise.resolve([] as SiteDomainRecord[]),
      ]);
      const current = homePage?.active_template_id ? await getTemplateById(homePage.active_template_id) : null;
      let rows: PublishedSectionRow[] = [];
      if (homePage?.is_published) {
        const { data } = await supabase
          .from('site_sections')
          .select('section_key, position, is_visible, published_content, published_styles')
          .eq('home_page_id', homePage.id)
          .not('published_content', 'is', null)
          .order('position', { ascending: true });
        rows = (data ?? []) as PublishedSectionRow[];
      }
      setTemplates(allTemplates);
      setAssignedIds(assigned);
      setPage(homePage);
      setSiteDomain(pickPrimaryDomain(domains));
      setActiveTemplate(current);
      setPublishedRows(rows);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [scope, companyId]);

  useEffect(() => { load(); }, [load]);

  const library = useMemo(() => buildTemplateLibrary({
    templates,
    assignedIds,
    activeTemplate,
    // Le site officiel Talvex (plateforme) n'a pas d'attributions : tout est disponible.
    actorIsTalvex: actorIsTalvex || scope === 'platform',
    targetCompanyId: companyId,
  }), [templates, assignedIds, activeTemplate, actorIsTalvex, scope, companyId]);

  /* Contenu du vrai site, construit comme la page publique (CompanySitePage). */
  const sitePreview = useMemo<SitePreviewPayload | null>(() => {
    if (!page || !activeTemplate) return null;
    const { overrides, order } = buildSectionOverrides(publishedRows);
    return {
      templateKey: activeTemplate.template_key,
      sectionOverrides: overrides,
      sectionOrder: order,
      appIconUrl: page.app_icon_url || page.logo_url || null,
    };
  }, [page, activeTemplate, publishedRows]);

  const applyTemplateToSite = useCallback(async (template: SiteTemplate): Promise<string | null> => {
    try {
      if (page) await applyTemplate(page.id, template.id);
      else await createOrUpdateSite({ siteScope: scope, companyId, companyName, templateId: template.id });
      await load(true);
      return null;
    } catch (error) {
      return applyTemplateErrorMessage(error);
    }
  }, [page, scope, companyId, companyName, load]);

  const reload = useCallback(() => load(true), [load]);

  return { loading, loadError, page, siteDomain, activeTemplate, library, sitePreview, reload, applyTemplateToSite };
}
