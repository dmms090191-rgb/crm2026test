// Validation des entrees de la couche Hostinger (module pur : aucun reseau, aucun secret).
// Miroir de public.normalize_domain_name / public.is_valid_domain_name (migration 20260917114422).

export type DomainInputError = "invalid_domain" | "unsupported_characters";

export type DomainInput =
  | { ok: true; domain: string; sld: string; tld: string }
  | { ok: false; error: DomainInputError; normalized: string | null };

const VALID_DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;
const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RAW_LENGTH = 300;

/* Minuscules, sans schema, sans port/chemin/requete, sans point final, sans "www." en tete. */
export function normalizeDomainName(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > MAX_RAW_LENGTH) return null;
  let value = raw.trim().toLowerCase();
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.replace(/[:/?#].*$/, "");
  value = value.replace(/\.+$/, "");
  value = value.replace(/^www\./, "");
  return value === "" ? null : value;
}

export function isValidDomainName(value: string): boolean {
  return value.length >= 4 && value.length <= 253 && VALID_DOMAIN_RE.test(value) && normalizeDomainName(value) === value;
}

/*
 * Nom saisi -> domaine normalise + decoupage attendu par Hostinger (nom sans extension, extension sans point).
 * Extensions a une ou deux etiquettes (com, fr, co.il). Au-dela : refuse (sous-domaine).
 * Les noms accentues doivent arriver en punycode (xn--) : refus explicite sinon.
 */
export function parseDomainInput(raw: unknown): DomainInput {
  const normalized = normalizeDomainName(raw);
  if (normalized === null) return { ok: false, error: "invalid_domain", normalized: null };
  // deno-lint-ignore no-control-regex
  if (/[^\x00-\x7f]/.test(normalized)) return { ok: false, error: "unsupported_characters", normalized };
  if (!isValidDomainName(normalized)) return { ok: false, error: "invalid_domain", normalized };

  const labels = normalized.split(".");
  if (labels.length < 2 || labels.length > 3) return { ok: false, error: "invalid_domain", normalized };
  const [sld, ...rest] = labels;
  return { ok: true, domain: normalized, sld, tld: rest.join(".") };
}

export type SearchQuery =
  | { ok: true; name: string; requestedTld: string | null }
  | { ok: false; error: DomainInputError };

/*
 * Recherche multi-extensions : « dior », « dior.com » ou « https://www.dior.com/ » -> nom « dior »
 * (+ extension demandee si elle est saisie). Le nom seul est ensuite essaye sur plusieurs extensions.
 */
export function parseSearchQuery(raw: unknown): SearchQuery {
  const normalized = normalizeDomainName(raw);
  if (normalized === null) return { ok: false, error: "invalid_domain" };
  // deno-lint-ignore no-control-regex
  if (/[^\x00-\x7f]/.test(normalized)) return { ok: false, error: "unsupported_characters" };
  const labels = normalized.split(".");
  const name = labels[0];
  if (!LABEL_RE.test(name)) return { ok: false, error: "invalid_domain" };
  if (labels.length === 1) return { ok: true, name, requestedTld: null };
  const requestedTld = parseTld(labels.slice(1).join("."));
  if (!requestedTld) return { ok: false, error: "invalid_domain" };
  return { ok: true, name, requestedTld };
}

/* Extension seule (catalogue) : "com", ".COM", "co.il". */
export function parseTld(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 64) return null;
  const value = raw.trim().toLowerCase().replace(/^\.+/, "");
  const labels = value.split(".");
  if (labels.length < 1 || labels.length > 2) return null;
  if (!labels.every((label) => LABEL_RE.test(label))) return null;
  if (!/^[a-z]/.test(labels[labels.length - 1])) return null;
  return value;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
