const DEFAULT_COUNTRY_CODE = '+33';
const DEFAULT_COUNTRY_DIGITS = 9;

export interface PhoneNormResult {
  canonical: string | null;
  valid: boolean;
  error?: string;
}

export function normalizePhone(raw: string): PhoneNormResult {
  if (!raw || raw.trim() === '') {
    return { canonical: null, valid: true };
  }

  let cleaned = raw.trim();
  cleaned = cleaned.replace(/[\s\-.()/]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    const digits = cleaned.slice(1);
    if (digits.length === DEFAULT_COUNTRY_DIGITS) {
      cleaned = DEFAULT_COUNTRY_CODE + digits;
    }
  }

  if (!cleaned.startsWith('+')) {
    if (/^\d{10,15}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
    } else {
      return { canonical: null, valid: false, error: 'Format de telephone non reconnu' };
    }
  }

  const digitsOnly = cleaned.slice(1);
  if (!/^\d{7,15}$/.test(digitsOnly)) {
    return { canonical: null, valid: false, error: 'Numero de telephone invalide (longueur incorrecte)' };
  }

  return { canonical: cleaned, valid: true };
}

export function normalizeEmail(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export function capitalizeName(raw: string): string {
  if (!raw || raw.trim() === '') return '';
  return raw
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
