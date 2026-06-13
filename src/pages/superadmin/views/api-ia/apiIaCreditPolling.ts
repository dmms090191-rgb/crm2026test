import { supabase } from '../../../../lib/supabase';
import type { CreditInfo } from './apiIaTypes';

export interface ProviderBalanceResult {
  provider?: string;
  total_balance?: string | null;
  currency?: string;
  status: string;
  error?: string;
  checked_at: string;
  key_configured?: boolean;
}

export async function fetchProviderBalance(provider: string): Promise<ProviderBalanceResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { status: 'error', error: 'Non authentifie', checked_at: new Date().toISOString() };
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-provider-status?provider=${encodeURIComponent(provider)}`,
    { headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } },
  );
  return res.json();
}

export function parseCreditResult(result: ProviderBalanceResult, provider: string): CreditInfo {
  if (result.status === 'key_missing') {
    return { credit: 'Cle manquante', checkedAt: result.checked_at, status: null };
  }
  if (result.status === 'error') {
    return { credit: 'Erreur verification', checkedAt: result.checked_at, status: null };
  }

  if (provider === 'recraft') {
    const credit = result.total_balance != null
      ? `${result.total_balance} unites API`
      : 'Non disponible via API';
    return {
      credit,
      checkedAt: result.checked_at,
      status: result.status === 'available' ? 'active' : 'inactive',
    };
  }

  if (provider === 'stability') {
    const credit = result.total_balance != null
      ? `${result.total_balance} credits`
      : 'Non disponible via API';
    return {
      credit,
      checkedAt: result.checked_at,
      status: result.status === 'available' ? 'active' : 'inactive',
    };
  }

  const symbol = result.currency === 'CNY' ? '\u00a5' : '$';
  return {
    credit: `${result.total_balance} ${symbol}`,
    checkedAt: result.checked_at,
    status: result.status === 'available' ? 'active' : 'inactive',
  };
}
