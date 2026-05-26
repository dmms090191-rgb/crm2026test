import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useClientConseiller } from '../../../hooks/useClientConseiller';
import { LayoutDashboard } from 'lucide-react';
import ConseillerCard from './ConseillerCard';

interface ClientVueEnsembleProps {
  clientName: string;
  clientAuthId?: string;
  onNavigate?: (view: string) => void;
}

export default function ClientVueEnsemble({ clientName, clientAuthId, onNavigate }: ClientVueEnsembleProps) {
  const tokens = useThemeTokens();
  const { conseiller, loading: conseillerLoading } = useClientConseiller(clientAuthId ?? null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div
        className="rounded-2xl p-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(14,165,233,0.06) 100%)`,
          border: `1px solid rgba(6,182,212,0.15)`,
        }}
      >
        <div className="absolute top-4 right-4 opacity-10">
          <LayoutDashboard className="w-24 h-24" style={{ color: '#22d3ee' }} />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold" style={{ color: tokens.text.primary }}>
            {greeting}, {clientName}
          </h1>
          <p className="text-sm mt-2 max-w-lg leading-relaxed" style={{ color: tokens.text.tertiary }}>
            Bienvenue dans votre espace personnel. Retrouvez ici vos messages, rendez-vous et propositions en un seul endroit.
          </p>
        </div>
      </div>

      {!conseillerLoading && conseiller && (
        <ConseillerCard
          conseiller={conseiller}
          onContact={() => onNavigate?.('messagerie')}
        />
      )}
    </div>
  );
}
