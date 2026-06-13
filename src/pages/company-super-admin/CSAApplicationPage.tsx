import { useState, useEffect, useCallback } from 'react';
import { Smartphone, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useAppConfig } from '../../hooks/useAppConfig';
import { useActiveLogo } from '../../hooks/useActiveLogo';
import { supabase } from '../../lib/supabase';
import usePwaInstall from '../../hooks/usePwaInstall';
import SimulatedPhone from '../../components/SimulatedPhone';
import AdminAppFeaturesList from '../admin/views/application/AdminAppFeaturesList';
import AdminAppIconPickerModal from '../admin/views/application/AdminAppIconPickerModal';
import PwaInstallButton from '../superadmin/views/application/PwaInstallButton';

interface Props {
  companyId: string;
}

export default function CSAApplicationPage({ companyId }: Props) {
  const t = useThemeTokens();
  const { config, loading: configLoading, updateConfig } = useAppConfig(companyId, 'company');
  const { url: activeLogoUrl } = useActiveLogo(companyId);
  const pwa = usePwaInstall();

  const [companyName, setCompanyName] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .maybeSingle();
      if (data?.name) setCompanyName(data.name);
    })();
  }, [companyId]);

  const appIconUrl = config?.app_icon_url ?? activeLogoUrl ?? null;
  const appName = config?.app_name || companyName || 'Mon application';

  const handleIconSelected = useCallback(async (url: string, logoId: string) => {
    await updateConfig({ app_icon_url: url, app_icon_id: logoId });
    setShowIconPicker(false);
  }, [updateConfig]);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#0ea5e9' }} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="text-center mb-8 sm:mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}
        >
          <Smartphone className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#0ea5e9' }}>Application mobile</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: t.heading.primary }}>
          {appName}
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: t.text.tertiary }}>
          Gerez l'application mobile de votre societe.
          L'apercu ci-dessous affiche la vraie interface responsive de votre espace.
        </p>

        <div className="flex justify-center mt-6">
          <PwaInstallButton pwa={pwa} appName={appName} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-start justify-items-center">
        <div
          className="rounded-2xl p-6 sm:p-8 w-full max-w-md"
          style={{
            background: t.surface.primary,
            border: `1px solid ${t.surface.border}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <AdminAppFeaturesList
            appIconUrl={appIconUrl}
            appName={appName}
            onChangeAppIcon={() => setShowIconPicker(true)}
          />
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-medium px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)', color: '#0ea5e9' }}
            >
              Apercu responsive reel
            </span>
          </div>
          <SimulatedPhone appIconUrl={appIconUrl} appName={appName} />
        </div>
      </div>

      {showIconPicker && (
        <AdminAppIconPickerModal
          companyId={companyId}
          currentIconUrl={appIconUrl}
          onSelect={handleIconSelected}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
}
