import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { lireToutesLesLignes } from '../../../../lib/lectureIntegrale';
import type { PeriodeDossier } from '../../../../lib/crmImmoEcheancier';
import {
  deriverAlertes, filtrer, compteBadge,
  type Alerte, type EtatConnu, type GenreAlerte, type FiltreAlertes, type DossierPourAlertes,
  type EncaissementConnu, type MomentIsrael,
} from '../../../../lib/crmImmoAlertes';

/**
 * L'etat des alertes CRM IMMO — la SOURCE UNIQUE, sans Realtime.
 *
 * ---------- CE QU'IL SERT, DEPUIS LE 20 OCTOBRE 2026 ----------
 *
 * DEUX surfaces, un seul etat :
 *   - le hub Notifications GENERAL : la dixieme categorie, sa pastille et sa liste ;
 *   - la page du module : la cloche locale, ses filtres, ses actions lire / traiter.
 *
 * La decision a change. Ce hook etait auparavant cloisonne : il ne devait toucher ni
 * TopBar ni les cartes du hub, et un test interdisait tout chemin entre les deux. Le
 * cloisonnement est leve DANS CE SENS — le compteur remonte maintenant jusqu'a la
 * pastille generale, mais UNIQUEMENT pour les Societes qui possedent le module.
 *
 * Ce qui n'a PAS change : ce hook ne lit rien des notifications generales. Le general
 * descend vers le module, jamais l'inverse.
 *
 * Il est appele UNE SEULE FOIS, dans AdminDashboard, et son resultat se partage par
 * CrmImmoAlertesContext. Deux appels, c'est deux etats React : le hub et la page
 * divergeraient des qu'une alerte serait traitee d'un cote.
 * scripts/crm-immo/alertesDansNotifications.test.ts le prouve, et casse si quelqu'un
 * rouvre un second chemin — ou s'il restaure l'ancienne regle.
 *
 * ---------- DEUX RYTHMES, ET UN SEUL COUTE DU RESEAU ----------
 *
 * Les alertes sont DERIVEES des dates : rien n'est stocke. Donc une alerte peut naitre
 * sans qu'aucune donnee ait change — un loyer bascule a minuit, une fin de contrat
 * atteint J-30. Il faut recalculer, pas recharger.
 *
 *   - toutes les 60 s : RE-DERIVATION depuis la memoire. Zero requete. C'est exactement
 *     ce que fait deja useAgendaNotifications.
 *   - reseau : au montage, au retour de visibilite de l'onglet, et toutes les 5 min.
 *
 * Sans le retour de visibilite, un portable repris le lendemain matin afficherait les
 * alertes de la veille pendant cinq minutes.
 */

/* Les seules colonnes dont la derivation a besoin : inutile de rapatrier les
   commentaires et les valeurs personnalisees pour compter des echeances.

   `date_entree` a rejoint la liste le 22 octobre 2026 : sans elle, l'alerte de loyer ne
   pouvait pas etre bornee par le DEBUT du bail, et un contrat a venir reclamait deja
   son loyer. Une colonne oubliee ici rend la regle muette sans qu'aucun type ne
   proteste — `date_entree` est optionnel dans DossierPourAlertes. */
const CHAMPS_DOSSIER = 'id,nom,prenom,locataire,proprietaire,date_entree,date_fin_contrat,jour_encaissement';

const RYTHME_RESEAU = 300_000;

/**
 * @param actif  Vrai seulement si la Societe possede REELLEMENT le module.
 *
 * Ce hook est desormais appele UNE SEULE FOIS, dans AdminDashboard, pour servir a la
 * fois le hub Notifications general et la page du module. Mais AdminDashboard est monte
 * pour TOUTES les Societes de Talvex, et la plupart n ont pas CRM Immo : sans ce
 * drapeau, chacune paierait deux requetes inutiles a chaque ouverture de panel.
 *
 * La RLS rendrait bien 0 ligne — ce n est pas une question de securite, c est une
 * question de ne pas demander ce qu on sait absent.
 */
export function useCrmImmoAlertes(
  actif: boolean,
  /* Le jour ET l'heure, en heure d'Israel : la cloche attend 08:00, elle ne peut donc
     plus se contenter d'une date. Le moment vient du tableau de bord, qui porte
     l'unique horloge du module. */
  moment: MomentIsrael,
  periodes: PeriodeDossier[],
  encaissements: EncaissementConnu[],
  rechargerDonnees: () => Promise<void>,
) {
  const companyId = useCompanyId();
  const [dossiers, setDossiers] = useState<DossierPourAlertes[]>([]);
  const [etats, setEtats] = useState<EtatConnu[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState<FiltreAlertes>('actives');


  /**
   * CE QUE CE HOOK LIT LUI-MEME : ses dossiers et ses etats, rien d'autre.
   *
   * Les PERIODES et les ENCAISSEMENTS arrivent du hook du tableau de bord, qui les
   * charge une fois pour les deux surfaces. Les relire ici donnerait deux jeux de
   * lignes rafraichis a des instants differents — et une cloche qui reclamerait un
   * loyer que les cartes comptent deja comme encaisse.
   *
   * Les deux lectures restantes sont PAGINEES : crm_immo_dossiers et crm_immo_etats
   * grossissent aussi, et PostgREST tronque sans le dire.
   */
  const chargerLesSiennes = useCallback(async () => {
    if (!actif || !companyId) {
      setDossiers([]); setEtats([]); setChargement(false); return;
    }
    const [d, e] = await Promise.all([
      lireToutesLesLignes<DossierPourAlertes>((de, a) =>
        supabase.from('crm_immo_dossiers').select(CHAMPS_DOSSIER, { count: 'exact' })
          .eq('company_id', companyId).order('id').range(de, a)),
      lireToutesLesLignes<EtatConnu>((de, a) =>
        supabase.from('crm_immo_etats').select('dossier_id,genre,periode,lue_le,traitee_le', { count: 'exact' })
          .eq('company_id', companyId).order('dossier_id').order('genre').order('periode').range(de, a)),
    ]);
    if (d.error || e.error) {
      setErreur(d.error?.message ?? e.error?.message ?? '');
    } else {
      setDossiers((d.data ?? []) as DossierPourAlertes[]);
      setEtats((e.data ?? []) as EtatConnu[]);
      setErreur('');
    }
    setChargement(false);
  }, [actif, companyId]);

  /*
   * LE CHARGEMENT INITIAL NE TOUCHE QUE CE QUI APPARTIENT A CE HOOK.
   *
   * Le hook du tableau de bord charge DEJA les periodes et les encaissements a son
   * propre montage. Les redemander ici ferait deux fois les memes deux requetes a
   * chaque ouverture du panel, pour les memes lignes.
   */
  useEffect(() => { void chargerLesSiennes(); }, [chargerLesSiennes]);

  /**
   * << Actualiser >>, lui, rafraichit TOUT ce dont la cloche depend.
   *
   * C'est ce que les cinq appels de la page attendent : apres un encaissement ou un
   * renouvellement, la cloche doit repartir sur des periodes a jour, pas seulement sur
   * des etats a jour.
   */
  const recharger = useCallback(async () => {
    await Promise.all([chargerLesSiennes(), rechargerDonnees()]);
  }, [chargerLesSiennes, rechargerDonnees]);

  /*
   * Plus de battement local ici : l'horloge appartient au hook du tableau de bord, qui
   * la prete. Elle avance toujours toutes les 60 s sans aucune requete — c'est juste
   * qu'il n'y en a plus qu'UNE dans l'application.
   */

  /* Reseau : periodique, et au retour de visibilite. */
  const rechargerRef = useRef(recharger);
  useEffect(() => { rechargerRef.current = recharger; }, [recharger]);

  useEffect(() => {
    if (!actif) return;
    const t = setInterval(() => { void rechargerRef.current(); }, RYTHME_RESEAU);
    const auRetour = () => { if (document.visibilityState === 'visible') void rechargerRef.current(); };
    document.addEventListener('visibilitychange', auRetour);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', auRetour); };
  }, [actif]);

  const toutes = useMemo(
    () => deriverAlertes({ dossiers, etats, moment, encaissements, periodes }),
    [dossiers, etats, moment, encaissements, periodes],
  );

  const affichees = useMemo(() => filtrer(toutes, filtre), [toutes, filtre]);
  const badge = useMemo(() => compteBadge(toutes), [toutes]);

  /*
   * Les ACTIVES, independamment du filtre de la page.
   *
   * `affichees` suit le selecteur Actives / Traitees / Toutes de la page du module. Le
   * hub Notifications general, lui, n a pas ce selecteur : s il affichait `affichees`,
   * choisir << Traitees >> sur la page du module changerait la liste du hub general, qui
   * montrerait des echeances deja traitees pendant que sa pastille, elle, compte les
   * actives. Liste et chiffre se contrediraient, et l utilisateur n aurait aucun moyen de
   * comprendre pourquoi.
   *
   * On derive donc de `toutes` — la meme source, un calcul de plus au meme endroit, et
   * non une seconde verite ailleurs.
   */
  const actives = useMemo(() => filtrer(toutes, 'actives'), [toutes]);

  /**
   * Marque une alerte lue ou traitee.
   *
   * UPSERT sur la contrainte d'unicite, et non INSERT : l'alerte peut deja avoir une
   * ligne (lue puis traitee). `onConflict` nomme les quatre colonnes de
   * crm_immo_etats_unique_par_echeance — company_id en tete depuis la migration qui l'a
   * cloisonnee.
   *
   * On ecrit TOUJOURS lue_le en meme temps que traitee_le : traiter sans avoir lu est
   * legitime, mais l'alerte doit alors sortir du badge, et le predicat du badge regarde
   * les deux.
   */
  const marquer = useCallback(async (a: Alerte, quoi: 'lue' | 'traitee') => {
    if (!companyId) return { error: 'Société introuvable.' };
    const maintenant = new Date().toISOString();
    const ligne = {
      company_id: companyId,
      dossier_id: a.dossier_id,
      genre: a.genre as GenreAlerte,
      periode: a.periode,
      lue_le: maintenant,
      traitee_le: quoi === 'traitee' ? maintenant : (a.traitee ? maintenant : null),
    };

    const { data, error } = await supabase
      .from('crm_immo_etats')
      .upsert(ligne, { onConflict: 'company_id,dossier_id,genre,periode' })
      .select('dossier_id,genre,periode,lue_le,traitee_le');

    if (error) return { error: error.message };
    const rendues = (data ?? []) as EtatConnu[];
    /* ZERO ligne = refus de la RLS, pas une reussite : supabase-js ne leve rien. */
    if (rendues.length === 0) return { error: 'Action refusée : droits insuffisants.' };

    setEtats(prev => {
      const autres = prev.filter(e => !(e.dossier_id === a.dossier_id && e.genre === a.genre && e.periode === a.periode));
      return [...autres, rendues[0]];
    });
    return { error: null };
  }, [companyId]);

  const marquerLue = useCallback((a: Alerte) => marquer(a, 'lue'), [marquer]);
  const marquerTraitee = useCallback((a: Alerte) => marquer(a, 'traitee'), [marquer]);

  return {
    alertes: affichees, toutes, actives, badge, filtre, setFiltre,
    chargement, erreur, aujourdhui: moment.jour, moment,
    recharger, marquerLue, marquerTraitee,
  };
}

/** Ce que le hook rend : la SEULE source de verite des alertes du module. */
export type EtatAlertesImmo = ReturnType<typeof useCrmImmoAlertes>;
