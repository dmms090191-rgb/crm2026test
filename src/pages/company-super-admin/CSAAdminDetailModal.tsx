import EntityDetailModal from '../../components/detail/EntityDetailModal';
import type { InfoDraft } from '../../components/detail/EntityInfoTab';
import { supabase } from '../../lib/supabase';
import type { CSAAdminUser } from './CSAAdminsList';

interface Props {
  admin: CSAAdminUser;
  onClose: () => void;
  onUpdate: () => void;
}

/**
 * Detail d'une SOCIETE. Enveloppe fine autour du modal partage : seule la
 * sauvegarde des informations est propre a cette entite.
 *
 * Endpoint inchange : `update-admin-for-super-admin` exige une cible de role
 * `admin`, ce qui est exactement le cas ici. Comportement identique a avant.
 */
export default function CSAAdminDetailModal({ admin, onClose, onUpdate }: Props) {
  async function saveInfo(draft: InfoDraft) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Non authentifie');
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-admin-for-super-admin`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          admin_id: admin.id,
          first_name: draft.first_name,
          last_name: draft.last_name,
          company: draft.company,
          phone: draft.phone,
          ...(draft.email ? { email: draft.email } : {}),
        }),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erreur');
  }

  return (
    <EntityDetailModal
      entity={admin}
      companyLabel="Societe"
      editableFields={{ email: true }}
      onSaveInfo={saveInfo}
      currentPin={admin.pin}
      onClose={onClose}
      onUpdate={onUpdate}
    />
  );
}
