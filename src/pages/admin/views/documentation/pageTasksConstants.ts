export interface Task {
  id: string;
  page_key: string;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  created_at: string;
}

export type TaskStatus = Task['status'];

export interface NewTaskForm {
  title: string;
  description: string;
  status: TaskStatus;
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; bg: string; border: string; accent: string }> = {
  todo: {
    label: 'A faire',
    dot: '#eab308',
    bg: 'rgba(234,179,8,0.06)',
    border: 'rgba(234,179,8,0.18)',
    accent: '#eab308',
  },
  doing: {
    label: 'En cours',
    dot: '#0ea5e9',
    bg: 'rgba(14,165,233,0.06)',
    border: 'rgba(14,165,233,0.18)',
    accent: '#0ea5e9',
  },
  done: {
    label: 'Termine',
    dot: '#22c55e',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.18)',
    accent: '#22c55e',
  },
};

export const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done'];
