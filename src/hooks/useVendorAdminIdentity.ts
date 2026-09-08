import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface VendorAdminIdentity {
  /** « Prenom Nom » du responsable, ou « Administrateur » si rien n'est saisi. */
  name: string;
  /** Ligne secondaire, seulement quand une vraie identite a ete trouvee. */
  subtitle: string;
}

const FALLBACK: VendorAdminIdentity = { name: 'Administrateur', subtitle: '' };

/**
 * Identite de l'administration pour un Commercial.
 *
 * La table `vendor_admin_messages` ne porte aucune reference vers l'auteur du
 * message : `sender` vaut la chaine 'admin', rien de plus. Le prenom et le nom
 * ne sont donc pas derivables du message. La seule source lisible par un
 * Commercial est `companies.admin_first_name` / `admin_last_name`, exactement
 * comme le panel Client le fait deja pour son conseiller
 * (voir useClientConseiller).
 *
 * Aucun UUID n'est jamais affiche : si la Societe n'a pas saisi de nom, on
 * retombe sur « Administrateur », qui reste une information juste.
 */
export function useVendorAdminIdentity(vendorDbId: string | null) {
  const [identity, setIdentity] = useState<VendorAdminIdentity>(FALLBACK);

  useEffect(() => {
    if (!vendorDbId) { setIdentity(FALLBACK); return; }
    let cancelled = false;

    (async () => {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('company_id')
        .eq('id', vendorDbId)
        .maybeSingle();
      if (cancelled) return;
      if (!vendor?.company_id) { setIdentity(FALLBACK); return; }

      const { data: company } = await supabase
        .from('companies')
        .select('admin_first_name, admin_last_name')
        .eq('id', vendor.company_id)
        .maybeSingle();
      if (cancelled) return;

      const name = [company?.admin_first_name, company?.admin_last_name]
        .filter(Boolean).join(' ').trim();

      setIdentity(name ? { name, subtitle: 'Votre responsable' } : FALLBACK);
    })();

    return () => { cancelled = true; };
  }, [vendorDbId]);

  return identity;
}
