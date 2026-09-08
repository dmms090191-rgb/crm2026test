import { ChevronUp, ChevronDown, GripVertical, EyeOff } from 'lucide-react';
import type { ActionDef } from '../ActionModal';
import type { ThemeTokens } from '../../../lib/themeTokensTypes';

interface Props {
  action: ActionDef;
  t: ThemeTokens;
  wide?: boolean;
  /** Mode gestion de visibilite (Talvex en Visu). Exclusif de `reordering`. */
  hiding?: boolean;
  onHide?: () => void;
  reordering: boolean;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  dragging: boolean;
  dropTarget: boolean;
}

/**
 * Carte d'action de la modale « Actions societe ».
 *
 * Purement visuelle : `action.onClick` est appele tel quel, jamais reecrit.
 * En reorganisation le clic metier est neutralise — c'est la seule difference
 * de comportement, et elle est voulue.
 */
export default function PremiumActionCard({
  action, t, wide, hiding, onHide, reordering, index, total,
  onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, dragging, dropTarget,
}: Props) {
  const c = action.color;
  const span = wide ? ' sm:col-span-2' : '';

  const skin: React.CSSProperties = {
    background: `linear-gradient(140deg, ${t.surface.secondary}, ${t.surface.secondary}99)`,
    border: `1px solid ${dropTarget ? `${c}66` : `${c}22`}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
  };

  const body = (
    <>
      <span
        className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{ background: `${c}14`, border: `1px solid ${c}2e`, color: c }}
      >
        {action.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold leading-tight truncate" style={{ color: c }}>
          {action.label}
        </span>
        {action.description && (
          // Pas de troncature : en demi-colonne le sous-texte passe a la ligne.
          // La grille egalise la hauteur des cartes d'une meme rangee.
          <span className="block text-[10.5px] leading-snug mt-0.5" style={{ color: t.text.tertiary }}>
            {action.description}
          </span>
        )}
      </span>
    </>
  );

  // Gestion de visibilite : la carte n'agit plus, elle porte un bouton
  // « Masquer ». Son onClick metier n'est ni appele ni modifie.
  if (hiding) {
    return (
      <div
        className={`group flex items-center gap-3 px-3 py-2.5 min-h-[58px] rounded-xl${span}`}
        style={{ ...skin, borderStyle: 'dashed', borderColor: `${c}3d` }}
      >
        {body}
        <button
          type="button"
          onClick={onHide}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold flex-shrink-0 transition-all active:scale-[0.97]"
          style={{ background: `${t.text.quaternary}14`, border: `1px solid ${t.text.quaternary}2e`, color: t.text.tertiary }}
        >
          <EyeOff className="w-3 h-3" />Masquer
        </button>
      </div>
    );
  }

  if (!reordering) {
    return (
      <button
        onClick={action.onClick}
        className={`group flex items-center gap-3 px-3 py-2.5 min-h-[58px] rounded-xl text-left transition-all duration-200 active:scale-[0.985]${span}`}
        style={skin}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = `${c}55`;
          e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 18px -8px ${c}55`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = `${c}22`;
          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.035)';
          e.currentTarget.style.transform = 'none';
        }}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDrop}
      className={`group flex items-center gap-3 px-3 py-2.5 min-h-[58px] rounded-xl select-none cursor-grab active:cursor-grabbing transition-opacity${span}`}
      style={{ ...skin, borderStyle: 'dashed', borderColor: `${c}3d`, opacity: dragging ? 0.35 : 1 }}
    >
      {body}
      <span className="flex items-center gap-0.5 flex-shrink-0">
        <button
          type="button" onClick={onMoveUp} disabled={index === 0} aria-label="Monter"
          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-20"
          style={{ background: t.surface.hover, color: t.text.tertiary }}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button" onClick={onMoveDown} disabled={index === total - 1} aria-label="Descendre"
          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-20"
          style={{ background: t.surface.hover, color: t.text.tertiary }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <GripVertical className="w-3.5 h-3.5 ml-0.5 opacity-30" style={{ color: t.text.tertiary }} />
      </span>
    </div>
  );
}
