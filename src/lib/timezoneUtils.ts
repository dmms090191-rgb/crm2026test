function parseUtc(ts: string): Date {
  let s = ts.replace(' ', 'T');
  if (/[+-]\d{2}$/.test(s)) s += ':00';
  return new Date(s);
}

export interface TimezoneOption {
  value: string;
  label: string;
  shortLabel: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'Europe/Paris', label: 'France (Paris)', shortLabel: 'France' },
  { value: 'Asia/Jerusalem', label: 'Israel (Jerusalem)', shortLabel: 'Israel' },
  { value: 'Europe/London', label: 'Royaume-Uni (Londres)', shortLabel: 'UK' },
  { value: 'America/New_York', label: 'Est USA (New York)', shortLabel: 'New York' },
  { value: 'America/Los_Angeles', label: 'Ouest USA (Los Angeles)', shortLabel: 'Los Angeles' },
  { value: 'Europe/Berlin', label: 'Allemagne (Berlin)', shortLabel: 'Allemagne' },
  { value: 'Asia/Dubai', label: 'Dubai (EAU)', shortLabel: 'Dubai' },
];

export function getTzLabel(tz: string): string {
  const opt = TIMEZONE_OPTIONS.find(o => o.value === tz);
  return opt?.shortLabel ?? tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

export function getTzBadgeStyle(tz: string): { bg: string; color: string; border: string } {
  switch (tz) {
    case 'Europe/Paris':
      return { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.15)' };
    case 'Asia/Jerusalem':
      return { bg: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.15)' };
    case 'Europe/London':
      return { bg: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.15)' };
    case 'America/New_York':
      return { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' };
    case 'America/Los_Angeles':
      return { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' };
    default:
      return { bg: 'rgba(148,163,184,0.08)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.15)' };
  }
}

export function localToUTC(date: string, time: string, tz: string): string {
  const dtStr = `${date}T${time}:00`;
  const utcGuess = new Date(dtStr + 'Z');

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcGuess);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';

  const localOfUtcGuess = new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`
  );

  const offsetMs = localOfUtcGuess.getTime() - utcGuess.getTime();
  const utcResult = new Date(utcGuess.getTime() - offsetMs);
  return utcResult.toISOString();
}

export function utcToLocal(utcDateStr: string, tz: string): { date: string; time: string } {
  const utc = parseUtc(utcDateStr);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return {
    date: formatter.format(utc),
    time: timeFormatter.format(utc),
  };
}

export function formatTimeInTz(utcDateStr: string, tz: string): string {
  const utc = parseUtc(utcDateStr);
  return utc.toLocaleTimeString('fr-FR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateInTz(utcDateStr: string, tz: string): string {
  const utc = parseUtc(utcDateStr);
  return utc.toLocaleDateString('fr-FR', {
    timeZone: tz,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateIsoInTz(utcDateStr: string, tz: string): string {
  const utc = parseUtc(utcDateStr);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utc);
}

export function getHourInTz(utcDateStr: string, tz: string): number {
  const utc = parseUtc(utcDateStr);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(utc);
  return parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
}

export function getRdvLocalDate(rdv: { appointment_utc?: string | null; proposed_date: string }, tz: string): string {
  if (rdv.appointment_utc) {
    return formatDateIsoInTz(rdv.appointment_utc, tz);
  }
  return rdv.proposed_date;
}

export function getRdvLocalTime(rdv: { appointment_utc?: string | null; proposed_time: string }, tz: string): string {
  if (rdv.appointment_utc) {
    return formatTimeInTz(rdv.appointment_utc, tz);
  }
  return rdv.proposed_time?.slice(0, 5) ?? '';
}

export function getRdvLocalHour(rdv: { appointment_utc?: string | null; proposed_time: string }, tz: string): number {
  if (rdv.appointment_utc) {
    return getHourInTz(rdv.appointment_utc, tz);
  }
  return parseInt(rdv.proposed_time?.split(':')[0] ?? '0', 10);
}
