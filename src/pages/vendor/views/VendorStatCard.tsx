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

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 md:p-5 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-0.5${onClick ? ' cursor-pointer' : ''}`}
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
      <p className="text-3xl md:text-4xl font-bold tabular-nums" style={{ color: tokens.stat.valuePrimary }}>{count}</p>
    </div>
  );
}
