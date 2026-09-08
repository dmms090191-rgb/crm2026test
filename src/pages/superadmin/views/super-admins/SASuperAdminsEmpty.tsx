import { ShieldPlus, Users } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

/** Etat « aucun groupe en base ». */
export function SASuperAdminsEmpty({ tokens: t, onCreate }: { tokens: ThemeTokens; onCreate: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <Users className="w-8 h-8" style={{ color: '#f59e0b' }} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold" style={{ color: t.text.primary }}>Aucun groupe</h2>
          <p className="text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
            Un groupe est une organisation principale, rattachée à sa propre société, qui pourra ensuite créer et gérer plusieurs sociétés. Créez-en un pour commencer.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
        >
          <ShieldPlus className="w-4 h-4" />
          Créer un groupe
        </button>
      </div>
    </div>
  );
}

/** Etat « des groupes existent, mais aucun ne passe les filtres ». */
export function SASuperAdminsNoMatch({ tokens: t, onReset }: { tokens: ThemeTokens; onReset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-center">
      <p className="text-sm font-semibold" style={{ color: t.text.primary }}>Aucun groupe ne correspond</p>
      <p className="text-xs" style={{ color: t.text.tertiary }}>Aucun groupe ne correspond aux filtres appliques.</p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}
