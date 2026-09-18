/*
 * Modele pur de l'interface Site (MON SITE / DOMAINE / TEMPLATES / APERCU).
 * Aucun import d'execution : testable avec node --test (scripts/site-interface).
 * Tout ce qui est affiche au client est formule sans jargon technique.
 */
import type { CompanyHomePage, SiteTemplate } from './companyHomePagesTypes';
import type { SiteDomainRecord } from './siteDomainTypes';

export type SiteTabId = 'mon-site' | 'domaine' | 'templates' | 'apercu';
export const SITE_TAB_ORDER: SiteTabId[] = ['mon-site', 'domaine', 'templates', 'apercu'];

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusInfo {
  label: string;
  hint: string;
  tone: StatusTone;
}

type PageLike = Pick<CompanyHomePage,
  'title' | 'slug' | 'is_active' | 'is_published' | 'custom_domain' | 'domain_status' | 'domain_verified' | 'domain_expires_at'
  | 'active_template_id'>;

/* ---------- Statut du site ---------- */

/*
 * « Publié » = ce que voit reellement un visiteur : site en ligne, avec un template et une adresse
 * publique (adresse Talvex ou domaine actif). Sinon « Brouillon », avec la raison.
 * Le drapeau is_published du Studio (masque) ne sert plus a ce statut : il ne pilote que le contenu
 * personnalise charge par la page publique et par l'apercu.
 */
export function publicationStatus(page: PageLike | null, siteDomain: SiteDomainRecord | null = null): StatusInfo {
  if (!page) return { label: 'Pas encore créé', hint: 'Choisissez un template pour créer votre site.', tone: 'neutral' };
  if (!page.active_template_id) return { label: 'Brouillon', hint: 'Choisissez un template pour publier votre site.', tone: 'warning' };
  if (!page.is_active) return { label: 'Brouillon', hint: "Votre site est hors ligne : les visiteurs ne peuvent pas le voir.", tone: 'warning' };
  const hasAddress = !!page.slug || domainSummary(page, siteDomain).state === 'active';
  if (!hasAddress) return { label: 'Brouillon', hint: "Votre site n'a pas encore d'adresse publique : les visiteurs ne peuvent pas le voir.", tone: 'warning' };
  return { label: 'Publié', hint: 'Votre site est visible par vos visiteurs.', tone: 'success' };
}

export function siteDisplayName(page: PageLike | null, fallback: string): string {
  const title = page?.title?.trim();
  return title ? title : fallback;
}

/* ---------- Domaine ---------- */

export type DomainState = 'none' | 'active' | 'pending' | 'attention';

export interface DomainSummary extends StatusInfo {
  state: DomainState;
  domain: string | null;
  /* Date de renouvellement : uniquement si elle existe reellement en base. */
  renewalDate: string | null;
  /* Renouvellement a prevoir (calcule par le serveur a partir de la date d'expiration reelle). */
  renewalDue: boolean;
}

/*
 * Etat du domaine affiche au client. Source de verite : site_domains (siteDomain) ;
 * repli sur les anciennes colonnes de company_home_pages tant qu'aucun domaine n'y est enregistre.
 */
export function domainSummary(page: PageLike | null, siteDomain: SiteDomainRecord | null = null): DomainSummary {
  if (siteDomain) return summarizeSiteDomain(siteDomain);
  const domain = page?.custom_domain?.trim() || null;
  const renewalDate = page?.domain_expires_at ?? null;
  if (!page || !domain) {
    return { state: 'none', domain: null, renewalDate: null, renewalDue: false, label: 'Aucun domaine', hint: "Votre site n'a pas encore de nom de domaine personnalisé.", tone: 'neutral' };
  }
  if (page.domain_verified && page.domain_status === 'verified') {
    return { state: 'active', domain, renewalDate, renewalDue: false, label: 'Actif', hint: 'Votre nom de domaine mène bien à votre site.', tone: 'success' };
  }
  if (page.domain_status === 'error') {
    return { state: 'attention', domain, renewalDate, renewalDue: false, label: 'Non relié', hint: "Votre nom de domaine n'est pas encore relié à votre site.", tone: 'danger' };
  }
  return { state: 'pending', domain, renewalDate, renewalDue: false, label: 'En cours de mise en service', hint: 'La mise en service de votre nom de domaine est en cours.', tone: 'warning' };
}

/* Domaine principal vivant (la RPC exclut deja les domaines liberes ou en echec). */
export function pickPrimaryDomain(records: SiteDomainRecord[] | null | undefined): SiteDomainRecord | null {
  if (!records || records.length === 0) return null;
  return records.find(r => r.is_primary) ?? records[0];
}

/* Traduit les etats techniques (enregistrement + mise en service) en libelles clients sans jargon. */
export function summarizeSiteDomain(record: SiteDomainRecord): DomainSummary {
  const base = { domain: record.domain_name, renewalDate: record.expires_at, renewalDue: record.renewal_due };

  switch (record.registration_status) {
    case 'pending':
      return { ...base, state: 'pending', label: 'En cours de préparation', hint: 'La préparation de votre nom de domaine est en cours.', tone: 'warning' };
    case 'expired':
      return { ...base, state: 'attention', label: 'Expiré', hint: 'Votre nom de domaine a expiré.', tone: 'danger' };
    case 'suspended':
      return { ...base, state: 'attention', label: 'Suspendu', hint: 'Votre nom de domaine est suspendu.', tone: 'danger' };
    case 'transfer_out':
      return { ...base, state: 'pending', label: 'Transfert en cours', hint: 'Un transfert de votre nom de domaine est en cours.', tone: 'warning' };
    case 'failed':
    case 'released':
      return { ...base, state: 'none', domain: null, renewalDate: null, renewalDue: false, label: 'Aucun domaine', hint: "Votre site n'a pas encore de nom de domaine personnalisé.", tone: 'neutral' };
    default:
      break;
  }

  switch (record.connection_status) {
    case 'active':
      return { ...base, state: 'active', label: 'Actif', hint: 'Votre nom de domaine mène bien à votre site.', tone: 'success' };
    case 'dns_failed':
    case 'verification_failed':
      return { ...base, state: 'attention', label: 'Non relié', hint: "La mise en service de votre nom de domaine n'a pas abouti.", tone: 'danger' };
    case 'disconnected':
      return { ...base, state: 'attention', label: 'Non relié', hint: "Votre nom de domaine n'est pas relié à votre site.", tone: 'danger' };
    default:
      return { ...base, state: 'pending', label: 'En cours de mise en service', hint: 'La mise en service de votre nom de domaine est en cours.', tone: 'warning' };
  }
}

/* ---------- Adresse publique ---------- */

export type PublicUrlReason = 'ok' | 'no_site' | 'offline' | 'no_address';

export interface PublicUrlInfo {
  url: string | null;
  reason: PublicUrlReason;
  hint: string;
}

export function publicSiteUrl(page: PageLike | null, origin: string, siteDomain: SiteDomainRecord | null = null): PublicUrlInfo {
  if (!page) return { url: null, reason: 'no_site', hint: "Votre site n'est pas encore créé." };
  if (!page.is_active) return { url: null, reason: 'offline', hint: 'Votre site est hors ligne.' };
  const domain = domainSummary(page, siteDomain);
  if (domain.state === 'active' && domain.domain) return { url: `https://${domain.domain}`, reason: 'ok', hint: '' };
  if (page.slug) return { url: `${origin}/site/${encodeURIComponent(page.slug)}`, reason: 'ok', hint: '' };
  return { url: null, reason: 'no_address', hint: "Votre site n'a pas encore d'adresse publique." };
}

/* ---------- Dates ---------- */

export function formatDateFr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/* ---------- Bibliotheque de templates ---------- */

export interface TemplateEntry {
  template: SiteTemplate;
  isActive: boolean;
  isAssigned: boolean;
  isOwnedByTarget: boolean;
}

export interface TemplateLibraryInput {
  templates: SiteTemplate[];
  assignedIds: ReadonlySet<string>;
  activeTemplate: SiteTemplate | null;
  /* Talvex Administrateur voit tout (droit special des fondations). */
  actorIsTalvex: boolean;
  targetCompanyId: string | null;
}

export function buildTemplateLibrary(input: TemplateLibraryInput): TemplateEntry[] {
  const { templates, assignedIds, activeTemplate, actorIsTalvex, targetCompanyId } = input;
  const all = [...templates];
  if (activeTemplate && !all.some(tp => tp.id === activeTemplate.id)) all.unshift(activeTemplate);

  const entries = all
    .filter(tp => actorIsTalvex || assignedIds.has(tp.id) || tp.id === activeTemplate?.id)
    .map(tp => ({
      template: tp,
      isActive: tp.id === activeTemplate?.id,
      isAssigned: assignedIds.has(tp.id),
      isOwnedByTarget: !!targetCompanyId && tp.owner_company_id === targetCompanyId,
    }));

  return entries.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.isAssigned !== b.isAssigned) return a.isAssigned ? -1 : 1;
    return a.template.name.localeCompare(b.template.name, 'fr');
  });
}

export function applyTemplateErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (code === '42501') return "Ce template n'est pas disponible pour cette entreprise.";
  return "Le template n'a pas pu être appliqué. Réessayez dans un instant.";
}

/* ---------- Apercu du vrai site ---------- */

export interface SectionOverrideShape {
  content: Record<string, string>;
  styles: Record<string, string>;
  visible: boolean;
}

export interface PublishedSectionRow {
  section_key: string;
  position: number;
  is_visible: boolean;
  published_content: Record<string, string> | null;
  published_styles: Record<string, string> | null;
}

/* Miroir exact de CompanySitePage : seules les sections publiees personnalisent le site public. */
export function buildSectionOverrides(rows: PublishedSectionRow[]): { overrides?: Record<string, SectionOverrideShape>; order?: string[] } {
  const usable = rows
    .filter(r => r.published_content !== null)
    .sort((a, b) => a.position - b.position);
  if (usable.length === 0) return {};
  const overrides: Record<string, SectionOverrideShape> = {};
  const order: string[] = [];
  for (const row of usable) {
    overrides[row.section_key] = { content: row.published_content ?? {}, styles: row.published_styles ?? {}, visible: row.is_visible };
    order.push(row.section_key);
  }
  return { overrides, order };
}

export interface SitePreviewPayload {
  templateKey: string;
  sectionOverrides?: Record<string, SectionOverrideShape>;
  sectionOrder?: string[];
  appIconUrl: string | null;
}

export const PREVIEW_READY_MESSAGE = 'talvex-site-preview-ready';
export const PREVIEW_PAYLOAD_MESSAGE = 'talvex-site-preview-payload';
export const PREVIEW_ROUTE = '/site-apercu';

export function isPreviewPayloadMessage(data: unknown): data is { type: typeof PREVIEW_PAYLOAD_MESSAGE; payload: SitePreviewPayload } {
  if (typeof data !== 'object' || data === null) return false;
  const msg = data as { type?: unknown; payload?: unknown };
  if (msg.type !== PREVIEW_PAYLOAD_MESSAGE || typeof msg.payload !== 'object' || msg.payload === null) return false;
  const p = msg.payload as { templateKey?: unknown; appIconUrl?: unknown };
  return typeof p.templateKey === 'string' && p.templateKey.length > 0 && (p.appIconUrl === null || typeof p.appIconUrl === 'string');
}

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
export const PREVIEW_DEVICE_WIDTHS: Record<PreviewDevice, number> = { desktop: 1280, tablet: 820, mobile: 390 };

export function previewScale(containerWidth: number, device: PreviewDevice): number {
  const width = PREVIEW_DEVICE_WIDTHS[device];
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return 1;
  return Math.min(1, containerWidth / width);
}
