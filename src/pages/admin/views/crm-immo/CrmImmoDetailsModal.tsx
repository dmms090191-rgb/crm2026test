import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Pencil, Save, Info, MessageSquare , CalendarClock } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useFermetureModale } from './useFermetureModale';
import { useCrmImmoCommentaires } from './useCrmImmoCommentaires';
import CrmImmoChampsDossier from './CrmImmoChampsDossier';
import CrmImmoCommentaires from './CrmImmoCommentaires';
import { enDateFrancaise } from '../../../../lib/crmImmoAlertes';
import CrmImmoEcheancier from './CrmImmoEcheancier';
import CrmImmoRenouvelerModal from './CrmImmoRenouvelerModal';
import { useCrmImmoEcheancier, type EncaissementDossier } from './useCrmImmoEcheancier';
import {
  problemeDeSaisie, SAISIE_VIDE, type DossierImmo, type ColonneImmo, type SaisieDossier
} from './crmImmoTypes';

/**
 * LA MODALE DETAILS — tout un dossier, en deux onglets.
 *
 * ---------- POURQUOI UNE MODALE DE PLUS, ET NON DES ONGLETS DANS CELLE QUI EXISTE ----------
 *
 * CrmImmoDossierModal sert d'abord a CREER un client. Lui ajouter un onglet Commentaires
 * donnerait un onglet vide et desactive la moitie du temps : un dossier qui n'existe pas
 * encore n'a pas d'historique, et n'en aura pas tant qu'il n'est pas enregistre.
 *
 * Les deux modales ne se dupliquent pas pour autant : les champs sont dessines par
 * CrmImmoChampsDossier, et la validation par problemeDeSaisie — un seul endroit pour les
 * deux. Ce qui differe ici, c'est l'enveloppe : des onglets, un mode lecture, et un
 * passage en modification explicite.
 *
 * ---------- UNE SEULE MODALE POUR DEUX PORTES D'ENTREE ----------
 *
 * Exigence de David : << Je ne veux pas deux modales differentes. >> Le bouton Details
 * l'ouvre sur Informations, le bouton Commentaires du tableau l'ouvre sur Commentaires.
 * C'est la meme modale : l'onglet de depart est une PROP, pas une seconde modale.
 *
 * ---------- ON CONSULTE D'ABORD ----------
 *
 * L'onglet Informations s'ouvre en LECTURE. On vient voir un dossier beaucoup plus
 * souvent qu'on ne vient le corriger, et un formulaire ouvert invite a modifier ce qu'on
 * voulait seulement lire. << Modifier >> bascule, << Annuler >> revient en arriere en
 * jetant les changements, << Enregistrer >> ecrit vraiment en base.
 */

export type OngletDetails = 'informations' | 'commentaires' | 'echeancier';

interface Props {
  dossier: DossierImmo;
  colonnesPerso: ColonneImmo[];
  /** L'onglet affiche a l'ouverture. Details -> informations, Commentaires -> commentaires. */
  ongletInitial: OngletDetails;
  enCours: boolean;
  erreur: string;
  onFermer: () => void;
  onEnregistrer: (s: SaisieDossier) => void;
  /**
   * Appele quand la PERIODE de bail a change — renouvellement, encaissement, annulation.
   *
   * L'echeancier se recharge tout seul, mais la LISTE de la page et le CLASSEMENT du
   * tableau de bord, eux, ne savent rien : ils relisent sur leur propre rythme, a cinq
   * minutes d'intervalle et jamais en phase. Sans ce signal, un bail renouvele garde
   * ses anciennes dates dans la liste, et reste dans la mauvaise categorie, jusqu'au
   * prochain passage reseau.
   */
  onPeriodeChangee?: () => void;
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

export default function CrmImmoDetailsModal({
  dossier, colonnesPerso, ongletInitial, enCours, erreur, onFermer, onEnregistrer, onPeriodeChangee,
}: Props) {
  const t = useThemeTokens();
  const [onglet, setOnglet] = useState<OngletDetails>(ongletInitial);

  /*
   * L'echeancier du dossier. Il ne calcule rien : les echeances, leur numero et leur
   * statut viennent de crmImmoEcheancier, la meme fonction que lisent les
   * notifications. Ce hook ne fait que charger les periodes et les encaissements.
   */
  const ech = useCrmImmoEcheancier(dossier.id);
  const [renouveler, setRenouveler] = useState(false);
  const [erreurEcheancier, setErreurEcheancier] = useState('');
  const [aAnnuler, setAAnnuler] = useState<EncaissementDossier | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [edition, setEdition] = useState(false);
  const [saisie, setSaisie] = useState<SaisieDossier>(SAISIE_VIDE);

  const commentaires = useCrmImmoCommentaires(dossier.id);

  const depart = useMemo(() => JSON.stringify(versSaisie(dossier)), [dossier]);
  useEffect(() => { setSaisie(JSON.parse(depart) as SaisieDossier); }, [depart]);

  /*
   * Un enregistrement reussi fait repasser en LECTURE.
   *
   * La modale ne sait pas directement que l ecriture a abouti : elle voit `enCours`
   * retomber a faux, et `erreur` rester vide. C est suffisant, et c est le seul signal
   * disponible sans remonter un rappel de succes jusqu ici.
   *
   * Elle ne se FERME pas pour autant : on vient d y consulter une fiche, la refermer
   * obligerait a la rouvrir pour verifier ce qu on vient d ecrire.
   */
  const enCoursAvant = useRef(enCours);
  useEffect(() => {
    if (enCoursAvant.current && !enCours && erreur === '') setEdition(false);
    enCoursAvant.current = enCours;
  }, [enCours, erreur]);

  const modifie = edition && JSON.stringify(saisie) !== depart;
  const probleme = problemeDeSaisie(saisie);

  /*
   * Echap et le clic sur le fond ferment — mais pas au prix d une saisie. Hors mode
   * edition il n y a rien a perdre : un seul geste suffit. En edition avec des
   * changements, le premier geste avertit et le second ferme.
   *
   * Le brouillon de commentaire, lui, n est PAS protege : il vit dans le panneau des
   * commentaires, qui ne sait rien de la fermeture. C est un arbitrage assume — proteger
   * les deux demanderait de remonter l etat du brouillon jusqu ici, pour un texte qu on
   * retape en quelques secondes, alors qu une fiche de dix champs ne se retape pas.
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

  function annulerEdition() {
    setSaisie(JSON.parse(depart) as SaisieDossier);
    setEdition(false);
    fermeture.reinitialiser();
  }

  const titre = [dossier.prenom, dossier.nom].filter(Boolean).join(' ').trim() || dossier.nom;
  const nombre = commentaires.liste.length;

  const ONGLETS: { cle: OngletDetails; libelle: string; icone: typeof Info }[] = [
    { cle: 'informations', libelle: 'Informations', icone: Info },
    { cle: 'commentaires', libelle: 'Commentaires', icone: MessageSquare },
    /* << Échéancier loyers >> : les echeances du bail, leur statut, et le loyer du mois
       en cours surligne. Il n'a pas de compteur comme les commentaires — le nombre de
       loyers est deja affiche dans l'onglet, avec la periode qui le produit. */
    { cle: 'echeancier', libelle: 'Échéancier loyers', icone: CalendarClock },
  ];

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-immo-details-modal"
      {...fermeture.proprietesDuFond}>

      {/* max-w-3xl : plus large que la modale de creation — c'est la << grande modale >>
          demandee. dvh et non vh : le clavier mobile ne change pas vh, et la barre des
          boutons passerait dessous. */}
      <div className="w-full sm:max-w-3xl max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="flex items-start justify-between gap-2 px-4 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          <div className="min-w-0">
            {/* break-words : le nom vient de l utilisateur, rien ne borne sa longueur. */}
            <h2 className="text-base font-bold break-words" style={{ color: t.modal.title }}
              data-testid="crm-immo-details-titre">
              {titre}
            </h2>
            <p className="text-xs" style={{ color: t.modal.subtitle }}>
              Dossier CRM Immo
            </p>
          </div>
          <button type="button" onClick={onFermer} disabled={enCours} title="Fermer"
            aria-label="Fermer le détail du dossier"
            data-testid="crm-immo-details-fermer"
            /* Mesure a 375 px : 28 x 28. Un ::before de -8px porte la zone a 44 x 44.
               Le bouton est seul dans son coin : aucune collision possible. */
            className="relative p-1.5 rounded-lg disabled:opacity-50 shrink-0 max-md:before:absolute max-md:before:content-[''] max-md:before:-inset-2"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/*
          LES ONGLETS. role="tablist" et aria-selected : un lecteur d'ecran annonce alors
          << onglet 1 sur 2, selectionne >> au lieu de deux boutons sans rapport.
        */}
        <div className="flex items-stretch gap-1 px-3 pt-2 shrink-0" role="tablist"
          style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          {ONGLETS.map(o => {
            const actif = onglet === o.cle;
            const Icone = o.icone;
            return (
              <button key={o.cle} type="button" role="tab" aria-selected={actif}
                onClick={() => setOnglet(o.cle)}
                data-testid={`crm-immo-details-onglet-${o.cle}`}
                /* py-3 : 44 px de haut au doigt, sans toucher a la largeur. */
                className="inline-flex items-center gap-1.5 px-3 py-3 rounded-t-lg text-sm font-semibold"
                style={actif
                  ? { color: t.accent.text, borderBottom: `2px solid ${t.accent.solid}` }
                  : { color: t.text.secondary, borderBottom: '2px solid transparent' }}>
                <Icone className="w-4 h-4" />
                {o.libelle}
                {o.cle === 'commentaires' && nombre > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                    data-testid="crm-immo-details-onglet-compte"
                    style={{ background: t.accent.solid, color: t.text.inverse }}>
                    {nombre > 99 ? '99+' : nombre}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {onglet === 'informations' && (
            <CrmImmoChampsDossier
              saisie={saisie}
              colonnesPerso={colonnesPerso}
              onPoser={poser}
              onPoserValeur={poserValeur}
              lectureSeule={!edition}
              /* L'onglet Commentaires remplace l'ancien champ unique : le montrer ici
                 laisserait croire qu'il y a deux endroits ou ecrire une note. */
              sansCommentaire
            />
          )}

          {onglet === 'commentaires' && <CrmImmoCommentaires etat={commentaires} />}

          {onglet === 'echeancier' && (
            <CrmImmoEcheancier
              echeancier={ech.echeancier}
              periodeAffichee={ech.periodeAffichee}
              periodeActive={ech.periodeActive}
              historique={ech.historique}
              encaissements={ech.encaissements}
              compteurs={ech.compteurs}
              chargement={ech.chargement}
              enCours={ech.enCours}
              echeancierDe={ech.echeancierDe}
              onEncaisser={async (date) => {
                const e = await ech.marquerEncaisse(date);
                setErreurEcheancier(e ?? '');
                if (!e) onPeriodeChangee?.();
              }}
              onAnnuler={(e) => { setAAnnuler(e); setMotifAnnulation(''); }}
              onRenouveler={() => { setErreurEcheancier(''); setRenouveler(true); }}
            />
          )}

          {(ech.erreur !== '' || erreurEcheancier !== '') && onglet === 'echeancier' && (
            <p className="text-xs px-3 py-2 rounded-lg break-words mt-3" data-testid="crm-immo-echeancier-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreurEcheancier || ech.erreur}
            </p>
          )}
        </div>

        <div className="px-4 py-3 shrink-0 flex flex-col gap-2"
          style={{ borderTop: `1px solid ${t.modal.border}`, paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>

          {fermeture.confirmationDemandee && (
            <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-details-confirmer-fermeture"
              style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
              Vos modifications seront perdues. Appuyez de nouveau sur Échap, ou cliquez de nouveau à côté, pour fermer sans enregistrer.
            </p>
          )}

          {edition && probleme !== '' && (
            <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-details-probleme"
              style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
              {probleme}
            </p>
          )}

          {erreur !== '' && (
            <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-details-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}

          {/* flex-wrap : a 375 px, trois boutons ne tiennent pas toujours sur une ligne. */}
          <div className="flex flex-wrap justify-end gap-2">
            {onglet === 'informations' && !edition && (
              <button type="button" onClick={() => setEdition(true)}
                data-testid="crm-immo-details-modifier"
                className="inline-flex items-center gap-1.5 px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold"
                style={{ background: t.accent.solid, color: t.text.inverse }}>
                <Pencil className="w-4 h-4" />
                Modifier
              </button>
            )}

            {onglet === 'informations' && edition && (
              <>
                <button type="button" onClick={annulerEdition} disabled={enCours}
                  data-testid="crm-immo-details-annuler"
                  className="px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                  Annuler
                </button>
                <button type="button" onClick={() => onEnregistrer(saisie)}
                  disabled={enCours || probleme !== ''}
                  data-testid="crm-immo-details-enregistrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: t.accent.solid, color: t.text.inverse }}>
                  <Save className="w-4 h-4" />
                  {enCours ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </>
            )}

            {onglet === 'commentaires' && (
              <button type="button" onClick={onFermer} disabled={enCours}
                data-testid="crm-immo-details-fermer-bas"
                className="px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {renouveler && (
      <CrmImmoRenouvelerModal
        periodeActive={ech.periodeActive}
        enCours={ech.enCours}
        erreur={erreurEcheancier}
        onFermer={() => { setRenouveler(false); setErreurEcheancier(''); }}
        onValider={async (debut, fin, jour) => {
          const e = await ech.renouveler(debut, fin, jour);
          if (e) { setErreurEcheancier(e); return; }
          setErreurEcheancier('');
          setRenouveler(false);
          onPeriodeChangee?.();
        }}
      />
    )}

    {aAnnuler && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: t.surface.overlay }} data-testid="crm-immo-annuler-modal">
        <div className="w-full max-w-md rounded-2xl p-4 flex flex-col gap-3 max-h-[90dvh] overflow-auto"
          style={{ background: t.card.bg, border: `1px solid ${t.surface.border}` }}>
          <h3 className="text-sm font-bold" style={{ color: t.heading.primary }}>
            Annuler l'encaissement du {enDateFrancaise(aAnnuler.echeance)} ?
          </h3>
          {/* L'annulation n'efface rien : la ligne est conservee, l'echeance redevient
              due, et la correction reste lisible dans l'historique. */}
          <p className="text-xs" style={{ color: t.text.tertiary }}>
            L'échéance redeviendra due. La ligne n'est pas supprimée : la correction reste
            visible dans l'historique des encaissements annulés.
          </p>
          <label>
            <span className="block text-xs mb-1" style={{ color: t.modal.fieldLabel }}>
              Motif (facultatif)
            </span>
            <input value={motifAnnulation} onChange={e => setMotifAnnulation(e.target.value)}
              data-testid="crm-immo-annuler-motif" maxLength={500}
              placeholder="Erreur de saisie, chèque rejeté…"
              className="w-full px-3 py-2 rounded-lg text-sm max-md:text-base outline-none"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }} />
          </label>
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button type="button" onClick={() => setAAnnuler(null)} disabled={ech.enCours}
              data-testid="crm-immo-annuler-renoncer" aria-label="Renoncer à annuler l'encaissement"
              className="px-3 py-2 max-md:px-4 max-md:py-3 rounded-lg text-sm font-semibold"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
              Renoncer
            </button>
            <button type="button" disabled={ech.enCours}
              onClick={async () => {
                const e = await ech.annulerEncaissement(aAnnuler.id, motifAnnulation);
                setErreurEcheancier(e ?? '');
                if (!e) { setAAnnuler(null); onPeriodeChangee?.(); }
              }}
              data-testid="crm-immo-annuler-confirmer"
              aria-label="Confirmer l'annulation de l'encaissement"
              className="px-3 py-2 max-md:px-4 max-md:py-3 rounded-lg text-sm font-semibold"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              Annuler l'encaissement
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}