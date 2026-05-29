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
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <LogoPage
          companyId={companyId}
          title="Logo"
          subtitle="Gerez les logos de la plateforme"
        />
      </div>
    </div>
  );
}
