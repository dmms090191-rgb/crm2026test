/*
 * Regroupement des sites de Talvex > Sites & Domaines.
 * Le type reel d'une entreprise vient de companies.entity_type (fondations Site),
 * JAMAIS de company_tier (colonne historique, plus utilisee ici).
 */
import type { CompanyHomePageWithCompany } from '../../../../lib/companyHomePagesTypes';

export interface GroupeSites {
  companyId: string;
  companyName: string;
  pages: CompanyHomePageWithCompany[];
}

export interface GroupedSites {
  platform: CompanyHomePageWithCompany[];
  independents: CompanyHomePageWithCompany[];
  groupes: GroupeSites[];
}

/* Identifiants des Groupes parents dont le nom n'est pas connu via leur propre site. */
export function missingParentIds(pages: CompanyHomePageWithCompany[]): string[] {
  const known = new Set(pages.filter(p => p.companies?.entity_type === 'groupe' && p.company_id).map(p => p.company_id as string));
  const missing = new Set<string>();
  for (const p of pages) {
    const parent = p.companies?.parent_company_id;
    if (p.companies?.entity_type === 'societe' && parent && !known.has(parent)) missing.add(parent);
  }
  return [...missing];
}

export function groupSites(pages: CompanyHomePageWithCompany[], parentNames: ReadonlyMap<string, string> = new Map()): GroupedSites {
  const platform: CompanyHomePageWithCompany[] = [];
  const independents: CompanyHomePageWithCompany[] = [];
  const groupes = new Map<string, GroupeSites>();

  const ensureGroupe = (id: string, name: string | null) => {
    const existing = groupes.get(id);
    if (existing) {
      if (name && existing.companyName === 'Groupe') existing.companyName = name;
      return existing;
    }
    const created: GroupeSites = { companyId: id, companyName: name || parentNames.get(id) || 'Groupe', pages: [] };
    groupes.set(id, created);
    return created;
  };

  for (const p of pages) {
    const company = p.companies;
    const type = company?.entity_type;
    if (p.site_scope === 'platform' || type === 'platform') { platform.push(p); continue; }
    if (type === 'groupe' && p.company_id) { ensureGroupe(p.company_id, company?.name ?? null).pages.unshift(p); continue; }
    if (type === 'societe' && company?.parent_company_id) { ensureGroupe(company.parent_company_id, null).pages.push(p); continue; }
    independents.push(p);
  }

  const sorted = [...groupes.values()].sort((a, b) => a.companyName.localeCompare(b.companyName, 'fr'));
  return { platform, independents, groupes: sorted };
}
