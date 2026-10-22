import { useState, useMemo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { enDateFrancaise } from '../../../../lib/crmImmoAlertes';
import { construireEcheancier } from '../../../../lib/crmImmoEcheancier';
import { useFermetureModale } from './useFermetureModale';
import type { PeriodeEnregistree } from './useCrmImmoEcheancier';

/**
 * RENOUVELER LE CONTRAT.
 *
 * ---------- CE QUE LA VALIDATION FAIT, ET NE FAIT PAS ----------
 *
 * Elle CLOTURE l'ancienne periode et en cree une nouvelle. L'ancienne est conservee avec
 * son echeancier et ses encaissements : c'est tout l'objet du renouvellement, et David
 * l'a pose en regle — << Je ne veux pas ecraser l'ancienne periode sans trace. >>
 *
 * L'ordre n'est pas une discipline : un index partiel unique interdit deux periodes en
 * cours, donc inserer avant de cloturer echoue en base. Et les trois colonnes du dossier
 * se resynchronisent par declencheur, sans que cet ecran ait a les ecrire.
 *
 * ---------- L'APERCU AVANT DE VALIDER ----------
 *
 * Le nombre de loyers et les premieres echeances s'affichent AVANT la validation, par la
 * meme fonction que l'onglet Echeancier. On voit donc ce qu'on va creer — y compris
 * qu'une periode mal saisie ne produirait aucun loyer.
 */

interface Props {
  periodeActive: PeriodeEnregistree | null;
  enCours: boolean;
  erreur: string;
  onFermer: () => void;
  onValider: (debut: string, fin: string, jour: number) => void;
}

export default function CrmImmoRenouvelerModal({
  periodeActive, enCours, erreur, onFermer, onValider,
}: Props) {
  const t = useThemeTokens();

  /* Le jour d'encaissement est REPRIS de la periode en cours, et reste modifiable :
     un renouvellement change rarement le jour, mais il peut. */
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [jour, setJour] = useState(String(periodeActive?.jour_encaissement ?? ''));

  const aPerdre = debut !== '' || fin !== '' || jour !== String(periodeActive?.jour_encaissement ?? '');
  const fermeture = useFermetureModale({ onFermer, bloquee: enCours, aPerdre });

  /* L'APERCU : la meme fonction que l'onglet Echeancier, jamais un second calcul. */
  const apercu = useMemo(
    () => construireEcheancier({ debut, fin, jour: Number(jour) }),
    [debut, fin, jour],
  );

  const champ = 'w-full px-3 py-2 rounded-lg text-sm max-md:text-base outline-none';
  const styleChamp = {
    background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: t.surface.overlay }}
      data-testid="crm-immo-renouveler-modal"
      {...fermeture.proprietesDuFond}>
      {/* `max-h-[90dvh]` et non `vh` : `vh` ne rapetisse pas quand le clavier mobile
          monte, et la modale se retrouve coupee au moment ou l'on saisit. */}
      <div className="w-full max-w-lg rounded-2xl p-4 flex flex-col gap-3 max-h-[90dvh] overflow-auto"
        style={{ background: t.card.bg, border: `1px solid ${t.surface.border}` }}>

        <div className="flex items-start gap-2">
          <RefreshCw className="w-5 h-5 shrink-0 mt-0.5" style={{ color: t.accent.text }} />
          <div className="min-w-0">
            <h3 className="text-sm font-bold" style={{ color: t.heading.primary }}>
              Renouveler le contrat
            </h3>
            {periodeActive && (
              <p className="text-[11px] mt-0.5 break-words" style={{ color: t.label.hint }}>
                Période en cours : du {enDateFrancaise(periodeActive.debut)} au{' '}
                {enDateFrancaise(periodeActive.fin)}. Elle sera conservée dans l'historique.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className="block text-xs mb-1" style={{ color: t.modal.fieldLabel }}>
              Nouvelle date de début *
            </span>
            <input type="date" value={debut} onChange={e => { setDebut(e.target.value); fermeture.reinitialiser(); }}
              data-testid="crm-immo-renouveler-debut" className={champ} style={styleChamp} />
          </label>
          <label>
            <span className="block text-xs mb-1" style={{ color: t.modal.fieldLabel }}>
              Nouvelle date de fin *
            </span>
            <input type="date" value={fin} onChange={e => { setFin(e.target.value); fermeture.reinitialiser(); }}
              data-testid="crm-immo-renouveler-fin" className={champ} style={styleChamp} />
          </label>
          <label>
            <span className="block text-xs mb-1" style={{ color: t.modal.fieldLabel }}>
              Jour d'encaissement
            </span>
            <select value={jour} onChange={e => { setJour(e.target.value); fermeture.reinitialiser(); }}
              data-testid="crm-immo-renouveler-jour" className={champ}
              style={{ ...styleChamp, background: t.selectBg }}>
              <option value="">—</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {n === 29 ? '29 (28 en février, sauf année bissextile)'
                    : n === 30 ? '30 (28 ou 29 en février)'
                    : n === 31 ? '31 (dernier jour du mois)' : n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* L'APERCU : ce que la validation va reellement creer. */}
        <div className="rounded-lg p-2.5 text-xs break-words"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
          data-testid="crm-immo-renouveler-apercu">
          {apercu.length === 0
            ? "Renseignez les deux dates et le jour pour voir le nouvel échéancier."
            : (
              <>
                <strong style={{ color: t.text.secondary }}>
                  {apercu.length} loyer{apercu.length > 1 ? 's' : ''}
                </strong>
                {' — du '}{enDateFrancaise(apercu[0].date)}
                {' au '}{enDateFrancaise(apercu[apercu.length - 1].date)}
                {/* La numerotation RECOMMENCE a 1 : la nouvelle periode est un autre
                    echeancier, et l'ancienne garde le sien. */}
                <span style={{ color: t.label.hint }}> · la numérotation repart à 1.</span>
              </>
            )}
        </div>

        {fermeture.confirmationDemandee && (
          <p className="text-xs px-2.5 py-1.5 rounded-lg" data-testid="crm-immo-renouveler-rearme"
            style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
            Refaites le même geste pour fermer sans renouveler.
          </p>
        )}

        {erreur !== '' && (
          <p className="text-xs px-2.5 py-1.5 rounded-lg break-words" data-testid="crm-immo-renouveler-erreur"
            style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />{erreur}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button type="button" onClick={onFermer} disabled={enCours}
            data-testid="crm-immo-renouveler-annuler" aria-label="Annuler le renouvellement"
            className="px-3 py-2 max-md:px-4 max-md:py-3 rounded-lg text-sm font-semibold"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
            Annuler
          </button>
          <button type="button"
            onClick={() => onValider(debut, fin, Number(jour))}
            disabled={enCours || apercu.length === 0}
            data-testid="crm-immo-renouveler-valider"
            aria-label="Valider le renouvellement du contrat"
            className="px-3 py-2 max-md:px-4 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: t.accent.solid, border: `1px solid ${t.accent.solid}`, color: t.text.inverse }}>
            {enCours ? 'Renouvellement…' : 'Renouveler'}
          </button>
        </div>
      </div>
    </div>
  );
}
