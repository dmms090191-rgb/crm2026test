import { useMemo, useState } from 'react';
import { Plus, Trash2, Inbox } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import CrmProspectionFilters from './crm-prospection/CrmProspectionFilters';
import CrmProspectionTable from './crm-prospection/CrmProspectionTable';
import CrmProspectionCards from './crm-prospection/CrmProspectionCards';
import CrmProspectionModal from './crm-prospection/CrmProspectionModal';
import CrmProspectionDeleteModal from './crm-prospection/CrmProspectionDeleteModal';
import CrmProspectionCommentaireModal from './crm-prospection/CrmProspectionCommentaireModal';
import { useCrmProspectionData, type SaisieProspection } from './crm-prospection/useCrmProspectionData';
import {
  leadsAffiches as calculerAffiches, idsSelectionnables, idsASupprimer, etatCaseEnTete,
  FILTRES_VIDES,
  type FiltresProspection, type LeadProspection, type ColonneTri, type SensTri,
} from '../../../lib/crmProspectionRecherche';

/**
 * LE CRM DE PROSPECTION DU PANEL SOCIETE.
 *
 * V1 volontairement simple, demandee par David le 02/11/2026 : des personnes a
 * contacter, avec leur entreprise, un lien, un statut et un commentaire. Ni
 * automatisation, ni IA, ni appel, ni agenda, ni scoring, ni pipeline, ni historique —
 * ecartes nommement, et a ne pas ajouter « parce que les autres CRM les ont ».
 *
 * ---------- CE QUI N'EST PAS APPELE ICI, ET POURQUOI ----------
 *
 * PAS DE useEditorMode(). Son fournisseur n'est pose que par AdminDashboard, que la
 * coquille telephone ne monte PAS : l'appeler ferait lever « useEditorMode must be used
 * within EditorModeProvider » au montage, et React remonterait jusqu'a l'ErrorBoundary —
 * remplacant tout l'ecran, barre d'onglets comprise, sans moyen d'en sortir autrement
 * qu'en relancant l'application. Aucun relevé ne l'attraperait : ils tournent sous Node,
 * sans ecran. La variante sure serait useEditorModeSafe, mais cette vue n'en a aucun
 * besoin.
 *
 * PAS DE useColumnOrder NI DE COLONNES PERSONNALISEES. David n'en a pas demande, et le
 * mecanisme existant range l'ordre des colonnes dans le localStorage — un defaut qu'il a
 * deja fait corriger ailleurs. On ne le rouvre pas ici.
 *
 * Les seuls contextes utilises sont ceux que la coquille telephone pose reellement :
 * Theme, CompanyId et Simulation.
 */

export default function CrmProspection() {
  const t = useThemeTokens();
  const { leads, statuts, chargement, erreur, creer, modifier, supprimer, isSimulating } = useCrmProspectionData();

  const [filtres, setFiltres] = useState<FiltresProspection>(FILTRES_VIDES);
  const [tri, setTri] = useState<ColonneTri>('nom');
  const [sens, setSens] = useState<SensTri>('asc');
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());

  const [edition, setEdition] = useState<{ id: string | null; saisie: SaisieProspection } | null>(null);
  const [aSupprimer, setASupprimer] = useState<LeadProspection | 'selection' | null>(null);
  const [commentaireOuvert, setCommentaireOuvert] = useState<LeadProspection | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreurAction, setErreurAction] = useState('');

  /**
   * LA LISTE AFFICHEE : filtree PUIS triee. C'est elle, et elle seule, qui sert de
   * reference a la case d'en-tete et a la suppression groupee — la regle que David a
   * posee en majuscules.
   */
  const affiches = useMemo(
    () => calculerAffiches(leads, filtres, tri, sens, statuts),
    [leads, filtres, tri, sens, statuts],
  );

  const etatCase = etatCaseEnTete(affiches, selection);
  /* Ce que la suppression groupee effacerait REELLEMENT : l'intersection de la selection
     avec les lignes visibles. C'est ce compte qu'on annonce, jamais selection.size. */
  const cibles = useMemo(() => idsASupprimer(affiches, selection), [affiches, selection]);

  function basculerUn(id: string) {
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  /**
   * LA CASE D'EN-TETE NE TOUCHE QUE LES LIGNES VISIBLES.
   *
   * Tout cocher = ajouter les ids affiches. Tout decocher = les RETIRER, sans effacer le
   * reste de la selection : une ligne cochee puis masquee par un filtre n'a pas a etre
   * oubliee parce qu'on a clique sur l'en-tete. Et comme la suppression intersecte avec
   * l'affichage, elle ne peut pas l'emporter non plus.
   */
  function basculerTous() {
    const ids = idsSelectionnables(affiches);
    setSelection((s) => {
      const n = new Set(s);
      if (etatCase === 'toute') ids.forEach((i) => n.delete(i));
      else ids.forEach((i) => n.add(i));
      return n;
    });
  }

  function trierPar(c: ColonneTri) {
    if (c === tri) setSens((s) => (s === 'asc' ? 'desc' : 'asc'));
    else { setTri(c); setSens('asc'); }
  }

  function ouvrirModification(l: LeadProspection) {
    setErreurAction('');
    setEdition({
      id: l.id,
      saisie: {
        nom: l.nom, prenom: l.prenom ?? '', email: l.email ?? '', poste: l.poste ?? '',
        entreprise: l.entreprise ?? '', lien: l.lien ?? '', statut_id: l.statut_id,
        commentaire: l.commentaire ?? '',
      },
    });
  }

  async function validerEdition(saisie: SaisieProspection) {
    if (!edition) return;
    setEnCours(true);
    const msg = edition.id === null ? await creer(saisie) : await modifier(edition.id, saisie);
    setEnCours(false);
    if (msg !== '') { setErreurAction(msg); return; }
    setEdition(null);
  }

  async function confirmerSuppression() {
    setEnCours(true);
    const ids = aSupprimer === 'selection' ? cibles : aSupprimer ? [aSupprimer.id] : [];
    const msg = await supprimer(ids);
    setEnCours(false);
    if (msg !== '') { setErreurAction(msg); return; }
    /* Les lignes effacees sortent aussi de la selection : la laisser pleine ferait
       afficher « Supprimer 3 » pour des lignes qui n'existent plus. */
    setSelection((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; });
    setASupprimer(null);
  }

  return (
    <div className="p-4 md:p-6" data-testid="crm-prospection">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: t.heading.primary }}>CRM Prospection</h1>
          <p className="text-sm" style={{ color: t.label.muted }}>
            Vos contacts de prospection. {leads.length} lead{leads.length > 1 ? 's' : ''}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/*
            « SUPPRIMER LA SELECTION » N'EXISTE QUE QUAND IL Y A QUELQUE CHOSE A
            SUPPRIMER, et le compte annonce est celui des lignes VISIBLES et cochees —
            pas la taille brute de la selection, qui peut contenir des lignes qu'un
            filtre masque depuis.
          */}
          {cibles.length > 0 && (
            <button type="button" onClick={() => { setErreurAction(''); setASupprimer('selection'); }}
              disabled={isSimulating}
              data-testid="crm-prospection-supprimer-selection"
              className="h-10 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              <Trash2 className="w-4 h-4" />
              Supprimer la sélection ({cibles.length})
            </button>
          )}

          <button type="button"
            onClick={() => { setErreurAction(''); setEdition({ id: null, saisie: { nom: '', prenom: '', email: '', poste: '', entreprise: '', lien: '', statut_id: null, commentaire: '' } }); }}
            disabled={isSimulating}
            data-testid="crm-prospection-ajouter"
            className="h-10 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: t.accent.solid, color: t.text.inverse }}>
            <Plus className="w-4 h-4" />
            Nouveau lead
          </button>
        </div>
      </div>

      {/* En Visu, Talvex LIT mais n'ecrit pas : meme regle que le CRM Leads, et on le DIT
          plutot que de laisser des boutons eteints sans explication. */}
      {isSimulating && (
        <p className="text-xs mb-3 px-3 py-2 rounded-lg" data-testid="crm-prospection-lecture-seule"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.label.muted }}>
          Mode visualisation : la lecture est autorisée, l’écriture ne l’est pas.
        </p>
      )}

      <CrmProspectionFilters
        filtres={filtres} onChange={setFiltres} statuts={statuts}
        nbAffiches={affiches.length} nbTotal={leads.length}
      />

      {erreur !== '' && (
        <p className="text-xs mb-3 px-3 py-2 rounded-lg break-words" data-testid="crm-prospection-erreur"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {erreur}
        </p>
      )}

      {chargement ? (
        <p className="text-sm py-8 text-center" style={{ color: t.label.muted }}>Chargement…</p>
      ) : affiches.length === 0 ? (
        /* DEUX VIDES DIFFERENTS, ET IL FAUT LES DISTINGUER : un CRM vide appelle « ajoutez
           un lead », une liste vidée par un filtre appelle « relâchez le filtre ». Les
           confondre fait chercher une panne la ou il n'y en a pas. */
        <div className="py-12 text-center" data-testid="crm-prospection-vide">
          <Inbox className="w-8 h-8 mx-auto mb-3" style={{ color: t.label.muted }} />
          <p className="text-sm" style={{ color: t.label.muted }}>
            {leads.length === 0
              ? 'Aucun lead pour le moment. Commencez par en ajouter un.'
              : 'Aucun lead ne correspond aux filtres. Réinitialisez-les pour tout revoir.'}
          </p>
        </div>
      ) : (
        <>
          <CrmProspectionTable
            leads={affiches} statuts={statuts} selection={selection}
            onBasculerUn={basculerUn} onBasculerTous={basculerTous}
            tri={tri} sens={sens} onTrier={trierPar}
            onModifier={ouvrirModification}
            onSupprimer={(l) => { setErreurAction(''); setASupprimer(l); }}
            onVoirCommentaire={setCommentaireOuvert}
            lectureSeule={isSimulating}
          />
          <CrmProspectionCards
            leads={affiches} statuts={statuts} selection={selection}
            onBasculerUn={basculerUn}
            onModifier={ouvrirModification}
            onSupprimer={(l) => { setErreurAction(''); setASupprimer(l); }}
            onVoirCommentaire={setCommentaireOuvert}
            lectureSeule={isSimulating}
          />
        </>
      )}

      {edition && (
        <CrmProspectionModal
          initial={edition.id === null ? null : edition.saisie}
          statuts={statuts} enCours={enCours} erreur={erreurAction}
          onAnnuler={() => setEdition(null)} onValider={validerEdition}
        />
      )}

      {aSupprimer && (
        <CrmProspectionDeleteModal
          nom={aSupprimer === 'selection' ? undefined : aSupprimer.nom}
          nombre={aSupprimer === 'selection' ? cibles.length : 1}
          enCours={enCours} erreur={erreurAction}
          onAnnuler={() => setASupprimer(null)} onConfirmer={confirmerSuppression}
        />
      )}

      {commentaireOuvert && (
        <CrmProspectionCommentaireModal
          nom={[commentaireOuvert.prenom, commentaireOuvert.nom].filter(Boolean).join(' ') || commentaireOuvert.nom}
          commentaire={commentaireOuvert.commentaire ?? ''}
          onFermer={() => setCommentaireOuvert(null)}
        />
      )}
    </div>
  );
}
