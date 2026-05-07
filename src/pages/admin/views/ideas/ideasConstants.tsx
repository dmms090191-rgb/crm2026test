import { Clock, CheckCircle2 } from 'lucide-react';

export type IdeaStatus = 'todo' | 'done';

export interface Idea {
  id: string;
  title: string;
  content: string;
  idea_date: string;
  status: IdeaStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export const STATUS_CONFIG: Record<IdeaStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  todo: {
    label: 'À faire',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.2)',
    icon: <Clock className="w-3 h-3" />,
  },
  done: {
    label: 'Implémenté',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.2)',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

export const STATUS_CYCLE: IdeaStatus[] = ['todo', 'done'];

export function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
