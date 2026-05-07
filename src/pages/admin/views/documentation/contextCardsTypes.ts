export interface ContextCard {
  id: string;
  title: string;
  content: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const ACCENT_COLOR = '#22d3ee';
export const ACCENT_BG = 'rgba(34,211,238,0.08)';
export const ACCENT_BORDER = 'rgba(34,211,238,0.2)';
