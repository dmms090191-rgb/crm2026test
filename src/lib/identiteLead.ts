import { estEnteteEntreprise, estCleReservee } from './entetesImport';
import { telDuLead, type PorteurDeNumero } from './formatTel';

/**
 * LE NOM AFFICHE D'UN LEAD — sans jamais rien inventer.
 *
 * Demande de David : « Si le fichier a Nom/Prenom, on les utilise. Sinon on n'invente rien :
 * l'Entreprise sert d'identite visuelle » (« Encre Fictive Rennes | 06 00 ... »).
 *
 * Ordre : Prenom + Nom → Entreprise → Email → Telephone → « Lead sans nom ». Rien n'est
 * ECRIT : c'est de l'affichage. Le prenom et le nom d'un lead restent vides en base s'ils
 * l'etaient dans le fichier.
 *
 * Les champs sont lus dans la colonne PLATE d'abord (ce que l'import normalise), puis dans
 * le JSONB sous les cles connues — `Nom` (import, saisie manuelle) et `nom` (comptes de
 * demonstration) coexistent en base.
 */

export interface LeadIdentifiable extends PorteurDeNumero {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
}

export type SourceIdentite = 'contact' | 'entreprise' | 'email' | 'telephone' | 'aucune';

export interface IdentiteLead {
  titre: string;
  source: SourceIdentite;
  /** La valeur de la colonne Entreprise si le fichier en a une, meme quand le contact est connu. */
  entreprise: string;
}

export const LEAD_SANS_NOM = 'Lead sans nom';

const CLES_DATA: Record<'prenom' | 'nom' | 'email', string[]> = {
  prenom: ['Prenom', 'Prénom', 'prenom', 'prénom'],
  nom: ['Nom', 'nom'],
  email: ['Email', 'email', 'E-mail', 'Mail'],
};

/** Prenom, nom ou email d'un lead : la colonne plate, puis les cles connues du JSONB. */
export function champContact(lead: LeadIdentifiable | null | undefined, champ: 'prenom' | 'nom' | 'email'): string {
  if (!lead) return '';
  const plat = (lead[champ] ?? '').trim();
  if (plat !== '') return plat;
  const data = lead.data;
  if (!data) return '';
  for (const k of CLES_DATA[champ]) {
    const v = typeof data[k] === 'string' ? data[k].trim() : '';
    if (v !== '') return v;
  }
  return '';
}

/** La valeur de la premiere cle du JSONB qui designe une entreprise (« Entreprise », « Société »...). */
export function entrepriseDuLead(lead: LeadIdentifiable | null | undefined): string {
  const data = lead?.data;
  if (!data) return '';
  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== 'string' || estCleReservee(k)) continue;
    if (estEnteteEntreprise(k) && v.trim() !== '') return v.trim();
  }
  return '';
}

export function identiteLead(lead: LeadIdentifiable | null | undefined): IdentiteLead {
  const entreprise = entrepriseDuLead(lead);
  const contact = [champContact(lead, 'prenom'), champContact(lead, 'nom')].filter(Boolean).join(' ');
  if (contact) return { titre: contact, source: 'contact', entreprise };
  if (entreprise) return { titre: entreprise, source: 'entreprise', entreprise };
  const email = champContact(lead, 'email');
  if (email) return { titre: email, source: 'email', entreprise };
  const tel = telDuLead(lead);
  if (tel) return { titre: tel, source: 'telephone', entreprise };
  return { titre: LEAD_SANS_NOM, source: 'aucune', entreprise };
}

/** Deux lettres pour l'avatar : initiales du contact, sinon de l'entreprise, sinon « ? ». */
export function initialesLead(lead: LeadIdentifiable | null | undefined): string {
  const id = identiteLead(lead);
  if (id.source !== 'contact' && id.source !== 'entreprise') return '?';
  const mots = id.titre.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
  const lettres = mots.slice(0, 2).map(w => (w.match(/[\p{L}\p{N}]/u)?.[0] ?? '').toUpperCase());
  return lettres.join('') || '?';
}
