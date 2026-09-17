/*
 * Modele pur de la recherche de domaine (onglet DOMAINE).
 * Les donnees viennent UNIQUEMENT du serveur Talvex (fonction hostinger-domains) : aucune
 * disponibilite ni aucun prix n'est calcule ou devine ici. Textes clients sans jargon.
 * Aucun import d'execution : testable avec node --test (scripts/site-interface).
 */
import type { StatusTone } from './siteWorkspaceModel';

export type AvailabilityStatus = 'available' | 'unavailable' | 'unknown' | 'invalid';

export interface ProviderPriceLine {
  currency: string;
  first_year_cents: number;
  renewal_cents: number;
}

export type ProviderPriceStatus = 'found' | 'not_found' | 'ambiguous' | 'unavailable' | 'not_requested';

export interface DomainAvailabilityResult {
  domain: string | null;
  status: AvailabilityStatus;
  reason: string | null;
  retry_after_seconds: number | null;
  restricted: boolean;
  alternatives: string[];
  checked_at: string | null;
  from_cache: boolean;
  /* Prix vendu au Groupe/Societe : pas encore defini (jamais le cout Hostinger). */
  client_price: null;
  /* Cout Hostinger : present UNIQUEMENT pour Talvex (le serveur ne l'envoie pas aux autres). */
  provider_price?: { status: ProviderPriceStatus; prices: ProviderPriceLine[] };
  restriction_note?: string | null;
}

export function unknownResult(reason: string): DomainAvailabilityResult {
  return {
    domain: null, status: 'unknown', reason, retry_after_seconds: null, restricted: false,
    alternatives: [], checked_at: null, from_cache: false, client_price: null,
  };
}

const STATUSES: AvailabilityStatus[] = ['available', 'unavailable', 'unknown', 'invalid'];
const PRICE_STATUSES: ProviderPriceStatus[] = ['found', 'not_found', 'ambiguous', 'unavailable', 'not_requested'];

function isPriceLine(v: unknown): v is ProviderPriceLine {
  const p = v as ProviderPriceLine;
  return typeof v === 'object' && v !== null && typeof p.currency === 'string' && /^[A-Z]{3}$/.test(p.currency)
    && Number.isSafeInteger(p.first_year_cents) && p.first_year_cents >= 0
    && Number.isSafeInteger(p.renewal_cents) && p.renewal_cents >= 0;
}

/* Reponse HTTP du serveur -> resultat sur. Toute forme inattendue devient « impossible de verifier ». */
export function parseAvailabilityResponse(httpStatus: number, body: unknown): DomainAvailabilityResult {
  if (httpStatus === 401) return unknownResult('unauthenticated');
  if (httpStatus === 403) return unknownResult('forbidden');
  if (httpStatus !== 200 || typeof body !== 'object' || body === null) return unknownResult('provider_unavailable');
  const r = (body as { ok?: unknown; result?: Record<string, unknown> }).result;
  if ((body as { ok?: unknown }).ok !== true || typeof r !== 'object' || r === null) return unknownResult('provider_unavailable');
  if (!STATUSES.includes(r.status as AvailabilityStatus)) return unknownResult('provider_unavailable');

  const result: DomainAvailabilityResult = {
    domain: typeof r.domain === 'string' ? r.domain : null,
    status: r.status as AvailabilityStatus,
    reason: typeof r.reason === 'string' ? r.reason : null,
    retry_after_seconds: Number.isSafeInteger(r.retry_after_seconds) ? (r.retry_after_seconds as number) : null,
    restricted: r.restricted === true,
    alternatives: Array.isArray(r.alternatives) ? r.alternatives.filter((a): a is string => typeof a === 'string').slice(0, 5) : [],
    checked_at: typeof r.checked_at === 'string' ? r.checked_at : null,
    from_cache: r.from_cache === true,
    client_price: null,
  };
  const pp = r.provider_price as { status?: unknown; prices?: unknown } | undefined;
  if (pp && typeof pp === 'object' && PRICE_STATUSES.includes(pp.status as ProviderPriceStatus)) {
    result.provider_price = {
      status: pp.status as ProviderPriceStatus,
      prices: Array.isArray(pp.prices) ? pp.prices.filter(isPriceLine) : [],
    };
  }
  if ('restriction_note' in r) result.restriction_note = typeof r.restriction_note === 'string' ? r.restriction_note : null;
  if ((result.status === 'available' || result.status === 'unavailable') && !result.domain) return unknownResult('provider_unavailable');
  return result;
}

/* Verification locale minimale avant d'appeler le serveur (qui refait la validation complete). */
export function precheckDomainQuery(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (value === '') return { ok: false, message: 'Saisissez un nom de domaine, par exemple : monentreprise.com' };
  if (value.length > 253) return { ok: false, message: 'Ce nom de domaine est trop long.' };
  if (!value.includes('.')) return { ok: false, message: 'Ajoutez l’extension, par exemple : monentreprise.com ou monentreprise.fr' };
  return { ok: true, value };
}

export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export interface AvailabilityView {
  tone: StatusTone;
  label: string;
  detail: string | null;
  priceLines: string[];
  alternatives: string[];
  /* Le futur bouton Acheter n'apparait (desactive) que pour un domaine reellement disponible. */
  showBuyPlaceholder: boolean;
}

/*
 * Hostinger ne renvoie aucun prix par nom : c'est le tarif catalogue de l'EXTENSION (un nom premium
 * peut couter davantage). Le libelle le dit, pour ne jamais presenter ce montant comme certain.
 */
function providerPriceLines(result: DomainAvailabilityResult): string[] {
  const pp = result.provider_price;
  const lines: string[] = [];
  if (!pp || pp.status === 'not_requested') return lines;
  const dot = result.domain ? result.domain.indexOf('.') : -1;
  const label = dot > 0 ? `Coût Talvex (tarif Hostinger de l'extension .${result.domain!.slice(dot + 1)})` : 'Coût Talvex (tarif Hostinger de l’extension)';
  if (pp.status === 'found' && pp.prices.length > 0) {
    for (const p of pp.prices) {
      const renewal = formatMoney(p.renewal_cents, p.currency);
      lines.push(p.first_year_cents !== p.renewal_cents
        ? `${label} : ${formatMoney(p.first_year_cents, p.currency)} la 1re année, puis ${renewal} / an`
        : `${label} : ${renewal} / an`);
    }
    lines.push('Tarif standard de l’extension, à reconfirmer pour ce nom précis au moment de l’achat.');
  } else if (pp.status === 'unavailable') {
    lines.push(`${label} : momentanément indisponible.`);
  } else {
    lines.push(`${label} : non trouvé.`);
  }
  lines.push('Prix client : pas encore défini.');
  return lines;
}

/* Codes de restriction renvoyes par Hostinger (constate : "requires_eu_residence" pour .fr). */
const RESTRICTION_LABELS: Record<string, string> = {
  requires_eu_residence: "réservé aux résidents de l'Union européenne",
};

export function restrictionLabel(code: string): string {
  return RESTRICTION_LABELS[code.trim().toLowerCase()] ?? code;
}

export function describeAvailability(result: DomainAvailabilityResult, actorIsTalvex: boolean): AvailabilityView {
  if (result.status === 'available') {
    const details: string[] = [];
    if (result.restricted) details.push("Cette extension a des conditions d'enregistrement particulières.");
    if (actorIsTalvex && result.restriction_note) details.push(`Condition indiquée par Hostinger : ${restrictionLabel(result.restriction_note)}.`);
    return {
      tone: 'success',
      label: 'Disponible',
      detail: details.length ? details.join(' ') : null,
      priceLines: actorIsTalvex ? providerPriceLines(result) : ['Le prix vous sera indiqué ici avant tout achat.'],
      alternatives: [],
      showBuyPlaceholder: true,
    };
  }
  if (result.status === 'unavailable') {
    return {
      tone: 'danger',
      label: 'Indisponible',
      // Hostinger repond aussi « indisponible » pour une extension qu'il ne vend pas (constate : .co.il) :
      // ne jamais affirmer que le nom est deja utilise.
      detail: "Ce nom de domaine ne peut pas être enregistré.",
      priceLines: [],
      alternatives: result.alternatives,
      showBuyPlaceholder: false,
    };
  }
  if (result.status === 'invalid') {
    const detail = result.reason === 'unsupported_characters'
      ? 'Les lettres accentuées ne sont pas encore prises en charge.'
      : result.reason === 'unsupported_extension'
        ? "Cette extension n'est pas proposée."
        : "Vérifiez l'orthographe, par exemple : monentreprise.com";
    return { tone: 'warning', label: 'Nom de domaine non valide', detail, priceLines: [], alternatives: [], showBuyPlaceholder: false };
  }
  const wait = result.retry_after_seconds;
  const hasWait = !!wait && wait > 0;
  const delay = hasWait ? `${wait} s` : 'une minute';
  let detail: string;
  switch (result.reason) {
    case 'provider_not_configured':
      detail = 'La vérification des noms de domaine sera bientôt disponible.';
      break;
    case 'forbidden':
      detail = "Vous n'avez pas accès à cette vérification pour cette entreprise.";
      break;
    case 'unauthenticated':
      detail = 'Votre session a expiré. Reconnectez-vous puis réessayez.';
      break;
    case 'rate_limited':
      detail = `Trop de vérifications en peu de temps. Réessayez dans ${delay}.`;
      break;
    case 'busy':
      detail = `Beaucoup de vérifications sont en cours. Réessayez dans ${delay}.`;
      break;
    default:
      detail = hasWait ? `Réessayez dans ${delay}.` : 'Réessayez dans quelques instants.';
  }
  return { tone: 'warning', label: 'Impossible de vérifier pour le moment.', detail, priceLines: [], alternatives: [], showBuyPlaceholder: false };
}
