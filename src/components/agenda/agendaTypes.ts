export interface RdvProposal {
  id: string;
  vendor_id?: string | null;
  lead_id?: string | null;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  proposed_date: string;
  proposed_time: string;
  notes: string;
  status: string;
  motif: string;
  description: string;
  created_by_role: string;
  created_by_id?: string | null;
  target_role: string;
  responded_at?: string | null;
  responded_by?: string | null;
  created_at: string;
  vendor_name?: string;
  appointment_utc?: string | null;
  source_timezone?: string;
  created_by_name?: string;
  treated_at?: string | null;
}

export const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending:   { label: 'En attente', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.25)',  dot: '#fbbf24' },
  confirmed: { label: 'Confirmé',   color: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.25)',  dot: '#34d399' },
  cancelled: { label: 'Annulé',     color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', dot: '#f87171' },
  done:      { label: 'Terminé',    color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', dot: '#94a3b8' },
};

export const DAYS_SHORT  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const MONTHS      = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
export const HOURS       = Array.from({ length: 24 }, (_, i) => i);

export type ViewMode = 'month' | 'week' | 'day';
