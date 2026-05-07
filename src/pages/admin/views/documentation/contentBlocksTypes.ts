export interface ContentBlock {
  id: string;
  title: string;
  utility: string;
  position: number;
  created_at: string;
}

export interface BlockTask {
  id: string;
  block_id: string;
  text: string;
  status: 'todo' | 'doing' | 'done';
  position: number;
  created_at: string;
}

export interface BlockInfo {
  id: string;
  block_id: string;
  text: string;
  position: number;
  created_at: string;
}

export type TaskStatus = BlockTask['status'];

export const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; bg: string; border: string; accent: string }> = {
  todo: { label: 'A faire', dot: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.30)', accent: '#facc15' },
  doing: { label: 'En cours', dot: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.30)', accent: '#38bdf8' },
  done: { label: 'Termine', dot: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.30)', accent: '#4ade80' },
};

export const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done'];
