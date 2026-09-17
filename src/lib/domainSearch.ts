import { supabase } from './supabase';
import { parseSearchResponse, unknownPage, type SearchPage } from './domainSearchModel';

/*
 * Recherche multi-extensions : navigateur -> serveur Talvex (hostinger-domains) -> Hostinger.
 * Le navigateur n'appelle jamais Hostinger et ne connait aucun jeton fournisseur.
 * Lecture seule : aucune commande, aucune intention d'achat, aucun rattachement.
 * offset = 0 : extensions principales ; ensuite, pages suivantes (« Voir plus d'extensions »).
 */
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hostinger-domains`;

export async function searchDomains(companyId: string, query: string, offset: number, signal?: AbortSignal): Promise<SearchPage> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return unknownPage('unauthenticated', offset);
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'search_domains', company_id: companyId, query, offset }),
      signal,
    });
    const body = await res.json().catch(() => null);
    return parseSearchResponse(res.status, body, offset);
  } catch (error) {
    if (signal?.aborted) throw error;
    return unknownPage('network', offset);
  }
}
