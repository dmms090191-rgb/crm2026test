import { User, MessageCircle } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import type { ConseillerInfo } from '../../../hooks/useClientConseiller';

interface Props {
  conseiller: ConseillerInfo;
  onContact: () => void;
}

export default function ConseillerCard({ conseiller, onContact }: Props) {
  const tokens = useThemeTokens();
  const fullName = [conseiller.firstName, conseiller.lastName].filter(Boolean).join(' ');
  const initial = (conseiller.firstName || conseiller.lastName || 'C').charAt(0).toUpperCase();

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(14,165,233,0.1) 100%)',
            border: '1.5px solid rgba(6,182,212,0.25)',
            color: '#06b6d4',
          }}
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: tokens.text.quaternary }}>
            Votre conseiller
          </p>
          <p className="text-base font-bold truncate" style={{ color: tokens.text.primary }}>
            {fullName || 'Non assigne'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.tertiary }}>
            {conseiller.roleLabel}
          </p>
        </div>

        <button
          onClick={onContact}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(6,182,212,0.25)',
          }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Contacter</span>
        </button>
      </div>
    </div>
  );
}
