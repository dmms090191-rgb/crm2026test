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

/*
 * « Mes domaines enregistres » : lecture et masquage, uniquement via RPC (droit verifie cote serveur).
 * Masquer ne touche jamais site_domains : ni deconnexion, ni DNS, ni hebergeur.
 */
export async function getRegisteredDomains(companyId: string): Promise<unknown[]> {
  const { data, error } = await supabase.rpc('get_site_domain_list', { p_company_id: companyId });
  if (error) throw error;
  return (data ?? []) as unknown[];
}

export async function hideRegisteredDomain(companyId: string, domain: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('hide_site_domain_from_list', { p_company_id: companyId, p_domain: domain });
  if (error) throw error;
  return data;
}

/* Nombre de domaines masques, ou null si l'acces est refuse (interprete par toHideAllOutcome). */
export async function hideAllRegisteredDomains(companyId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('hide_all_site_domains_from_list', { p_company_id: companyId });
  if (error) throw error;
  return data;
}
