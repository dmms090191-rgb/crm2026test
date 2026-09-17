import { supabase } from './supabase';
import type { SiteDomainRecord } from './siteDomainTypes';

/*
 * Domaines de l'entreprise ciblee (source de verite : site_domains).
 * Lecture uniquement via la RPC get_site_domains : droit verifie cote serveur (can_manage_company),
 * informations metier seulement. Aucune ecriture depuis le navigateur.
 */
export async function getSiteDomains(companyId: string): Promise<SiteDomainRecord[]> {
  const { data, error } = await supabase.rpc('get_site_domains', { p_company_id: companyId });
  if (error) throw error;
  return (data ?? []) as SiteDomainRecord[];
}
