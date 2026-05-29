import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LogoPage from '../../../components/logo/LogoPage';

export default function SALogoPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const metaId = user.app_metadata?.company_id;
      if (metaId) setCompanyId(metaId);
    })();
  }, []);

  return (
    <div className="p-2 sm:p-3 md:p-4 flex flex-col h-full min-h-0">
      <LogoPage
        companyId={companyId}
        title="Logo"
        subtitle="Gerez les logos de la plateforme"
        isSA
      />
    </div>
  );
}
