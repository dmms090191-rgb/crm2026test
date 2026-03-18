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
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Mode d'import</p>
      <div className="space-y-2">
        {modes.map(m => {
          const isActive = value === m.key;
          const isDisabled = m.key === 'update' && dupCrmCount === 0;
          return (
            <button
              key={m.key}
              onClick={() => !isDisabled && onChange(m.key)}
              disabled={isDisabled}
              className="w-full text-left flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all"
              style={{
                background: isActive ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.02)',
                border: isActive ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.05)',
                opacity: isDisabled ? 0.4 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  border: isActive ? '5px solid #22d3ee' : '2px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                }}
              />
              <div>
                <p className="text-xs font-semibold" style={{ color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.7)' }}>{m.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{m.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
