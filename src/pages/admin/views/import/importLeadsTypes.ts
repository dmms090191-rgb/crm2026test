import type { ImportMode } from './ImportModeSelector';

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
  inserted: number;
  updated: number;
  ignored: number;
  errors: number;
  mode: ImportMode;
  errorCsvData: string | null;
  fileName: string;
}
