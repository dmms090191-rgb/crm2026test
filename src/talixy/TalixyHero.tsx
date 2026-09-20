import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

/*
 * TALIXY — hero central de la maquette : sur-titre espace, grand titre fin, sous-titre,
 * trois cartes translucides (icone ronde + libelle + fleche ronde).
 * Composant de presentation pur : aucun acces aux donnees ; les cartes ouvrent de VRAIES vues
 * existantes via onClick. Entree echelonnee en opacite + legere montee (.tx-rise, classe .tx-anim
 * neutralisee en mouvement reduit) — jamais d'animation sur un conteneur de vues.
 */
export interface TalixyHeroCard {
  icon: ReactNode;
  label: ReactNode;
  onClick: () => void;
}

interface Props {
  overline: string;
  title: string;
  subtitle: string;
  /** Facultatif : le dashboard valide par David n'affiche aucune carte dans le hero. */
  cards?: TalixyHeroCard[];
}

export default function TalixyHero({ overline, title, subtitle, cards }: Props) {
  return (
    <section className="tx-hero" data-testid="talixy-hero">
      <p className="tx-hero-overline tx-anim tx-rise" style={{ animationDelay: '0ms' }}>{overline}</p>
      <h1 className="tx-hero-title tx-anim tx-rise" style={{ animationDelay: '60ms' }}>{title}</h1>
      <p className="tx-hero-subtitle tx-anim tx-rise" style={{ animationDelay: '120ms' }}>{subtitle}</p>
      {!!cards?.length && (
      <div className="tx-hero-cards">
        {cards.map((card, i) => (
          <button
            key={i}
            type="button"
            className="tx-hero-card tx-anim tx-rise"
            style={{ animationDelay: `${180 + i * 60}ms` }}
            onClick={card.onClick}
          >
            <span className="tx-hero-card-icon">{card.icon}</span>
            <span className="tx-hero-card-label">{card.label}</span>
            <span className="tx-hero-card-arrow"><ArrowRight size={14} strokeWidth={2} /></span>
          </button>
        ))}
      </div>
      )}
    </section>
  );
}
