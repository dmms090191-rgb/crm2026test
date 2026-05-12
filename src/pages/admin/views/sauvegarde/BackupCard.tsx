import { Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export function BackupCard({
  icon, title, description, buttonLabel, disabled, loading, onClick, variant = 'default', tokens: t,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'warning';
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  const isWarning = variant === 'warning';
  const isDisabled = disabled || loading;

  return (
    <div
      className="flex flex-col rounded-2xl p-4 sm:p-6 transition-shadow hover:shadow-lg min-w-0"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
    >
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4"
        style={{
          background: isWarning ? t.warning.bg : t.accent.bg,
          color: isWarning ? t.warning.text : t.accent.solid,
        }}
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: t.text.primary }}>{title}</h3>
      <p className="text-xs leading-relaxed mb-4 sm:mb-5 flex-1 break-words" style={{ color: t.text.secondary }}>{description}</p>
      <button
        disabled={isDisabled}
        onClick={isDisabled ? undefined : onClick}
        className="w-full py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2"
        style={{
          background: isDisabled ? t.surface.secondary : isWarning ? t.warning.text : t.accent.solid,
          color: isDisabled ? t.text.tertiary : '#ffffff',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {buttonLabel}
      </button>
    </div>
  );
}
