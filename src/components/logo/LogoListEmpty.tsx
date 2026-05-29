import { Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';

interface Props {
  onUpload: () => void;
  onSwitchToAi?: () => void;
}

export default function LogoListEmpty({ onUpload, onSwitchToAi }: Props) {
  const t = useThemeTokens();

  return (
    <div
      className="rounded-2xl p-8 sm:p-12"
      style={{
        background: `linear-gradient(180deg, ${t.surface.secondary} 0%, ${t.surface.primary} 100%)`,
        border: `1px dashed ${t.surface.border}`,
      }}
    >
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.08))',
            border: '1px solid rgba(245,158,11,0.15)',
          }}
        >
          <ImageIcon className="w-7 h-7" style={{ color: '#d97706' }} />
        </div>

        <h3 className="text-sm sm:text-base font-bold mb-2" style={{ color: t.text.primary }}>
          Aucun logo enregistre
        </h3>
        <p className="text-xs sm:text-[13px] leading-relaxed mb-6" style={{ color: t.text.tertiary }}>
          Generez un logo avec l'IA ou importez votre propre logo. Vos logos apparaitront ici.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {onSwitchToAi && (
            <button
              onClick={onSwitchToAi}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                boxShadow: '0 2px 12px rgba(245,158,11,0.25)',
              }}
            >
              <Sparkles className="w-4 h-4" />
              Creer avec l'IA
            </button>
          )}
          <button
            onClick={onUpload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: t.surface.primary,
              border: `1px solid ${t.surface.border}`,
              color: t.text.secondary,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Upload className="w-4 h-4" />
            Uploader un logo
          </button>
        </div>
      </div>
    </div>
  );
}
