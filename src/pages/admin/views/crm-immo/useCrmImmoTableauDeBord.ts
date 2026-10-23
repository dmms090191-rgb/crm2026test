import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import {
  journeeDeReference, momentDe, FUSEAU_ALERTES, HEURE_DECLENCHEMENT,
  type MomentIsrael,
} from '../../../../lib/crmImmoAlertes';
import { lireToutesLesLignes } from '../../../../lib/lectureIntegrale';
import {
  classerTableauDeBord,
  type ClassementImmo, type PeriodeDossier, type EncaissementActif,
} from '../../../../lib/crmImmoEcheancier';

/**
 * LES SEPT COMPTEURS DU DASHBOARD D'UNE SOCIETE QUI POSSEDE CRM IMMO.
 *
 * ---------- POURQUOI UN HOOK SEPARE DE CELUI DES ALERTES ----------
 *
 * La cloche du module ne lit PAS crm_immo_contrats, et c'est voulu : les trois colonnes
 * du dossier refletent la periode en cours, et les relire serait une seconde source
 * pour la meme verite. Un test l'interdit.
 *
 * Le tableau de bord, lui, ne peut PAS s'en contenter, et pour DEUX raisons distinctes.
 *
 * ---------- 1. CE QU'UN DOSSIER NE PEUT PAS PORTER ----------
 *
 * Les trois colonnes du dossier refletent UNE periode, celle en cours. Un bail dont la
 * periode a ete cloturee sans renouvellement les garde telles quelles — c'est le repli
 * volontaire de sync_dossier_depuis_contrat, qui evite qu'un dossier perde son dernier
 * contrat connu. Le dossier affiche alors des dates que crm_immo_contrats ne compte
 * plus comme actives, et les quatre categories de contrat seraient fausses.
 *
 * C'est aussi la table que David a designee comme source : << crm_immo_contrats doit
 * contenir TOUTES les periodes. >>
 *
 * ---------- 2. LA DIVERGENCE PAR VIDAGE, ELLE, EST FERMEE ----------
 *
 * Mesure du 22 octobre 2026, declencheurs mis au travail puis transaction annulee :
 * vider date_fin_contrat sur le dossier laissait la periode INTACTE, et le dossier
 * affirmait le contraire de ce que disait le contrat (scenario D).
 *
 * Un declencheur BEFORE l'empeche depuis le meme jour : tant qu'une periode est en
 * cours, une saisie qui laisse l'une des trois colonnes vide est ramenee aux valeurs du
 * contrat. Ce motif-la n'est donc PLUS une raison de lire crm_immo_contrats — la
 * premiere suffit, et elle ne depend d'aucun declencheur.
 *
 * ---------- UNE SEULE HORLOGE DANS L'APPLICATION ----------
 *
 * `aujourdhui` est RECU, pas recalcule. Il vient du hook des alertes, qui le fait
 * avancer toutes les 60 s. Deux horloges, c'est le 1er du mois ou la cloche et le
 * tableau de bord ne seraient pas d'accord sur le mois courant.
 *
 * ---------- ET AUCUN SECOND CALCUL ----------
 *
 * Ce hook ne compte rien. Il charge, convertit la date d'encaissement en jour local, et
 * passe le tout a compterTableauDeBord — qui passe lui-meme par construireEcheancier et
 * statutDe, exactement comme l'onglet Echeancier loyers et les notifications.
 */

/** Une ligne de crm_immo_contrats, telle que PostgREST la rend. */
interface LignePeriode {
  id: string;
  dossier_id: string;
  debut: string;
  fin: string;
  jour_encaissement: number;
  cloture_le: string | null;
}

/** Une ligne de crm_immo_loyers, telle que PostgREST la rend. */
interface LigneLoyer {
  id: string;
  dossier_id: string;
  echeance: string;
  encaisse_le: string;
}

/* Les seules colonnes utiles. `cloture_le is null` : apres un renouvellement, l'ancienne
   periode est clotûree et ne doit plus etre comptee comme un bail. */
const CHAMPS_PERIODE = 'id,dossier_id,debut,fin,jour_encaissement,cloture_le';

/* `encaisse_le` est indispensable : David a tranche que << Encaisses ce mois >> compte
   l'ARGENT RENTRE, pas les echeances du mois. Un loyer de janvier regle en octobre
   compte en octobre. */
const CHAMPS_LOYER = 'id,dossier_id,echeance,encaisse_le';

const RYTHME_DERIVATION = 60_000;
const RYTHME_RESEAU = 300_000;

/**
 * @param actif      Vrai seulement si la Societe possede REELLEMENT le module.
 * @param aujourdhui Le jour de reference, en 'AAAA-MM-JJ', fourni par le hook des alertes.
 *
 * AdminDashboard est monte pour TOUTES les Societes de Talvex, et une seule possede le
 * module aujourd'hui. Sans ce drapeau, chacune paierait deux requetes inutiles a chaque
 * ouverture de panel. La RLS rendrait bien 0 ligne — ce n'est pas une question de
 * securite, c'est une question de ne pas demander ce qu'on sait absent.
 */
export function useCrmImmoTableauDeBord(actif: boolean) {
  const companyId = useCompanyId();
  const [periodes, setPeriodes] = useState<PeriodeDossier[]>([]);
  const [encaissements, setEncaissements] = useState<EncaissementActif[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  /* Le fuseau d'Israel, et lui seul. Voir FUSEAU_ALERTES : une seule notion de
     << aujourd'hui >> dans tout le module, quel que soit le poste qui consulte. */
  const fuseau = FUSEAU_ALERTES;

  /*
   * ---------- L'HORLOGE VIT ICI, ET NULLE PART AILLEURS ----------
   *
   * Elle etait dans le hook des alertes, qui la pretait a celui-ci. Le 22 octobre 2026,
   * la regle des impayes anciens a inverse la dependance : c'est desormais ce hook qui
   * charge les PERIODES, et le hook des alertes qui les recoit — il ne peut donc plus
   * fournir la date sans creer un cycle.
   *
   * Une seule horloge dans l'application, par consequence : le 1er du mois, la cloche
   * et le tableau de bord basculent ensemble ou pas du tout.
   *
   * Elle avance toutes les 60 s SANS aucune requete : une alerte peut naitre d'une date
   * qui change, pas d'une donnee qui bouge. Et elle est relue a chaque passage reseau,
   * parce qu'un onglet d'arriere-plan voit ses minuteurs geles par le navigateur.
   */
  /*
   * ---------- ELLE PORTE L'HEURE DEPUIS LE 23 OCTOBRE 2026 ----------
   *
   * Un jour seul ne permettait pas de dire << a partir de 08:00 >> : une alerte
   * basculait a minuit. L'horloge rend desormais un MomentIsrael — jour ET minutes.
   *
   * ---------- POURQUOI ON NE REMPLACE PAS L'ETAT A CHAQUE MINUTE ----------
   *
   * Une chaine identique ne declenche aucun rendu : React compare par Object.is. Un
   * OBJET neuf, lui, en declenche un a chaque passage, soit un rendu par minute pour
   * rien. On ne remplace donc l'etat que si quelque chose d'OBSERVABLE a change : le
   * jour, ou le franchissement de 08:00. Entre deux, `minutes` reste fige a sa derniere
   * valeur utile, ce qui est sans consequence : personne ne lit les minutes autrement
   * que pour les comparer a HEURE_DECLENCHEMENT.
   */
  const [moment, setMoment] = useState<MomentIsrael>(() => momentDe(new Date(), fuseau));
  const aujourdhui = moment.jour;

  useEffect(() => {
    if (!actif) return;
    const avancer = () => setMoment(precedent => {
      const suivant = momentDe(new Date(), fuseau);
      const memeJour = precedent.jour === suivant.jour;
      const memeCote = (precedent.minutes >= HEURE_DECLENCHEMENT) === (suivant.minutes >= HEURE_DECLENCHEMENT);
      return memeJour && memeCote ? precedent : suivant;
    });
    const t = setInterval(avancer, RYTHME_DERIVATION);
    return () => clearInterval(t);
  }, [actif, fuseau]);

  const recharger = useCallback(async () => {
    if (!actif || !companyId) {
      setPeriodes([]); setEncaissements([]); setChargement(false); return;
    }
    /*
     * LES DEUX LECTURES SONT PAGINEES, ET LEUR COMPLETUDE EST VERIFIEE.
     *
     * PostgREST tronque au-dela de son plafond, et il le fait sans erreur : la reponse
     * est simplement plus courte. `crm_immo_loyers` gagne une ligne par mois et par
     * dossier — cent dossiers et la table passe le millier en moins d'un an. Les
     * compteurs se mettraient alors a oublier les plus anciens loyers, en silence.
     *
     * `.order('id')` n'est pas decoratif : sans ordre TOTAL, deux pages successives
     * peuvent trier differemment deux lignes ex aequo, et on en saute ou on en repete.
     */
    const [k, l] = await Promise.all([
      lireToutesLesLignes<LignePeriode>((de, a) =>
        supabase.from('crm_immo_contrats').select(CHAMPS_PERIODE, { count: 'exact' })
          .eq('company_id', companyId).order('id').range(de, a)),
      /* Les ANNULES sont ecartes : une annulation rend l'echeance a nouveau due, et son
         encaissement ne compte plus dans le mois. */
      lireToutesLesLignes<LigneLoyer>((de, a) =>
        supabase.from('crm_immo_loyers').select(CHAMPS_LOYER, { count: 'exact' })
          .eq('company_id', companyId).is('annule_le', null).order('id').range(de, a)),
    ]);
    if (k.error || l.error) {
      setErreur(k.error?.message ?? l.error?.message ?? '');
    } else {
      /*
       * TOUTES les periodes, cloturees comprises — regle posee par David le 22 octobre
       * 2026 : << Le renouvellement ne doit jamais faire disparaitre une dette reelle. >>
       * Les quatre categories de contrat, elles, ne regardent que la periode en cours ;
       * c'est classerTableauDeBord qui fait le tri, sur le drapeau `cloturee`.
       */
      setPeriodes((k.data ?? []).map(r => ({
        dossier_id: r.dossier_id,
        debut: r.debut,
        fin: r.fin,
        jour_encaissement: r.jour_encaissement,
        cloturee: r.cloture_le !== null,
      })));
      /*
       * encaisse_le est un timestamptz : on le ramene au JOUR du poste, jamais a l'UTC.
       * Un encaissement enregistre le 1er novembre a 00 h 30 a Paris est bien de
       * novembre ; `toISOString().slice(0,10)` le rangerait en octobre et le compteur
       * se tromperait de mois une nuit par mois.
       */
      setEncaissements((l.data ?? []).map(r => ({
        dossier_id: r.dossier_id,
        echeance: r.echeance,
        encaisseLeJour: journeeDeReference(new Date(r.encaisse_le), fuseau),
      })));
      setErreur('');
    }
    /* Le moment est relu a chaque passage reseau : un onglet laisse ouvert la nuit doit
       repartir sur la bonne date ET du bon cote de 08:00, meme si le battement de 60 s
       a ete gele par le navigateur en arriere-plan. */
    setMoment(momentDe(new Date(), fuseau));
    setChargement(false);
  }, [actif, companyId, fuseau]);

  useEffect(() => { void recharger(); }, [recharger]);

  /* Reseau : periodique, et au retour de visibilite de l'onglet. Sans le retour de
     visibilite, un portable repris le lendemain matin afficherait les chiffres de la
     veille pendant cinq minutes. */
  const rechargerRef = useRef(recharger);
  useEffect(() => { rechargerRef.current = recharger; }, [recharger]);

  useEffect(() => {
    if (!actif) return;
    const t = setInterval(() => { void rechargerRef.current(); }, RYTHME_RESEAU);
    const auRetour = () => { if (document.visibilityState === 'visible') void rechargerRef.current(); };
    document.addEventListener('visibilitychange', auRetour);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', auRetour); };
  }, [actif]);

  /*
   * UN SEUL CLASSEMENT POUR LES CARTES ET POUR LES FILTRES.
   *
   * `classement.compteurs` alimente les sept cartes du dashboard ; `classement.dossiers`
   * alimente les sept filtres de la page du module. Les deux sortent du meme parcours,
   * sur les memes lignes, avec la meme date : une carte ne peut plus annoncer un chiffre
   * que la liste qu'elle ouvre contredirait.
   *
   * Avant le 22 octobre 2026, la page refaisait son propre calcul de preavis avec son
   * horloge a elle, gelee au montage. Mesure de ce jour-la : carte << Contrats a
   * renouveler >> = 0, liste ouverte par le clic = 1 ligne.
   */
  const classement: ClassementImmo = useMemo(
    () => classerTableauDeBord({ periodes, encaissements, aujourdhui }),
    [periodes, encaissements, aujourdhui],
  );

  return {
    compteurs: classement.compteurs,
    dossiersParCategorie: classement.dossiers,
    /* Les lignes brutes : le hook des alertes derive les siennes des MEMES, pour que la
       cloche et les cartes ne puissent pas dire deux choses differentes. */
    /* `moment` porte le jour ET l'heure : c'est lui que la cloche doit recevoir, pour
       pouvoir attendre 08:00. `aujourdhui` en est la seule projection, conservee pour
       tout ce qui ne raisonne qu'en jour calendaire — statuts, classement, cartes. */
    periodes, encaissements, aujourdhui, moment,
    chargement, erreur, recharger,
  };
}

/** Ce que le hook rend : la source unique des compteurs ET des filtres du module. */
export type EtatTableauDeBordImmo = ReturnType<typeof useCrmImmoTableauDeBord>;
