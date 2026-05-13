import { useThemeTokens } from '../../../hooks/useThemeTokens';

interface StatCardProps {
  label: string;
  sublabel: string;
  count: number | string;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  onClick?: () => void;
}

export default function StatCard({ label, sublabel, count, icon, accentColor, glowColor, onClick }: StatCardProps) {
  const tokens = useThemeTokens();
  const displayCount = typeof count === 'number' ? Math.max(0, count) : count;

  return (
    <>
      {/* Mobile card: horizontal layout with left accent */}
      <div
        className={`sm:hidden relative overflow-hidden rounded-xl flex items-center gap-4 p-4 transition-all duration-200 active:scale-[0.98]${onClick ? ' cursor-pointer' : ''}`}
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          boxShadow: `0 2px 12px rgba(0,0,0,0.15), 0 0 0 1px ${glowColor}08`,
          backdropFilter: 'blur(16px)',
        }}
        onClick={onClick}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ background: accentColor }}
        />

        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-1"
          style={{
            background: `${glowColor}12`,
            border: `1px solid ${glowColor}20`,
            color: accentColor,
          }}
        >
          {icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: accentColor }}>{label}</p>
          <p className="text-[11px] mt-0.5 leading-tight" style={{ color: tokens.text.quaternary }}>{sublabel}</p>
        </div>

        {/* Count */}
        <div className="flex-shrink-0 text-right">
          <p className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: tokens.stat.valuePrimary }}>{displayCount}</p>
        </div>
      </div>

      {/* Desktop card: vertical layout (unchanged) */}
      <div
        className={`hidden sm:flex relative overflow-hidden rounded-2xl p-4 md:p-5 flex-col justify-between group transition-transform duration-300 hover:-translate-y-0.5${onClick ? ' cursor-pointer' : ''}`}
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          boxShadow: tokens.card.shadow,
        }}
        onClick={onClick}
      >
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-20"
          style={{ background: glowColor, opacity: tokens.stat.glowOpacity }}
        />
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-[9px] md:text-[10px] font-bold tracking-[0.12em] md:tracking-[0.15em] uppercase mb-0.5" style={{ color: accentColor }}>{label}</p>
            <p className="text-[10px] md:text-xs leading-tight uppercase tracking-wide md:tracking-wider whitespace-nowrap" style={{ color: tokens.text.quaternary }}>{sublabel}</p>
          </div>
          <div
            className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${glowColor}18`, color: accentColor, boxShadow: `0 0 16px ${glowColor}30` }}
          >
            {icon}
          </div>
        </div>
        <p className="text-3xl md:text-4xl font-bold tabular-nums" style={{ color: tokens.stat.valuePrimary }}>{displayCount}</p>
      </div>
    </>
  );
}
