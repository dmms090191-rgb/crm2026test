import { LayoutTemplate, Sparkles, ChevronRight } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { CABINET_TEMPLATES } from './cabinetTypes';

interface Props {
  onChooseTemplate: () => void;
  onCreateBlank: () => void;
}

/**
 * Premiere vue du modal : deux grandes cartes, clairement separees.
 *
 * Difference assumee avec le module Boutique : tant qu'aucun modele de cabinet n'existe,
 * la premiere carte est DESACTIVEE et le dit. Proposer un choix qui mene a une liste vide
 * serait une fausse promesse. La carte se reactive seule des qu'une entree apparait dans
 * `CABINET_TEMPLATES` — aucune autre ligne a changer.
 */
export default function CabinetStartChoice({ onChooseTemplate, onCreateBlank }: Props) {
  const t = useThemeTokens();
  const sansModele = CABINET_TEMPLATES.length === 0;

  const cards = [
    {
      key: 'template',
      icon: <LayoutTemplate className="w-6 h-6" />,
      title: 'Choisir un modèle de cabinet',
      subtitle: sansModele
        ? 'Aucun modèle n’est disponible pour le moment. Les modèles de cabinet arriveront avec leur scène 3D.'
        : 'Démarrez avec un cabinet déjà conçu et prêt à personnaliser.',
      onClick: onChooseTemplate,
      disabled: sansModele,
    },
    {
      key: 'blank',
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Créer mon cabinet',
      subtitle: 'Créez un nouveau cabinet entièrement personnalisé à partir de zéro.',
      onClick: onCreateBlank,
      disabled: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map(c => (
        <button key={c.key} type="button" onClick={c.onClick} disabled={c.disabled}
          data-testid={`cabinet-choix-${c.key}`}
          className="group text-left p-6 rounded-2xl transition-all duration-200 enabled:hover:scale-[1.02]"
          style={{
            background: t.surface.secondary,
            border: `1px solid ${t.surface.border}`,
            opacity: c.disabled ? 0.55 : 1,
            cursor: c.disabled ? 'not-allowed' : 'pointer',
          }}>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
            {c.icon}
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: t.text.primary }}>{c.title}</h3>
          <p className="text-xs leading-relaxed mb-4" style={{ color: t.text.tertiary }}>{c.subtitle}</p>
          {c.disabled ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: t.text.quaternary }}>
              Bientôt disponible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: t.accent.text }}>
              Continuer
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
