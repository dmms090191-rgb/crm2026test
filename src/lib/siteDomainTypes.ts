/*
 * Types des domaines (source de verite : site_domains, lus via la RPC get_site_domains).
 * Informations metier uniquement : jamais prix, identifiants fournisseur, commande ni notes.
 */
export type DomainRegistrationStatus =
  | 'pending' | 'registered' | 'failed' | 'expired' | 'suspended' | 'transfer_out' | 'released' | 'external';

export type DomainConnectionStatus =
  | 'not_started' | 'dns_configuring' | 'dns_failed' | 'verifying' | 'verification_failed' | 'active' | 'disconnected';

/* Informations metier renvoyees par get_site_domains (jamais prix, identifiants fournisseur ni notes). */
export interface SiteDomainRecord {
  id: string;
  domain_name: string;
  is_primary: boolean;
  provider: 'hostinger' | 'external';
  registration_status: DomainRegistrationStatus;
  connection_status: DomainConnectionStatus;
  auto_renew: boolean | null;
  registered_at: string | null;
  expires_at: string | null;
  verified_at: string | null;
  activated_at: string | null;
  renewal_due: boolean;
  updated_at: string;
}
