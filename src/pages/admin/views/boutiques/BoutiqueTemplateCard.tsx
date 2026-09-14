import { Box } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { BoutiqueTemplate } from './boutiqueTypes';

interface Props {
  template: BoutiqueTemplate;
  onUse: (template: BoutiqueTemplate) => void;
}

/** Carte d'un modele disponible. L'integration 3D n'est PAS faite a cette etape. */
export default function BoutiqueTemplateCard({ template, onUse }: Props) {
  const t = useThemeTokens();

  const rows = [
    { label: 'Nom', value: template.name },
    { label: 'Catégorie', value: template.category },
    { label: 'Type', value: template.type },
  ];

  return (
    <div className="p-5 rounded-2xl" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
          style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <Box className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold" style={{ color: t.text.primary }}>
            {template.name} — {template.category}
          </h3>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: t.text.tertiary }}>{template.description}</p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 mt-4">
        {rows.map(r => (
          <div key={r.label}>
            <dt className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: t.label.muted }}>{r.label}</dt>
            <dd className="text-sm font-semibold mt-0.5 truncate" style={{ color: t.text.secondary }}>{r.value}</dd>
          </div>
        ))}
      </dl>

      <button type="button" onClick={() => onUse(template)}
        className="w-full mt-5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
        style={{ background: t.accent.solid, color: t.text.inverse }}>
        Utiliser ce modèle
      </button>
    </div>
  );
}
