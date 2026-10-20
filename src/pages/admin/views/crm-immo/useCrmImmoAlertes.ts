import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import {
  deriverAlertes, journeeDeReference, fuseauLocal, filtrer, compteBadge,
  type Alerte, type EtatConnu, type GenreAlerte, type FiltreAlertes, type DossierPourAlertes,
} from '../../../../lib/crmImmoAlertes';

/**
 * L'etat de la cloche CRM IMMO — locale au module, sans Realtime.
 *
 * ---------- CE QU'ELLE N'EST PAS ----------
 *
 * Elle ne touche NI TopBar, NI les cartes du NotifHub general, NI aucune somme de
 * compteurs. Elle est montee par la vue du module, elle vit dans son dossier, et aucun
 * chiffre n'en sort. L'inverse est vrai aussi : elle ne lit rien des notifications
 * generales. scripts/crm-immo/clocheIsolation.test.ts le prouve, et casse si quelqu'un
 * branche un jour l'un sur l'autre.
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
   commentaires et les valeurs personnalisees pour compter des echeances. */
const CHAMPS_DOSSIER = 'id,nom,prenom,locataire,proprietaire,date_fin_contrat,jour_encaissement';

const RYTHME_DERIVATION = 60_000;
const RYTHME_RESEAU = 300_000;

export function useCrmImmoAlertes() {
  const companyId = useCompanyId();
  const [dossiers, setDossiers] = useState<DossierPourAlertes[]>([]);
  const [etats, setEtats] = useState<EtatConnu[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState<FiltreAlertes>('actives');
  const fuseau = useMemo(() => fuseauLocal(), []);

  /* Le jour de reference, recalcule au battement. C'est LUI qui fait naitre les alertes
     sans aucune requete. */
  const [aujourdhui, setAujourdhui] = useState(() => journeeDeReference(new Date(), fuseau));

  const recharger = useCallback(async () => {
    if (!companyId) { setDossiers([]); setEtats([]); setChargement(false); return; }
    const [d, e] = await Promise.all([
      supabase.from('crm_immo_dossiers').select(CHAMPS_DOSSIER).eq('company_id', companyId),
      supabase.from('crm_immo_etats').select('dossier_id,genre,periode,lue_le,traitee_le').eq('company_id', companyId),
    ]);
    if (d.error || e.error) {
      setErreur(d.error?.message ?? e.error?.message ?? '');
    } else {
      setDossiers((d.data ?? []) as DossierPourAlertes[]);
      setEtats((e.data ?? []) as EtatConnu[]);
      setErreur('');
    }
    /* Le jour est relu a chaque passage reseau : un onglet laisse ouvert la nuit doit
       repartir sur la bonne date, meme si le battement de 60 s a ete gele par le
       navigateur en arriere-plan. */
    setAujourdhui(journeeDeReference(new Date(), fuseau));
    setChargement(false);
  }, [companyId, fuseau]);

  useEffect(() => { void recharger(); }, [recharger]);

  /* Battement local : aucune requete, seulement la date qui avance. */
  useEffect(() => {
    const t = setInterval(() => setAujourdhui(journeeDeReference(new Date(), fuseau)), RYTHME_DERIVATION);
    return () => clearInterval(t);
  }, [fuseau]);

  /* Reseau : periodique, et au retour de visibilite. */
  const rechargerRef = useRef(recharger);
  useEffect(() => { rechargerRef.current = recharger; }, [recharger]);

  useEffect(() => {
    const t = setInterval(() => { void rechargerRef.current(); }, RYTHME_RESEAU);
    const auRetour = () => { if (document.visibilityState === 'visible') void rechargerRef.current(); };
    document.addEventListener('visibilitychange', auRetour);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', auRetour); };
  }, []);

  const toutes = useMemo(
    () => deriverAlertes({ dossiers, etats, aujourdhui }),
    [dossiers, etats, aujourdhui],
  );

  const affichees = useMemo(() => filtrer(toutes, filtre), [toutes, filtre]);
  const badge = useMemo(() => compteBadge(toutes), [toutes]);

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
    alertes: affichees, toutes, badge, filtre, setFiltre,
    chargement, erreur, aujourdhui,
    recharger, marquerLue, marquerTraitee,
  };
}
