import ct from 'countries-and-timezones';

const STORAGE_KEY_PREFIX = 'crm_user_timezone';
const LEGACY_STORAGE_KEY = 'crm_user_timezone';
const OLD_STORAGE_KEY = 'app-timezone';
const DEFAULT_TZ = 'Europe/Paris';

if (!localStorage.getItem(LEGACY_STORAGE_KEY) && localStorage.getItem(OLD_STORAGE_KEY)) {
  localStorage.setItem(LEGACY_STORAGE_KEY, localStorage.getItem(OLD_STORAGE_KEY)!);
  localStorage.removeItem(OLD_STORAGE_KEY);
}

export function buildStorageKey(role?: string | null, userId?: string | null): string {
  if (role && userId) return `${STORAGE_KEY_PREFIX}_${role}_${userId}`;
  if (role) return `${STORAGE_KEY_PREFIX}_${role}`;
  return `${STORAGE_KEY_PREFIX}_global`;
}

export interface TzSearchResult {
  timezone: string;
  country: string;
  city: string;
  utcOffset: string;
}

const allTimezones = ct.getAllTimezones();
const allCountries = ct.getAllCountries();

const searchIndex: { keyword: string; timezone: string; country: string; city: string; utcOffset: string }[] = [];

for (const [tzName, tz] of Object.entries(allTimezones)) {
  if (!tzName.includes('/') || tzName.startsWith('Etc/')) continue;
  const city = tzName.split('/').pop()!.replace(/_/g, ' ');
  const countryCode = tz.countries?.[0];
  const country = countryCode ? (allCountries[countryCode]?.name ?? countryCode) : '';
  const offsetHours = (tz.utcOffset ?? 0) / 60;
  const sign = offsetHours >= 0 ? '+' : '-';
  const utcOffset = `UTC${sign}${String(Math.floor(Math.abs(offsetHours))).padStart(2, '0')}:${String(Math.abs(offsetHours * 60) % 60).padStart(2, '0')}`;

  searchIndex.push({
    keyword: `${country} ${city} ${tzName}`.toLowerCase(),
    timezone: tzName,
    country,
    city,
    utcOffset,
  });
}

searchIndex.sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city));

export function searchTimezones(query: string, limit = 20): TzSearchResult[] {
  if (!query.trim()) return searchIndex.slice(0, limit);
  const q = query.toLowerCase().trim();
  const results: TzSearchResult[] = [];
  for (const entry of searchIndex) {
    if (entry.keyword.includes(q)) {
      results.push({ timezone: entry.timezone, country: entry.country, city: entry.city, utcOffset: entry.utcOffset });
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function getUserTimezone(role?: string | null, userId?: string | null): string {
  if (role && userId) {
    const specific = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${role}_${userId}`);
    if (specific) return specific;
  }
  if (role) {
    const roleKey = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${role}`);
    if (roleKey) return roleKey;
    return DEFAULT_TZ;
  }
  return localStorage.getItem(LEGACY_STORAGE_KEY) || DEFAULT_TZ;
}

export function setUserTimezone(tz: string, role?: string | null, userId?: string | null): void {
  if (role && userId) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_${role}_${userId}`, tz);
  }
  if (role) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_${role}`, tz);
  }
}

export function getCurrentTime(tz: string): string {
  return new Date().toLocaleTimeString('fr-FR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getTzCountryLabel(tz: string): string {
  const entry = searchIndex.find(e => e.timezone === tz);
  if (entry) return entry.country;
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

export function formatMessageTime(iso: string, tz: string): string {
  let s = iso.replace(' ', 'T');
  if (/[+-]\d{2}$/.test(s)) s += ':00';
  return new Date(s).toLocaleString('fr-FR', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export { LEGACY_STORAGE_KEY as STORAGE_KEY, DEFAULT_TZ };
