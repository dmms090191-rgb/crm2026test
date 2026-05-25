import { Globe } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  message?: string;
  hint?: string;
}

export default function SiteEmptyState({ message = 'Aucun site cree pour le moment', hint }: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))',
          border: '1px solid rgba(14,165,233,0.2)',
          boxShadow: '0 0 24px rgba(14,165,233,0.1)',
        }}
      >
        <Globe className="w-7 h-7" style={{ color: '#0ea5e9' }} />
      </div>
      <p className="text-sm font-medium text-center max-w-xs" style={{ color: t.text.secondary }}>
        {message}
      </p>
      {hint && (
        <p className="text-xs mt-2 text-center max-w-xs" style={{ color: t.text.tertiary }}>
          {hint}
        </p>
      )}
    </div>
  );
}
