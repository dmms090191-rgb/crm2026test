import { ArrowLeft } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';

interface Props {
  fullName: string;
  onBack: () => void;
}

export default function CSAImpersonationBanner({ fullName, onBack }: Props) {
  const t = useThemeTokens();
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-2 flex-shrink-0"
      style={{ background: t.accent.bg, borderBottom: `1px solid ${t.accent.border}` }}
    >
      <span className="text-xs font-medium truncate min-w-0" style={{ color: t.accent.text }}>
        <span className="hidden sm:inline">Mode Super Admin — vous visualisez le panel de </span>
        <span className="sm:hidden">Visualisation </span>
        <span className="font-bold">{fullName}</span>
      </span>
      <button
        onClick={onBack}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all hover:scale-105 whitespace-nowrap flex-shrink-0"
        style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
      >
        <ArrowLeft className="w-3 h-3 flex-shrink-0" />
        <span className="hidden sm:inline">Retour au CRM</span>
        <span className="sm:hidden">Retour</span>
      </button>
    </div>
  );
}
