import ct from 'countries-and-timezones';

const STORAGE_KEY_PREFIX = 'crm_user_timezone';
const LEGACY_STORAGE_KEY = 'crm_user_timezone';
const OLD_STORAGE_KEY = 'app-timezone';
function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch { /* fallback */ }
  return 'UTC';
}

const DEFAULT_TZ = detectBrowserTimezone();

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

const fullSearchIndex: { keyword: string; timezone: string; country: string; city: string; utcOffset: string }[] = [];

for (const [tzName, tz] of Object.entries(allTimezones)) {
  if (!tzName.includes('/') || tzName.startsWith('Etc/')) continue;
  const city = tzName.split('/').pop()!.replace(/_/g, ' ');
  const countryCode = tz.countries?.[0];
  const country = countryCode ? (allCountries[countryCode]?.name ?? countryCode) : '';
  const offsetHours = (tz.utcOffset ?? 0) / 60;
  const sign = offsetHours >= 0 ? '+' : '-';
  const utcOffset = `UTC${sign}${String(Math.floor(Math.abs(offsetHours))).padStart(2, '0')}:${String(Math.abs(offsetHours * 60) % 60).padStart(2, '0')}`;

  fullSearchIndex.push({
    keyword: `${country} ${city} ${tzName}`.toLowerCase(),
    timezone: tzName,
    country,
    city,
    utcOffset,
  });
}

fullSearchIndex.sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city));

interface AllowedTz { tz: string; aliases: string[] }

const ALLOWED_TIMEZONES: AllowedTz[] = [
  { tz: 'Asia/Jerusalem', aliases: ['israel', 'jerusalem', 'israël'] },
  { tz: 'Europe/Paris', aliases: ['france', 'paris', 'monaco'] },
  { tz: 'Europe/Brussels', aliases: ['belgium', 'belgique', 'bruxelles', 'brussels', 'luxembourg', 'netherlands', 'pays-bas', 'hollande', 'amsterdam'] },
  { tz: 'Europe/Zurich', aliases: ['switzerland', 'suisse', 'zurich'] },
  { tz: 'Europe/Madrid', aliases: ['spain', 'espagne', 'madrid'] },
  { tz: 'Europe/Rome', aliases: ['italy', 'italie', 'rome'] },
  { tz: 'Europe/Berlin', aliases: ['germany', 'allemagne', 'berlin', 'denmark', 'danemark', 'copenhagen', 'copenhague', 'sweden', 'suède', 'suede', 'stockholm', 'norway', 'norvège', 'norvege', 'oslo'] },
  { tz: 'Europe/London', aliases: ['united kingdom', 'royaume-uni', 'london', 'londres', 'angleterre', 'uk'] },
  { tz: 'Europe/Dublin', aliases: ['ireland', 'irlande', 'dublin'] },
  { tz: 'Europe/Lisbon', aliases: ['portugal', 'lisbon', 'lisbonne'] },
  { tz: 'Europe/Vienna', aliases: ['austria', 'autriche', 'vienna', 'vienne'] },
  { tz: 'Europe/Helsinki', aliases: ['finland', 'finlande', 'helsinki'] },
  { tz: 'Europe/Malta', aliases: ['malta', 'malte'] },
  { tz: 'Asia/Nicosia', aliases: ['cyprus', 'chypre', 'nicosia', 'nicosie'] },
  { tz: 'Europe/Athens', aliases: ['greece', 'grèce', 'grece', 'athens', 'athènes'] },
];

const searchIndex: { keyword: string; timezone: string; country: string; city: string; utcOffset: string }[] = [];

for (const allowed of ALLOWED_TIMEZONES) {
  const entry = fullSearchIndex.find(e => e.timezone === allowed.tz);
  if (entry) {
    const aliasStr = allowed.aliases.join(' ');
    searchIndex.push({
      ...entry,
      keyword: `${entry.keyword} ${aliasStr}`,
    });
  }
}

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
  const entry = fullSearchIndex.find(e => e.timezone === tz);
  if (entry) return entry.country;
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

export function getTzCountryCode(tz: string): string {
  const tzData = allTimezones[tz as keyof typeof allTimezones];
  if (tzData && tzData.countries && tzData.countries.length > 0) {
    return tzData.countries[0];
  }
  const entry = fullSearchIndex.find(e => e.timezone === tz);
  if (entry?.country) return entry.country.slice(0, 2).toUpperCase();
  return 'TZ';
}

export function formatTodayInTz(tz: string): string {
  return new Date().toLocaleDateString('fr-FR', {
    timeZone: tz,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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
