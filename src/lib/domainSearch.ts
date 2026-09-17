import { supabase } from './supabase';
import { parseAvailabilityResponse, unknownResult, type DomainAvailabilityResult } from './domainSearchModel';

/*
 * Recherche de disponibilite : navigateur -> serveur Talvex (hostinger-domains) -> Hostinger.
 * Le navigateur n'appelle jamais Hostinger et ne connait aucun jeton fournisseur.
 * Lecture seule : aucune commande, aucune intention d'achat, aucun rattachement.
 */
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hostinger-domains`;

export async function checkDomainAvailability(companyId: string, domain: string, signal?: AbortSignal): Promise<DomainAvailabilityResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return unknownResult('unauthenticated');
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'check_availability', company_id: companyId, domain }),
      signal,
    });
    const body = await res.json().catch(() => null);
    return parseAvailabilityResponse(res.status, body);
  } catch (error) {
    if (signal?.aborted) throw error;
    return unknownResult('network');
  }
}
