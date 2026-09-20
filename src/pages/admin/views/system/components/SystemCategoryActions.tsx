import { Palette, FolderPlus, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';
import SystemActionsMenu, { type ActionDef } from './SystemActionsMenu';

interface Props {
  depth: number;
  name: string;
  tokens: ReturnType<typeof useThemeTokens>;
  onAddChild: () => void;
  onAddItem: () => void;
  onRename: () => void;
  onDelete: () => void;
  onOpenColorPicker: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/**
 * Actions d'une categorie ou d'un sous-groupe. Meme liste qu'avant, meme ordre : seule la coquille
 * du menu a ete extraite dans SystemActionsMenu, pour que les notes puissent avoir le meme.
 */
export default function SystemCategoryActions({ depth, name, tokens, onAddChild, onAddItem, onRename, onDelete, onOpenColorPicker, onMoveUp, onMoveDown }: Props) {
  const items: ActionDef[] = [];
  items.push({ label: 'Monter', icon: <ArrowUp className="w-4 h-4" />, action: onMoveUp });
  items.push({ label: 'Descendre', icon: <ArrowDown className="w-4 h-4" />, action: onMoveDown });
  if (depth < 2) {
    items.push({ label: depth === 0 ? 'Sous-categorie' : 'Fonctionnalite', icon: <FolderPlus className="w-4 h-4" />, action: onAddChild });
  }
  items.push({ label: 'Ajouter item', icon: <Plus className="w-4 h-4" />, action: onAddItem });
  items.push({ label: 'Couleur', icon: <Palette className="w-4 h-4" />, action: onOpenColorPicker });
  items.push({ label: 'Renommer', icon: <Pencil className="w-4 h-4" />, action: onRename });
  items.push({ label: 'Supprimer', icon: <Trash2 className="w-4 h-4" />, action: onDelete, danger: true });

  return <SystemActionsMenu name={name} items={items} tokens={tokens} />;
}
