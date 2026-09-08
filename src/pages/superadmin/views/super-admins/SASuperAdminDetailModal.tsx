import EntityDetailModal from '../../../../components/detail/EntityDetailModal';
import type { InfoDraft } from '../../../../components/detail/EntityInfoTab';
import { supabase } from '../../../../lib/supabase';
import type { CompanySuperAdmin } from './superAdminTypes';

interface Props {
  sa: CompanySuperAdmin;
  onClose: () => void;
  onUpdate: () => void;
}

/**
 * Detail d'un GROUPE. Meme modal partage que le detail d'une Societe, meme
 * design, memes trois onglets, memes regles de fermeture et de taille.
 *
 * Seule la sauvegarde des informations differe : `update-admin-for-super-admin`
 * refuse toute cible dont le role n'est pas `admin`. Pour un Groupe on passe
 * donc par `update-company-super-admin`, qui exige precisement un appelant
 * `super_admin` et une cible `company_super_admin` — un Groupe normal ne peut
 * donc pas emprunter ce chemin.
 *
 * Les quatre champs atterrissent dans `auth.users.user_metadata`, la source de
 * verite que relisent la Liste des groupes, l'annuaire et les notifications.
 */
export default function SASuperAdminDetailModal({ sa, onClose, onUpdate }: Props) {
  async function saveInfo(draft: InfoDraft) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Non authentifie');
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-company-super-admin`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        // Ni role, ni company_id, ni permissions : ces champs ne transitent pas.
        // L'email n'est envoye que s'il a ete saisi.
        body: JSON.stringify({
          target_user_id: sa.id,
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
      entity={sa}
      companyLabel="Groupe"
      editableFields={{ email: true }}
      onSaveInfo={saveInfo}
      onClose={onClose}
      onUpdate={onUpdate}
    />
  );
}
