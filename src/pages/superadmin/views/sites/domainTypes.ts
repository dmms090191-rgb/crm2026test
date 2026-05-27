import { supabase } from '../../../../lib/supabase';

export interface PriceBreakdown {
  vercelPrice: number;
  displayPrice: number;
}

export interface PriceResult {
  years: number;
  currency: string;
  purchase: PriceBreakdown;
  renewal: PriceBreakdown;
}

export interface DomainResult {
  domain: string;
  available: boolean | null;
  price: PriceResult | null;
  loading: boolean;
  error?: string;
  yearsWarning?: string;
}

export interface BuyResult {
  success?: boolean;
  orderId?: string;
  vercelOrderId?: string;
  vercelOrderStatus?: string;
  addedToProject?: boolean;
  error?: string;
}

export interface DomainOrder {
  id: string;
  domain_name: string;
  vercel_order_status: string;
  purchase_price: number;
  currency: string;
  years: number;
  created_at: string;
  completed_at: string | null;
}

export const VERCEL_DNS_RECORDS = [
  { type: 'A', name: '@', value: '76.76.21.21', desc: 'Pour le domaine principal' },
  { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com', desc: 'Pour www' },
] as const;

export const YEAR_OPTIONS = [1, 2, 3, 5, 10] as const;

export const SUGGESTION_TLDS = ['.com', '.net', '.org', '.co', '.io', '.app', '.dev', '.company', '.community', '.computer'] as const;

export async function callRegistrar(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifie');
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/domain-registrar`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
    },
  );
  return res.json();
}

export async function callManageDomain(action: string, domain: string, pageId: string, extra?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifie');
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-domain`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action, domain, page_id: pageId, ...extra }),
    },
  );
  return res.json();
}

export function formatDuration(years: number): string {
  return years === 1 ? '1 an' : `${years} ans`;
}

export function safeFixed(value: unknown): string {
  if (value == null || typeof value !== 'number' || !isFinite(value)) return '—';
  return value.toFixed(2);
}

export function formatPrice(value: unknown, currency: string, years: number): string {
  const formatted = safeFixed(value);
  if (formatted === '—') return 'Prix indisponible';
  return `${formatted} ${currency} / ${formatDuration(years)}`;
}

export function extractBaseName(domain: string): string {
  const dot = domain.indexOf('.');
  return dot > 0 ? domain.substring(0, dot) : domain;
}

export function generateDomainSuggestions(input: string): string[] {
  const cleaned = input.trim().toLowerCase();
  if (!cleaned) return [];
  const baseName = extractBaseName(cleaned);
  const hasTld = cleaned.includes('.');
  const domains: string[] = [];
  if (hasTld) domains.push(cleaned);
  for (const tld of SUGGESTION_TLDS) {
    const d = baseName + tld;
    if (d !== cleaned) domains.push(d);
  }
  return [...new Set(domains)].slice(0, 10);
}

export async function checkDomainAvailability(domain: string, years: number, signal: AbortSignal): Promise<DomainResult> {
  try {
    const avail = await callRegistrar('check-availability', { domain });
    if (signal.aborted) return { domain, available: null, price: null, loading: false };
    if (avail.error) return { domain, available: null, price: null, loading: false, error: avail.error };
    if (!avail.available) return { domain, available: false, price: null, loading: false };
    const priceRes = await callRegistrar('get-price', { domain, years });
    if (signal.aborted) return { domain, available: true, price: null, loading: false };
    if (priceRes.yearsNotSupported) return { domain, available: true, price: null, loading: false, yearsWarning: priceRes.error || 'Duree non disponible' };
    if (priceRes.error) return { domain, available: true, price: null, loading: false, error: priceRes.error };
    return { domain, available: true, price: priceRes, loading: false };
  } catch {
    return { domain, available: null, price: null, loading: false, error: 'Erreur reseau' };
  }
}
