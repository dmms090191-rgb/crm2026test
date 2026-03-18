import { supabase } from './supabase';

export interface DocumentationExport {
  version: 1;
  exported_at: string;
  crm_documentation: { tab_id: string; content: string }[];
  doc_tab_labels: { tab_id: string; label: string }[];
  sidebar_order: { group_id: string; item_key: string; position: number }[];
  crm_notes: {
    id: string;
    title: string;
    content: string;
    note_date: string;
    time_start: string;
    time_end: string;
    created_at: string;
    updated_at: string;
  }[];
  crm_ideas: {
    id: string;
    title: string;
    content: string;
    idea_date: string;
    status: string;
    position: number;
    created_at: string;
    updated_at: string;
  }[];
  crm_context_cards: {
    id: string;
    title: string;
    content: string;
    position: number;
    created_at: string;
    updated_at: string;
  }[];
}

export async function exportDocumentation(): Promise<DocumentationExport> {
  const [
    { data: docs },
    { data: labels },
    { data: order },
    { data: notes },
    { data: ideas },
    { data: cards },
  ] = await Promise.all([
    supabase.from('crm_documentation').select('tab_id, content'),
    supabase.from('doc_tab_labels').select('tab_id, label'),
    supabase.from('sidebar_order').select('group_id, item_key, position').order('position', { ascending: true }),
    supabase.from('crm_notes').select('*').order('note_date', { ascending: false }),
    supabase.from('crm_ideas').select('*').order('position', { ascending: true }),
    supabase.from('crm_context_cards').select('*').order('position', { ascending: true }),
  ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    crm_documentation: (docs ?? []).map((d) => ({ tab_id: d.tab_id, content: d.content })),
    doc_tab_labels: (labels ?? []).map((l) => ({ tab_id: l.tab_id, label: l.label })),
    sidebar_order: (order ?? []).map((o) => ({ group_id: o.group_id, item_key: o.item_key, position: o.position })),
    crm_notes: (notes ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      note_date: n.note_date,
      time_start: n.time_start,
      time_end: n.time_end,
      created_at: n.created_at,
      updated_at: n.updated_at,
    })),
    crm_ideas: (ideas ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      content: i.content,
      idea_date: i.idea_date,
      status: i.status,
      position: i.position,
      created_at: i.created_at,
      updated_at: i.updated_at,
    })),
    crm_context_cards: (cards ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      position: c.position,
      created_at: c.created_at,
      updated_at: c.updated_at,
    })),
  };
}

export function downloadJson(data: DocumentationExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crm-documentation-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
