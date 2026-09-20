import type { ReactNode } from 'react';
import TalixyHero from './TalixyHero';
import TalixyGroupesCard from './TalixyGroupesCard';

/*
 * TALIXY — composition du dashboard Talvex Administrateur (validee par David) :
 *
 *   DASHBOARD
 *   Créez. Développez. Rayonnez.
 *   Vue globale de votre plateforme Talvex.
 *   [ Santé du projet ~66 % ]  [ Groupes ~34 % ]   <- deux colonnes, tout tient dans le premier ecran
 *
 * Santé du projet = la vraie carte actuelle (donnees reelles), compactee par CSS Talixy seulement.
 * Ne se monte QUE sous Talixy hors editeur ; l'ancien contenu du dashboard reste intact pour
 * Graphite et les autres themes (masquer, jamais supprimer).
 */
export default function TalixyDashboard({ health }: { health: ReactNode }) {
  return (
    <div className="tx-dash" data-testid="talixy-dashboard">
      <TalixyHero
        overline="Dashboard"
        title="Créez. Développez. Rayonnez."
        subtitle="Vue globale de votre plateforme Talvex."
      />
      <div className="tx-dash-cols">
        <div className="tx-health tx-anim tx-rise" data-tx-health style={{ animationDelay: '180ms' }}>
          {health}
        </div>
        <div className="tx-groupes-col tx-anim tx-rise" style={{ animationDelay: '240ms' }}>
          <h2 className="tx-section-title">Groupes</h2>
          <TalixyGroupesCard />
        </div>
      </div>
    </div>
  );
}
