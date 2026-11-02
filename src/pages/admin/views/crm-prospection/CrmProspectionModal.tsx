import { useState } from 'react';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useFermetureModale } from '../crm-immo/useFermetureModale';
import type { SaisieProspection } from './useCrmProspectionData';
import type { StatutProspection } from '../../../../lib/crmProspectionRecherche';

/**
 * AJOUTER OU MODIFIER UN LEAD. Une seule modale pour les deux : les champs sont les
 * memes, et deux formulaires jumeaux divergent toujours.
 *
 * LA FERMETURE PASSE PAR useFermetureModale DU MODULE CRM IMMO — le seul crochet du depot
 * qui traite correctement les trois cas : Echap et le clic sur le fond ferment, AUCUN
 * geste ne ferme pendant une ecriture en vol, et quand il y a quelque chose a perdre il
 * faut DEUX gestes. Ici `aPerdre` vaut vrai des qu'un champ a ete touche : fermer d'un
 * clic a cote apres avoir saisi dix champs serait la pire facon de perdre son travail.
 */

interface Props {
  /** Le lead en cours de modification, ou null pour une creation. */
  initial: SaisieProspection | null;
  statuts: readonly StatutProspection[];
  enCours: boolean;
  erreur: string;
  onAnnuler: () => void;
  onValider: (saisie: SaisieProspection) => void;
}

const CHAMPS: ReadonlyArray<{ cle: keyof SaisieProspection; libelle: string; type: string; aide?: string }> = [
  { cle: 'nom', libelle: 'Nom', type: 'text' },
  { cle: 'prenom', libelle: 'Prénom', type: 'text' },
  { cle: 'email', libelle: 'Email', type: 'email' },
  { cle: 'poste', libelle: 'Poste', type: 'text' },
  /* « Societe » a l'ecran, `entreprise` en base : l'employeur du prospect. */
  { cle: 'entreprise', libelle: 'Société', type: 'text' },
  {
    cle: 'lien', libelle: 'Lien', type: 'url',
    aide: 'Site, LinkedIn, Instagram, Facebook… L’adresse doit commencer par https://',
  },
];

export default function CrmProspectionModal({ initial, statuts, enCours, erreur, onAnnuler, onValider }: Props) {
  const t = useThemeTokens();
  const [saisie, setSaisie] = useState<SaisieProspection>(
    initial ?? { nom: '', prenom: '', email: '', poste: '', entreprise: '', lien: '', statut_id: null, commentaire: '' },
  );
  const [touche, setTouche] = useState(false);

  const fermeture = useFermetureModale({ onFermer: onAnnuler, bloquee: enCours, aPerdre: touche });

  function poser<K extends keyof SaisieProspection>(cle: K, valeur: SaisieProspection[K]) {
    setTouche(true);
    setSaisie((s) => ({ ...s, [cle]: valeur }));
  }

  /* Le nom est le seul champ obligatoire, et la base le refuse aussi (contrainte
     crm_prospection_leads_nom_non_vide). Le bouton reste donc eteint plutot que de
     laisser partir une requete dont on connait deja le refus. */
  const valide = saisie.nom.trim() !== '';

  const champStyle = {
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    color: t.input.text,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-prospection-modal"
      {...fermeture.proprietesDuFond}>
      <div className="w-full max-w-lg max-h-[92dvh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="px-5 py-3.5 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          <h2 className="text-base font-bold" style={{ color: t.modal.title }}>
            {initial ? 'Modifier le lead' : 'Nouveau lead'}
          </h2>
          {/* LE X PASSE PAR `demander`, PAS PAR onAnnuler. C'est la lecon ecrite dans
              useFermetureModale : branche en direct, il ferme SANS prevenir, et dix
              champs saisis partent en un geste. `demander` arme la confirmation. */}
          <button type="button" onClick={fermeture.demander} disabled={enCours} aria-label="Fermer"
            className="w-8 h-8 rounded-lg inline-flex items-center justify-center disabled:opacity-40"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain grid gap-3">
          {CHAMPS.map((c) => (
            <label key={c.cle} className="grid gap-1">
              <span className="text-xs font-medium" style={{ color: t.modal.fieldLabel }}>
                {c.libelle}{c.cle === 'nom' && <span style={{ color: t.danger.text }}> *</span>}
              </span>
              <input
                type={c.type}
                data-testid={`crm-prospection-champ-${c.cle}`}
                value={saisie[c.cle] as string}
                onChange={(e) => poser(c.cle, e.target.value as SaisieProspection[typeof c.cle])}
                disabled={enCours}
                className="h-10 px-3 rounded-lg text-sm outline-none"
                style={champStyle}
              />
              {c.aide && <span className="text-[11px]" style={{ color: t.label.hint }}>{c.aide}</span>}
            </label>
          ))}

          <label className="grid gap-1">
            <span className="text-xs font-medium" style={{ color: t.modal.fieldLabel }}>Statut</span>
            {/*
              LE MEME CATALOGUE QUE LE CRM LEADS. La liste vient de public.statuts, filtree
              sur la Societe. Si elle est vide, c'est qu'aucun statut n'a ete cree dans
              l'onglet Statuts — on le DIT, plutot que d'afficher une liste muette.
            */}
            <select
              data-testid="crm-prospection-champ-statut"
              value={saisie.statut_id ?? ''}
              onChange={(e) => poser('statut_id', e.target.value === '' ? null : e.target.value)}
              disabled={enCours}
              className="h-10 px-3 rounded-lg text-sm outline-none"
              style={champStyle}
            >
              <option value="">Sans statut</option>
              {statuts.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            {statuts.length === 0 && (
              <span className="text-[11px]" style={{ color: t.label.hint }}>
                Aucun statut n’existe encore. Créez-en dans l’onglet « Statuts » — ce sont les mêmes
                que ceux du CRM Leads.
              </span>
            )}
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium" style={{ color: t.modal.fieldLabel }}>Commentaire</span>
            <textarea
              data-testid="crm-prospection-champ-commentaire"
              value={saisie.commentaire}
              onChange={(e) => poser('commentaire', e.target.value)}
              disabled={enCours}
              rows={4}
              maxLength={5000}
              className="px-3 py-2 rounded-lg text-sm outline-none resize-y"
              style={champStyle}
            />
            <span className="text-[11px]" style={{ color: t.label.hint }}>
              {saisie.commentaire.length} / 5 000
            </span>
          </label>

          {erreur !== '' && (
            <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-prospection-modal-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}
        </div>

        <div className="px-5 py-3 shrink-0 flex flex-wrap justify-end gap-2"
          style={{ borderTop: `1px solid ${t.modal.border}`, paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          {fermeture.confirmationDemandee && (
            <p className="w-full text-xs mb-1" style={{ color: t.label.hint }}>
              Vos modifications seront perdues. Appuyez à nouveau pour fermer.
            </p>
          )}
          <button type="button" onClick={fermeture.demander} disabled={enCours}
            className="h-10 px-4 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}>
            Annuler
          </button>
          <button type="button" onClick={() => onValider(saisie)} disabled={enCours || !valide}
            data-testid="crm-prospection-valider"
            className="h-10 px-4 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: t.accent.solid, color: t.text.inverse }}>
            {enCours ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}
