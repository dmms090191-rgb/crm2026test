import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ContextCard } from './ContextCardsView';
import type { SectionColors } from './docGeneraleTypes';
import { getSectionColor } from './docGeneraleTypes';

export function ContextCardsSection({ cards, tokens }: { cards: ContextCard[]; tokens: ReturnType<typeof useThemeTokens> }) {
  if (cards.length === 0) return null;
  const colors = getSectionColor('contexte-chatgpt');

  return (
    <div className="flex flex-col gap-4">
      {cards.map((card, idx) => (
        <div
          key={card.id}
          className="relative rounded-xl overflow-hidden transition-all duration-200"
          style={{
            background: tokens.surface.tertiary,
            border: `1px solid ${tokens.surface.borderLight}`,
          }}
        >
          <div
            className="absolute top-0 left-0 w-[3px] h-full rounded-r-full"
            style={{ background: colors.accent, opacity: 0.4 }}
          />
          <div className="pl-6 pr-5 py-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-md"
                style={{
                  background: colors.accentSoft,
                  color: colors.accent,
                  border: `1px solid ${colors.accentBorder}`,
                }}
              >
                {idx + 1}
              </span>
              <h4
                className="text-sm font-semibold"
                style={{ color: tokens.text.primary }}
              >
                {card.title}
              </h4>
            </div>
            {card.content && (
              <p
                className="text-[13px] whitespace-pre-wrap ml-0.5"
                style={{ color: tokens.text.secondary, lineHeight: '1.85' }}
              >
                {card.content}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GroupHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: SectionColors;
}) {
  const tokens = useThemeTokens();

  return (
    <div className="flex items-center gap-2.5 md:gap-4 mb-4 md:mb-5">
      <div
        className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: color.iconBg,
          border: `1px solid ${color.accentBorder}`,
        }}
      >
        <span style={{ color: color.accent }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xs md:text-sm font-bold tracking-tight" style={{ color: tokens.text.primary, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>
      <span
        className="text-[10px] font-bold tabular-nums px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg flex-shrink-0"
        style={{
          background: color.accentSoft,
          color: color.accent,
          border: `1px solid ${color.accentBorder}`,
        }}
      >
        {count} section{count > 1 ? 's' : ''}
      </span>
    </div>
  );
}
