export interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  created_at: string;
  auth_user_id?: string | null;
}

export interface VendorComment {
  id: string;
  vendor_id: string;
  content: string;
  created_at: string;
}

export type ModalTab = 'informations' | 'mot-de-passe' | 'commentaires';
