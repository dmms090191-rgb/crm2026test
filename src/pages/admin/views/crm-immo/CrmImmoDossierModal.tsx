import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useFermetureModale } from './useFermetureModale';
import CrmImmoChampsDossier from './CrmImmoChampsDossier';
import {
  problemeDeSaisie, SAISIE_VIDE,
  type DossierImmo, type ColonneImmo, type SaisieDossier,
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
    commentaire: s(d.commentaire), mode_paiement: s(d.mode_paiement), valeurs,
  };
}

export default function CrmImmoDossierModal({
  dossier, colonnesPerso, enCours, erreur, onFermer, onValider,
}: Props) {
  const t = useThemeTokens();
  const [saisie, setSaisie] = useState<SaisieDossier>(SAISIE_VIDE);

  useEffect(() => {
    setSaisie(dossier ? versSaisie(dossier) : SAISIE_VIDE);
  }, [dossier]);

  /*
   * Le formulaire a-t-il ete touche ? On compare a l etat du depart plutot que de poser
   * un drapeau a chaque frappe : revenir soi-meme sur ses pas rend le formulaire intact,
   * et la modale se referme alors d un seul geste.
   */
  const depart = useMemo(
    () => JSON.stringify(dossier ? versSaisie(dossier) : SAISIE_VIDE),
    [dossier],
  );
  const modifie = JSON.stringify(saisie) !== depart;

  /*
   * Echap et le clic sur le fond ferment — mais pas au prix d une saisie.
   *
   * Sur telephone, la feuille occupe presque tout l ecran : le fond se reduit a une
   * bande de soixante-cinq pixels en haut, exactement la ou le pouce passe en tenant
   * l appareil. Un formulaire de dix champs ne doit pas partir sur ce geste-la. Quand
   * quelque chose a ete saisi, le premier geste ARME et le second ferme — la convention
   * du module, deja celle du bouton Supprimer d une colonne.
   */
  const fermeture = useFermetureModale({ onFermer, bloquee: enCours, aPerdre: modifie });

  const poser = (cle: keyof SaisieDossier, v: string) => {
    fermeture.reinitialiser();
    setSaisie(p => ({ ...p, [cle]: v }));
  };
  const poserValeur = (id: string, v: string) => {
    fermeture.reinitialiser();
    setSaisie(p => ({ ...p, valeurs: { ...p.valeurs, [id]: v } }));
  };

  /* La meme regle que les CHECK de la base. Partagee avec la modale Details :
     deux copies finiraient par diverger des contraintes qu elles annoncent. */
  const probleme = useMemo(() => problemeDeSaisie(saisie), [saisie]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-immo-dossier-modal"
      {...fermeture.proprietesDuFond}>
      {/* dvh et non vh : le clavier mobile ne change pas vh, et la barre des boutons
          passerait dessous. */}
      <div className="w-full sm:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
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
            aria-label={dossier ? 'Fermer la fiche sans enregistrer' : 'Fermer le formulaire sans enregistrer'}
            data-testid="crm-immo-dossier-fermer"
            /* Mesure a 375 px : 28 x 28. Un ::before de -8px porte la zone a 44 x 44.
               Le bouton est seul dans son coin — son voisin est le bloc de titre, qui
               n est pas cliquable : aucune collision possible. */
            className="relative p-1.5 rounded-lg disabled:opacity-50 max-md:before:absolute max-md:before:content-[''] max-md:before:-inset-2"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          <CrmImmoChampsDossier
            saisie={saisie}
            colonnesPerso={colonnesPerso}
            onPoser={poser}
            onPoserValeur={poserValeur}
          />
        </div>

        <div className="px-4 py-3 shrink-0 flex flex-col gap-2"
          style={{ borderTop: `1px solid ${t.modal.border}`, paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          {/* Le probleme local d'abord, l'erreur serveur ensuite : la premiere empeche
              d'envoyer, la seconde raconte ce que la base a refuse. */}
          {fermeture.confirmationDemandee && (
            <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-dossier-confirmer-fermeture"
              style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
              Vos modifications seront perdues. Appuyez de nouveau sur Échap, ou cliquez de nouveau à côté, pour fermer sans enregistrer.
            </p>
          )}
          {probleme !== '' && (
            <p className="text-xs px-3 py-2 rounded-lg" data-testid="crm-immo-dossier-probleme"
              style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
              {probleme}
            </p>
          )}
          {erreur !== '' && (
            <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-dossier-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onFermer} disabled={enCours}
              /* Mesure a 375 px : 38 px de haut. max-md:py-3 porte a 46. */
              className="px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
              Annuler
            </button>
            <button type="button" onClick={() => onValider(saisie)}
              disabled={enCours || probleme !== ''}
              data-testid="crm-immo-dossier-valider"
              className="px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: t.accent.solid, color: t.text.inverse }}>
              {enCours ? 'Enregistrement…' : dossier ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
