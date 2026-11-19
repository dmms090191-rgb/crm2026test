import { FolderPlus, FolderInput, AlertCircle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Onglet } from '../../../../lib/ongletsLeads';
import type { ChoixOngletUi } from './useImportLeads';

interface Props {
  onglets: Onglet[];
  choix: ChoixOngletUi;
  onChoix: (c: ChoixOngletUi) => void;
  nomNouvel: string;
  onNomNouvel: (v: string) => void;
  erreurNom: string | null;
  erreurChargement: string;
}

/*
 * L'ETAPE OBLIGATOIRE : OU RANGER CE FICHIER.
 *
 * Demande de David : a chaque import, choisir « Ajouter a un onglet de colonnes existant »
 * ou « Creer un nouvel onglet de colonnes ». Rien n'est pre-coche : tant qu'aucun choix
 * n'est fait, le bouton d'import reste inactif. Un onglet existant garde ses colonnes, en
 * gagne de nouvelles a droite si le fichier en apporte, et n'en perd jamais.
 */
export default function OngletImportChoix({ onglets, choix, onChoix, nomNouvel, onNomNouvel, erreurNom, erreurChargement }: Props) {
  const t = useThemeTokens();
  const aucunExistant = onglets.length === 0;
  const carte = (actif: boolean, desactive = false): React.CSSProperties => ({
    background: actif ? 'rgba(34,211,238,0.06)' : t.surface.tertiary,
    border: actif ? t.accent.border : t.surface.borderLight,
    opacity: desactive ? 0.5 : 1,
    cursor: desactive ? 'not-allowed' : 'pointer',
  });
  const pastille = (actif: boolean): React.CSSProperties => ({
    border: actif ? `5px solid ${t.accent.text}` : `2px solid ${t.surface.border}`,
  });

  return (
    <section className="rounded-2xl p-3 sm:p-4 space-y-3" style={{ background: t.card.bg, border: choix ? t.card.border : `1px solid ${t.accent.solid}` }} aria-labelledby="titre-onglet-import">
      <div>
        <p id="titre-onglet-import" className="text-xs font-bold tracking-widest uppercase" style={{ color: t.text.tertiary }}>
          Onglet de colonnes <span style={{ color: t.danger.text }}>*</span>
        </p>
        <p className="text-[11px] mt-1" style={{ color: t.text.quaternary }}>
          Les leads de ce fichier et toutes ses colonnes seront rangés dans cet onglet du CRM. Ils restent aussi visibles dans « Principal ».
        </p>
      </div>

      {erreurChargement && (
        <p className="flex items-center gap-1.5 text-[11px]" style={{ color: t.danger.text }}>
          <AlertCircle className="w-3.5 h-3.5" />Onglets illisibles : {erreurChargement}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Onglet de destination">
        <div className="rounded-xl p-3 space-y-2" style={carte(choix?.type === 'existant', aucunExistant)}>
          <button
            type="button" role="radio" aria-checked={choix?.type === 'existant'} disabled={aucunExistant}
            onClick={() => onChoix({ type: 'existant', ongletId: choix?.type === 'existant' ? choix.ongletId : onglets[0]?.id ?? '' })}
            className="w-full flex items-start gap-2.5 text-left disabled:cursor-not-allowed"
          >
            <span className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={pastille(choix?.type === 'existant')} />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: choix?.type === 'existant' ? t.accent.text : t.text.secondary }}>
                <FolderInput className="w-3.5 h-3.5" />Ajouter à un onglet de colonnes existant
              </span>
              <span className="block text-[10px] mt-0.5" style={{ color: t.text.tertiary }}>
                {aucunExistant ? 'Aucun onglet pour l\'instant.' : 'Réutilise ses colonnes et ajoute celles qui manquent.'}
              </span>
            </span>
          </button>
          {choix?.type === 'existant' && (
            <select
              aria-label="Onglet existant"
              value={choix.ongletId}
              onChange={e => onChoix({ type: 'existant', ongletId: e.target.value })}
              className="w-full h-10 px-3 rounded-lg text-xs focus:outline-none"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.input.text }}
            >
              {onglets.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
            </select>
          )}
        </div>

        <div className="rounded-xl p-3 space-y-2" style={carte(choix?.type === 'nouveau')}>
          <button
            type="button" role="radio" aria-checked={choix?.type === 'nouveau'}
            onClick={() => onChoix({ type: 'nouveau' })}
            className="w-full flex items-start gap-2.5 text-left"
          >
            <span className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={pastille(choix?.type === 'nouveau')} />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: choix?.type === 'nouveau' ? t.accent.text : t.text.secondary }}>
                <FolderPlus className="w-3.5 h-3.5" />Créer un nouvel onglet de colonnes
              </span>
              <span className="block text-[10px] mt-0.5" style={{ color: t.text.tertiary }}>Les colonnes du fichier deviennent les colonnes de l'onglet.</span>
            </span>
          </button>
          {choix?.type === 'nouveau' && (
            <div>
              <input
                aria-label="Nom du nouvel onglet"
                value={nomNouvel}
                maxLength={80}
                onChange={e => onNomNouvel(e.target.value)}
                placeholder="Ex. : Tatoueurs Rennes"
                className="w-full h-10 px-3 rounded-lg text-xs focus:outline-none"
                style={{ background: t.surface.secondary, border: `1px solid ${erreurNom ? t.danger.text : t.surface.border}`, color: t.input.text }}
              />
              {erreurNom && <p className="text-[10px] mt-1" style={{ color: t.danger.text }} role="alert">{erreurNom}</p>}
            </div>
          )}
        </div>
      </div>
      {!choix && <p className="text-[11px]" style={{ color: t.accent.text }}>Choisissez où ranger ce fichier pour pouvoir l'importer.</p>}
    </section>
  );
}
