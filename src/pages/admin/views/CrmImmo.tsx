import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTalixy } from '../../../talixy/useTalixy';
import { toutesLesColonnes, colonnesVisibles, cleColonne } from '../../../lib/crmImmoColonnes';
import { colonneParCle, preparerLignes, type FiltreDossiers, type Sens } from '../../../lib/crmImmoRecherche';
import { COMPTEUR_DE_CATEGORIE } from '../../../lib/crmImmoEcheancier';
import { COLONNES_SYSTEME, type DossierImmo, type SaisieDossier } from './crm-immo/crmImmoTypes';
import { useCrmImmoDossiers } from './crm-immo/useCrmImmoDossiers';
import { useCrmImmoColonnes } from './crm-immo/useCrmImmoColonnes';
import { useAlertesImmoPartagees } from '../../../contexts/CrmImmoAlertesContext';
import CrmImmoFilters from './crm-immo/CrmImmoFilters';
import CrmImmoTable from './crm-immo/CrmImmoTable';
import CrmImmoCards from './crm-immo/CrmImmoCards';
import CrmImmoDossierModal from './crm-immo/CrmImmoDossierModal';
import CrmImmoDeleteModal from './crm-immo/CrmImmoDeleteModal';
import CrmImmoColonnesModal from './crm-immo/CrmImmoColonnesModal';
import CrmImmoDetailsModal, { type OngletDetails } from './crm-immo/CrmImmoDetailsModal';
import { useCrmImmoNombreCommentaires } from './crm-immo/useCrmImmoCommentaires';
import CrmImmoCloche from './crm-immo/CrmImmoCloche';
import { nomCanonique } from '../../../lib/crmImmoIdentite';

/**
 * Page « CRM Immo » du panel Societe.
 *
 * Module metier AUTONOME, specifique a l'immobilier. Il ne partage aucune table, aucune
 * notification et aucune colonne avec le CRM classique, les leads ou les clients : c'est
 * la regle fondatrice du chantier, tenue jusque dans la base — quatre tables `crm_immo_*`
 * et douze policies qui leur sont propres.
 *
 * ---------- CE COMPOSANT N'EST JAMAIS MONTE SANS DROIT ----------
 *
 * Le droit est verifie AVANT, par CrmImmoGate, qui porte aussi le lazy() : ce fichier
 * n'est meme pas telecharge par un navigateur dont la Societe n'a pas le module. Il n'a
 * donc aucun controle a refaire, et surtout il ne doit pas en ajouter un : deux verites
 * du droit, c'est une panne intermittente.
 *
 * ---------- LE TITRE EST UN REPERE DE TEST, PAS UNE DECORATION ----------
 *
 * AdminViewRenderer a un `default:` qui retourne la Vue d'ensemble. Un onglet branche
 * partout SAUF dans le switch ouvre donc le Dashboard, sans aucune erreur de console ni
 * de build. Un test qui se contenterait de verifier que la page ne plante pas passerait
 * au vert. Ce <h1> et son data-testid sont le seul moyen de distinguer « le module est
 * la » de « le Dashboard s'est affiche a sa place ».
 *
 * ---------- LA HAUTEUR SE PREND PAR flex, JAMAIS PAR h-full ----------
 *
 * ThemeContext interpose un `<div key={scopeId}>` SANS STYLE entre la page et son
 * conteneur. Un `height: 100%` est un contrat avec TOUS les ancetres : cette div sans
 * hauteur le rompt en silence, et le defaut a deja ete mesure sur le site public. On
 * s'etend donc avec flex-1 et min-h-0, qui ne dependent d'aucun ancetre.
 */
interface Props {
  /*
   * Auth id de l'entite dont on lit et ecrit la preference de colonnes — l'entite
   * VISUALISEE, pas l'observateur. Depuis le 28/10/2026, l'ordre et le masquage des
   * colonnes systeme ne vivent plus dans le navigateur mais dans les preferences du compte,
   * pour que deux ordinateurs d'une meme Societe affichent les memes colonnes.
   *
   * Il DESCEND au lieu d'etre relu ici : AdminDashboard le tient deja, lu par getSession,
   * donc sans aller-retour serveur. Le relire avec getUser rendrait au module un cinquieme
   * appel auth sur son chemin d'ouverture, que le commit ee04a89 a justement chasse.
   *
   * Optionnel : la vue reste montable sans, et le reglage retombe alors sur le seul cache
   * local — exactement le comportement d'avant ce chantier.
   */
  proprietaireReglage?: string | null;
}

export default function CrmImmo({ proprietaireReglage = null }: Props) {
  const t = useThemeTokens();
  const tx = useTalixy();
  const dos = useCrmImmoDossiers();
  const col = useCrmImmoColonnes(proprietaireReglage);
  /*
   * ---------- LA SOURCE UNIQUE ----------
   *
   * Les alertes ne sont PLUS chargees ici. Elles le sont une seule fois dans
   * AdminDashboard, et servent a la fois le hub Notifications general et cette page.
   *
   * Deux appels donneraient deux verites : traiter une alerte dans la cloche ci-dessous
   * ne decrementerait pas le compteur du hub, et l utilisateur ne saurait pas lequel
   * croire. La cloche locale garde en revanche tout son role — filtres Actives /
   * Traitees / Toutes, marquer lu, traiter, historique — que le hub general n a pas.
   */
  const partage = useAlertesImmoPartagees();
  const alertes = partage?.etat ?? null;

  const [terme, setTerme] = useState('');
  const [filtre, setFiltre] = useState<FiltreDossiers>('tous');
  const [triSur, setTriSur] = useState<string | null>(null);
  const [sens, setSens] = useState<Sens>('asc');

  const [edite, setEdite] = useState<DossierImmo | null>(null);
  const [creation, setCreation] = useState(false);
  const [aSupprimer, setASupprimer] = useState<DossierImmo | null>(null);
  const [colonnesOuvertes, setColonnesOuvertes] = useState(false);

  /*
   * UNE seule modale Details, DEUX portes d entree : le bouton Details l ouvre sur
   * Informations, le bouton Commentaires sur Commentaires. L onglet de depart est donc
   * un etat du parent, pas une seconde modale.
   */
  const [details, setDetails] = useState<{ dossier: DossierImmo; onglet: OngletDetails } | null>(null);
  const commentairesParDossier = useCrmImmoNombreCommentaires();
  const ouvrirDetails = (d: DossierImmo, onglet: OngletDetails) => {
    setDetails({ dossier: d, onglet });
    setErreurFormulaire('');
  };

  const [enCours, setEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');
  /*
   * L'AVERTISSEMENT DE LA BASE — pas une erreur, et c'est la nuance.
   *
   * Vider une date de bail alors qu'une periode est en cours : la base la remet aux
   * valeurs du contrat, et c'est ce qui empeche le dossier de contredire sa periode.
   * L'enregistrement REUSSIT donc. Mais l'utilisateur voit sa saisie revenir, et sans
   * un mot il croit a un bug. On l'affiche, en information et non en rouge.
   */
  const [avertissement, setAvertissement] = useState('');
  const [erreurSuppression, setErreurSuppression] = useState('');

  /*
   * LE CLASSEMENT VIENT DU TABLEAU DE BORD, ET CETTE PAGE N'A PLUS D'HORLOGE.
   *
   * Elle en avait une — `journeeDeReference(new Date(), fuseau)` dans un useMemo a
   * dependance vide — donc GELEE au montage, sans intervalle ni retour de visibilite.
   * Celle du tableau de bord avance toutes les 60 s. Un panel laisse ouvert la nuit
   * comparait donc une carte datee du 23 a une liste datee du 22, et le 1er du mois
   * toutes les echeances basculaient d'un cote sans basculer de l'autre.
   *
   * Desormais le filtre lit l'appartenance calculee une seule fois, dans AdminDashboard,
   * par le hook qui alimente les cartes. Plus de seconde horloge, donc plus de
   * desaccord possible entre le chiffre d'une carte et la liste qu'elle ouvre.
   */
  const tableauDeBord = partage?.tableauDeBord ?? null;
  const classement = tableauDeBord?.dossiersParCategorie ?? null;

  const colonnes = useMemo(
    () => toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: col.colonnes, reglage: col.reglage }),
    [col.colonnes, col.reglage],
  );
  const visibles = useMemo(() => colonnesVisibles(colonnes), [colonnes]);

  const lignes = useMemo(() => preparerLignes({
    dossiers: dos.dossiers, terme, colonnes: visibles,
    triSur: colonneParCle(visibles, triSur), sens, filtre, classement,
  }), [dos.dossiers, terme, visibles, triSur, sens, filtre, classement]);

  /* Le compteur de la carte correspondant au filtre actif, pour dire a voix haute
     l'ecart d'unite : neuf echeances en retard peuvent n'etre qu'un seul dossier. */
  /*
   * << Chargement >> et non << aucun dossier >>.
   *
   * Le classement arrive par le reseau, apres la liste. Pendant ce temps, un filtre
   * de categorie rend une liste vide — et un tableau vide dit << aucun dossier ne
   * correspond >>, ce qui est faux et decourage de chercher plus loin.
   */
  const enAttenteDuClassement = filtre !== 'tous' && (tableauDeBord ? tableauDeBord.chargement : true);

  const compteurCategorie = useMemo(() => {
    if (filtre === 'tous' || !tableauDeBord) return null;
    return tableauDeBord.compteurs[COMPTEUR_DE_CATEGORIE[filtre]];
  }, [filtre, tableauDeBord]);

  /* Un tri sur une colonne qu'on vient de masquer ou de supprimer n'a plus de sens : on
     le retire plutot que de laisser un en-tete fleche invisible decider de l'ordre. */
  useEffect(() => {
    if (triSur && !visibles.some(c => cleColonne(c) === triSur)) setTriSur(null);
  }, [visibles, triSur]);

  const basculerTri = useCallback((cle: string) => {
    setTriSur(prev => {
      if (prev !== cle) { setSens('asc'); return cle; }
      /* Troisieme clic : on retire le tri, plutot que de boucler indefiniment entre
         croissant et decroissant sans pouvoir revenir a l'ordre naturel. */
      if (sens === 'asc') { setSens('desc'); return cle; }
      setSens('asc'); return null;
    });
  }, [sens]);

  /*
   * L ECRITURE D UNE COLONNE A CHOIX.
   *
   * Les deux vues ne connaissent qu une chose : une colonne qui porte `choix` se
   * modifie sur place. Elles ne savent PAS ou la valeur est rangee — c est ici qu on
   * le decide, et nulle part ailleurs.
   *
   * Un registre, et non un `if` : le jour ou une deuxieme colonne a choix arrive, elle
   * s ajoute sur une ligne. Une colonne absente du registre rend une erreur lisible au
   * lieu d un echec muet qui laisserait croire que la valeur est enregistree.
   */
  const ECRITURE_PAR_COLONNE: Record<string, (id: string, v: string) => Promise<{ error: string | null }>> = useMemo(
    () => ({ mode_paiement: (id, v) => dos.changerModePaiement(id, v) }),
    [dos],
  );

  const changerChoix = useCallback(async (
    d: DossierImmo, cle: string, valeur: string,
  ): Promise<{ error: string | null }> => {
    const ecrire = ECRITURE_PAR_COLONNE[cle];
    if (ecrire === undefined) return { error: 'Cette colonne ne se modifie pas depuis le tableau.' };
    return ecrire(d.id, valeur);
  }, [ECRITURE_PAR_COLONNE]);

  /* Ouvrir le dossier d'une alerte : la cloche appelle, on fait defiler et on ouvre. */
  const zoneTableau = useRef<HTMLDivElement | null>(null);
  const ouvrirDepuisAlerte = useCallback((dossierId: string) => {
    const d = dos.dossiers.find(x => x.id === dossierId);
    if (!d) { setTerme(''); setFiltre('tous'); return; }
    setEdite(d);
    setErreurFormulaire('');
  }, [dos.dossiers]);

  /*
   * LE CLIC DEPUIS LE HUB GENERAL.
   *
   * Le hub vit dans la barre du haut, cette page dans la zone principale : ils ne se
   * connaissent pas. Le hub depose donc une demande d ouverture dans le contexte, et
   * cette page la consomme des que ses dossiers sont charges.
   *
   * La garde sur `dos.loading` est essentielle : au moment du clic, la vue vient a
   * peine d etre montee et sa liste est VIDE. Consommer la demande tout de suite ne
   * trouverait rien et la perdrait, en silence.
   */
  useEffect(() => {
    const vise = partage?.dossierAOuvrir;
    if (!vise || dos.loading) return;
    const d = dos.dossiers.find(x => x.id === vise);
    partage?.ouvertureConsommee();
    if (d) { setEdite(d); setErreurFormulaire(''); }
  }, [partage, dos.dossiers, dos.loading]);

  /*
   * LE FILTRE DEMANDE PAR UNE CARTE DU DASHBOARD.
   *
   * << Contrats a renouveler >> et << Baux expires >> menent ici avec le filtre
   * << Fin proche >> deja applique — il couvre exactement ces deux cas : fin dans le
   * preavis, ou deja passee.
   *
   * Pas de garde sur dos.loading, contrairement a l ouverture d un dossier : poser un
   * filtre ne demande AUCUNE donnee. Attendre le chargement ferait seulement voir la
   * liste complete une fraction de seconde avant qu elle se filtre.
   */
  useEffect(() => {
    const vise = partage?.filtreADemander;
    if (!vise) return;
    partage?.filtreConsomme();
    setFiltre(vise);
  }, [partage]);

  async function validerDossier(s: SaisieDossier) {
    setEnCours(true);
    setErreurFormulaire('');
    setAvertissement('');
    const r = edite ? await dos.modifier(edite.id, s) : await dos.creer(s);
    setEnCours(false);
    if (r.error) { setErreurFormulaire(r.error); return; }
    if (r.avertissement) setAvertissement(r.avertissement);
    setEdite(null);
    setCreation(false);
    /* Les echeances ont pu changer : la cloche ET le hub general doivent en tenir
       compte tout de suite — ils lisent la meme source. */
    void alertes?.recharger();
  }

  /**
   * Enregistrer depuis la modale Details.
   *
   * Le meme chemin que le formulaire : dos.modifier, qui demande ses lignes en retour et
   * traite ZERO ligne comme le refus que c est — supabase-js rend { error: null } quand
   * la RLS refuse un UPDATE.
   *
   * La modale RESTE OUVERTE apres un enregistrement reussi, contrairement au formulaire
   * de creation qui se ferme. On vient d y consulter une fiche : la refermer obligerait
   * a la rouvrir pour verifier ce qu on vient d ecrire. Elle repasse simplement en
   * lecture, et la ligne vivante qu elle recoit en prop montre l etat de la base.
   */
  async function enregistrerDepuisDetails(s: SaisieDossier) {
    if (!details) return;
    setEnCours(true);
    setErreurFormulaire('');
    setAvertissement('');
    const r = await dos.modifier(details.dossier.id, s);
    setEnCours(false);
    if (r.error) { setErreurFormulaire(r.error); return; }
    if (r.avertissement) setAvertissement(r.avertissement);
    /* Les echeances ont pu changer : la cloche ET le hub general lisent la meme source. */
    void alertes?.recharger();
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    setEnCours(true);
    setErreurSuppression('');
    const r = await dos.supprimer([aSupprimer.id]);
    setEnCours(false);
    if (r.error) { setErreurSuppression(r.error); return; }
    setASupprimer(null);
    void alertes?.recharger();
  }

  /*
   * Sous Talixy, la coquille .tx-page porte deja ses propres marges : garder p-4 sm:p-6
   * les doublerait et pousserait le tableau hors du cadre. Hors Talixy, ce sont elles
   * qui donnent sa respiration a la page.
   */
  const corps = (
    <div
      className={`flex flex-col flex-1 min-h-0 gap-4${tx.active ? '' : ' p-4 sm:p-6'}`}
      data-testid="crm-immo"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/*
          Sous Talixy, le titre est porte par la coquille .tx-page-head, centree, et il ne
          doit PAS etre repete ici. Hors Talixy, c'est ce bloc qui le porte. Dans les deux
          cas data-testid="crm-immo-titre" existe exactement une fois : c'est le seul
          repere qui distingue << le module est la >> de << le Dashboard s'est affiche a sa
          place >>, et un doublon ferait echouer les tests pour de mauvaises raisons.
        */}
        {!tx.active && (
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.heading.primary }} data-testid="crm-immo-titre">
              CRM Immo
            </h1>
            <p className="text-sm mt-1" style={{ color: t.label.muted }}>
              Vos dossiers immobiliers, leurs echeances de contrat et leurs loyers a encaisser.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/*
            La cloche LOCALE reste, et elle garde son role propre : filtres Actives /
            Traitees / Toutes, marquer lu, traiter, historique. Le hub general, lui, ne
            fait que signaler et ouvrir le dossier — aucune des dix categories n y porte
            d action. Les deux lisent la MEME source, donc traiter ici decremente le
            compteur du hub dans le meme rendu.
          */}
          {alertes && (
            <CrmImmoCloche
              alertes={alertes.alertes}
              badge={alertes.badge}
              filtre={alertes.filtre}
              onFiltre={alertes.setFiltre}
              chargement={alertes.chargement}
              erreur={alertes.erreur}
              onRecharger={() => { void alertes.recharger(); }}
              onMarquerLue={(a) => { void alertes.marquerLue(a); }}
              onMarquerTraitee={(a) => { void alertes.marquerTraitee(a); }}
              onOuvrirDossier={ouvrirDepuisAlerte}
            />
          )}
          <button type="button" onClick={() => { setCreation(true); setErreurFormulaire(''); }}
            data-testid="crm-immo-ajouter"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: t.accent.solid, color: t.text.inverse }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un client</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>
      </div>

      <CrmImmoFilters
        terme={terme} onTerme={setTerme}
        filtre={filtre} onFiltre={setFiltre}
        total={dos.dossiers.length} affiches={lignes.length}
        compteurCategorie={compteurCategorie}
        /* Le MEME etat que la liste. La barre et le tableau disaient deux choses au
           meme instant : << 0 dossier >> ici, << Chargement des dossiers... >> la. */
        chargement={dos.loading || enAttenteDuClassement}
        onOuvrirColonnes={() => setColonnesOuvertes(true)}
      />

      {(dos.error !== '' || col.error !== '') && (
        <p className="text-xs px-3 py-2 rounded-lg" data-testid="crm-immo-erreur"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {dos.error || col.error}
        </p>
      )}

      {/* L'enregistrement a REUSSI, mais la base a conserve la periode du bail. Ton
          d'information, pas d'erreur — et refermable, parce qu'il ne bloque rien. */}
      {avertissement !== '' && (
        <div className="text-xs px-3 py-2 rounded-lg flex items-start gap-2" data-testid="crm-immo-avertissement"
          style={{ background: t.badge.liveBg, border: `1px solid ${t.badge.liveBorder}`, color: t.badge.liveText }}>
          <span className="flex-1">{avertissement}</span>
          <button type="button" onClick={() => setAvertissement('')}
            aria-label="Fermer cet avertissement"
            className="shrink-0 px-1 rounded max-md:min-h-[44px] max-md:min-w-[44px]"
            style={{ color: t.badge.liveText }}>
            ×
          </button>
        </div>
      )}

      <div ref={zoneTableau} className="flex-1 min-h-0">
        <CrmImmoTable
          dossiers={lignes} colonnes={visibles} loading={dos.loading || enAttenteDuClassement}
          triSur={triSur} sens={sens} onTrier={basculerTri}
          onModifier={(d) => { setEdite(d); setErreurFormulaire(''); }}
          onSupprimer={(d) => { setASupprimer(d); setErreurSuppression(''); }}
          onDetails={ouvrirDetails}
          nombreCommentaires={commentairesParDossier.parDossier}
          onChoisir={changerChoix}
        />
        <CrmImmoCards
          dossiers={lignes} colonnes={visibles} loading={dos.loading || enAttenteDuClassement}
          onModifier={(d) => { setEdite(d); setErreurFormulaire(''); }}
          onSupprimer={(d) => { setASupprimer(d); setErreurSuppression(''); }}
          onDetails={ouvrirDetails}
          nombreCommentaires={commentairesParDossier.parDossier}
          onChoisir={changerChoix}
        />
      </div>

      {(creation || edite) && (
        <CrmImmoDossierModal
          dossier={edite}
          colonnesPerso={col.colonnes.filter(c => !c.masquee)}
          enCours={enCours}
          erreur={erreurFormulaire}
          onFermer={() => { if (!enCours) { setEdite(null); setCreation(false); } }}
          onValider={(s) => { void validerDossier(s); }}
        />
      )}

      {details && (
        <CrmImmoDetailsModal
          /* La ligne VIVANTE, pas celle capturee a l ouverture : apres un enregistrement,
             la liste a change et la modale doit montrer ce qui est en base. Si le dossier
             a disparu entre-temps, on retombe sur la capture plutot que de planter. */
          dossier={dos.dossiers.find(x => x.id === details.dossier.id) ?? details.dossier}
          colonnesPerso={col.colonnes.filter(c => !c.masquee)}
          ongletInitial={details.onglet}
          enCours={enCours}
          erreur={erreurFormulaire}
          /*
           * La periode de bail vient de changer — renouvellement, encaissement,
           * annulation. Trois surfaces doivent le savoir, et aucune ne le devine :
           *   - la LISTE, qui porte les dates du dossier ;
           *   - le CLASSEMENT, qui decide dans quel filtre ce dossier tombe ;
           *   - la CLOCHE, qui derive ses alertes des memes dates.
           * Sans ce signal, chacune attend son propre passage reseau — cinq minutes,
           * et jamais en phase. Un bail renouveler resterait dans l'ancienne
           * categorie pendant ce temps, avec les anciennes dates affichees.
           */
          onPeriodeChangee={() => {
            void dos.recharger();
            void partage?.tableauDeBord?.recharger();
            void alertes?.recharger();
          }}
          onFermer={() => {
            if (enCours) return;
            setDetails(null);
            /* Le compte du tableau se rafraichit a la FERMETURE : c est le seul moment
               ou il a pu changer, et le recalculer a chaque frappe serait une requete
               par caractere. */
            void commentairesParDossier.recharger();
          }}
          onEnregistrer={(s) => { void enregistrerDepuisDetails(s); }}
        />
      )}

      {aSupprimer && (
        <CrmImmoDeleteModal
          nom={nomCanonique(aSupprimer.nom_complet_locataire, aSupprimer.nom, aSupprimer.prenom)}
          enCours={enCours}
          erreur={erreurSuppression}
          onAnnuler={() => { if (!enCours) setASupprimer(null); }}
          onConfirmer={() => { void confirmerSuppression(); }}
        />
      )}

      {colonnesOuvertes && (
        <CrmImmoColonnesModal
          perso={col.colonnes}
          reglage={col.reglage}
          erreur={col.error}
          onFermer={() => setColonnesOuvertes(false)}
          onAjouter={(nom, type) => { void col.ajouter(nom, type); }}
          onRenommer={(id, nom) => { void col.renommer(id, nom); }}
          onBasculerMasquagePerso={(id, masquee) => { void col.basculerMasquage(id, masquee); }}
          onSupprimerPerso={(id) => { void col.supprimer(id); }}
          onReordonnerPerso={(ordre) => { void col.reordonner(ordre); }}
          onReglage={col.enregistrerReglage}
        />
      )}
    </div>
  );

  /*
   * TALIXY — memes donnees, memes actions, meme tableau : on ajoute seulement la
   * coquille de page commune aux autres onglets, comme le fait SystemPage.
   *
   * Le corps n'est PAS place dans .tx-page-body : ce conteneur plafonne a 660px, ce qui
   * convient a une page de texte centre et etranglerait un tableau a dix colonnes. On
   * passe par .tx-immo-corps, plafonne a 1120px centres, et data-tx-immo rend a la page
   * la gouttiere droite de 17,5vw que la coquille reserve au decor.
   */
  if (tx.active) {
    return (
      <div className="tx-page" data-tx-immo>
        <header className="tx-page-head">
          <p className="tx-page-eyebrow">Immobilier</p>
          <h1 className="tx-page-title" data-testid="crm-immo-titre">CRM Immo</h1>
          <p className="tx-page-subtitle">
            Vos dossiers, leurs echeances de contrat et leurs loyers a encaisser.
          </p>
        </header>
        <div className="tx-immo-corps">{corps}</div>
      </div>
    );
  }

  return corps;
}
