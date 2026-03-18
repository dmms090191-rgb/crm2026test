import { supabase } from './supabase';
import type { DocumentationExport } from './exportDocumentation';

export interface ImportResult {
  crm_documentation: { imported: number; skipped: number };
  doc_tab_labels: { imported: number; skipped: number };
  sidebar_order: { imported: number; skipped: number };
  crm_notes: { imported: number; skipped: number };
  crm_ideas: { imported: number; skipped: number };
  crm_context_cards: { imported: number; skipped: number };
}

export function validateExportFile(data: unknown): data is DocumentationExport {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (typeof d.exported_at !== 'string') return false;
  if (!Array.isArray(d.crm_documentation)) return false;
  if (!Array.isArray(d.doc_tab_labels)) return false;
  if (!Array.isArray(d.sidebar_order)) return false;
  if (!Array.isArray(d.crm_notes)) return false;
  if (!Array.isArray(d.crm_ideas)) return false;
  if (!Array.isArray(d.crm_context_cards)) return false;
  return true;
}

export async function importDocumentation(data: DocumentationExport): Promise<ImportResult> {
  const result: ImportResult = {
    crm_documentation: { imported: 0, skipped: 0 },
    doc_tab_labels: { imported: 0, skipped: 0 },
    sidebar_order: { imported: 0, skipped: 0 },
    crm_notes: { imported: 0, skipped: 0 },
    crm_ideas: { imported: 0, skipped: 0 },
    crm_context_cards: { imported: 0, skipped: 0 },
  };

  const [
    { data: existingDocs },
    { data: existingLabels },
    { data: existingOrder },
    { data: existingNotes },
    { data: existingIdeas },
    { data: existingCards },
  ] = await Promise.all([
    supabase.from('crm_documentation').select('tab_id'),
    supabase.from('doc_tab_labels').select('tab_id'),
    supabase.from('sidebar_order').select('group_id, item_key'),
    supabase.from('crm_notes').select('id'),
    supabase.from('crm_ideas').select('id'),
    supabase.from('crm_context_cards').select('id'),
  ]);

  const existingDocIds = new Set((existingDocs ?? []).map((r) => r.tab_id));
  const existingLabelIds = new Set((existingLabels ?? []).map((r) => r.tab_id));
  const existingOrderKeys = new Set((existingOrder ?? []).map((r) => `${r.group_id}::${r.item_key}`));
  const existingNoteIds = new Set((existingNotes ?? []).map((r) => r.id));
  const existingIdeaIds = new Set((existingIdeas ?? []).map((r) => r.id));
  const existingCardIds = new Set((existingCards ?? []).map((r) => r.id));

  for (const row of data.crm_documentation) {
    if (existingDocIds.has(row.tab_id)) {
      result.crm_documentation.skipped++;
    } else {
      const { error } = await supabase.from('crm_documentation').insert({ tab_id: row.tab_id, content: row.content });
      if (!error) result.crm_documentation.imported++;
      else result.crm_documentation.skipped++;
    }
  }

  for (const row of data.doc_tab_labels) {
    if (existingLabelIds.has(row.tab_id)) {
      result.doc_tab_labels.skipped++;
    } else {
      const { error } = await supabase.from('doc_tab_labels').insert({ tab_id: row.tab_id, label: row.label });
      if (!error) result.doc_tab_labels.imported++;
      else result.doc_tab_labels.skipped++;
    }
  }

  for (const row of data.sidebar_order) {
    const key = `${row.group_id}::${row.item_key}`;
    if (existingOrderKeys.has(key)) {
      result.sidebar_order.skipped++;
    } else {
      const { error } = await supabase.from('sidebar_order').insert({ group_id: row.group_id, item_key: row.item_key, position: row.position });
      if (!error) result.sidebar_order.imported++;
      else result.sidebar_order.skipped++;
    }
  }

  for (const row of data.crm_notes) {
    if (existingNoteIds.has(row.id)) {
      result.crm_notes.skipped++;
    } else {
      const { error } = await supabase.from('crm_notes').insert({
        id: row.id,
        title: row.title,
        content: row.content,
        note_date: row.note_date,
        time_start: row.time_start,
        time_end: row.time_end,
      });
      if (!error) result.crm_notes.imported++;
      else result.crm_notes.skipped++;
    }
  }

  for (const row of data.crm_ideas) {
    if (existingIdeaIds.has(row.id)) {
      result.crm_ideas.skipped++;
    } else {
      const { error } = await supabase.from('crm_ideas').insert({
        id: row.id,
        title: row.title,
        content: row.content,
        idea_date: row.idea_date,
        status: row.status,
        position: row.position,
      });
      if (!error) result.crm_ideas.imported++;
      else result.crm_ideas.skipped++;
    }
  }

  for (const row of data.crm_context_cards) {
    if (existingCardIds.has(row.id)) {
      result.crm_context_cards.skipped++;
    } else {
      const { error } = await supabase.from('crm_context_cards').insert({
        id: row.id,
        title: row.title,
        content: row.content,
        position: row.position,
      });
      if (!error) result.crm_context_cards.imported++;
      else result.crm_context_cards.skipped++;
    }
  }

  return result;
}
