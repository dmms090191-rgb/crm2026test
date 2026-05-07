import { getThemeTokens } from '../../../../lib/themeTokens';

export default function ScoreBar({ score, color, tokens }: { score: number; color: string; tokens: ReturnType<typeof getThemeTokens> }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span
        className="text-xs font-bold tabular-nums flex-shrink-0"
        style={{ color, minWidth: '36px', textAlign: 'right' }}
      >
        {score}%
      </span>
    </div>
  );
}
