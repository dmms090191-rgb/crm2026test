import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCompanyId } from '../../../hooks/useCompanyId';
import { supabase } from '../../../lib/supabase';
import SiteManagerShell from '../../superadmin/views/site-builder/SiteManagerShell';

/* Attente maximale du companyId avant d'afficher « Aucune entreprise ciblée » (Visu sans entreprise). */
const COMPANY_ID_WAIT_MS = 4000;

export default function AdminSite() {
  const companyId = useCompanyId();
  // Le companyId arrive de facon asynchrone : tant que la session annonce une Societe, on attend
  // qu'il soit resolu au lieu d'afficher brievement « aucune entreprise ciblee ».
  // Ce n'est pas un droit : le serveur (get_site_context) reste seul juge.
  const [sessionState, setSessionState] = useState<'pending' | 'with_company' | 'without_company'>('pending');
  const [waitExpired, setWaitExpired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSessionState(session?.user?.app_metadata?.company_id ? 'with_company' : 'without_company');
    });
    // Visu avec un identifiant vide : jamais de chargement infini.
    const timer = window.setTimeout(() => { if (!cancelled) setWaitExpired(true); }, COMPANY_ID_WAIT_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  if (!companyId && sessionState !== 'without_company' && !waitExpired) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0ea5e9' }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col">
        <SiteManagerShell
          ownerType="admin_company"
          title="Site"
          subtitle="Gerez le site public de votre societe"
          companyId={companyId || null}
        />
      </div>
    </div>
  );
}
