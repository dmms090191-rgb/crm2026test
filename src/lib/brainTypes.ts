export interface BrainService {
  name: string;
  description: string;
  price: string;
}

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export type WeekSchedule = Record<string, DaySchedule>;

export interface AppointmentRules {
  duration_minutes: number;
  buffer_minutes: number;
  max_advance_days: number;
  min_advance_hours: number;
  max_per_day: number;
}

export interface CrmRules {
  default_status: string;
  auto_assign_vendor: boolean;
  require_phone: boolean;
  require_email: boolean;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface OfficialResponse {
  question: string;
  answer: string;
}

export interface KnowledgeSection {
  key: string;
  title: string;
  icon: string;
  content: string;
  position: number;
}

export type AiScope = 'platform' | 'company';

export interface AiCompanyBrain {
  id: string;
  ai_scope: AiScope;
  company_id: string | null;
  business_context_text: string;
  company_name: string;
  company_description: string;
  business_sector: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  language: string;
  services: BrainService[];
  opening_hours: WeekSchedule;
  appointment_rules: AppointmentRules;
  crm_rules: CrmRules;
  faq: FaqEntry[];
  official_responses: OfficialResponse[];
  knowledge_sections: KnowledgeSection[];
  tone: string;
  allowed_tools: string[];
  forbidden_actions: string[];
  sensitive_requests: string[];
  created_at: string;
  updated_at: string;
}

export const DAYS_OF_WEEK = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
] as const;

export const AVAILABLE_TOOLS = [
  { id: 'get_company_context', label: 'Contexte entreprise', description: "L'IA peut lire les informations de cette societe." },
  { id: 'get_available_slots', label: 'Creneaux disponibles', description: "L'IA peut consulter les creneaux disponibles pour proposer un rendez-vous." },
  { id: 'get_lead_context', label: 'Contexte lead', description: "L'IA peut lire les informations d'un lead/client de cette societe." },
  { id: 'send_message', label: 'Envoyer message', description: "L'IA peut preparer ou envoyer un message." },
] as const;

export function defaultBrain(companyId: string | null, scope: AiScope = 'company'): Omit<AiCompanyBrain, 'id' | 'created_at' | 'updated_at'> {
  const schedule: WeekSchedule = {};
  for (const { key } of DAYS_OF_WEEK) {
    schedule[key] = key === 'samedi' || key === 'dimanche'
      ? { open: '09:00', close: '17:00', closed: true }
      : { open: '09:00', close: '18:00', closed: false };
  }
  return {
    ai_scope: scope,
    company_id: companyId,
    business_context_text: '',
    company_name: '',
    company_description: '',
    business_sector: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    language: 'fr',
    services: [],
    opening_hours: schedule,
    appointment_rules: { duration_minutes: 30, buffer_minutes: 15, max_advance_days: 30, min_advance_hours: 2, max_per_day: 8 },
    crm_rules: { default_status: 'Nouveau', auto_assign_vendor: false, require_phone: false, require_email: true },
    faq: [],
    official_responses: [],
    knowledge_sections: [],
    tone: '',
    allowed_tools: ['get_company_context', 'get_available_slots'],
    forbidden_actions: [],
    sensitive_requests: [],
  };
}
