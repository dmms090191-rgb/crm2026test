import { useState, useEffect } from 'react';
import { Smartphone, Download, ExternalLink, ImagePlus } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { supabase } from '../../../lib/supabase';
import SimulatedPhone from '../../../components/SimulatedPhone';

interface Props {
  onChangeAppIcon?: () => void;
}

export default function SAApplicationPage({ onChangeAppIcon }: Props) {
  const t = useThemeTokens();
  const [downloadHovered, setDownloadHovered] = useState(false);
  const [appIconUrl, setAppIconUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const companyId = user.app_metadata?.company_id;
      if (!companyId) return;
      const { data } = await supabase.from('company_home_pages')
        .select('app_icon_url')
        .eq('company_id', companyId)
        .maybeSingle();
      if (data?.app_icon_url) setAppIconUrl(data.app_icon_url);
    })();
  }, []);

  const downloadUrl: string | null = null;
  const hasDownloadUrl = !!downloadUrl;

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}
        >
          <Smartphone className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#0ea5e9' }}>Application mobile</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: t.heading.primary }}>
          Talvex
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: t.text.tertiary }}>
          Gerez votre activite ou que vous soyez avec l'application mobile Talvex.
          L'apercu ci-dessous affiche la vraie interface responsive du projet.
        </p>
      </div>

      {/* Two-column: Features + Phone */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-start justify-items-center">
        {/* Features card */}
        <div
          className="rounded-2xl p-6 sm:p-8 w-full max-w-md"
          style={{
            background: t.surface.primary,
            border: `1px solid ${t.surface.border}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <AppFeaturesList appIconUrl={appIconUrl} onChangeAppIcon={onChangeAppIcon} />
        </div>

        {/* Real responsive phone preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)', color: '#0ea5e9' }}>
              Apercu responsive reel
            </span>
          </div>
          <SimulatedPhone />
        </div>
      </div>

      {/* Download button */}
      <div className="flex justify-center mt-8 sm:mt-10">
        {hasDownloadUrl ? (
          <button
            onClick={handleDownload}
            onMouseEnter={() => setDownloadHovered(true)}
            onMouseLeave={() => setDownloadHovered(false)}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: downloadHovered
                ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
                : 'linear-gradient(135deg, #0ea5e9, #10b981)',
              color: '#fff',
              boxShadow: downloadHovered
                ? '0 8px 32px rgba(14,165,233,0.4), 0 0 0 1px rgba(14,165,233,0.2)'
                : '0 4px 20px rgba(14,165,233,0.25)',
            }}
          >
            <Download className="w-5 h-5" />
            Telecharger l'application
            <ExternalLink className="w-4 h-4 opacity-60" />
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold"
              style={{
                background: t.surface.secondary,
                border: `1.5px dashed ${t.surface.border}`,
                color: t.text.quaternary,
                cursor: 'not-allowed',
              }}
            >
              <Download className="w-5 h-5 opacity-40" />
              Telecharger l'application
            </div>
            <p className="text-[11px] font-medium" style={{ color: t.text.quaternary }}>
              Telechargement bientot disponible
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AppFeaturesList({ appIconUrl, onChangeAppIcon }: { appIconUrl: string | null; onChangeAppIcon?: () => void }) {
  const t = useThemeTokens();

  const features = [
    { label: 'Tableau de bord', desc: 'Vue d\'ensemble en temps reel', color: '#0ea5e9' },
    { label: 'Gestion des leads', desc: 'Suivi complet de vos prospects', color: '#10b981' },
    { label: 'Messagerie', desc: 'Communication directe avec vos equipes', color: '#f59e0b' },
    { label: 'Notifications push', desc: 'Alertes instantanees sur votre mobile', color: '#ef4444' },
    { label: 'Agenda', desc: 'Planification et rappels de rendez-vous', color: '#06b6d4' },
    { label: 'Mode hors-ligne', desc: 'Acces aux donnees sans connexion', color: '#64748b' },
  ];

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
