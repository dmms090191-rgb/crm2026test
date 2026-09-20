import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';
import SystemActionsMenu, { type ActionDef } from './SystemActionsMenu';

interface Props {
  title: string;
  tokens: ReturnType<typeof useThemeTokens>;
  /** Premiere note de son groupe : rien a monter. */
  isFirst: boolean;
  /** Derniere note de son groupe : rien a descendre. */
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: () => void;
  onDelete: () => void;
}

/**
 * Actions d'une note. Meme menu « ... » que les categories, TOUJOURS visible : la corbeille
 * d'avant n'apparaissait qu'au survol de la ligne (opacity-0 sous sm:), ce qui la rendait
 * introuvable a la souris comme au clavier.
 */
export default function SystemItemActions({ title, tokens, isFirst, isLast, onMoveUp, onMoveDown, onRename, onDelete }: Props) {
  const items: ActionDef[] = [];
  if (!isFirst) items.push({ label: 'Monter', icon: <ArrowUp className="w-4 h-4" />, action: onMoveUp });
  if (!isLast) items.push({ label: 'Descendre', icon: <ArrowDown className="w-4 h-4" />, action: onMoveDown });
  items.push({ label: 'Modifier', icon: <Pencil className="w-4 h-4" />, action: onRename });
  items.push({ label: 'Supprimer', icon: <Trash2 className="w-4 h-4" />, action: onDelete, danger: true });

  return <SystemActionsMenu name={title} items={items} tokens={tokens} />;
}
