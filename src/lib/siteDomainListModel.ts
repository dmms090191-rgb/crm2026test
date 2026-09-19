/*
 * « Mes domaines enregistres » : les domaines deja enregistres par l'entite (Groupe ou Societe).
 * Modele pur (aucun import d'execution) : testable avec node --test.
 *
 * « Supprimer » ne supprime rien : le domaine est seulement retire de CETTE liste (masquage cote
 * serveur). Il n'est jamais deconnecte, reste la propriete du client, et ses e-mails ne sont pas
 * touches. Un domaine en service (Actif ou en cours de mise en service) ne peut pas etre retire.
 */
import type { DomainState, StatusTone } from './siteWorkspaceModel';

/* Ligne renvoyee par la RPC get_site_domain_list. */
export interface RegisteredDomainRow {
  domain_name: string;
  is_active: boolean;
  is_live: boolean;
  connection_status: string | null;
  registration_status: string | null;
  last_registered_at: string | null;
}

export interface RegisteredDomain {
  name: string;
  /* Domaine connecte et en ligne : badge « Actif ». */
  active: boolean;
  /* Domaine en service (rattache, non libere) : jamais retirable. */
  live: boolean;
  canHide: boolean;
  badge: { label: string; tone: StatusTone } | null;
}

/* Domaine affiche par le panneau juste au-dessus : il est toujours dans la liste, protege, avec le meme etat. */
export interface CurrentDomain {
  domain: string | null;
  state: DomainState;
  label: string;
  tone: StatusTone;
}

export const COPIED_MS = 2000;

const ACTIVE_BADGE = { label: 'Actif', tone: 'success' as StatusTone };

/*
 * Badge d'un domaine en service qui n'est pas celui du panneau (par exemple l'ancien domaine pendant un
 * changement). Memes libelles que summarizeSiteDomain (siteWorkspaceModel) : un test les compare mot pour mot.
 */
export function liveBadge(registration: string | null, connection: string | null): { label: string; tone: StatusTone } {
  switch (registration) {
    case 'pending': return { label: 'En cours de préparation', tone: 'warning' };
    case 'expired': return { label: 'Expiré', tone: 'danger' };
    case 'suspended': return { label: 'Suspendu', tone: 'danger' };
    case 'transfer_out': return { label: 'Transfert en cours', tone: 'warning' };
    default: break;
  }
  switch (connection) {
    case 'active': return ACTIVE_BADGE;
    case 'dns_failed':
    case 'verification_failed':
    case 'disconnected': return { label: 'Non relié', tone: 'danger' };
    default: return { label: 'Mise en service à terminer', tone: 'warning' };
  }
}

function isRow(value: unknown): value is RegisteredDomainRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.domain_name === 'string' && row.domain_name.trim() !== '';
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/* Lignes du serveur -> liste affichee. Le domaine du panneau et les domaines en service passent en tete. */
export function parseRegisteredDomains(rows: unknown, current: CurrentDomain | null = null): RegisteredDomain[] {
  const seen = new Set<string>();
  const list: RegisteredDomain[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isRow(row)) continue;
    const name = row.domain_name.trim().toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);
    const active = row.is_active === true;
    const live = active || row.is_live === true;
    const badge = active ? ACTIVE_BADGE : live ? liveBadge(text(row.registration_status), text(row.connection_status)) : null;
    list.push({ name, active, live, canHide: !live, badge });
  }

  // Le domaine du panneau : jamais absent, jamais retirable, et son badge dit exactement ce que dit le panneau.
  const pinned = current?.domain?.trim().toLowerCase();
  if (pinned && current && current.state !== 'none') {
    const active = current.state === 'active';
    const entry: RegisteredDomain = {
      name: pinned, active, live: true, canHide: false, badge: active ? ACTIVE_BADGE : { label: current.label, tone: current.tone },
    };
    const index = list.findIndex(d => d.name === pinned);
    if (index >= 0) list[index] = entry; else list.unshift(entry);
  }

  const rank = (d: RegisteredDomain) => (d.name === pinned ? 0 : d.active ? 1 : d.live ? 2 : 3);
  return list.map((d, i) => ({ d, i })).sort((a, b) => rank(a.d) - rank(b.d) || a.i - b.i).map(x => x.d);
}

export function hideableCount(list: RegisteredDomain[]): number {
  return list.filter(d => d.canHide).length;
}

/* Ce qui reste vrai pour le client : dit dans chaque confirmation. */
const NOT_DISCONNECTED = "Le domaine n'est pas déconnecté : il reste votre propriété et vos e-mails ne sont pas touchés.";

export function hideConfirm(domain: string) {
  return {
    title: `Retirer ${domain} de la liste ?`,
    text: `Il disparaît seulement de « Mes domaines enregistrés ». ${NOT_DISCONNECTED}`,
    confirm: 'Retirer de la liste',
    cancel: 'Annuler',
  };
}

export function hideAllConfirm(list: RegisteredDomain[]) {
  const count = hideableCount(list);
  const keepsLive = list.some(d => d.live);
  return {
    title: count > 1 ? `Retirer ${count} domaines de la liste ?` : 'Retirer 1 domaine de la liste ?',
    text: `${keepsLive ? 'Votre domaine en service reste affiché. ' : ''}Aucun domaine n'est déconnecté : ils restent votre propriété et vos e-mails ne sont pas touchés.`,
    confirm: 'Tout retirer de la liste',
    cancel: 'Annuler',
  };
}

export type HideOutcome = 'hidden' | 'active' | 'not_found' | 'invalid' | 'forbidden' | 'error';

export function toHideOutcome(value: unknown): HideOutcome {
  return value === 'hidden' || value === 'active' || value === 'not_found' || value === 'invalid' || value === 'forbidden'
    ? value
    : 'error';
}

/* Reponse de « Tout supprimer » : un nombre, NULL si l'acces est refuse, autre chose = erreur. */
export type HideAllOutcome = number | 'forbidden' | 'error';

export function toHideAllOutcome(value: unknown): HideAllOutcome {
  if (value === null) return 'forbidden';
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 'error';
}

export interface ListFeedback {
  tone: StatusTone;
  text: string;
}

const FORBIDDEN_TEXT = "Vous n'avez pas accès à cette entreprise.";

export function hideMessage(outcome: HideOutcome, domain: string): ListFeedback {
  switch (outcome) {
    case 'hidden':
      return { tone: 'success', text: `${domain} a été retiré de la liste. Il n'est pas déconnecté.` };
    case 'active':
      return { tone: 'neutral', text: `${domain} est en service : il reste affiché dans la liste.` };
    case 'not_found':
      return { tone: 'neutral', text: `${domain} n'est plus dans la liste.` };
    case 'forbidden':
      return { tone: 'danger', text: FORBIDDEN_TEXT };
    default:
      return { tone: 'danger', text: 'Impossible de retirer ce domaine pour le moment. Réessayez.' };
  }
}

export function hideAllMessage(outcome: HideAllOutcome): ListFeedback {
  if (outcome === 'forbidden') return { tone: 'danger', text: FORBIDDEN_TEXT };
  if (outcome === 'error') return { tone: 'danger', text: 'Impossible de vider la liste pour le moment. Réessayez.' };
  if (outcome === 0) return { tone: 'neutral', text: 'Aucun domaine à retirer : un domaine en service reste toujours affiché.' };
  return {
    tone: 'success',
    text: `${outcome > 1 ? `${outcome} domaines retirés` : '1 domaine retiré'} de la liste. Aucun n'a été déconnecté.`,
  };
}

export type CopyState = 'idle' | 'copied' | 'failed';

export function copyLabel(state: CopyState): string {
  return state === 'copied' ? 'Copié' : state === 'failed' ? 'Copie impossible' : 'Copier';
}

/* Annonce pour les lecteurs d'ecran, succes comme echec. */
export function copyAnnouncement(domain: string, ok: boolean): string {
  return ok ? `${domain} copié.` : `Copie impossible de ${domain}.`;
}
