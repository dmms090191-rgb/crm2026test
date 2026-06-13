import { Paintbrush, Type, RotateCcw } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import type { EditorPanelTokens } from './editorPanelTheme';

export type TypoTarget = 'categories' | 'items' | 'rdr' | null;

interface Props {
  ctx: ReturnType<typeof useEditorMode>;
  pt: EditorPanelTokens;
  typoTarget: TypoTarget;
  onTypoTargetChange: (target: TypoTarget) => void;
}

export default function EditorTextesContent({ ctx, pt, typoTarget, onTypoTargetChange }: Props) {
  const isAllCats = ctx.textTarget?.kind === 'all-categories';
  const isAllItems = ctx.textTarget?.kind === 'all-items';
  const hasCatFont = !!ctx.typographyOverrides.categoryFont;
  const hasItemFont = !!ctx.typographyOverrides.itemFont;
  const hasRdrFont = !!ctx.typographyOverrides.rdrFont;

  return (
    <div className="px-2 py-1 flex flex-col gap-1">
      <div className="px-2.5 py-2">
        <span
          className="text-[10px] font-extrabold uppercase tracking-[0.15em]"
          style={{ color: pt.text.secondary }}
        >
          Couleurs
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-1">
        <ActionButton
          active={isAllCats}
          onClick={() => ctx.setTextTarget(isAllCats ? null : { kind: 'all-categories' })}
          label="Colorer toutes les categories"
          icon={<Paintbrush className="w-3.5 h-3.5 flex-shrink-0" />}
          pt={pt}
        />
        <ActionButton
          active={isAllItems}
          onClick={() => ctx.setTextTarget(isAllItems ? null : { kind: 'all-items' })}
          label="Colorer tous les onglets"
          icon={<Paintbrush className="w-3.5 h-3.5 flex-shrink-0" />}
          pt={pt}
        />
      </div>

      <div className="mx-2 my-2">
        <div className="h-px" style={{ background: pt.surface.border }} />
      </div>

      <div className="px-2.5 pb-1">
        <span
          className="text-[10px] font-extrabold uppercase tracking-[0.15em]"
          style={{ color: pt.text.secondary }}
        >
          Typographie
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-1">
        <ActionButton
          active={typoTarget === 'categories'}
          onClick={() => onTypoTargetChange(typoTarget === 'categories' ? null : 'categories')}
          label="Typographie categories"
          icon={<Type className="w-3.5 h-3.5 flex-shrink-0" />}
          pt={pt}
          badge={hasCatFont ? ctx.typographyOverrides.categoryFont! : undefined}
        />
        <ActionButton
          active={typoTarget === 'items'}
          onClick={() => onTypoTargetChange(typoTarget === 'items' ? null : 'items')}
          label="Typographie onglets"
          icon={<Type className="w-3.5 h-3.5 flex-shrink-0" />}
          pt={pt}
          badge={hasItemFont ? ctx.typographyOverrides.itemFont! : undefined}
        />
        <ActionButton
          active={typoTarget === 'rdr'}
          onClick={() => onTypoTargetChange(typoTarget === 'rdr' ? null : 'rdr')}
          label="Typographie RDR"
          icon={<Type className="w-3.5 h-3.5 flex-shrink-0" />}
          pt={pt}
          badge={hasRdrFont ? ctx.typographyOverrides.rdrFont! : undefined}
        />
        <ActionButton
          active={false}
          onClick={() => {
            if (typoTarget === 'categories') ctx.resetTypography('categories');
            else if (typoTarget === 'items') ctx.resetTypography('items');
            else if (typoTarget === 'rdr') ctx.resetTypography('rdr');
            else ctx.resetTypography('all');
          }}
          label="Typographie par defaut"
          icon={<RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />}
          pt={pt}
          disabled={!hasCatFont && !hasItemFont && !hasRdrFont}
        />
      </div>
    </div>
  );
}

function ActionButton({ active, onClick, label, icon, pt, badge, disabled }: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  pt: EditorPanelTokens;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 hover:scale-[1.01] disabled:opacity-35 disabled:hover:scale-100 disabled:cursor-not-allowed"
      style={{
        background: active ? `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})` : pt.surface.secondary,
        color: active ? '#fff' : pt.text.primary,
        border: `1px solid ${active ? pt.accent.border : pt.surface.border}`,
        boxShadow: active ? `0 4px 16px ${pt.accent.bg}` : '0 1px 3px rgba(0,0,0,0.12)',
      }}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span
          className="text-[8px] font-medium px-1.5 py-0.5 rounded-md truncate max-w-[60px]"
          style={{ background: pt.surface.secondary, color: pt.label.muted, border: `1px solid ${pt.surface.border}` }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
