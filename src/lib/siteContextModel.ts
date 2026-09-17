/*
 * Modele PUR du contexte Site (aucun import, testable par node --test).
 *
 * Deux notions ne se melangent jamais :
 *  - l'ACTEUR REEL : le compte reellement connecte (JWT Supabase), meme en Visu ;
 *  - la CIBLE : l'entreprise dont on gere le site, NOMMEE explicitement par l'ecran.
 * Le serveur (RPC get_site_context -> can_manage_company) decide si l'acteur peut gerer la cible
 * et renvoie la relation ; ce modele ne fait que la mettre en forme.
 */

export type SiteActorRole = 'super_admin' | 'company_super_admin' | 'admin' | 'vendor' | 'client' | 'unknown';
export type SiteEntityType = 'platform' | 'groupe' | 'societe';
export type SiteRelation = 'self' | 'group_child' | 'platform_admin' | 'other';
export type SiteScope = 'platform' | 'company';
export type SiteContextStatus = 'loading' | 'ready' | 'no_target' | 'forbidden' | 'error';

export interface SiteActor {
  userId: string;
  role: SiteActorRole;
  companyId: string | null;
}

/** Ligne renvoyee par la RPC get_site_context. */
export interface SiteContextRow {
  target_company_id: string;
  target_name: string | null;
  target_entity_type: string | null;
  target_parent_company_id: string | null;
  parent_name: string | null;
  parent_entity_type: string | null;
  relation: string | null;
}

export interface SiteTarget {
  scope: SiteScope;
  companyId: string | null;
  name: string;
  entityType: SiteEntityType | null;
  parentCompanyId: string | null;
  parentName: string | null;
}

export interface SiteChainStep {
  kind: 'actor' | SiteEntityType;
  label: string;
}

export interface SiteContextState {
  status: SiteContextStatus;
  actor: SiteActor | null;
  target: SiteTarget | null;
  relation: SiteRelation | null;
  /** true quand l'acteur agit sur une autre entite que la sienne (Visu ou gestion deleguee). */
  isVisu: boolean;
  chain: SiteChainStep[];
  canManageSite: boolean;
}

const ROLES: readonly SiteActorRole[] = ['super_admin', 'company_super_admin', 'admin', 'vendor', 'client'];
const ENTITY_TYPES: readonly SiteEntityType[] = ['platform', 'groupe', 'societe'];
const RELATIONS: readonly SiteRelation[] = ['self', 'group_child', 'platform_admin', 'other'];

export const ACTOR_ROLE_LABELS: Record<SiteActorRole, string> = {
  super_admin: 'Talvex Administrateur',
  company_super_admin: 'Groupe',
  admin: 'Société',
  vendor: 'Commercial',
  client: 'Client',
  unknown: 'Compte',
};

export const ENTITY_LABELS: Record<SiteEntityType, string> = {
  platform: 'Talvex',
  groupe: 'Groupe',
  societe: 'Société',
};

export const LOADING_SITE_CONTEXT: SiteContextState = {
  status: 'loading', actor: null, target: null, relation: null, isVisu: false, chain: [], canManageSite: false,
};

export function normalizeRole(value: unknown): SiteActorRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value) ? (value as SiteActorRole) : 'unknown';
}

function normalizeEntityType(value: unknown): SiteEntityType | null {
  return typeof value === 'string' && (ENTITY_TYPES as readonly string[]).includes(value) ? (value as SiteEntityType) : null;
}

function normalizeRelation(value: unknown): SiteRelation {
  return typeof value === 'string' && (RELATIONS as readonly string[]).includes(value) ? (value as SiteRelation) : 'other';
}

/** Acteur reel a partir de l'utilisateur de la session Supabase (app_metadata, non modifiable par lui). */
export function actorFromUser(user: { id: string; app_metadata?: Record<string, unknown> | null }): SiteActor {
  const meta = user.app_metadata ?? {};
  const companyId = typeof meta.company_id === 'string' && meta.company_id ? meta.company_id : null;
  return { userId: user.id, role: normalizeRole(meta.role), companyId };
}

function denied(status: SiteContextStatus, actor: SiteActor | null, target: SiteTarget | null = null): SiteContextState {
  return { status, actor, target, relation: null, isVisu: false, chain: [], canManageSite: false };
}

/** Site officiel Talvex (scope platform) : seul Talvex Administrateur le gere. */
export function buildPlatformContext(actor: SiteActor | null): SiteContextState {
  const target: SiteTarget = { scope: 'platform', companyId: null, name: 'Talvex', entityType: 'platform', parentCompanyId: null, parentName: null };
  if (!actor || actor.role !== 'super_admin') return denied('forbidden', actor, target);
  return {
    status: 'ready', actor, target, relation: 'platform_admin', isVisu: false,
    chain: [{ kind: 'platform', label: 'Site Talvex' }], canManageSite: true,
  };
}

/** Site d'une entreprise nommee. row = reponse serveur (null si l'acteur ne peut pas gerer la cible). */
export function buildCompanyContext(actor: SiteActor | null, targetCompanyId: string | null, row: SiteContextRow | null): SiteContextState {
  if (!actor) return denied('forbidden', null);
  if (!targetCompanyId) return denied('no_target', actor);
  if (!row || row.target_company_id !== targetCompanyId) return denied('forbidden', actor);

  const entityType = normalizeEntityType(row.target_entity_type);
  const relation = normalizeRelation(row.relation);
  const target: SiteTarget = {
    scope: 'company',
    companyId: row.target_company_id,
    name: row.target_name?.trim() || 'Entreprise sans nom',
    entityType,
    parentCompanyId: row.target_parent_company_id,
    parentName: row.parent_name?.trim() || null,
  };

  const targetStep: SiteChainStep = {
    kind: entityType ?? 'societe',
    label: `${entityType ? ENTITY_LABELS[entityType] : 'Entreprise'} ${target.name}`,
  };
  const parentStep: SiteChainStep | null = target.parentCompanyId
    ? { kind: 'groupe', label: `Groupe ${target.parentName ?? ''}`.trim() }
    : null;

  let chain: SiteChainStep[];
  if (relation === 'self') {
    chain = [targetStep];
  } else if (relation === 'group_child') {
    chain = parentStep ? [{ ...parentStep, kind: 'actor' }, targetStep] : [targetStep];
  } else {
    const actorStep: SiteChainStep = { kind: 'actor', label: ACTOR_ROLE_LABELS[actor.role] };
    chain = parentStep ? [actorStep, parentStep, targetStep] : [actorStep, targetStep];
  }

  return {
    status: 'ready', actor, target, relation,
    isVisu: relation !== 'self',
    chain,
    canManageSite: true,
  };
}
