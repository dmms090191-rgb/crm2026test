import { supabase } from './supabase';
import { parseSearchResponse, unknownPage, type SearchPage } from './domainSearchModel';
import { parseExtensionsResponse, unknownExtensions, type ExtensionCatalog } from './domainFilterModel';

/*
 * Recherche multi-extensions : navigateur -> serveur Talvex (hostinger-domains) -> Hostinger.
 * Le navigateur n'appelle jamais Hostinger et ne connait aucun jeton fournisseur.
 * Lecture seule : aucune commande, aucune intention d'achat, aucun rattachement.
 * offset = 0 : extensions principales ; ensuite, pages suivantes (« Voir plus d'extensions »).
 */
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hostinger-domains`;

type Posted = { status: number; body: unknown } | 'unauthenticated' | 'network';

export async function postToServer(payload: Record<string, unknown>, signal?: AbortSignal): Promise<Posted> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 'unauthenticated';
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
      signal,
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch (error) {
    if (signal?.aborted) throw error;
    return 'network';
  }
}

export async function searchDomains(companyId: string, query: string, offset: number, signal?: AbortSignal): Promise<SearchPage> {
  const posted = await postToServer({ action: 'search_domains', company_id: companyId, query, offset }, signal);
  if (typeof posted === 'string') return unknownPage(posted, offset);
  return parseSearchResponse(posted.status, posted.body, offset);
}

/* Filtre : verification des SEULES extensions choisies (10 au plus par appel) pour le nom deja recherche. */
export async function searchSelectedExtensions(companyId: string, query: string, tlds: string[], signal?: AbortSignal): Promise<SearchPage> {
  const posted = await postToServer({ action: 'search_domains', company_id: companyId, query, tlds }, signal);
  if (typeof posted === 'string') return unknownPage(posted, 0);
  return parseSearchResponse(posted.status, posted.body, 0);
}

/* Filtre : noms des extensions vendues (catalogue serveur en cache ; aucun prix). */
export async function listSearchExtensions(companyId: string, signal?: AbortSignal): Promise<ExtensionCatalog> {
  const posted = await postToServer({ action: 'search_extensions', company_id: companyId }, signal);
  if (typeof posted === 'string') return unknownExtensions(posted);
  return parseExtensionsResponse(posted.status, posted.body);
}
