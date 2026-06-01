import { ImagePlus } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

const features = [
  { label: 'Tableau de bord', desc: 'Vue d\'ensemble en temps reel', color: '#0ea5e9' },
  { label: 'Gestion des leads', desc: 'Suivi complet de vos prospects', color: '#10b981' },
  { label: 'Messagerie', desc: 'Communication directe avec vos equipes', color: '#f59e0b' },
  { label: 'Notifications push', desc: 'Alertes instantanees sur votre mobile', color: '#ef4444' },
  { label: 'Agenda', desc: 'Planification et rappels de rendez-vous', color: '#06b6d4' },
  { label: 'Mode hors-ligne', desc: 'Acces aux donnees sans connexion', color: '#64748b' },
];

interface Props {
  appIconUrl: string | null;
  onChangeAppIcon?: () => void;
}

export default function AppFeaturesList({ appIconUrl, onChangeAppIcon }: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex flex-col items-center text-center">
      {/* App icon */}
      <div className="relative mb-4">
        <div
          className="absolute -inset-4 rounded-[2rem] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        {appIconUrl ? (
          <img
            src={appIconUrl}
            alt="Icone application"
            className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[1.5rem] object-cover"
            style={{
              boxShadow: '0 8px 32px rgba(14,165,233,0.3), 0 2px 8px rgba(0,0,0,0.15)',
            }}
          />
        ) : (
          <div
            className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[1.5rem] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
              boxShadow: '0 8px 32px rgba(14,165,233,0.3), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.2)',
            }}
          >
            <span className="text-white text-4xl sm:text-5xl font-bold select-none">T</span>
          </div>
        )}
      </div>

      {/* Change icon button */}
      {onChangeAppIcon && (
        <button
          onClick={onChangeAppIcon}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-105 active:scale-95 mb-4"
          style={{
            background: 'rgba(14,165,233,0.06)',
            border: '1px solid rgba(14,165,233,0.18)',
            color: '#0284c7',
          }}
        >
          <ImagePlus className="w-3 h-3" />
          {appIconUrl ? "Changer l'icone" : "Inserer une icone"}
        </button>
      )}

      <h3 className="text-lg font-bold mb-1" style={{ color: t.heading.primary }}>Talvex</h3>
      <p className="text-xs mb-1" style={{ color: t.text.tertiary }}>CRM professionnel</p>
      <p
        className="text-[10px] font-mono px-2 py-0.5 rounded-md mb-6"
        style={{ background: t.surface.secondary, color: t.text.quaternary }}
      >
        v1.0.0
      </p>

      <div className="w-full space-y-2">
        {features.map((feat) => (
          <div
            key={feat.label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${feat.color}12`, border: `1px solid ${feat.color}25` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: feat.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>{feat.label}</p>
              <p className="text-[10px]" style={{ color: t.text.quaternary }}>{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
