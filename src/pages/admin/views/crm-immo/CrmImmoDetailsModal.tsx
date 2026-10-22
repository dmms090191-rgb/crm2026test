import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Pencil, Save, Info, MessageSquare , CalendarClock, Paperclip } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useFermetureModale } from './useFermetureModale';
import { useCrmImmoCommentaires } from './useCrmImmoCommentaires';
import CrmImmoChampsDossier from './CrmImmoChampsDossier';
import CrmImmoCommentaires from './CrmImmoCommentaires';
import { enDateFrancaise } from '../../../../lib/crmImmoAlertes';
import CrmImmoEcheancier from './CrmImmoEcheancier';
import CrmImmoRenouvelerModal from './CrmImmoRenouvelerModal';
import { useCrmImmoEcheancier, type EncaissementDossier } from './useCrmImmoEcheancier';
import CrmImmoDocuments from './CrmImmoDocuments';
import { useCrmImmoDocuments } from './useCrmImmoDocuments';
import {
  problemeDeSaisie, SAISIE_VIDE, type DossierImmo, type ColonneImmo, type SaisieDossier
} from './crmImmoTypes';

/**
 * LA MODALE DETAILS — tout un dossier, en quatre onglets.
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

export type OngletDetails = 'informations' | 'commentaires' | 'echeancier' | 'documents';

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

/*
 * L'INDICATEUR D'ONGLET ACTIF CHANGE DE FORME AVEC LA MISE EN PAGE, PARCE QU'IL LE DOIT.
 *
 * En rangee, un lisere de 2 px sous l'onglet actif tombe sur le bord bas de la barre,
 * donc contre le panneau : il DESIGNE le contenu qu'il ouvre. Dans la grille 2 x 2, les
 * deux onglets de la premiere ligne n'ont aucun bord de barre sous eux — leur lisere
 * flotte au MILIEU de la barre, 4 px au-dessus de la seconde ligne, et se lit alors comme
 * un soulignement de l'onglet du DESSOUS. Mesure a 360 px : bord bas de l'onglet actif a
 * y=54 dans une barre de 105 px, soit 51 px trop haut. Et le defaut etait PERMANENT sur
 * telephone, car les deux seules portes d'entree de la modale ouvrent sur un onglet de la
 * premiere ligne : CrmImmoCards et CrmImmoTable passent 'informations' ou 'commentaires'.
 *
 * Sous md, l'onglet actif est donc marque comme une CASE — teinte de fond et bordure
 * complete — et non par un bord bas. C'est le patron maison du tablist en grille
 * (SiteTabs) et du selecteur de SimulationPreview.
 *
 * ---------- POURQUOI LA BORDURE EST accent.solid ET NON tab.activeBorder ----------
 *
 * t.tab.activeBorder etait le jeton evident, et il est FAUX ici. Mesure du contraste de
 * la bordure elle-meme contre le fond de modale, sur les seize themes selectionnables,
 * avec le plancher maison de 3:1 pour un element d'interface non textuel (celui de
 * scripts/talixy/talixyFoundations.test.ts) :
 *
 *   tab.activeBorder -> minimum 1,10. Sous le plancher sur DEUX themes : talixy a 1,10
 *     (rgba(255,255,255,0.9) sur un fond clair : une alpha elevee n'est pas un contraste)
 *     et highlevel_emerald a 2,10.
 *   accent.solid     -> minimum 2,10. Sous le plancher sur UN seul theme,
 *     highlevel_emerald, qui l'etait DEJA : c'est la couleur du lisere d'avant.
 *   accent.border    -> sous le plancher sur les SEIZE. Inutilisable.
 *
 * Donc accent.solid : elle n'introduit aucun theme degrade, et sur talixy elle evite un
 * recul net (1,10 contre 6,85 auparavant). Elle a un second merite : l'indicateur porte
 * alors la MEME couleur dans les deux mises en page, seule sa forme change.
 *
 * La teinte de fond reste t.tab.activeBg. Elle ne porte PAS le signal — mesuree entre
 * 1,04 et 1,31 contre le fond — c'est la bordure qui le porte ; elle ne fait qu'affirmer
 * la case.
 *
 * La couleur du texte ne change pas : t.accent.text. Mesure du contraste du TEXTE sur la
 * case active, teinte composee sur le fond : la teinte etant de la couleur de l'accent,
 * elle rapproche le fond du texte et fait BAISSER le contraste de 0,12 a 2,72 selon le
 * theme. Tous restent au-dessus de 4,0 — le plus bas est red a 4,02 — sauf
 * highlevel_emerald a 2,76, qui etait DEJA a 2,88 : son defaut lui est anterieur et n'est
 * pas corrige ici. On ne prend pas t.tab.activeText, mais sans en dire du mal : dans
 * douze des seize themes il vaut EXACTEMENT accent.text, et dans les quatre autres il est
 * plus contraste. Le garder ici n'apporterait donc rien et changerait la couleur de
 * l'onglet actif sur quatre themes sans raison.
 *
 * A partir de md, le lisere revient tel qu'il etait.
 *
 * Pourquoi des proprietes CSS personnalisees et non le style inline : un style inline
 * gagne contre toute classe, donc aucun `md:` ne pourrait le reprendre. L'idiome — poser
 * la variable inline, la consommer en [color:var(...)] — est celui d'AdminMobileBellMenu
 * et des ecrans site-builder.
 */
const ONGLET_ACTIF =
  'max-md:bg-[color:var(--onglet-fond)] max-md:border-[color:var(--onglet-trait)] md:border-b-[color:var(--onglet-trait)]';
const ONGLET_INACTIF = 'max-md:border-transparent md:border-b-transparent';

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

  /*
   * Les documents du dossier. Meme convention que les deux hooks freres : il charge au
   * MONTAGE de la modale et non a l'ouverture de l'onglet. C'est deliberement la
   * convention du module — s'en ecarter pour economiser une requete installerait une
   * troisieme facon de charger un onglet, et c'est la divergence qui coute, pas l'appel.
   */
  const documents = useCrmImmoDocuments(dossier.id);

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
    /* << Documents >> : les pieces du dossier, par photo ou par fichier, rangees dans des
       dossiers a un niveau. Les octets vivent dans un bucket PRIVE, jamais accessibles
       par une URL permanente. */
    { cle: 'documents', libelle: 'Documents', icone: Paperclip },
  ];

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-center p-0 max-md:items-stretch md:items-center md:p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-immo-details-modal"
      {...fermeture.proprietesDuFond}>

      {/*
        SOUS md, LA MODALE EST L'ECRAN. AU-DESSUS, C'EST UNE FENETRE.

        Mesure sur le telephone de David : la modale n'occupait qu'une partie de la
        hauteur, bords arrondis en haut, le fond visible au-dessus — une fenetre flottante
        sur un ecran de 6 pouces, ou la place est justement ce qui manque. Sous md elle
        prend donc tout : largeur pleine, hauteur pleine, aucun arrondi.

        Le patron est celui de la maison — SitePreviewModal dit en toutes lettres
        << Mobile : occupe tout l'ecran. Ordinateur : grande fenetre centree >> — avec
        DEUX divergences assumees :

          h-[100dvh] ET NON h-full. h-full vaut height:100%, donc resolu contre le bloc
          conteneur : un seul ancetre portant transform, filter ou backdrop-filter fait
          du voile `fixed` un calque relatif a CET ancetre, et la coque suivrait sa
          hauteur au lieu de l'ecran. Cette modale vit sous AdminDashboard et n'est pas
          portee vers document.body, contrairement a SitePreviewModal : h-[100dvh] ne
          depend, lui, d'aucune chaine d'ancetres.

          dvh ET NON vh, que SitePreviewModal emploie encore : C1 de cibleTactile
          l'interdit dans ce module, et pour une raison — avec le clavier mobile, vh ne
          bouge pas et le pied passe dessous.

        md: et non sm:, comme la barre d'onglets juste en dessous : la frontiere du
        module est md, et deux bascules a deux pixels differents dans la MEME modale
        auraient donne, entre 640 et 767 px, une fenetre centree coiffant une grille
        d'onglets encore en mode telephone.

        Le plafond de 92dvh reste, a partir de md : sur un ecran large, une modale qui
        touche les deux bords perd sa qualite de fenetre.
      */}
      <div className="w-full flex flex-col overflow-hidden max-md:h-[100dvh] md:max-w-3xl md:max-h-[92dvh] md:rounded-2xl"
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
          {/* LE X PASSE PAR LE MEME CHEMIN QU'ECHAP, ET C'EST NOUVEAU.
              Il appelait onFermer en direct : en modification, il fermait SANS armer
              l'avertissement << Vos modifications seront perdues >>, que le clavier et
              le clic a cote armaient bien. Tant qu'on pouvait cliquer a cote, la
              divergence restait discrete. En plein ecran il n'y a PLUS de fond a
              cliquer : le X devient la seule sortie, et il doit donc etre la sortie
              qui previent. Un second appui ferme, comme ailleurs. */}
          <button type="button" onClick={fermeture.demander} disabled={enCours} title="Fermer"
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
          << onglet 1 sur 4, selectionne >> au lieu de quatre boutons sans rapport.

          ---------- UNE GRILLE SOUS 768 PX, LA RANGEE AU-DESSUS ----------

          La rangee qui defile ne suffisait pas, et la mesure le dit : a 360 px, les
          quatre onglets font 564 px de contenu dans 358 px de barre. << Échéancier
          loyers >> finissait a 442 px et << Documents >> a 564 — tous deux HORS ECRAN.
          Le defilement existait, mais rien ne l'annoncait : on ne decouvrait le
          quatrieme onglet qu'en balayant au hasard. Un onglet qu'on ne sait pas
          atteindre n'existe pas.

          D'ou la grille 2 x 2 : les quatre sont la d'un coup, sans geste a deviner.

          ---------- POURQUOI md ET NON sm ----------

          La frontiere mobile/bureau de ce module est md, pas sm, et la source durable de
          ce fait est theme.test.ts, qui EXIGE `hidden md:block` sur le tableau et
          `md:hidden` sur les fiches. (Un comptage des `max-md:` du module le montrerait
          aussi, mais un comptage vieillit a chaque commit : on cite donc le test, pas un
          nombre.) Avec un `sm:` ici, la bande 640-767 px montrait les
          FICHES mobiles sous une barre d'onglets deja en rangee bureau — deux mises en
          page de generations differentes dans la meme vue, et une bande que rien ne
          mesurait. `md:` fait coincider les deux bascules sur le meme pixel.

          Ce que ce choix coute, dit franchement : entre ~600 et 767 px la rangee TENAIT
          deja entiere (mesure a 601 px : debordement 0, bord droit de << Documents >> a
          587 px pour 599 px de barre). La grille y ajoute donc une seconde ligne, soit
          ~50 px pris au corps defilant. C'est le prix de la coherence avec les fiches, et
          c'est un prix, pas un gain.

          `no-scrollbar` reste sans prefixe : il est inerte quand il n'y a pas de barre de
          defilement, donc il ne gene pas la grille.

          Les deux variables CSS posees ici alimentent ONGLET_ACTIF — voir son
          commentaire en tete de fichier pour la raison.
        */}
        <div className="grid grid-cols-2 gap-1 px-3 pt-2 shrink-0 no-scrollbar md:flex md:items-stretch md:overflow-x-auto"
          role="tablist"
          style={{
            borderBottom: `1px solid ${t.modal.border}`,
            '--onglet-fond': t.tab.activeBg,
            '--onglet-trait': t.accent.solid,
          } as React.CSSProperties}>
          {ONGLETS.map(o => {
            const actif = onglet === o.cle;
            const Icone = o.icone;
            return (
              <button key={o.cle} type="button" role="tab" aria-selected={actif}
                onClick={() => setOnglet(o.cle)}
                data-testid={`crm-immo-details-onglet-${o.cle}`}
                /* `max-md:min-h-[44px]` et non `min-h-[44px]` : la cible au doigt est
                   prefixee PARTOUT ailleurs dans le module (une trentaine de
                   `max-md:min-h-[44px]`), et la laisser sans prefixe epaississait la
                   rangee de bureau sans raison. Dans la grille, un libelle qui s'enroule
                   doit AGRANDIR le bouton, jamais le reduire sous 44 px.
                   `max-md:border` reserve 1 px sur les quatre cotes : l'onglet actif et
                   les trois autres occupent alors la meme place, donc rien ne saute au
                   changement d'onglet. Le bord bas de 2 px, lui, n'existe qu'a partir de
                   md — d'ou `md:border-b-2` et non un `border-b-2` nu.
                   Le texte est centre dans sa case sous md, aligne a gauche en rangee.
                   whitespace-nowrap et shrink-0 ne valent qu'a partir de md : sous md le
                   libelle doit pouvoir s'enrouler plutot que de sortir de sa case. */
                className={`inline-flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-semibold text-center max-md:min-h-[44px] max-md:rounded-lg max-md:border md:rounded-t-lg md:border-b-2 md:justify-start md:px-3 md:text-left md:whitespace-nowrap md:shrink-0 ${actif ? ONGLET_ACTIF : ONGLET_INACTIF}`}
                style={{ color: actif ? t.accent.text : t.text.secondary }}>
                <Icone className="w-4 h-4 shrink-0" />
                {o.libelle}
                {o.cle === 'commentaires' && nombre > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold shrink-0"
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

          {onglet === 'documents' && <CrmImmoDocuments etat={documents} />}

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