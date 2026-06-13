import { SquareStack, Paintbrush, ArrowRight } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { resolveZoneBg } from '../../contexts/editorModeHelpers';
import { CARD_TARGETS, type CardTarget } from '../../contexts/editorModeTypes';
import type { EditorPanelTokens } from './editorPanelTheme';

interface Props {
  ctx: ReturnType<typeof useEditorMode>;
  pt: EditorPanelTokens;
}

export default function EditorCartesContent({ ctx, pt }: Props) {
  const customizedCount = CARD_TARGETS.filter(c => ctx.cardOverrides[c.id]?.bg).length;

  return (
    <div className="px-1.5 py-1 flex flex-col gap-0.5">
      <div className="px-2.5 pt-2.5 pb-1 flex items-center justify-between">
        <span
          className="text-[8px] font-extrabold uppercase tracking-[0.18em]"
          style={{ color: pt.accent.text }}
        >
          Cartes du dashboard
        </span>
        {customizedCount > 0 && (
          <span
            className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: pt.accent.bg, color: pt.accent.text }}
          >
            {customizedCount}/{CARD_TARGETS.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 px-1.5 pb-1.5">
        {CARD_TARGETS.map(card => {
          const active = ctx.activeCardTarget === card.id;
          const ovr = ctx.cardOverrides[card.id];
          const hasBg = !!ovr?.bg;
          return (
            <button
              key={card.id}
              onClick={() => ctx.setActiveCardTarget(active ? null : card.id as CardTarget)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`
                  : pt.surface.secondary,
                color: active ? '#fff' : pt.text.primary,
                border: `1px solid ${active ? pt.accent.border : pt.surface.border}`,
                boxShadow: active
                  ? `0 4px 16px ${pt.accent.bg}`
                  : '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <SquareStack className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{card.label}</span>
              {hasBg && (
                <span className="flex items-center gap-0.5 flex-shrink-0" title="Fond">
                  <Paintbrush className="w-2 h-2 opacity-50" />
                  <span
                    className="w-3 h-3 rounded-md"
                    style={{
                      background: resolveZoneBg(ovr.bg!),
                      border: `1px solid ${pt.swatchBorder}`,
                    }}
                  />
                </span>
              )}
              <ArrowRight className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />
            </button>
          );
        })}
      </div>

      <div className="mx-2 mt-2 mb-1">
        <p className="text-[9px] leading-relaxed" style={{ color: pt.label.muted }}>
          Selectionne une carte, puis choisis une couleur ou un degrade dans le panneau Couleur. Seul le fond de la carte est modifie.
        </p>
      </div>
    </div>
  );
}
