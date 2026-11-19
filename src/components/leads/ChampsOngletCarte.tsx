import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { valeurDyn, type ColonneAffichee } from '../../lib/ongletsLeads';
import ValeurLead from './ValeurLead';

interface Props {
  lead: { data?: Record<string, string> | null };
  champs: ColonneAffichee[];
  /** Le titre de la carte est deja l'entreprise : ne pas la repeter dessous. */
  exclureEntreprise?: boolean;
}

/** Le nombre de champs montres d'emblee sur une carte : au-dela, « Voir plus ». */
export const CHAMPS_CARTE_VISIBLES = 4;

/*
 * LES COLONNES DE L'ONGLET, SUR UNE CARTE MOBILE.
 *
 * Seuls les champs REMPLIS sont montres — une carte n'est pas un formulaire, une ligne
 * « Instagram : — » n'apprend rien. Les quatre premiers d'emblee, dans l'ordre de l'onglet ;
 * le reste derriere « Voir plus ». Les liens ont une cible de 44 px (pouce).
 */
export default function ChampsOngletCarte({ lead, champs, exclureEntreprise }: Props) {
  const t = useThemeTokens();
  const [tout, setTout] = useState(false);
  const remplis = champs
    .filter(c => !(exclureEntreprise && c.type === 'entreprise'))
    .map(c => ({ c, v: valeurDyn(lead.data, c.cleData) }))
    .filter(x => x.v !== '');
  if (remplis.length === 0) return null;
  const montres = tout ? remplis : remplis.slice(0, CHAMPS_CARTE_VISIBLES);
  const caches = remplis.length - montres.length;

  return (
    <div className="mb-3">
      <dl className="grid grid-cols-1 gap-1.5">
        {montres.map(({ c, v }) => (
          <div key={c.cle} className="flex items-start gap-2 min-w-0">
            <dt className="text-[11px] w-24 flex-shrink-0 truncate pt-0.5" style={{ color: t.text.quaternary }} title={c.libelle}>{c.libelle}</dt>
            <dd className="min-w-0 flex-1"><ValeurLead valeur={v} type={c.type} tactile /></dd>
          </div>
        ))}
      </dl>
      {(caches > 0 || tout) && remplis.length > CHAMPS_CARTE_VISIBLES && (
        <button
          type="button"
          onClick={() => setTout(v => !v)}
          aria-expanded={tout}
          className="mt-1.5 inline-flex items-center gap-1 min-h-[44px] px-2 -ml-2 text-[11px] font-semibold"
          style={{ color: t.accent.text }}
        >
          {tout ? 'Voir moins' : `Voir plus (${caches})`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${tout ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}
