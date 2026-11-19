import type { ModeImport } from '../../../../lib/importOnglet';

export interface ImportRecord {
  id: string;
  file_name: string;
  lead_count: number;
  new_leads_count: number;
  duplicates_count: number;
  errors_count: number;
  import_mode: string;
  columns: string[];
  imported_at: string;
  source_file: string | null;
}

export type Phase = 'upload' | 'analyzing' | 'preview' | 'importing' | 'done';

export interface ImportResultState {
  /** Leads crees. */
  inserted: number;
  /** Doublons completes ou mis a jour. */
  updated: number;
  /** Doublons laisses tels quels (mais rattaches a l'onglet). */
  ignored: number;
  /** Lignes refusees (apercu + base). */
  errors: number;
  /** Leads rattaches a l'onglet. */
  lies: number;
  /** Doublons dont l'email du fichier differe de celui en base (jamais remplace). */
  conflits: number;
  /** Colonnes masquees de l'onglet, reaffichees parce que le fichier les remplit. */
  reaffichees: string[];
  interrompu: string | null;
  mode: ModeImport;
  errorCsvData: string | null;
  fileName: string;
  ongletId: string;
  ongletNom: string;
}
