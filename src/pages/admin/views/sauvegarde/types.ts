export interface ImportedBackup {
  filename: string;
  metadata: {
    date_export: string;
    version_crm: string;
    version_schema: string;
    exported_tables: string[];
    failed_tables: { table: string; error: string }[];
    counts: Record<string, number>;
    security_notes?: string;
  };
  data: Record<string, unknown[]>;
}
