import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export type ImportMode = 'ignore' | 'update' | 'force';

interface ImportModeSelectorProps {
  value: ImportMode;
  onChange: (mode: ImportMode) => void;
  dupCrmCount: number;
}

const modes: { key: ImportMode; label: string; description: string }[] = [
  {
    key: 'ignore',
    label: 'Ignorer les doublons',
    description: 'Insère uniquement les nouveaux leads. Les doublons (fichier et CRM) sont ignorés.',
  },
  {
    key: 'update',
    label: 'Mettre à jour les doublons CRM',
    description: 'Insère les nouveaux leads et met à jour les champs des doublons CRM existants.',
  },
  {
    key: 'force',
    label: 'Forcer l\'import',
    description: 'Insère toutes les lignes valides y compris les doublons. Les erreurs de validation restent exclues.',
  },
];

export default function ImportModeSelector({ value, onChange, dupCrmCount }: ImportModeSelectorProps) {
  const tokens = useThemeTokens();

  return (
    <div
      className="rounded-2xl p-3 sm:p-4 space-y-3"
      style={{ background: tokens.card.bg, border: tokens.card.border }}
    >
      <p className="text-xs font-bold tracking-widest uppercase" style={{ color: tokens.text.tertiary }}>Mode d'import</p>
      <div className="space-y-2">
        {modes.map(m => {
          const isActive = value === m.key;
          const isDisabled = m.key === 'update' && dupCrmCount === 0;
          return (
            <button
              key={m.key}
              onClick={() => !isDisabled && onChange(m.key)}
              disabled={isDisabled}
              className="w-full text-left flex items-start gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl transition-all"
              style={{
                background: isActive ? 'rgba(34,211,238,0.06)' : tokens.surface.tertiary,
                border: isActive ? tokens.accent.border : tokens.surface.borderLight,
                opacity: isDisabled ? 0.4 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
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
                <p className="text-xs font-semibold" style={{ color: isActive ? tokens.accent.text : tokens.text.secondary }}>{m.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: tokens.text.tertiary }}>{m.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
