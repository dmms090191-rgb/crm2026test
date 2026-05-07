export function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getMondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function formatDateFull(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function normalizeTimestamp(ts: string): string {
  let s = ts.replace(' ', 'T');
  const offsetMatch = s.match(/([+-]\d{2})$/);
  if (offsetMatch) {
    s = s + ':00';
  }
  return s;
}

export function getRdvTimestamp(rdv: { appointment_utc?: string | null; proposed_date: string; proposed_time: string }): number {
  if (rdv.appointment_utc) {
    return new Date(normalizeTimestamp(rdv.appointment_utc)).getTime();
  }
  return new Date(`${rdv.proposed_date}T${rdv.proposed_time}:00`).getTime();
}

export function isRdvPast(rdv: { appointment_utc?: string | null; proposed_date: string; proposed_time: string }): boolean {
  return getRdvTimestamp(rdv) < Date.now();
}
