import { supabase } from './supabase';
import type { DocumentationExport } from './exportDocumentation';

export interface ImportResult {
  crm_documentation: { imported: number; skipped: number };
  doc_tab_labels: { imported: number; skipped: number };
  sidebar_order: { imported: number; skipped: number };
  crm_notes: { imported: number; skipped: number };
  crm_ideas: { imported: number; skipped: number };
  crm_context_cards: { imported: number; skipped: number };
  crm_amelioration_categories: { imported: number; skipped: number };
  crm_ameliorations: { imported: number; skipped: number };
}

export function validateExportFile(data: unknown): data is DocumentationExport {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1 && d.version !== 2) return false;
  if (typeof d.exported_at !== 'string') return false;
  if (!Array.isArray(d.crm_documentation)) return false;
  if (!Array.isArray(d.doc_tab_labels)) return false;
  if (!Array.isArray(d.sidebar_order)) return false;
  if (!Array.isArray(d.crm_notes)) return false;
  if (!Array.isArray(d.crm_ideas)) return false;
  if (!Array.isArray(d.crm_context_cards)) return false;
  return true;
}

function normalizeV1(data: unknown): DocumentationExport {
  const d = data as DocumentationExport & { version: 1 | 2 };
  return {
    ...d,
    version: 2,
    crm_amelioration_categories: d.crm_amelioration_categories ?? [],
    crm_ameliorations: d.crm_ameliorations ?? [],
  };
}

export async function importDocumentation(raw: DocumentationExport, companyId?: string | null): Promise<ImportResult> {
  const data = normalizeV1(raw);

  const result: ImportResult = {
    crm_documentation: { imported: 0, skipped: 0 },
    doc_tab_labels: { imported: 0, skipped: 0 },
    sidebar_order: { imported: 0, skipped: 0 },
    crm_notes: { imported: 0, skipped: 0 },
    crm_ideas: { imported: 0, skipped: 0 },
    crm_context_cards: { imported: 0, skipped: 0 },
    crm_amelioration_categories: { imported: 0, skipped: 0 },
    crm_ameliorations: { imported: 0, skipped: 0 },
  };

  // crm_documentation - upsert by tab_id
  for (const row of data.crm_documentation) {
    const { error } = await supabase
      .from('crm_documentation')
      .upsert({ tab_id: row.tab_id, content: row.content, ...(companyId ? { company_id: companyId } : {}) }, { onConflict: 'tab_id' });
    if (!error) result.crm_documentation.imported++;
    else result.crm_documentation.skipped++;
  }

  // doc_tab_labels - upsert by tab_id
  for (const row of data.doc_tab_labels) {
    const { error } = await supabase
      .from('doc_tab_labels')
      .upsert({ tab_id: row.tab_id, label: row.label, ...(companyId ? { company_id: companyId } : {}) }, { onConflict: 'tab_id' });
    if (!error) result.doc_tab_labels.imported++;
    else result.doc_tab_labels.skipped++;
  }

  // sidebar_order - replace all docs entries for consistent ordering
  if (data.sidebar_order.length > 0) {
    await supabase.from('sidebar_order').delete().eq('group_id', 'docs');
    const rows = companyId
      ? data.sidebar_order.map(r => ({ ...r, company_id: companyId }))
      : data.sidebar_order;
    const { error } = await supabase.from('sidebar_order').insert(rows);
    if (!error) result.sidebar_order.imported = data.sidebar_order.length;
    else result.sidebar_order.skipped = data.sidebar_order.length;
  }

  // crm_notes - upsert by id
  for (const row of data.crm_notes) {
    const { error } = await supabase.from('crm_notes').upsert({
      id: row.id,
      title: row.title,
      content: row.content,
      note_date: row.note_date,
      time_start: row.time_start,
      time_end: row.time_end,
      ...(companyId ? { company_id: companyId } : {}),
    }, { onConflict: 'id' });
    if (!error) result.crm_notes.imported++;
    else result.crm_notes.skipped++;
  }

  // crm_ideas - upsert by id
  for (const row of data.crm_ideas) {
    const { error } = await supabase.from('crm_ideas').upsert({
      id: row.id,
      title: row.title,
      content: row.content,
      idea_date: row.idea_date,
      status: row.status,
      position: row.position,
    }, { onConflict: 'id' });
    if (!error) result.crm_ideas.imported++;
    else result.crm_ideas.skipped++;
  }

  // crm_context_cards - upsert by id
  for (const row of data.crm_context_cards) {
    const { error } = await supabase.from('crm_context_cards').upsert({
      id: row.id,
      title: row.title,
      content: row.content,
      position: row.position,
    }, { onConflict: 'id' });
    if (!error) result.crm_context_cards.imported++;
    else result.crm_context_cards.skipped++;
  }

  // crm_amelioration_categories - upsert BEFORE ameliorations (FK dependency)
  for (const row of data.crm_amelioration_categories) {
    const { error } = await supabase.from('crm_amelioration_categories').upsert({
      id: row.id,
      name: row.name,
      position: row.position,
    }, { onConflict: 'id' });
    if (!error) result.crm_amelioration_categories.imported++;
    else result.crm_amelioration_categories.skipped++;
  }

  // crm_ameliorations - upsert by id
  for (const row of data.crm_ameliorations) {
    const { error } = await supabase.from('crm_ameliorations').upsert({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      category_id: row.category_id,
      position: row.position,
    }, { onConflict: 'id' });
    if (!error) result.crm_ameliorations.imported++;
    else result.crm_ameliorations.skipped++;
  }

  return result;
}
