import type { ImportedBackup } from './types';

export type ParseResult =
  | { ok: true; backup: ImportedBackup }
  | { ok: false; error: string };

export function parseBackupJson(file: File, raw: unknown): ParseResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Fichier JSON invalide : contenu non reconnu.' };
  }
  const obj = raw as Record<string, unknown>;
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  const data = obj.data as Record<string, unknown> | undefined;

  if (!metadata) {
    return { ok: false, error: 'Ce fichier ne contient pas de champ "metadata". Ce n\'est pas une sauvegarde CRM valide.' };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Ce fichier ne contient pas de champ "data". Ce n\'est pas une sauvegarde CRM valide.' };
  }
  if (!metadata.exported_tables || !Array.isArray(metadata.exported_tables)) {
    return { ok: false, error: 'Le champ "metadata.exported_tables" est manquant ou invalide.' };
  }
  if (!metadata.counts || typeof metadata.counts !== 'object') {
    return { ok: false, error: 'Le champ "metadata.counts" est manquant ou invalide.' };
  }

  return {
    ok: true,
    backup: {
      filename: file.name,
      metadata: {
        date_export: (metadata.date_export as string) ?? '',
        version_crm: (metadata.version_crm as string) ?? '',
        version_schema: (metadata.version_schema as string) ?? '',
        exported_tables: metadata.exported_tables as string[],
        failed_tables: (metadata.failed_tables as string[]) ?? [],
        counts: metadata.counts as Record<string, number>,
        security_notes: metadata.security_notes as ImportedBackup['metadata']['security_notes'],
      },
      data: data as ImportedBackup['data'],
    },
  };
}
