import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTalixy } from '../../../talixy/useTalixy';
import { toutesLesColonnes, colonnesVisibles, cleColonne } from '../../../lib/crmImmoColonnes';
import { colonneParCle, preparerLignes, type FiltreDossiers, type Sens } from '../../../lib/crmImmoRecherche';
import { journeeDeReference, fuseauLocal } from '../../../lib/crmImmoAlertes';
import { COLONNES_SYSTEME, type DossierImmo, type SaisieDossier } from './crm-immo/crmImmoTypes';
import { useCrmImmoDossiers } from './crm-immo/useCrmImmoDossiers';
import { useCrmImmoColonnes } from './crm-immo/useCrmImmoColonnes';
import { useCrmImmoAlertes } from './crm-immo/useCrmImmoAlertes';
import CrmImmoFilters from './crm-immo/CrmImmoFilters';
import CrmImmoTable from './crm-immo/CrmImmoTable';
import CrmImmoCards from './crm-immo/CrmImmoCards';
import CrmImmoDossierModal from './crm-immo/CrmImmoDossierModal';
import CrmImmoDeleteModal from './crm-immo/CrmImmoDeleteModal';
import CrmImmoColonnesModal from './crm-immo/CrmImmoColonnesModal';
import CrmImmoCloche from './crm-immo/CrmImmoCloche';

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
export default function CrmImmo() {
  const t = useThemeTokens();
  const tx = useTalixy();
  const dos = useCrmImmoDossiers();
  const col = useCrmImmoColonnes();
  const alertes = useCrmImmoAlertes();

  const [terme, setTerme] = useState('');
  const [filtre, setFiltre] = useState<FiltreDossiers>('tous');
  const [triSur, setTriSur] = useState<string | null>(null);
  const [sens, setSens] = useState<Sens>('asc');

  const [edite, setEdite] = useState<DossierImmo | null>(null);
  const [creation, setCreation] = useState(false);
  const [aSupprimer, setASupprimer] = useState<DossierImmo | null>(null);
  const [colonnesOuvertes, setColonnesOuvertes] = useState(false);

  const [enCours, setEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');
  const [erreurSuppression, setErreurSuppression] = useState('');

  /* Le jour de reference, dans le fuseau du poste et jamais en UTC : un
     `toISOString().slice(0,10)` rendrait la veille entre minuit et 2 h du matin. */
  const fuseau = useMemo(() => fuseauLocal(), []);
  const aujourdhui = useMemo(() => journeeDeReference(new Date(), fuseau), [fuseau]);

  const colonnes = useMemo(
    () => toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: col.colonnes, reglage: col.reglage }),
    [col.colonnes, col.reglage],
  );
  const visibles = useMemo(() => colonnesVisibles(colonnes), [colonnes]);

  const lignes = useMemo(() => preparerLignes({
    dossiers: dos.dossiers, terme, colonnes: visibles,
    triSur: colonneParCle(visibles, triSur), sens, filtre, aujourdhui,
  }), [dos.dossiers, terme, visibles, triSur, sens, filtre, aujourdhui]);

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

  /* Ouvrir le dossier d'une alerte : la cloche appelle, on fait defiler et on ouvre. */
  const zoneTableau = useRef<HTMLDivElement | null>(null);
  const ouvrirDepuisAlerte = useCallback((dossierId: string) => {
    const d = dos.dossiers.find(x => x.id === dossierId);
    if (!d) { setTerme(''); setFiltre('tous'); return; }
    setEdite(d);
    setErreurFormulaire('');
  }, [dos.dossiers]);

  async function validerDossier(s: SaisieDossier) {
    setEnCours(true);
    setErreurFormulaire('');
    const r = edite ? await dos.modifier(edite.id, s) : await dos.creer(s);
    setEnCours(false);
    if (r.error) { setErreurFormulaire(r.error); return; }
    setEdite(null);
    setCreation(false);
    /* Les echeances ont pu changer : la cloche doit en tenir compte tout de suite. */
    void alertes.recharger();
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    setEnCours(true);
    setErreurSuppression('');
    const r = await dos.supprimer([aSupprimer.id]);
    setEnCours(false);
    if (r.error) { setErreurSuppression(r.error); return; }
    setASupprimer(null);
    void alertes.recharger();
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
        onOuvrirColonnes={() => setColonnesOuvertes(true)}
      />

      {(dos.error !== '' || col.error !== '') && (
        <p className="text-xs px-3 py-2 rounded-lg" data-testid="crm-immo-erreur"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {dos.error || col.error}
        </p>
      )}

      <div ref={zoneTableau} className="flex-1 min-h-0">
        <CrmImmoTable
          dossiers={lignes} colonnes={visibles} loading={dos.loading}
          triSur={triSur} sens={sens} onTrier={basculerTri}
          onModifier={(d) => { setEdite(d); setErreurFormulaire(''); }}
          onSupprimer={(d) => { setASupprimer(d); setErreurSuppression(''); }}
        />
        <CrmImmoCards
          dossiers={lignes} colonnes={visibles} loading={dos.loading}
          onModifier={(d) => { setEdite(d); setErreurFormulaire(''); }}
          onSupprimer={(d) => { setASupprimer(d); setErreurSuppression(''); }}
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

      {aSupprimer && (
        <CrmImmoDeleteModal
          nom={[aSupprimer.prenom, aSupprimer.nom].filter(Boolean).join(' ').trim() || aSupprimer.nom}
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
