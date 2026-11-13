import type { ImpersonatedClientInfo } from '../../client/ClientDashboard';

export interface ImportedLead {
  id: string;
  data: Record<string, string>;
  /**
   * La colonne PLATE de `leads`, desormais demandee par les requetes et lue en priorite.
   *
   * Elle existait deja en base et etait remplie pour 30 des 33 leads, mais aucune requete du
   * CRM ne la demandait : les deux listes lisaient `data['Telephone']`, absent pour 20 leads
   * sur 33. Voir `telDuLead` dans `lib/formatTel.ts` pour la cascade et le releve.
   */
  telephone?: string | null;
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
