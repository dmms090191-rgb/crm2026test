import type { DragEvent } from 'react';
import type { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface AmeliorationCategory {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Amelioration {
  id: string;
  title: string;
  description: string;
  status: string;
  position: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AmeliorationRowProps {
  item: Amelioration;
  index: number;
  tokens: ReturnType<typeof useThemeTokens>;
  confirmDeleteId: string | null;
  isReordering: boolean;
  isFirst: boolean;
  isLast: boolean;
  isMoved: boolean;
  isDragging?: boolean;
  categories?: AmeliorationCategory[];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onTransfer?: (targetCategoryId: string) => void;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
