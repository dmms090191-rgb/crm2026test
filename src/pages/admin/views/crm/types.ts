export interface ImportedLead {
  id: string;
  data: Record<string, string>;
  imported_at: string;
  statut?: string;
  actif?: boolean;
  vendor_id?: string | null;
  ai_enabled?: boolean;
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

/* ── Column definitions ── */

import { Hash, User, Mail, Phone, CalendarDays, Signal, Settings, Lock, Bot, UserCheck } from 'lucide-react';
import type { ColumnDef } from '../../../../components/table/useColumnOrder';

export const CRM_COLUMNS = [
  { key: 'hash', label: '#' },
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prenom' },
  { key: 'email', label: 'Email' },
  { key: 'telephone', label: 'Telephone' },
  { key: 'date_ajout', label: "Date d'ajout" },
  { key: 'statut', label: 'Statut', required: true },
  { key: 'actions', label: 'Actions', required: true },
  { key: 'acces', label: 'Acces', required: true },
  { key: 'ia', label: 'IA', required: true },
  { key: 'vendeur', label: 'Vendeur' },
];

export const VENDOR_BASE_COLUMNS: ColumnDef[] = [
  { key: 'hash', label: '#' },
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prenom' },
  { key: 'email', label: 'Email' },
  { key: 'telephone', label: 'Telephone' },
  { key: 'date_ajout', label: "Date d'ajout" },
  { key: 'statut', label: 'Statut', required: true },
  { key: 'actions', label: 'Actions', required: true },
  { key: 'acces', label: 'Acces', required: true },
  { key: 'ia', label: 'IA', required: true },
];

export const CRM_HEADER_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  hash: Hash, nom: User, prenom: User, email: Mail, telephone: Phone,
  date_ajout: CalendarDays, statut: Signal, actions: Settings, acces: Lock, ia: Bot, vendeur: UserCheck,
};
