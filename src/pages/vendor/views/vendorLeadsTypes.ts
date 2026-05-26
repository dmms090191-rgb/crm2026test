import type { ImpersonatedClientInfo } from '../../client/ClientDashboard';

export interface ImportedLead {
  id: string;
  data: Record<string, string>;
  imported_at: string;
  statut?: string;
  actif?: boolean;
  vendor_id?: string | null;
  ai_enabled?: boolean;
}

export interface StatutDef {
  id: string;
  nom: string;
  couleur: string;
}

export interface VendorChatLeadRef {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  tel?: string;
}

export interface VendorLeadsProps {
  vendorId: string | null;
  onOpenChat?: (lead: VendorChatLeadRef) => void;
  onConnectAsClient?: (client: ImpersonatedClientInfo) => void;
  onOpenRdv?: (lead: VendorChatLeadRef) => void;
}
