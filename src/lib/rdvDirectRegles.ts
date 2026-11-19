import { localToUTC, formatDateIsoInTz, formatTimeInTz, getRdvLocalDate, getRdvLocalTime } from './timezoneUtils';

/**
 * LE RDV DIRECT — les REGLES (aucun acces reseau) : date et heure dans le fuseau, ligne
 * d'historique, controle de saisie, creneau propose. Les lectures et ecritures sont dans
 * rdvDirect.ts, qui reexporte tout ceci.
 */

export const MOTIF_RDV_DIRECT = 'RDV direct';

export interface RdvDirect {
  id: string;
  lead_id: string | null;
  vendor_id: string | null;
  proposed_date: string;
  proposed_time: string;
  appointment_utc: string | null;
  source_timezone?: string | null;
  description: string;
  status: string;
  created_at: string;
  created_by_name?: string | null;
}


/** Date (jj/mm/aaaa) et heure (hh:mm) du RDV dans le fuseau donne. */
export function dateHeureRdv(r: Pick<RdvDirect, 'appointment_utc' | 'proposed_date' | 'proposed_time'>, tz: string): { date: string; heure: string } {
  const [a, m, j] = getRdvLocalDate(r, tz).split('-');
  return { date: `${j}/${m}/${a}`, heure: getRdvLocalTime(r, tz) };
}

/** La ligne d'historique du lead, tiree de l'etat COURANT du RDV. */
export function libelleRdvDirect(r: Pick<RdvDirect, 'appointment_utc' | 'proposed_date' | 'proposed_time' | 'description' | 'status'>, tz: string): string {
  const { date, heure } = dateHeureRdv(r, tz);
  const note = (r.description ?? '').trim();
  const suite = note ? ` — ${note}` : '';
  if (r.status === 'cancelled') return `RDV direct annulé (prévu le ${date} à ${heure})${suite}`;
  return `RDV direct prévu le ${date} à ${heure}${suite}`;
}

/** L'instant du RDV, en millisecondes. */
export function instantRdv(r: Pick<RdvDirect, 'appointment_utc' | 'proposed_date' | 'proposed_time'>): number {
  if (r.appointment_utc) return Date.parse(r.appointment_utc);
  return Date.parse(`${r.proposed_date}T${(r.proposed_time || '00:00').slice(0, 5)}:00`);
}

/** Les RDV directs A VENIR (confirmes, pas encore passes), du plus proche au plus lointain. */
export function rdvDirectsAVenir<T extends RdvDirect>(rdvs: readonly T[], maintenant: number): T[] {
  return rdvs
    .filter(r => r.status === 'confirmed' && instantRdv(r) >= maintenant)
    .sort((a, b) => instantRdv(a) - instantRdv(b));
}

/** Le controle de la saisie : un message a afficher, ou null si le creneau est bon. */
export function verifierCreneau(date: string, heure: string, tz: string, maintenant: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Choisissez une date.';
  if (!/^\d{2}:\d{2}$/.test(heure)) return 'Choisissez une heure.';
  const instant = Date.parse(localToUTC(date, heure, tz));
  if (Number.isNaN(instant)) return 'Date ou heure invalide.';
  if (instant < maintenant - 60_000) return 'Ce créneau est déjà passé.';
  return null;
}

/** Le creneau propose a l'ouverture : l'heure pleine qui suit, dans le fuseau du commercial. */
export function creneauParDefaut(tz: string, maintenant: number): { date: string; heure: string } {
  const prochaineHeure = new Date(Math.ceil((maintenant + 1) / 3_600_000) * 3_600_000).toISOString();
  return { date: formatDateIsoInTz(prochaineHeure, tz), heure: formatTimeInTz(prochaineHeure, tz) };
}
