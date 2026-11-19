import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ModeImport } from '../../../../lib/importOnglet';

/* L'ancien type reste exporte sous son nom : d'autres fichiers l'importent. */
export type ImportMode = ModeImport;

interface ImportModeSelectorProps {
  value: ModeImport;
  onChange: (mode: ModeImport) => void;
  dupCrmCount: number;
}

/*
 * TROIS MODES, ET AUCUN NE CREE DE DOUBLON.
 *
 * L'ancien mode « Forcer l'import » inserait les doublons comme nouveaux leads : il a
 * disparu. Un lead deja present (meme email, ou meme telephone) n'est JAMAIS duplique ; le
 * mode ne decide que de ce qu'on fait de SES valeurs. Dans les trois cas il est rattache a
 * l'onglet choisi, et dans les trois cas un email deja connu n'est jamais remplace.
 */
const modes: { key: ModeImport; label: string; description: string }[] = [
  {
    key: 'ignorer',
    label: 'Ignorer les doublons',
    description: 'Crée les nouveaux leads. Les leads déjà présents ne sont pas modifiés, ils sont seulement ajoutés à l\'onglet.',
  },
  {
    key: 'completer',
    label: 'Compléter les doublons',
    description: 'Crée les nouveaux leads. Pour les leads déjà présents, remplit seulement les champs vides avec les valeurs du fichier.',
  },
  {
    key: 'mettre_a_jour',
    label: 'Mettre à jour les doublons',
    description: 'Crée les nouveaux leads. Pour les leads déjà présents, les valeurs non vides du fichier remplacent les anciennes ; une cellule vide n\'efface jamais rien.',
  },
];

export default function ImportModeSelector({ value, onChange, dupCrmCount }: ImportModeSelectorProps) {
  const tokens = useThemeTokens();

  return (
    <div
      className="rounded-2xl p-3 sm:p-4 space-y-3"
      style={{ background: tokens.card.bg, border: tokens.card.border }}
    >
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: tokens.text.tertiary }}>Doublons</p>
        <p className="text-[10px]" style={{ color: tokens.text.quaternary }}>
          {dupCrmCount > 0 ? `${dupCrmCount} lead${dupCrmCount > 1 ? 's' : ''} déjà présent${dupCrmCount > 1 ? 's' : ''} repéré${dupCrmCount > 1 ? 's' : ''}` : 'Aucun doublon repéré à l\'aperçu'}
        </p>
      </div>
      <div className="space-y-2" role="radiogroup" aria-label="Que faire des leads déjà présents">
        {modes.map(m => {
          const isActive = value === m.key;
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(m.key)}
              className="w-full text-left flex items-start gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl transition-all"
              style={{
                background: isActive ? 'rgba(34,211,238,0.06)' : tokens.surface.tertiary,
                border: isActive ? tokens.accent.border : tokens.surface.borderLight,
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  border: isActive ? `5px solid ${tokens.accent.text}` : `2px solid ${tokens.surface.border}`,
                  background: 'transparent',
                }}
              />
              <div>
                <p className="text-xs" style={{ color: isActive ? tokens.accent.text : tokens.text.secondary, fontWeight: isActive ? 700 : 600 }}>{m.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: tokens.text.tertiary }}>{m.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
