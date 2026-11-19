const DEFAULT_COUNTRY_CODE = '+33';
const DEFAULT_COUNTRY_DIGITS = 9;

/** L'indicatif francais, sans le plus. Une seule source pour tout le fichier. */
export const INDICATIF_FRANCE = '33';

/**
 * Le nettoyage, en UN SEUL endroit.
 *
 * Deux fonctions de ce fichier ont besoin d'enlever les memes separateurs. Ecrit deux fois,
 * le jeu de caracteres aurait divergé a la premiere retouche : un numero aurait ete juge
 * valide a l'import et refuse a l'affichage, ou l'inverse.
 */
export function nettoyerTel(raw: string): string {
  return raw.trim().replace(/[\s\-.()/\u00A0\u202F]/g, '');
}

export interface PhoneNormResult {
  canonical: string | null;
  valid: boolean;
  error?: string;
}

export function normalizePhone(raw: string): PhoneNormResult {
  if (!raw || raw.trim() === '') {
    return { canonical: null, valid: true };
  }

  let cleaned = nettoyerTel(raw);

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    const digits = cleaned.slice(1);
    if (digits.length === DEFAULT_COUNTRY_DIGITS) {
      cleaned = DEFAULT_COUNTRY_CODE + digits;
    }
  }

  /* « +33 (0)6 12 34 56 78 » : le zero national garde derriere l'indicatif donnait
     +330612345678, une AUTRE forme que +33612345678 — et un doublon a l'import. Meme regle
     que public.lead_tel_canonique (migration 20261119091523). */
  if (/^\+330\d{9}$/.test(cleaned)) {
    cleaned = DEFAULT_COUNTRY_CODE + cleaned.slice(4);
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

/* ─────────────────────────────────────────────────────────────────────────────
   DECOMPOSITION — ce qu'il faut savoir d'un numero pour le reecrire sans l'abimer.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Un numero decompose, ou rien.
 *
 * ---------- POURQUOI DEUX FORMES ET NON UNE ----------
 *
 * Reecrire un numero demande de savoir ou s'arrete l'indicatif. Or les indicatifs font un,
 * deux ou TROIS chiffres : +1 pour l'Amerique du Nord, +33 pour la France, +352 pour le
 * Luxembourg. Les decouper au hasard produirait des numeros faux en silence, et un numero
 * faux ne se voit pas : il sonne dans le vide.
 *
 * On ne decompose donc QUE le cas francais, le seul ou la question « avec ou sans le zero »
 * a un sens. Tout autre pays est garde en forme internationale, intacte. C'est ce qui
 * garantit la regle « pour un indicatif different de la France, ne transforme pas vers 0 » :
 * elle n'est pas un test a ne pas oublier, c'est le type qui l'impose.
 */
export type TelDecompose =
  /** Numero francais : `national` est la partie SANS le zero de tete, 9 chiffres. */
  | { pays: 'fr'; national: string }
  /** Autre pays : `e164` est la forme internationale complete, plus compris. */
  | { pays: 'autre'; e164: string };

/**
 * Decompose un numero ecrit n'importe comment. Rend `null` si c'est indecidable — jamais une
 * approximation.
 *
 * Accepte, pour un numero francais : `0664333952`, `06 64 33 39 52`, `06-64-33-39-52`,
 * `06.64.33.39.52`, `(06) 64 33 39 52`, `+33664333952`, `+33 6 64 33 39 52`,
 * `0033664333952`, `664333952`, et meme `+330664333952` — la saisie fautive ou le zero
 * national a ete garde derriere l'indicatif.
 */
export function decomposeTel(raw: string | null | undefined): TelDecompose | null {
  if (!raw) return null;
  const propre = nettoyerTel(raw);
  if (propre === '') return null;

  /* On ramene d'abord les deux notations internationales a une seule. `0033...` et `+33...`
     disent la meme chose ; la suite n'a donc qu'un cas a traiter. */
  let inter: string | null = null;
  if (propre.startsWith('+')) inter = propre.slice(1);
  else if (propre.startsWith('00')) inter = propre.slice(2);

  if (inter !== null) {
    if (!/^\d{7,15}$/.test(inter)) return null;

    if (inter.startsWith(INDICATIF_FRANCE)) {
      let reste = inter.slice(INDICATIF_FRANCE.length);
      /* `+330664333952` : le zero national a survecu derriere l'indicatif. On le retire,
         sinon on rendrait un numero a dix chiffres apres l'indicatif — injoignable. */
      if (reste.length === DEFAULT_COUNTRY_DIGITS + 1 && reste.startsWith('0')) reste = reste.slice(1);
      if (reste.length === DEFAULT_COUNTRY_DIGITS && !reste.startsWith('0')) {
        return { pays: 'fr', national: reste };
      }
      /* Commence par 33 mais ne compte pas ses chiffres : ce n'est pas forcement la France
         (un numero chinois commence par 86, un autre pays peut commencer par 33 suivi
         d'autre chose). On le garde international, intact. */
      return { pays: 'autre', e164: '+' + inter };
    }
    return { pays: 'autre', e164: '+' + inter };
  }

  if (!/^\d+$/.test(propre)) return null;

  /* `0664333952` — la forme nationale. */
  if (propre.length === DEFAULT_COUNTRY_DIGITS + 1 && propre.startsWith('0')) {
    const national = propre.slice(1);
    if (!national.startsWith('0')) return { pays: 'fr', national };
    return null;
  }

  /* `664333952` — le zero a disparu, souvent au passage par un tableur. */
  if (propre.length === DEFAULT_COUNTRY_DIGITS && !propre.startsWith('0')) {
    return { pays: 'fr', national: propre };
  }

  return null;
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
