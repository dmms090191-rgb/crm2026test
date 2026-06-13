export interface CompanySuperAdmin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
  company_id: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  access_enabled: boolean;
}
