import { LayoutTemplate, Sparkles, ChevronRight } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  onChooseTemplate: () => void;
  onCreateBlank: () => void;
}

/** Premiere vue du modal : deux grandes cartes, clairement separees. */
export default function BoutiqueStartChoice({ onChooseTemplate, onCreateBlank }: Props) {
  const t = useThemeTokens();

  const cards = [
    {
      key: 'template',
      icon: <LayoutTemplate className="w-6 h-6" />,
      title: 'Choisir un modèle de boutique',
      subtitle: 'Démarrez avec une boutique déjà conçue et prête à personnaliser.',
      onClick: onChooseTemplate,
    },
    {
      key: 'blank',
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Créer ma boutique',
      subtitle: 'Créez une nouvelle boutique entièrement personnalisée à partir de zéro.',
      onClick: onCreateBlank,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map(c => (
        <button key={c.key} type="button" onClick={c.onClick}
          className="group text-left p-6 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
            {c.icon}
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: t.text.primary }}>{c.title}</h3>
          <p className="text-xs leading-relaxed mb-4" style={{ color: t.text.tertiary }}>{c.subtitle}</p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: t.accent.text }}>
            Continuer
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      ))}
    </div>
  );
}
