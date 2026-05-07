export interface ImportedLead {
  id: string;
  data: Record<string, string>;
  imported_at: string;
  statut?: string;
  actif?: boolean;
  vendor_id?: string | null;
}

export interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ImpersonatedClient {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export interface ChatLead {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  tel?: string;
}

export interface StatutDef {
  id: string;
  nom: string;
  couleur: string;
}
