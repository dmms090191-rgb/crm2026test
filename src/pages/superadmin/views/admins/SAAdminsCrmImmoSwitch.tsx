import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

/*
 * L'OCTROI DU MODULE CRM IMMO. Cote Talvex uniquement.
 *
 * Accorder ou retirer CRM Immo est une decision de Talvex, pas une donnee de la
 * Societe : il n'existe AUCUNE policy INSERT, UPDATE ou DELETE sur
 * crm_immo_acces pour `admin` ni pour `company_super_admin`. Une Societe, meme
 * un Groupe sur sa propre fille, se fait refuser en 42501. Cette bascule est
 * donc le seul chemin, et elle ne vit que dans le panel Talvex.
 *
 * ---------- POURQUOI UN UPSERT, ET JAMAIS UN UPDATE ----------
 *
 * Un .update() sur une Societe qui n'a jamais eu de ligne touche ZERO ligne et
 * ne leve AUCUNE erreur : supabase-js rend { error: null }. La bascule
 * reviendrait a sa position et personne ne saurait pourquoi. company_id est la
 * cle primaire de la table, donc l'upsert est exact et idempotent.
 *
 * ---------- POURQUOI ON NE SUPPRIME PAS LA LIGNE EN RETIRANT ----------
 *
 * `active` passe a false et la ligne reste : on garde qui a accorde le module et
 * quand. has_crm_immo_access teste `a.active`, exactement comme les douze
 * policies des tables de donnees — donc une ligne endormie ferme bien l'acces,
 * sans perdre la trace.
 *
 * Les DONNEES ne sont pas touchees : retirer le module rend les dossiers
 * illisibles, il ne les efface pas. Les reaccorder les rend tels quels.
 */

interface Props {
  companyId: string;
  /** Vrai si une ligne ACTIVE existe pour cette Societe. */
  enabled: boolean;
  onToggled: () => void;
}

export default function SAAdminsCrmImmoSwitch({ companyId, enabled, onToggled }: Props) {
  const t = useThemeTokens();
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState(enabled);
  const [erreur, setErreur] = useState('');

  useEffect(() => { setLocal(enabled); }, [enabled]);

  async function basculer() {
    if (loading || !companyId) return;
    setLoading(true);
    setErreur('');
    try {
      const vise = !local;
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('crm_immo_acces')
        .upsert(
          {
            company_id: companyId,
            active: vise,
            accorde_le: new Date().toISOString(),
            accorde_par: user?.id ?? null,
          },
          { onConflict: 'company_id' },
        );

      if (error) {
        /* Un refus ne doit pas se faire passer pour une reussite : on remet la
           bascule a sa position reelle et on le dit par l'infobulle. */
        setErreur(error.message);
        setLocal(enabled);
        return;
      }
      setLocal(vise);
      onToggled();
    } finally {
      setLoading(false);
    }
  }

  if (!companyId) return <span className="text-[10px] text-gray-400">--</span>;

  const titre = erreur
    ? `Echec : ${erreur}`
    : local ? 'CRM Immo active' : 'CRM Immo desactive';

  return (
    <div className="flex items-center gap-1.5">
      {/* Les deux etats normaux reprennent EXACTEMENT les valeurs de SAAdminsAiSwitch,
          sa voisine dans la meme colonne : deux bascules de couleurs differentes cote a
          cote feraient brouillon. L'etat d'erreur, lui, n'existe pas chez elle — on prend
          donc le token du theme plutot que d'inventer un rouge. */}
      <Building2 className="w-3.5 h-3.5" style={{ color: erreur ? t.danger.text : local ? '#0ea5e9' : '#9ca3af' }} />
      <button
        onClick={basculer}
        disabled={loading}
        title={titre}
        data-testid={`sa-crm-immo-switch-${companyId}`}
        className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
        style={{ background: local ? '#0ea5e9' : '#6b7280' }}
      >
        <span
          className="inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: local ? 'translateX(17px)' : 'translateX(3px)' }}
        />
      </button>
    </div>
  );
}
