import type { Vendor } from './views/ListeVendeurs';
import type { ImpersonatedClient } from './views/Crm';

export interface ImpersonatedAdminInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  pin?: string;
  company_id?: string;
}

export interface AdminDashboardProps {
  onLogout: () => void;
  onConnectAsVendor?: (vendor: Vendor) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  impersonatedAdmin?: ImpersonatedAdminInfo | null;
  onBackToSuperAdmin?: () => void;
  backLabel?: string;
  isSAViewing?: boolean;
}

export type ActiveView =
  | 'vue-ensemble'
  | 'site'
  | 'logo'
  | 'info-admin'
  | 'inscription'
  | 'import-leads'
  | 'ajouter-leads'
  | 'crm'
  | 'ajouter-vendeur'
  | 'liste-vendeurs'
  | 'chat-super-admin'
  | 'chat-client'
  | 'chat-vendeur'
  | 'agenda'
  | 'agenda-equipe'
  | 'propositions-rdv'
  | 'statuts'
  | 'documentation-crm'
  | 'system'
  | 'sauvegarde'
  | 'cerveau-ia'
  | 'application'
  | 'tuto'
  | 'editeur-ia'
  | 'calquer-logo';
