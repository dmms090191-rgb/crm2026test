import { champContact, entrepriseDuLead, type LeadIdentifiable } from './identiteLead';
import { telDuLead, telCorrespond } from './formatTel';

/**
 * LA RECHERCHE GLOBALE DU CRM LEADS — sur TOUS les leads, quel que soit l'onglet.
 *
 * Champs fouilles (demande de David) : Nom, Prenom, Entreprise, Email, Telephone. Sans
 * accents ni casse (« societe » trouve « Société »), mot par mot (« encre rennes » trouve
 * « Encre Fictive Rennes »), et le telephone tolere toutes les ecritures (`0600`, `+33 6 00`).
 */

export function normaliserRecherche(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* Le texte fouille d'un lead, calcule une fois par objet : 5 000 leads re-normalises a
   chaque frappe gelaient la saisie sur un telephone d'entree de gamme. Un lead modifie est
   un NOUVEL objet (mises a jour immuables), le cache ne peut donc pas servir une valeur
   perimee. */
const cache = new WeakMap<object, string>();

function texteFouille(lead: LeadIdentifiable): string {
  const deja = cache.get(lead);
  if (deja !== undefined) return deja;
  const t = normaliserRecherche([
    champContact(lead, 'prenom'), champContact(lead, 'nom'),
    entrepriseDuLead(lead), champContact(lead, 'email'),
  ].join(' \u0000 '));
  cache.set(lead, t);
  return t;
}

export function leadCorrespond(lead: LeadIdentifiable, saisie: string): boolean {
  const q = normaliserRecherche(saisie);
  if (q === '') return true;
  const texte = texteFouille(lead);
  if (q.split(' ').every(mot => texte.includes(mot))) return true;
  /* Le telephone seulement si la saisie contient au moins trois chiffres : sans ce seuil,
     taper « 3 » rendrait tous les leads dont le numero contient un 3. */
  if ((q.match(/\d/g) ?? []).length >= 3) return telCorrespond(telDuLead(lead), saisie);
  return false;
}
