export interface ChecklistItem {
  id: string;
  page_key: string;
  section: string;
  label: string;
  checked: boolean;
  position: number;
  is_custom: boolean;
}

export const SECTIONS = [
  { key: 'ui', label: 'UI' },
  { key: 'fonctionnalites', label: 'Fonctionnalites' },
  { key: 'tests', label: 'Tests' },
  { key: 'ux-design', label: 'UX / Design' },
] as const;

export const SECTION_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  ui: { accent: '#22d3ee', bg: 'rgba(34,211,238,0.06)', border: 'rgba(34,211,238,0.15)' },
  fonctionnalites: { accent: '#34d399', bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.15)' },
  tests: { accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)' },
  'ux-design': { accent: '#f472b6', bg: 'rgba(244,114,182,0.06)', border: 'rgba(244,114,182,0.15)' },
};
