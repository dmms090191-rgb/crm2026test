import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { lireToutesLesLignes } from '../../../../lib/lectureIntegrale';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { journeeDeReference, FUSEAU_ALERTES } from '../../../../lib/crmImmoAlertes';
import {
  construireEcheancier, statutDe, loyerActuel, compterParStatut,
  type EcheanceLoyer, type StatutLoyer,
} from '../../../../lib/crmImmoEcheancier';

/**
 * L'ECHEANCIER D'UN DOSSIER — le cote reseau.
 *
 * Il ne calcule rien : les echeances, leur numero, leur total et leur statut viennent
 * tous de `crmImmoEcheancier`, la meme fonction que lisent les notifications. Ce hook
 * ne fait que charger les PERIODES et les ENCAISSEMENTS, et ecrire ce qu'on lui demande.
 *
 * ---------- CE QUI EST CHARGE, ET CE QUI NE L'EST PAS ----------
 *
 * Les echeances ne sont pas chargees : elles n'existent pas en base. Un bail de trois
 * ans ne pose aucune ligne, il se recalcule. Seuls deux faits sont stockes, parce que
 * rien ne permet de les deviner : les periodes de contrat, et les encaissements.
 *
 * ---------- CHAQUE ECRITURE SE COMPTE ----------
 *
 * Un UPDATE refuse par la RLS ne leve pas d'erreur cote supabase-js : il rend
 * { error: null } et ZERO ligne. Toutes les ecritures d'ici font donc .select() et
 * comparent le nombre de lignes rendues.
 */

/**
 * Une periode de bail telle que la table la PORTE — une ligne, avec son id et sa date
 * de cloture.
 *
 * A ne pas confondre avec PeriodeDossier de crmImmoEcheancier, qui est l'ENTREE DU
 * CALCUL : celle-la ne garde que les quatre champs qui servent a produire des
 * echeances, plus un drapeau. Les deux ont vecu sous le meme nom un moment, ce qui
 * etait un piege a relecture.
 */
export interface PeriodeEnregistree {
  id: string;
  debut: string;
  fin: string;
  jour_encaissement: number;
  cloture_le: string | null;
  created_at: string;
}

/** Un encaissement, annule ou non. */
export interface EncaissementDossier {
  id: string;
  echeance: string;
  encaisse_le: string;
  annule_le: string | null;
  motif_annulation: string | null;
}

/** Une ligne de l'echeancier, prete a afficher. */
export interface LigneEcheancier extends EcheanceLoyer {
  statut: StatutLoyer;
  /** L'encaissement ACTIF de cette echeance, s'il y en a un. */
  encaissement: EncaissementDossier | null;
  /** Vrai pour le loyer du mois en cours — celui qui est surligne. */
  actuel: boolean;
}

/**
 * @param aujourdhuiPartage  Le jour de reference VIVANT du module, 'AAAA-MM-JJ' en
 *   Asia/Jerusalem, avance par le minuteur du tableau de bord.
 *
 *   POURQUOI IL ARRIVE DE L'EXTERIEUR. Ce crochet calculait le sien, dans un useMemo dont
 *   la seule dependance etait une constante de module : il etait donc FIGE au montage. Une
 *   modale laissee ouverte a cheval sur minuit gardait les statuts de la veille, alors que
 *   les cartes du tableau de bord, elles, avancaient toutes les 60 secondes. Le statut « En
 *   retard » dependant du jour, c'est exactement ce qui empechait le basculement
 *   AUTOMATIQUE que David demande.
 *
 *   On ne pose pas un second minuteur ici : deux horloges pourraient franchir minuit a deux
 *   instants, et faire dire aux cartes et a la modale deux choses differentes.
 *
 *   Optionnel : sans lui, le crochet retombe sur son propre calcul — fige, comme avant,
 *   mais exact au montage. C'est le repli d'un appelant qui n'aurait pas le contexte.
 */
export function useCrmImmoEcheancier(dossierId: string | null, aujourdhuiPartage?: string) {
  const companyId = useCompanyId();
  const [periodes, setPeriodes] = useState<PeriodeEnregistree[]>([]);
  const [encaissements, setEncaissements] = useState<EncaissementDossier[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  /* Israel, et pas le poste : le statut << en retard >> d'une echeance doit etre le meme
     pour tout le monde. Voir FUSEAU_ALERTES. */
  const fuseau = FUSEAU_ALERTES;
  /*
   * Le repli garde le MEME fuseau que l'horloge partagee : s'il calculait en heure locale,
   * un appelant sans contexte verrait d'autres statuts qu'un appelant avec — et le fuseau
   * est precisement ce que FUSEAU_ALERTES existe pour fixer.
   */
  const propre = useMemo(() => journeeDeReference(new Date(), fuseau), [fuseau]);
  const aujourdhui = aujourdhuiPartage ?? propre;

  const charger = useCallback(async () => {
    if (!dossierId || !companyId) { setPeriodes([]); setEncaissements([]); setChargement(false); return; }
    setChargement(true);
    /*
     * PAGINEES. Un dossier tenu longtemps accumule une ligne de loyer par mois : le
     * plafond de PostgREST finirait par couper l'historique sans rien dire, et
     * l'echeancier afficherait des encaissements manquants comme des impayes.
     *
     * Les deux tris sont DEPARTAGES par `id` : sans second critere, deux lignes de
     * meme date pourraient s'echanger entre deux pages — l'une vue deux fois, l'autre
     * jamais.
     */
    const [p, l] = await Promise.all([
      lireToutesLesLignes<PeriodeEnregistree>((de, a) =>
        supabase.from('crm_immo_contrats')
          .select('id,debut,fin,jour_encaissement,cloture_le,created_at', { count: 'exact' })
          .eq('company_id', companyId).eq('dossier_id', dossierId)
          .order('debut', { ascending: false }).order('id').range(de, a)),
      /* Les ANNULES sont charges aussi : l'historique de correction doit rester lisible. */
      lireToutesLesLignes<EncaissementDossier>((de, a) =>
        supabase.from('crm_immo_loyers')
          .select('id,echeance,encaisse_le,annule_le,motif_annulation', { count: 'exact' })
          .eq('company_id', companyId).eq('dossier_id', dossierId)
          .order('echeance', { ascending: true }).order('id').range(de, a)),
    ]);
    if (p.error || l.error) {
      setErreur(p.error?.message ?? l.error?.message ?? '');
    } else {
      setPeriodes((p.data ?? []) as PeriodeEnregistree[]);
      setEncaissements((l.data ?? []) as EncaissementDossier[]);
      setErreur('');
    }
    setChargement(false);
  }, [dossierId, companyId]);

  useEffect(() => { void charger(); }, [charger]);

  /** La periode EN COURS. Au plus une, la base le garantit par un index partiel. */
  const periodeActive = useMemo(
    () => periodes.find(p => p.cloture_le === null) ?? null,
    [periodes],
  );

  /** Les periodes closes, de la plus recente a la plus ancienne. */
  const historique = useMemo(
    () => periodes.filter(p => p.cloture_le !== null),
    [periodes],
  );

  /** Les encaissements actifs, par echeance. Une annulation rend l'echeance due. */
  const actifsParEcheance = useMemo(() => {
    const m = new Map<string, EncaissementDossier>();
    for (const e of encaissements) if (e.annule_le === null) m.set(e.echeance, e);
    return m;
  }, [encaissements]);

  /**
   * L'ECHEANCIER DE LA PERIODE EN COURS.
   *
   * Si aucune periode n'est en cours — bail termine et non renouvele — on prend la plus
   * recente : son echeancier reste consultable, et ses loyers impayes aussi.
   */
  const periodeAffichee = periodeActive ?? periodes[0] ?? null;

  const echeancier = useMemo<LigneEcheancier[]>(() => {
    if (!periodeAffichee) return [];
    const brut = construireEcheancier({
      debut: periodeAffichee.debut, fin: periodeAffichee.fin, jour: periodeAffichee.jour_encaissement,
    });
    const actuel = loyerActuel(brut, aujourdhui);
    return brut.map(e => {
      const encaissement = actifsParEcheance.get(e.date) ?? null;
      return {
        ...e,
        statut: statutDe(e.date, encaissement !== null, aujourdhui),
        encaissement,
        actuel: actuel !== null && actuel.date === e.date,
      };
    });
  }, [periodeAffichee, actifsParEcheance, aujourdhui]);

  const compteurs = useMemo(
    () => compterParStatut(
      echeancier,
      (d: string) => actifsParEcheance.has(d),
      aujourdhui,
    ),
    [echeancier, actifsParEcheance, aujourdhui],
  );

  /** L'echeancier d'une periode close, pour l'historique. */
  const echeancierDe = useCallback((p: PeriodeEnregistree) =>
    construireEcheancier({ debut: p.debut, fin: p.fin, jour: p.jour_encaissement }), []);

  /* ---------------------------------------------------------------------
     LES ECRITURES
     --------------------------------------------------------------------- */

  const marquerEncaisse = useCallback(async (echeance: string): Promise<string | null> => {
    if (!dossierId || !companyId) return 'Dossier introuvable.';
    setEnCours(true);
    const { data, error } = await supabase
      .from('crm_immo_loyers')
      .insert({ company_id: companyId, dossier_id: dossierId, echeance })
      .select('id');
    setEnCours(false);
    if (error) return error.message;
    if (!data || data.length === 0) return 'Action refusée : droits insuffisants.';
    await charger();
    return null;
  }, [dossierId, companyId, charger]);

  /**
   * ANNULER un encaissement : on NE supprime pas la ligne.
   *
   * David : << Je ne veux pas supprimer physiquement la ligne comme si elle n'avait
   * jamais existe. >> L'echeance redevient due, et la correction reste lisible. Le
   * declencheur en base refuse d'ailleurs le DELETE, et refuse aussi de defaire une
   * annulation : pour re-encaisser, on cree une NOUVELLE ligne.
   */
  const annulerEncaissement = useCallback(async (id: string, motif: string): Promise<string | null> => {
    if (!companyId) return 'Société introuvable.';
    setEnCours(true);
    const { data: utilisateur } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('crm_immo_loyers')
      .update({
        annule_le: new Date().toISOString(),
        annule_par: utilisateur?.user?.id ?? null,
        motif_annulation: motif.trim() === '' ? null : motif.trim().slice(0, 500),
      })
      .eq('id', id).eq('company_id', companyId)
      .select('id');
    setEnCours(false);
    if (error) return error.message;
    if (!data || data.length === 0) return 'Action refusée : droits insuffisants.';
    await charger();
    return null;
  }, [companyId, charger]);

  /**
   * RENOUVELER — UNE SEULE OPERATION, par la fonction crm_immo_renouveler.
   *
   * ---------- CE QUE C'ETAIT, ET POURQUOI C'ETAIT FRAGILE ----------
   *
   * Deux requetes HTTP, donc deux transactions : cloturer, puis inserer. Entre les
   * deux, l'etat valide de la base ne contenait AUCUNE periode en cours. Si la seconde
   * echouait — reseau coupe, onglet ferme, refus de droits — le bail restait cloture
   * sans remplacant. Et une ecriture concurrente dans cette fenetre faisait ressusciter
   * une periode par declencheur, ce qui faisait echouer l'insertion en 23505 et
   * laissait la base dans un etat pire qu'avant.
   *
   * ---------- CE QUE C'EST ----------
   *
   * Un appel, une transaction : soit la cloture ET la creation, soit rien. La fonction
   * verrouille la ligne du DOSSIER — pas la periode, qui cesse de qualifier sous
   * READ COMMITTED et ne serialise donc rien — et refuse si la periode en cours n'est
   * plus celle qu'on annonce.
   *
   * `periodeActive?.id ?? null` est cette annonce. Deux onglets ouverts sur la meme
   * fiche portent le meme identifiant ; le premier qui renouvelle le perime, et le
   * second recoit un refus lisible au lieu d'enterrer silencieusement son travail.
   *
   * Les messages d'erreur viennent de la base, en francais, et sont deja destines a
   * l'ecran : TLV01 dossier introuvable, TLV02 dates invalides, TLV03 periode deja
   * changee, TLV04 refus de droits.
   */
  const renouveler = useCallback(async (
    debut: string, fin: string, jour: number,
  ): Promise<string | null> => {
    if (!dossierId) return 'Dossier introuvable.';

    setEnCours(true);
    const { error } = await supabase.rpc('crm_immo_renouveler', {
      p_dossier_id: dossierId,
      p_periode_attendue: periodeActive?.id ?? null,
      p_debut: debut,
      p_fin: fin,
      p_jour: jour,
    });
    setEnCours(false);

    /*
     * Pas de garde << zero ligne >> ici, et ce n'est pas un oubli : un refus de la RLS
     * ne passe plus en silence. La fonction compte ses lignes (GET DIAGNOSTICS) et leve
     * une exception, que PostgREST remonte comme une vraie erreur.
     */
    if (error) return error.message || 'Le renouvellement a échoué.';
    await charger();
    return null;
  }, [dossierId, periodeActive, charger]);

  return {
    periodes, periodeActive, periodeAffichee, historique,
    encaissements, echeancier, compteurs, aujourdhui,
    chargement, erreur, enCours,
    echeancierDe, recharger: charger,
    marquerEncaisse, annulerEncaissement, renouveler,
  };
}
