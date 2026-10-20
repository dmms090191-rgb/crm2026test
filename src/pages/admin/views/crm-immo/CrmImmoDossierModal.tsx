import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  COLONNES_SYSTEME, TYPES_COLONNE, SAISIE_VIDE,
  type DossierImmo, type ColonneImmo, type SaisieDossier, type ChampSysteme,
} from './crmImmoTypes';

/**
 * Creation ET modification d'un dossier. `dossier` a null = creation.
 *
 * ---------- LA VALIDATION EST DOUBLE, ET C'EST VOLONTAIRE ----------
 *
 * Le formulaire refuse ici ce que la base refuserait de toute facon : nom vide,
 * jour d'encaissement hors de 1-31, date de fin anterieure a la date d'entree. Les trois
 * sont des CHECK en base, donc on ne peut pas les contourner — mais un refus cote base
 * revient sous la forme d'un message Postgres que personne ne comprend. Valider deux
 * fois, c'est offrir un message clair SANS perdre la garantie.
 *
 * Les colonnes PERSONNALISEES sont saisies par leur ID, jamais par leur nom : c'est la
 * cle du jsonb. Renommer une colonne ne casse donc aucun formulaire ouvert.
 */

interface Props {
  dossier: DossierImmo | null;
  colonnesPerso: ColonneImmo[];
  enCours: boolean;
  erreur: string;
  onFermer: () => void;
  onValider: (s: SaisieDossier) => void;
}

/** Une ligne de base devient une saisie : null devient chaine vide, jamais "null". */
function versSaisie(d: DossierImmo): SaisieDossier {
  const s = (v: string | null) => v ?? '';
  const valeurs: Record<string, string> = {};
  for (const [cle, v] of Object.entries(d.valeurs ?? {})) {
    valeurs[cle] = v === null || v === undefined ? '' : String(v);
  }
  return {
    nom: d.nom, prenom: s(d.prenom), email: s(d.email), telephone: s(d.telephone),
    date_entree: s(d.date_entree), date_fin_contrat: s(d.date_fin_contrat),
    locataire: s(d.locataire), proprietaire: s(d.proprietaire),
    jour_encaissement: d.jour_encaissement === null ? '' : String(d.jour_encaissement),
    commentaire: s(d.commentaire), valeurs,
  };
}

/** Le type de champ HTML qui convient a une colonne systeme. */
const TYPE_HTML: Record<ChampSysteme, string> = {
  nom: 'text', prenom: 'text', email: 'email', telephone: 'tel',
  date_entree: 'date', date_fin_contrat: 'date',
  locataire: 'text', proprietaire: 'text',
  jour_encaissement: 'number', commentaire: 'textarea',
};

export default function CrmImmoDossierModal({
  dossier, colonnesPerso, enCours, erreur, onFermer, onValider,
}: Props) {
  const t = useThemeTokens();
  const [saisie, setSaisie] = useState<SaisieDossier>(SAISIE_VIDE);

  useEffect(() => {
    setSaisie(dossier ? versSaisie(dossier) : SAISIE_VIDE);
  }, [dossier]);

  const poser = (cle: keyof SaisieDossier, v: string) => setSaisie(p => ({ ...p, [cle]: v }));
  const poserValeur = (id: string, v: string) =>
    setSaisie(p => ({ ...p, valeurs: { ...p.valeurs, [id]: v } }));

  /* Les memes regles que les CHECK de la base, dans le meme ordre. */
  const probleme = useMemo(() => {
    if (saisie.nom.trim() === '') return 'Le nom du client est obligatoire.';
    const j = saisie.jour_encaissement.trim();
    if (j !== '') {
      const n = Number(j);
      if (!Number.isInteger(n) || n < 1 || n > 31) {
        return "Le jour d'encaissement doit être un entier entre 1 et 31.";
      }
    }
    if (saisie.date_entree && saisie.date_fin_contrat
      && saisie.date_fin_contrat < saisie.date_entree) {
      return "La fin de contrat ne peut pas précéder la date d'entrée.";
    }
    return '';
  }, [saisie]);

  const champ = (cle: ChampSysteme) => {
    const def = COLONNES_SYSTEME.find(d => d.cle === cle)!;
    const type = TYPE_HTML[cle];
    const commun = {
      value: saisie[cle] as string,
      onChange: (e: { target: { value: string } }) => poser(cle, e.target.value),
      'data-testid': `crm-immo-champ-${cle}`,
      className: 'w-full px-3 py-2 rounded-lg text-sm outline-none',
      style: { background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue },
    };
    return (
      <label key={cle} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
        <span className="block text-xs mb-1" style={{ color: t.modal.fieldLabel }}>
          {def.libelle}{cle === 'nom' && ' *'}
        </span>
        {type === 'textarea'
          ? <textarea {...commun} rows={3} />
          : <input {...commun} type={type} {...(cle === 'jour_encaissement' ? { min: 1, max: 31, step: 1 } : {})} />}
        {cle === 'jour_encaissement' && (
          <span className="block text-[11px] mt-1" style={{ color: t.label.hint }}>
            Jour du mois. « 5 » = le 5 de chaque mois ; « 31 » est ramené au dernier jour des mois plus courts.
          </span>
        )}
      </label>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-immo-dossier-modal">
      <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: t.modal.title }}>
              {dossier ? 'Modifier le dossier' : 'Ajouter un client'}
            </h2>
            <p className="text-xs" style={{ color: t.modal.subtitle }}>
              Seul le nom du client est obligatoire.
            </p>
          </div>
          <button type="button" onClick={onFermer} disabled={enCours} title="Fermer"
            data-testid="crm-immo-dossier-fermer"
            className="p-1.5 rounded-lg disabled:opacity-50"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLONNES_SYSTEME.map(d => champ(d.cle))}
          </div>

          {colonnesPerso.length > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: t.label.hint }}>
                Vos colonnes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {colonnesPerso.map(c => (
                  <label key={c.id}>
                    <span className="block text-xs mb-1" style={{ color: t.modal.fieldLabel }}>{c.nom}</span>
                    {c.type === 'oui_non' ? (
                      <select
                        value={saisie.valeurs[c.id] ?? ''}
                        onChange={e => poserValeur(c.id, e.target.value)}
                        data-testid={`crm-immo-champ-perso-${c.id}`}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: t.selectBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}>
                        <option value="">—</option>
                        <option value="Oui">Oui</option>
                        <option value="Non">Non</option>
                      </select>
                    ) : (
                      <input
                        type={c.type === 'nombre' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                        value={saisie.valeurs[c.id] ?? ''}
                        onChange={e => poserValeur(c.id, e.target.value)}
                        data-testid={`crm-immo-champ-perso-${c.id}`}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}
                      />
                    )}
                    <span className="block text-[11px] mt-1" style={{ color: t.label.hint }}>
                      {TYPES_COLONNE.find(x => x.valeur === c.type)?.libelle}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 shrink-0 flex flex-col gap-2" style={{ borderTop: `1px solid ${t.modal.border}` }}>
          {/* Le probleme local d'abord, l'erreur serveur ensuite : la premiere empeche
              d'envoyer, la seconde raconte ce que la base a refuse. */}
          {probleme !== '' && (
            <p className="text-xs px-3 py-2 rounded-lg" data-testid="crm-immo-dossier-probleme"
              style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
              {probleme}
            </p>
          )}
          {erreur !== '' && (
            <p className="text-xs px-3 py-2 rounded-lg" data-testid="crm-immo-dossier-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onFermer} disabled={enCours}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
              Annuler
            </button>
            <button type="button" onClick={() => onValider(saisie)}
              disabled={enCours || probleme !== ''}
              data-testid="crm-immo-dossier-valider"
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: t.accent.solid, color: t.text.inverse }}>
              {enCours ? 'Enregistrement…' : dossier ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
